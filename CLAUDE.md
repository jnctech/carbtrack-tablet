# CLAUDE.md — CarbTrack Tablet

## Project Purpose
CarbTrack Tablet is a PWA for Fire HD 10 (Silk browser) that lets users build
and track recipes using carbtrack-au as the food data backend.
`carbs_per_100g` is the hero metric — same as the API it consumes.

## Tech Stack
**Vite 7** | **React 19** | **TypeScript** (strict) | **Tailwind v4** |
**shadcn/ui (Zinc)** | **TanStack Query + Router** | **Dexie** |
**react-hook-form + zod** | **vite-plugin-pwa**

## AI Assistant Usage
| Context | Model | Rationale |
|---|---|---|
| All development | Claude Opus 4.6 | Max plan — Opus end-to-end avoids drift |

## Hard Constraints
1. **Data**: Never write carb values locally — always derived from carbtrack-au API.
   Serve from Dexie cache only after a successful API hydration.
2. **No soft-delete bypass**: Respect `active=false` from API — never show inactive foods.
3. **Secrets**: `VITE_API_BASE_URL` and `VITE_API_TOKEN` in `.env` only — never hardcode.
4. **Quality Gates**: Zero `tsc --noEmit` errors (strict), zero ESLint errors, ≥80%
   Vitest coverage, SonarCloud Grade A (project: `jnctech_carbtrack-tablet`, org: `jnctech`,
   target branch: `develop`). All GitHub Actions SHA-pinned.
5. **Commits**: Conventional commits with scope.
   AI-assisted: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`.

## Branch Strategy
| Branch | Purpose |
|---|---|
| `main` | Stable, deployable |
| `develop` | Active development — SonarCloud analysis target |
| `feature/*` | Short-lived, branch off `develop` |

PRs target `jnctech/carbtrack-tablet` branch `develop` — never upstream.

## Common Commands
* **Dev**: `npm run dev`
* **Build**: `npm run build && npm run preview`
* **Lint**: `npm run lint` + `npm run typecheck`
* **Test**: `npm run test` (watch) / `npm run test:ci` (CI, with coverage)

## Session Protocol
* **Start**: run `/session-start`
* **End**: run `/session-end` → writes handoff to `~/Code/handoffs/YYYY-MM-DD-carbtrack-tablet-<topic>.md`

## Internal Documentation
`docs/internal/` — gitignored. Spec, delivery plan, CI/CD guide.

## Reference Docs (read when relevant)
* `docs/internal/DELIVERY-PLAN.md` — Phase 0–7 breakdown
* `docs/internal/ai-review-workflow.md` — Pre-PR checklist, review audit trail, change register process
* `docs/internal/architecture.md` — component tree, API client, Dexie schema, icon registry
* `docs/CHANGE-REGISTER.md` — CR-YYMMDD-slug entries
* `docs/ISSUES.md` — ISS-YYMMDD-topic entries
* `docs/decisions/` — ADRs (sequential ADR-NNN — see ADR-010 for why ADRs are the exception to date-based IDs)

## oob inbox — check on session start
This repo participates in the estate relay mailbox (a shared, git-controlled tree at `~/oob`). On session start, check for
messages addressed to you:
- `ls ~/oob/mailbox/to-carbtrack-tablet/` — your unread inbox (empty = clear).
- Read any relay found, action it, then `git mv` it to `~/oob/mailbox/read/` and commit **by path** (never `git add -A`).
- Ground in `~/oob/standards/DOCTRINE-oob-operating-concepts.md` and `~/oob/mailbox/README.md` before writing back.

Your canonical slug is `carbtrack-tablet` — spell it verbatim (a mismatched `ls` path = a missed message). **You share a
vantage card with the backend** (`~/oob/prompts/vantages/PROMPT-vantage-carbtrack.md` covers the family) **but NOT an
inbox**: `to-carbtrack-au/` is the backend's and is not yours to read or action. The two repos also differ — `carbtrack-au`
is PRIVATE with default branch `main`; this repo is PUBLIC with default branch `develop`. Never infer one's state from the
other. Onboarded 2026-07-21 per `~/oob/registry/STANDARD-repo-agent-onboarding-2026-07-02.md`.
