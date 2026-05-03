# ADR-004: No shared route-tree builder for TanStack Router

**Date:** 2026-05-03
**Status:** Accepted

## Context

The route tree is declared in two places that need to stay in sync:

1. `src/router.tsx` — the production router that mounts in `main.tsx`.
2. `src/test/renderWithRouter.tsx` — a per-test router built with the routes under test, so route-aware components (those using `useParams`, `Link`, `navigate`, `validateSearch`) can be unit-tested.

Phase 4 attempted to extract a shared `buildRouteTree(rootRoute, components)` helper to eliminate the duplicated child-route literals. Each new route currently requires changes in both files and there's a real risk of drift.

## Decision

**Keep the duplication.** Both files declare the TanStack Router child-route literals separately. No shared builder.

The Phase 4 attempt was reverted after surfacing a hard inference problem.

## Alternatives Considered

**1. Generic `buildRouteTree<TRoot, TChildren>(...)` helper**
Attempted in Phase 4 — *rejected*. TanStack Router's typed `Register` interface (the mechanism that gives `<Link to="/recipes/$recipeId">`, `navigate({to, params})`, and `validateSearch` their compile-time checking) requires the child-route declarations to flow as **literals** through `createRouter({ routeTree })`. Routing them through a generic builder erased the inference: `to` accepted any string, `params` lost its keys, and `validateSearch` stopped enforcing its zod schema. The DX cost outweighed the duplication cost.

**2. Code generation from a shared schema file**
Rejected — adds a build step and a generated artifact to maintain. The value isn't there for a project this size.

**3. File-based routing (TanStack Router's CLI mode)**
Rejected for now — would require restructuring `src/routes/` to match the CLI's file conventions and re-doing the test harness. Reasonable to revisit in Phase 7 polish, but not load-bearing.

## Consequences

- Adding a route requires updating two files. The test harness reminds you, since route-aware tests fail loudly if a route is missing.
- A linter rule or a code-review check could flag the divergence; not added yet, ISSUES.md is the right place if drift bites.
- Revisit if TanStack Router ships a typed builder pattern, or if the project moves to file-based routing.
