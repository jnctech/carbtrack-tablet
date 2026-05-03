# CarbTrack Tablet

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=jnctech_carbtrack-tablet&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=jnctech_carbtrack-tablet)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=jnctech_carbtrack-tablet&metric=coverage)](https://sonarcloud.io/summary/new_code?id=jnctech_carbtrack-tablet)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=jnctech_carbtrack-tablet&metric=bugs)](https://sonarcloud.io/summary/new_code?id=jnctech_carbtrack-tablet)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=jnctech_carbtrack-tablet&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=jnctech_carbtrack-tablet)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=jnctech_carbtrack-tablet&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=jnctech_carbtrack-tablet)

A Progressive Web App for Fire HD 10 (Silk browser) that lets users build and
track recipes against the [carbtrack-au](https://github.com/jnctech/carbtrack-au)
food database.

## Stack
Vite 7 · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (Zinc) ·
TanStack Query/Router · Dexie · react-hook-form + zod · vite-plugin-pwa

## Quickstart
```bash
npm install
cp .env.example .env       # set VITE_API_BASE_URL / VITE_API_TOKEN
npm run dev
```

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint over all `.ts`/`.tsx` |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run test` | Vitest in watch mode |
| `npm run test:ci` | Vitest run with v8 coverage (≥80% gate) |

## Quality gates
- Zero `tsc --noEmit` errors (strict)
- Zero ESLint errors
- ≥80% Vitest line/branch/function/statement coverage
- SonarCloud Grade A on `develop`
- All GitHub Actions SHA-pinned

## Branches
`main` (stable) · `develop` (active, SonarCloud target) · `feature/*` (short-lived)

PRs target `jnctech/carbtrack-tablet` → `develop`. Never upstream.

## Documentation
- `CLAUDE.md` — operating contract for AI-assisted work
- `docs/CHANGE-REGISTER.md` — every change tracked as `CR-YYMMDD-slug`
- `docs/ISSUES.md` — open/closed issues as `ISS-YYMMDD-topic`
- `docs/internal/` — gitignored; spec, delivery plan, architecture
