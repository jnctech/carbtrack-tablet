# ADR-002: Dexie cache trusted only after API hydration

**Date:** 2026-05-03
**Status:** Accepted

## Context

The tablet is a PWA on a Fire HD 10 that may be online intermittently. A naive cache-first strategy ("show Dexie data immediately, refresh in background") would be fast but lets stale `carbs_per_100g` values influence recipe saves. Carb data drives diet decisions — a value that's three weeks out of date because the device has been offline is worse than a loading spinner.

There's also a subtler failure mode: if Dexie is treated as authoritative on cold start, a backend soft-delete (`active=false`) won't propagate until the user happens to trigger a hydrating query. The user could keep building recipes around a discontinued product.

## Decision

Dexie reads are layered into the UI only after a successful hydration call has completed in the current session. The pattern, implemented in `useFoodSearch`:

1. `useLiveQuery(getCachedFoodsByQuery)` runs against Dexie continuously.
2. A parallel TanStack Query calls `searchFoods(q)`, parses with Zod, and on success calls `hydrateFoods(results)` to upsert into Dexie with a fresh `cached_at`.
3. The UI shows a loading state until the API query has resolved at least once. Cached rows then appear via `useLiveQuery` and remain available during subsequent typing.

`getCachedFoodsByQuery` filters `active=false` at read time — soft-deletes are respected even from cache.

## Alternatives Considered

**1. Cache-first, refresh in background (stale-while-revalidate)**
Rejected — produces a flicker (cached row → updated row) and lets a stale `carbs_per_100g` participate in a recipe save if the user is fast enough.

**2. No local cache, always fetch**
Rejected — typing latency on Silk over a slow connection becomes painful, and there's no offline grace at all.

**3. TTL-based cache (treat rows as fresh if `cached_at` < N minutes)**
Rejected — TTL tuning is a moving target and doesn't address the soft-delete propagation problem. The session-scoped hydration gate is simpler and stricter.

## Consequences

- Cold-start UX has a brief loading state instead of an instant cached render. Acceptable for a kitchen-bench tool.
- Cache acts purely as a typing-latency accelerator and offline-grace buffer, not as a fallback truth source.
- Stale-cache eviction (removing rows that drop out of API results) is still deferred — see Phase 2 Gap 2 in `docs/internal/phase2-spec.md`. The current model overretains rather than under-retains, which is the safer direction.
- `useLiveQuery` errors currently swallow to `[]`. Surfacing them is deferred (Phase 2 Gap 3) but should be revisited if Dexie corruption becomes a real failure mode.
