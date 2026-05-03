# ADR-001: Zod schemas as the API boundary contract

**Date:** 2026-05-03
**Status:** Accepted

## Context

CarbTrack Tablet consumes carbtrack-au, a separately versioned FastAPI backend. The two repos ship independently, so the tablet has no compile-time guarantee that a `/foods/{id}` response matches the shape the UI expects. Hand-written TypeScript interfaces over `fetch()` would let a backend rename or type change land silently and corrupt the Dexie cache, where the bad shape would persist across sessions.

The hero metric is `carbs_per_100g` — a single wrong value reaching a recipe save would propagate into the user's diet log. Boundary safety isn't theoretical here.

## Decision

Every response from carbtrack-au is parsed through a Zod schema in `src/lib/schemas.ts` before reaching application code. TypeScript types are derived via `z.infer` — never hand-written. A shared `parseOrThrow(schema, data)` helper in `src/lib/api.ts` runs the parse and throws an `ApiError` with `kind: "schema"` on mismatch (see ADR-003).

Every API helper (`searchFoods`, `getFood`, `listRecipes`, `getRecipe`, `createRecipe`, `updateRecipe`, `calculateRecipe`, `uploadAttachment`, `patchAttachment`, `deleteAttachment`) follows the pattern: `fetch → res.json() → parseOrThrow(SchemaName, data) → typed return`.

## Alternatives Considered

**1. Hand-written TypeScript interfaces with `as` casts**
Rejected — gives no runtime check. A backend shape drift would cache silently and fail somewhere far from the boundary, with a useless `Cannot read property 'x' of undefined` stack trace.

**2. OpenAPI codegen from a carbtrack-au spec**
Rejected for now — adds a build-time dependency on a spec file that doesn't yet exist, and codegen tools either produce verbose runtime validators (essentially Zod with extra steps) or no validators at all. Revisit if carbtrack-au publishes an OpenAPI doc.

**3. tRPC or a shared types package**
Rejected — would require coupling the two repos at the build level, defeating the independent-deploy property.

## Consequences

- Every new endpoint requires a schema definition first. No back doors via `fetch().then(r => r.json() as Foo)`.
- Schema drift between backend and tablet produces a hard, named error at the call site instead of garbage data in the cache.
- Bundle cost: Zod ~12KB gzipped — accepted.
- Phase 4 surfaced one regression (carbtrack-au's recipes router omits `recipe_id`/`created_at` from `_attachment_view` while the attachments router includes them). The schema caught it as a mismatch; resolved by marking those fields optional. A pinned-fixture regression test is queued for Phase 5 to detect future drift earlier.
