// Single source of truth for attachment upload constraints. Mirrors the
// server's allow-list in carbtrack-au's app/routers/attachments.py — keep in
// sync if either side changes.

export const ALLOWED_MIME: ReadonlyMap<string, string> = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export function describeUploadRejection(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return `Unsupported file type${file.type ? `: ${file.type}` : ""}`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `File too large (${mb} MB, max 15 MB)`;
  }
  if (file.size === 0) {
    return "File is empty";
  }
  return null;
}
