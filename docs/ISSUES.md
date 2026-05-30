# Issues — CarbTrack Tablet

Date-based IDs only: `ISS-YYMMDD-<topic>`. Append a letter if multiple issues
land on the same date with similar slugs.

## In-flight

> Active line of work + next-session prompt. Overwritten by session-end each session
> so it survives beyond the 2-handoff window session-start reads. Recoverable here alone.

_None recorded yet._

## Open

### ISS-260503-stale-cache-no-eviction
**Severity:** Low
**Surfaced by:** Phase 5 code review.
**Symptom:** `hydrateRecipeSummaries([])` (and `hydrateFoods([])`) early-return
on empty API responses, so a server-side delete leaves stale rows in the
Dexie cache. Library reports `source="api"` while rendering ghost rows.
**Plan:** When the API returns `[]` for a list query, replace the cache (or
diff-delete) instead of skipping the write. Mirrors the same gap in
`useFoodSearch` (Phase 2 Gap 2). Fix both together in a follow-up.

### ISS-260503-caption-sync-stuck-pending
**Severity:** Med
**Surfaced by:** Phase 5 silent-failure-hunter on Phase 4 fix.
**Symptom:** `AttachmentTile`'s caption sync-from-server effect skips while
`captionMutation.isPending` is true. If a PATCH gets wedged (network black
hole, no abort/timeout), the skip persists and the user can't see
server-side caption changes from another tab until they edit again.
**Plan:** Add a request timeout (AbortSignal.timeout) to the caption PATCH
or release the sync skip after N seconds with a "still saving…" indicator.
TanStack Query's default `retry: false` for mutations means a 5xx already
flips `isPending` to false, so the realistic risk is narrow — but worth
closing.

## Closed
<!-- ISS-YYMMDD-topic entries added as issues are resolved -->
