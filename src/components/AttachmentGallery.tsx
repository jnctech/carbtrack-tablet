import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ALLOWED_MIME,
  describeUploadRejection,
} from "@/lib/attachments";
import {
  ApiError,
  deleteAttachment,
  patchAttachment,
  uploadAttachment,
} from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { AttachmentView } from "@/lib/schemas";

interface Props {
  recipeId: number;
  attachments: AttachmentView[];
  onChanged: () => void;
}

interface UploadState {
  nonce: string;
  fileName: string;
  status: "uploading" | "error";
  error?: string;
}

const ACCEPT_ATTR: string = [...ALLOWED_MIME.keys()].join(",");

function formatUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    return `Upload failed (${err.status || err.kind}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Upload failed";
}

function formatActionError(err: unknown, label: string): string {
  if (err instanceof ApiError) {
    return `${label} failed (${err.status || err.kind}): ${err.message}`;
  }
  if (err instanceof Error) return `${label} failed: ${err.message}`;
  return `${label} failed`;
}

function newNonce(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

export function AttachmentGallery({
  recipeId,
  attachments,
  onChanged,
}: Readonly<Props>) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...attachments].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );

  const handleFiles = async (files: FileList | null) => {
    try {
      if (!files || files.length === 0) return;
      // Sequential — keeps server load gentle and the per-file error UX
      // simple. In-batch counter so each file gets a unique sort_order;
      // uploads.length here would be the stale render-time closure value.
      let queuedThisBatch = 0;
      for (const file of Array.from(files)) {
        const nonce = newNonce();
        const rejection = describeUploadRejection(file);
        if (rejection) {
          setUploads((u) => [
            ...u,
            { nonce, fileName: file.name, status: "error", error: rejection },
          ]);
          continue;
        }
        setUploads((u) => [
          ...u,
          { nonce, fileName: file.name, status: "uploading" },
        ]);
        try {
          await uploadAttachment(recipeId, file, {
            sortOrder: attachments.length + queuedThisBatch,
          });
          queuedThisBatch += 1;
          setUploads((u) => u.filter((entry) => entry.nonce !== nonce));
          onChanged();
        } catch (err: unknown) {
          const message = formatUploadError(err);
          setUploads((u) =>
            u.map((entry) =>
              entry.nonce === nonce
                ? { ...entry, status: "error", error: message }
                : entry,
            ),
          );
        }
      }
    } finally {
      // Always reset so the same file can be re-selected after a rejection
      // or a partial-batch failure (browsers suppress `change` for an
      // identical selection otherwise).
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const dismissUpload = (nonce: string) =>
    setUploads((u) => u.filter((entry) => entry.nonce !== nonce));

  return (
    <section
      aria-labelledby="attachments-heading"
      data-testid="attachment-gallery"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 id="attachments-heading" className="text-sm font-medium">
          Photos
        </h2>
        <label className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted/40">
          <span>+ Add photos</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </label>
      </div>

      {sorted.length === 0 && uploads.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No photos yet — tap "Add photos" to remember this recipe.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {sorted.map((att, idx) => (
          <AttachmentTile
            key={att.id}
            recipeId={recipeId}
            att={att}
            isFirst={idx === 0}
            isLast={idx === sorted.length - 1}
            neighbours={{
              prev: sorted[idx - 1] ?? null,
              next: sorted[idx + 1] ?? null,
            }}
            onChanged={onChanged}
          />
        ))}
        {uploads.map((u) => (
          <li
            key={u.nonce}
            className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3 text-center text-xs"
          >
            <p className="truncate w-full font-medium">{u.fileName}</p>
            {u.status === "uploading" ? (
              <p className="mt-2 text-muted-foreground">Uploading…</p>
            ) : (
              <>
                <p className="mt-2 text-destructive" role="alert">
                  {u.error}
                </p>
                <button
                  type="button"
                  onClick={() => dismissUpload(u.nonce)}
                  className="mt-2 underline-offset-4 hover:underline"
                >
                  Dismiss
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TileProps {
  recipeId: number;
  att: AttachmentView;
  isFirst: boolean;
  isLast: boolean;
  neighbours: { prev: AttachmentView | null; next: AttachmentView | null };
  onChanged: () => void;
}

function AttachmentTile({
  recipeId,
  att,
  isFirst,
  isLast,
  neighbours,
  onChanged,
}: Readonly<TileProps>) {
  const captionInputId = useId();
  const [caption, setCaption] = useState(att.caption ?? "");
  const debounced = useDebouncedValue(caption, 600);
  const lastSavedRef = useRef(att.caption ?? "");
  const captionAbortRef = useRef<AbortController | null>(null);
  // Caption errors and action errors (reorder/delete) live in separate slots
  // so a successful reorder doesn't visually swallow a failed caption save.
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const captionMutation = useMutation({
    mutationFn: (next: string) => {
      // Abort any prior in-flight caption PATCH so a slow response from an
      // earlier keystroke can't land after a faster newer one and resurrect
      // stale text. AbortController per-call; the rejection lands in onError
      // where we filter AbortError out.
      captionAbortRef.current?.abort();
      const ctrl = new AbortController();
      captionAbortRef.current = ctrl;
      return patchAttachment(
        recipeId,
        att.id,
        { caption: next === "" ? null : next },
        { signal: ctrl.signal },
      );
    },
    onSuccess: (updated) => {
      lastSavedRef.current = updated.caption ?? "";
      setCaptionError(null);
      onChanged();
    },
    onError: (err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCaptionError(formatActionError(err, "Caption save"));
    },
  });

  // Reset local state if the server-side caption changes (e.g. another tab
  // edited it and a refetch landed). Compare against last-saved so a
  // round-trip from this very tile doesn't bounce the input. Skip while a
  // caption save is in flight so a refetch can't stomp the user's edit.
  useEffect(() => {
    if (captionMutation.isPending) return;
    const incoming = att.caption ?? "";
    if (incoming !== lastSavedRef.current) {
      lastSavedRef.current = incoming;
      setCaption(incoming);
    }
  }, [att.caption, captionMutation.isPending]);

  useEffect(() => {
    if (debounced === lastSavedRef.current) return;
    captionMutation.mutate(debounced);
    // captionMutation is stable across renders (TanStack Query); we only
    // want to fire when the debounced value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const swapMutation = useMutation({
    mutationFn: async (other: AttachmentView) => {
      await patchAttachment(recipeId, att.id, {
        sort_order: other.sort_order,
      });
      try {
        await patchAttachment(recipeId, other.id, {
          sort_order: att.sort_order,
        });
      } catch (err) {
        // Compensating PATCH so two attachments don't end up sharing a
        // sort_order on the server. If the rollback also fails, surface a
        // louder message so the user knows to refresh.
        try {
          await patchAttachment(recipeId, att.id, {
            sort_order: att.sort_order,
          });
        } catch {
          throw new Error(
            "Reorder partially failed and could not be rolled back. Please refresh to see the current order.",
          );
        }
        throw err;
      }
    },
    onSuccess: () => {
      setActionError(null);
      onChanged();
    },
    onError: (err: unknown) => {
      setActionError(formatActionError(err, "Reorder"));
      // Re-sync from the server regardless so the UI matches reality even
      // when the rollback succeeded.
      onChanged();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAttachment(recipeId, att.id),
    onSuccess: () => {
      setActionError(null);
      onChanged();
    },
    onError: (err: unknown) => {
      setActionError(formatActionError(err, "Delete"));
    },
  });

  const confirmDelete = () => {
    if (typeof globalThis.confirm !== "function") {
      // No confirm prompt available (e.g. some embedded webviews). Surface
      // via the action-error slot rather than a silent no-op so the user
      // gets feedback that the tap registered.
      setActionError(
        "Confirm dialogs aren't available here — long-press support coming in a later phase.",
      );
      return;
    }
    if (globalThis.confirm("Delete this photo?")) {
      deleteMutation.mutate();
    }
  };

  const busy =
    swapMutation.isPending || deleteMutation.isPending;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      <a
        href={att.url}
        target="_blank"
        rel="noreferrer noopener"
        className="block aspect-square overflow-hidden rounded-md bg-muted/30"
      >
        <img
          src={att.thumb_url}
          alt={att.caption ?? "Recipe photo"}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </a>
      <label htmlFor={captionInputId} className="sr-only">
        Caption for photo
      </label>
      <input
        id={captionInputId}
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        aria-invalid={captionError ? true : undefined}
        className={`w-full rounded border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring ${
          captionError ? "border-destructive" : "border-border"
        }`}
      />
      {captionError && (
        <p className="text-xs text-destructive" role="alert">
          {captionError}
        </p>
      )}
      <div className="flex items-center justify-between gap-1 text-sm">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={isFirst || busy || !neighbours.prev}
            onClick={() =>
              neighbours.prev && swapMutation.mutate(neighbours.prev)
            }
            aria-label="Move photo earlier"
            className="min-h-10 rounded px-3 py-2 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={isLast || busy || !neighbours.next}
            onClick={() =>
              neighbours.next && swapMutation.mutate(neighbours.next)
            }
            aria-label="Move photo later"
            className="min-h-10 rounded px-3 py-2 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={confirmDelete}
          aria-label="Delete photo"
          className="min-h-10 rounded px-3 py-2 text-destructive hover:bg-destructive/10 disabled:opacity-30"
        >
          Delete
        </button>
      </div>
      {actionError && (
        <p className="text-xs text-destructive" role="alert">
          {actionError}
        </p>
      )}
    </li>
  );
}
