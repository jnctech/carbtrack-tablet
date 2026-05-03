import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttachmentGallery } from "./AttachmentGallery";
import type { AttachmentView } from "@/lib/schemas";

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function attachment(overrides: Partial<AttachmentView> = {}): AttachmentView {
  return {
    id: 1,
    recipe_id: 5,
    kind: "photo",
    filename: "a.jpg",
    mime_type: "image/jpeg",
    caption: null,
    sort_order: 0,
    created_at: "2026-05-03T00:00:00Z",
    url: "/attachments/5/a.jpg",
    thumb_url: "/attachments/thumbs/5/a.webp",
    ...overrides,
  };
}

function renderGallery(props: {
  attachments: AttachmentView[];
  onChanged?: () => void;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AttachmentGallery
        recipeId={5}
        attachments={props.attachments}
        onChanged={props.onChanged ?? (() => {})}
      />
    </QueryClientProvider>,
  );
}

function makeImageFile(name: string, type = "image/jpeg", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("AttachmentGallery", () => {
  it("renders the empty state when there are no photos or uploads", () => {
    renderGallery({ attachments: [] });
    expect(
      screen.getByText(/no photos yet/i),
    ).toBeInTheDocument();
  });

  it("renders thumbnails for existing attachments", () => {
    renderGallery({
      attachments: [
        attachment({ id: 1, caption: "cake", thumb_url: "/t/1.webp" }),
        attachment({ id: 2, sort_order: 1, thumb_url: "/t/2.webp" }),
      ],
    });
    expect(screen.getByAltText("cake")).toHaveAttribute(
      "src",
      "/t/1.webp",
    );
    expect(screen.getAllByAltText(/recipe photo|cake/i)).toHaveLength(2);
  });

  it("rejects oversized files inline without a network call", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    renderGallery({ attachments: [] });

    const big = makeImageFile("big.jpg", "image/jpeg", 16 * 1024 * 1024);
    const input = screen.getByLabelText(/add photos/i);
    await user.upload(input, big);

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported MIME inline without a network call", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    renderGallery({ attachments: [] });

    // userEvent.upload clamps the File's type to what the input accepts; bypass
    // by dispatching a synthetic change event with our hand-crafted file list.
    const bad = makeImageFile("note.txt", "text/plain", 100);
    const input = screen.getByLabelText(/add photos/i) as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [bad], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Unsupported file type/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads a valid file and calls onChanged", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(attachment({ id: 99 })), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;
    const onChanged = vi.fn();
    const user = userEvent.setup();
    renderGallery({ attachments: [], onChanged });

    const file = makeImageFile("good.jpg");
    const input = screen.getByLabelText(/add photos/i);
    await user.upload(input, file);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("debounced caption edit fires a single PATCH", async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify(attachment({ caption: "after" })),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    renderGallery({ attachments: [attachment({ caption: null })] });

    const captionInput = screen.getByPlaceholderText(/caption/i);
    await user.type(captionInput, "after");

    // Within the 600ms debounce window — nothing should have fired yet.
    expect(fetchMock).not.toHaveBeenCalled();

    await waitFor(
      () => expect(fetchMock).toHaveBeenCalledTimes(1),
      { timeout: 1500 },
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ caption: "after" });
  });

  it("up/down nudges PATCH both neighbours and disable at boundaries", async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify(attachment()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    renderGallery({
      attachments: [
        attachment({ id: 1, sort_order: 0 }),
        attachment({ id: 2, sort_order: 1 }),
        attachment({ id: 3, sort_order: 2 }),
      ],
    });

    const upButtons = screen.getAllByRole("button", {
      name: /move photo earlier/i,
    });
    const downButtons = screen.getAllByRole("button", {
      name: /move photo later/i,
    });
    expect(upButtons[0]).toBeDisabled(); // first
    expect(downButtons[2]).toBeDisabled(); // last

    if (!downButtons[0]) throw new Error("expected down button on first tile");
    await user.click(downButtons[0]); // swap 1 <-> 2

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const calls = fetchMock.mock.calls.map((c) => c[1]?.body as string);
    expect(calls).toEqual(
      expect.arrayContaining([
        JSON.stringify({ sort_order: 1 }),
        JSON.stringify({ sort_order: 0 }),
      ]),
    );
  });

  it("delete prompts and DELETEs on confirm", async () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ detail: "ok", id: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const onChanged = vi.fn();
    const user = userEvent.setup();
    renderGallery({
      attachments: [attachment({ id: 1 })],
      onChanged,
    });

    await user.click(screen.getByRole("button", { name: /delete photo/i }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("DELETE");
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("delete is skipped when user cancels confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    renderGallery({ attachments: [attachment({ id: 1 })] });

    await user.click(screen.getByRole("button", { name: /delete photo/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("surfaces upload server errors inline and lets the user dismiss", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("nope", { status: 500, statusText: "Server Error" }),
    ) as unknown as typeof fetch;
    const user = userEvent.setup();
    renderGallery({ attachments: [] });

    const file = makeImageFile("good.jpg");
    const input = screen.getByLabelText(/add photos/i);
    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /upload failed/i,
    );
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
