# ADR-005: Client attachment allow-list mirrors carbtrack-au

**Date:** 2026-05-03
**Status:** Accepted

## Context

carbtrack-au's attachments router enforces an image MIME allow-list (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`) and a 15 MB upload cap. Without a matching client-side guard, the tablet would happily POST a 50 MB HEIC and a `.gif` to discover the rejection only after the upload completes — wasting the user's time, the network, and producing a confusing error path.

The two services ship independently, so the allow-list could drift. A client list narrower than the backend's is a UX regression (rejecting files the server would accept). A client list broader than the backend's is a worse UX regression (apparent acceptance, server rejection, confusing error).

## Decision

`src/lib/attachments.ts` is a single source of truth for the client's pre-upload validation:

```ts
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export function describeUploadRejection(file: File): string | null { ... }
```

The values **mirror** carbtrack-au's enforcement exactly. The treatment is:

- `<input accept>` is set from `ALLOWED_MIME` so the OS picker filters first.
- `describeUploadRejection(file)` runs before any network call and returns a user-friendly message for size or type mismatches.
- The backend remains the source of truth — the client guard is a UX optimization, not a security boundary.

## Alternatives Considered

**1. No client validation, rely on backend rejection**
Rejected — turns every wrong-file mistake into a 30-second upload-then-fail loop, which is brutal on tablet-grade upload speeds.

**2. Fetch the allow-list from a backend endpoint**
Rejected — adds a startup round trip for a value that changes once a year. Mirroring in code is fine if both files are updated in the same change set.

**3. Maintain a richer client list (e.g. accept GIF) and translate before upload**
Rejected — the backend would still reject after translation, and we'd own a transcoding pipeline on the client.

## Consequences

- `src/lib/attachments.ts` and carbtrack-au's `app/routers/attachments.py` constants must be updated together. PR descriptions for either side should mention the other when changing the list.
- HEIC pre-upload sniffing is best-effort: Silk has been observed reporting empty `file.type` for some HEIC variants. The current reliance on the picker's `accept` filter plus the backend allow-list is acceptable; a magic-byte sniff was raised by `silent-failure-hunter` review and deferred until there's evidence Silk produces this case in practice.
- The cap is enforced in two places (file size pre-check, plus implicit FastAPI/Uvicorn body limit). Both stay at 15 MB; raising one without the other is wrong.
