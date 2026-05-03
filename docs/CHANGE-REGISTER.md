# Change Register — CarbTrack Tablet

Date-based IDs only: `CR-YYMMDD-<branch-slug>`. Append a letter (`-a`, `-b`) if
multiple CRs land on the same date with similar slugs.

## CR-260503-3-phase3-recipe-builder
**Date:** 2026-05-03
**Branch:** `feature/phase3-recipe-builder`
**Summary:** Phase 3 — recipe builder, custom-weight modal, edit mode.
- New typed API helpers in `src/lib/api.ts`: `listRecipes`, `getRecipe`,
  `createRecipe`, `updateRecipe`, `calculateRecipe` — all zod-validated
  against new schemas in `src/lib/schemas.ts` (RecipeSummary, RecipeDetail,
  CalculateResult, RecipeWrite, IngredientView, AttachmentView).
- `ApiError` gains `kind: "http" | "schema" | "network"` discriminator
  (Phase 2 deferred Gap 1). `apiFetch` wraps fetch `TypeError` as
  `kind: "network"`, schema mismatches throw `kind: "schema"`. Existing
  call sites compatible — `kind` defaults to `"http"`.
- `apiFetch` auto-sets `Content-Type: application/json` for body requests
  and returns `undefined` for 204 responses.
- `src/components/WeightModal.tsx` — native `<dialog>` modal with grams
  input, validation (1–5000g), preset chips (50g / 100g / 1 serving when
  `serving_size_g` is set on the food). `useId` for label association.
- `src/routes/RecipeBuilder.tsx` — react-hook-form + `useFieldArray`
  builder used in both new and edit modes. Inline ingredient picker
  reuses `useFoodSearch` + calls `getFood` on pick to fetch
  `serving_size_g` for the WeightModal preset. Live carb total via
  debounced `/recipes/calculate` with client-side estimate fallback
  badged "(estimated — could not refresh)" on API failure. Save uses
  POST/PUT depending on mode; new-mode success navigates to
  `/recipes/$recipeId`.
- `src/routes/recipeRoutes.tsx` — thin route screens forward params/
  search to `RecipeBuilder`.
- `src/router.tsx` — `/recipes/new` (replaces stub) + new
  `/recipes/$recipeId` dynamic route.
- `src/lib/db.ts` — `hydrateRecipeSummaries` + `getCachedRecipeSummaries`
  (pinned-first, alpha-sorted). Uses existing Phase 2 `recipeSummaries`
  table — no schema bump.
- `.gitignore` — added `.claude/` (per-machine session state).
- Tests: **73 passing — 97.09% statements / 88.49% branches / 95.45%
  functions / 97.59% lines**.
- Pre-PR review trail (per `docs/internal/ai-review-workflow.md`):
  - `/simplify` (3-agent reuse + quality + efficiency sweep) — 3 fixes:
    extracted `resolveTotalSource()` helper, declarative serving preset
    array spread, collapsed pinned/name sort to a single comparator.
  - `pr-review-toolkit:silent-failure-hunter` — 2 fixes: surface
    `seedQuery.error` inline, gate `detailQuery` reset with
    `detailLoadedRef` so background refetch can't blow away unsaved
    edits. Low-severity seed-remount race deferred.
  - `pr-review-toolkit:code-reviewer` — 2 fixes (#1 and #2 above) plus
    fixed `IngredientPicker` so picked rows fetch the full food (gets
    `serving_size_g` for the modal preset) and "already added" feedback
    surfaces in the picker. False-alarm finding about a Dexie schema
    migration (recipeSummaries was already in v1) noted and dismissed.

**Deferred for later phases:**
- Foods stale-cache eviction (Phase 2 Gap 2).
- `useLiveQuery` error surfacing (Phase 2 Gap 3).
- Indexed cache lookup for foods (Phase 2 Gap 5).
- Attachments + notes-with-photo (Phase 4).
- Recipe library screen + thumbnail rendering (Phase 5) —
  `hydrateRecipeSummaries` is wired so cache will be warm on arrival.

**Status:** Staged

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
