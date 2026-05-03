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

const ACCEPT_ATTR = Array.from(ALLOWED_MIME.keys()).join(",");

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
      a.created_at.localeCompare(b.created_at),
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Sequential — keeps server load gentle and the per-file error UX simple.
    for (const file of Array.from(files)) {
      const nonce =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
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
          sortOrder: attachments.length + uploads.length,
        });
        setUploads((u) => u.filter((entry) => entry.nonce !== nonce));
        onChanged();
      } catch (err: unknown) {
        const message =
          err instanceof ApiError
            ? `Upload failed (${err.status || err.kind}): ${err.message}`
            : err instanceof Error
              ? err.message
              : "Upload failed";
        setUploads((u) =>
          u.map((entry) =>
            entry.nonce === nonce
              ? { ...entry, status: "error", error: message }
              : entry,
          ),
        );
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <label className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted/40">
          + Add photos
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
  att: AttachmentView;
  isFirst: boolean;
  isLast: boolean;
  neighbours: { prev: AttachmentView | null; next: AttachmentView | null };
  onChanged: () => void;
}

function AttachmentTile({
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
  const [error, setError] = useState<string | null>(null);

  // Reset local state if the server-side caption changes (e.g. another tab
  // edited it and a refetch landed). Compare against last-saved so a
  // round-trip from this very tile doesn't bounce the input.
  useEffect(() => {
    const incoming = att.caption ?? "";
    if (incoming !== lastSavedRef.current) {
      lastSavedRef.current = incoming;
      setCaption(incoming);
    }
  }, [att.caption]);

  const captionMutation = useMutation({
    mutationFn: (next: string) =>
      patchAttachment(att.recipe_id, att.id, {
        caption: next === "" ? null : next,
      }),
    onSuccess: (updated) => {
      lastSavedRef.current = updated.caption ?? "";
      setError(null);
      onChanged();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Save failed");
    },
  });

  useEffect(() => {
    if (debounced === lastSavedRef.current) return;
    captionMutation.mutate(debounced);
    // captionMutation is stable across renders (TanStack Query); we only
    // want to fire when the debounced value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const swapMutation = useMutation({
    mutationFn: async (other: AttachmentView) => {
      await patchAttachment(att.recipe_id, att.id, {
        sort_order: other.sort_order,
      });
      await patchAttachment(other.recipe_id, other.id, {
        sort_order: att.sort_order,
      });
    },
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Reorder failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAttachment(att.recipe_id, att.id),
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Delete failed");
    },
  });

  const confirmDelete = () => {
    if (typeof window === "undefined") return;
    if (window.confirm("Delete this photo?")) {
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
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={isFirst || busy || !neighbours.prev}
            onClick={() =>
              neighbours.prev && swapMutation.mutate(neighbours.prev)
            }
            aria-label="Move photo earlier"
            className="rounded px-2 py-1 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
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
            className="rounded px-2 py-1 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={confirmDelete}
          aria-label="Delete photo"
          className="rounded px-2 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-30"
        >
          Delete
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
