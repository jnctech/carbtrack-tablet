# Change Register — CarbTrack Tablet

Date-based IDs only: `CR-YYMMDD-<branch-slug>`. Append a letter (`-a`, `-b`) if
multiple CRs land on the same date with similar slugs.

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
