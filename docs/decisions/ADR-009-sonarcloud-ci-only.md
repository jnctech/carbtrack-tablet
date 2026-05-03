# ADR-009: SonarCloud Automatic Analysis disabled, CI workflow only

**Date:** 2026-05-03
**Status:** Accepted

## Context

SonarCloud offers two analysis paths for a GitHub repo:

1. **Automatic Analysis** — SonarCloud watches the default branch and runs analysis itself, without requiring CI configuration.
2. **CI-based analysis** — a GitHub Actions step (`SonarSource/sonarqube-scan-action`) runs after tests, uploads coverage, and waits on the quality gate.

This repo needs CI-based analysis because we want test coverage uploaded with the scan — Automatic Analysis can't see coverage data. Running both paths simultaneously causes problems:

- The two analyses race; whichever lands second overwrites the first's findings on the SonarCloud project.
- Coverage shows as "0%" intermittently when Automatic Analysis wins the race.
- Doubles the analysis-minute consumption.
- Automatic Analysis runs on every default-branch update; with `develop` as the analysis branch (not `main`), Automatic Analysis adds noise on `main` updates that have no new findings.

## Decision

**Automatic Analysis is disabled** on `jnctech_carbtrack-tablet` in the SonarCloud UI. The `quality-gate.yml` GitHub Actions workflow is the only path that publishes analysis. It runs:

- On pushes to `develop` (the analysis branch).
- On pull requests targeting `develop`.
- Uploads `lcov.info` from `vitest --coverage` for line/branch coverage.
- Waits on the quality gate before the workflow succeeds.

`main` does not get scanned directly — it only receives merged-from-`develop` changes that were already scanned at the PR stage.

## Alternatives Considered

**1. Automatic Analysis only (no CI)**
Rejected — no coverage data, no quality-gate enforcement on PRs.

**2. Both Automatic and CI-based**
Rejected — race condition described above. The Sonar docs themselves warn against running both.

**3. CI-based on `main` instead of `develop`**
Rejected — `develop` is where active development happens (per CLAUDE.md branch strategy), and we want the gate to fire at PR time, not after a `main` merge.

## Consequences

- Analysis only happens via CI. Don't re-enable Automatic Analysis in the SonarCloud UI; it will silently start racing.
- If a new long-lived branch ever needs analysis (e.g. a major version branch), extend `quality-gate.yml` rather than reaching for Automatic Analysis.
- `SONAR_TOKEN` must be configured both as a repo secret and a Dependabot secret — the Dependabot version is required for Dependabot PRs to pass the quality gate.
- Confirmed working: `jnctech_carbtrack-tablet` org `jnctech`, configured in `sonar-project.properties`.
