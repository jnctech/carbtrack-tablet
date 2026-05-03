# Change Register — CarbTrack Tablet

Date-based IDs only: `CR-YYMMDD-<branch-slug>`. Append a letter (`-a`, `-b`) if
multiple CRs land on the same date with similar slugs.

## CR-260503-2-api-cache-search
**Date:** 2026-05-03
**Branch:** `feature/phase2-api-cache-search`
**Summary:** Phase 2 — typed API client + Dexie cache + ingredient search.
- Zod `FoodSchema` (`src/lib/schemas.ts`) as single source of truth for
  parsing carbtrack-au food responses.
- `searchFoods(q, opts)` and `getFood(id, opts)` in `src/lib/api.ts` —
  zod-validated via shared `parseOrThrow`, throw `ApiError` on shape
  mismatch (status 0).
- Dexie hydration: `hydrateFoods` (bulk upsert with `cached_at`) and
  `getCachedFoodsByQuery` (case-insensitive, active=true only,
  alpha-sorted) in `src/lib/db.ts`.
- `useFoodSearch` cache-first hook combining `useLiveQuery` with a
  parallel TanStack Query that hydrates on success.
- `/search` route screen with a 250ms debounced input and `FoodIcon`
  result rows, linking to a `/recipes/new` Phase 3 stub seeded with
  the food id. Index page is now a CTA into search.
- Tests: 44 passing, 99% statements / 91% branches / 100% functions.
- Pre-PR review trail: `/simplify`, `silent-failure-hunter`,
  `code-reviewer` — all findings either fixed or deferred with a note
  in the PR body (ApiError discriminator deferred to Phase 3).

**Deferred for Phase 3:**
- `ApiError` `kind` discriminator (http/schema/network) — useFoodSearch
  is the only caller and works fine with `status: 0` for schema errors.
- Stale-cache eviction when foods drop from API results.
- Surfacing `useLiveQuery` errors (currently defaults to `[]`).

**Status:** Deployed (merged 2026-05-03 as `6ddf5eb`, PR #19)

## CR-260503-1-scaffold
**Date:** 2026-05-03
**Branch:** `feature/scaffold`
**Summary:** Initial repo scaffold — Vite 7 + React 19 + TypeScript strict +
Tailwind v4 + shadcn/ui (Zinc tokens) + TanStack Query/Router + Dexie +
react-hook-form + zod + vite-plugin-pwa. `<FoodIcon>` registry seeded with
the 21 icon_keys live in carbtrack-au prod. Governance scaffold: CLAUDE.md,
docs/CHANGE-REGISTER.md, docs/ISSUES.md, docs/internal/ (gitignored). CI:
Gitea inner loop + GitHub outer (quality-gate / scorecard / dependency-review),
dependabot, sonar-project.properties (`jnctech_carbtrack-tablet`).
**Status:** Deployed (merged 2026-05-03 as `c0ad4c1`, PR #1)
