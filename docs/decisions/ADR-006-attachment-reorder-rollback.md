# ADR-006: Compensating PATCH on sort_order swap failure

**Date:** 2026-05-03
**Status:** Accepted

## Context

The Phase 4 attachment gallery supports up/down reordering by swapping `sort_order` between two adjacent attachments. The carbtrack-au PATCH endpoint operates on a single attachment at a time, so a swap is two sequential PATCH calls.

The naive implementation was:

```ts
await patchAttachment(a.id, { sort_order: b.sort_order });
await patchAttachment(b.id, { sort_order: a.sort_order });
```

If the second call fails (network blip, 5xx, schema error), the first call's success leaves both attachments holding `b.sort_order`. The gallery then shows two tiles tied at the same position, and the next reorder either picks an arbitrary one or no-ops, depending on Dexie iteration order. The user can't recover without manually editing one attachment's order.

`silent-failure-hunter` flagged this during pre-PR review.

## Decision

Wrap the swap in a try/catch that issues a compensating PATCH on second-call failure to restore the first attachment's original `sort_order`:

```ts
const originalA = a.sort_order;
await patchAttachment(a.id, { sort_order: b.sort_order });
try {
  await patchAttachment(b.id, { sort_order: a.sort_order });
} catch (err) {
  await patchAttachment(a.id, { sort_order: originalA }).catch(() => {});
  throw err;
}
```

The compensating PATCH is best-effort — if it also fails, the original error is still surfaced to the user via the gallery's action-error slot (see ADR on error-slot split, captured implicitly here). The user can refresh to see actual state and reorder again.

## Alternatives Considered

**1. Bulk reorder endpoint accepting the full new ordering**
Preferred long term — single atomic call, no rollback complexity. Not added yet because carbtrack-au would need a new endpoint and the up/down-only UX in Phase 4 doesn't justify it. **Revisit in Phase 5 alongside drag-reorder**, where the full-ordering payload is the natural shape.

**2. Optimistic update with retry queue**
Rejected — increases complexity (queue, conflict resolution) for a UX gain that doesn't exist on a single-user tablet. The user is right there and can simply tap again.

**3. Accept the inconsistency and surface a "broken ordering, please refresh" hint**
Rejected — leaves the database in a wedged state that compounds with each future reorder.

## Consequences

- Reorder is more complex than a two-line swap; the code reads carefully but lives in one place (`AttachmentGallery.tsx`).
- A double-failure (both patches fail) is rare and recoverable by refresh — acceptable.
- When Phase 5 introduces drag-reorder, prefer adding a bulk endpoint to carbtrack-au rather than replicating the rollback pattern across N pairs.
