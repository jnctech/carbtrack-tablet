# Architecture Decision Records

Lightweight records of key design decisions for CarbTrack Tablet.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-zod-api-boundary.md) | Zod schemas as the API boundary contract | Accepted |
| [ADR-002](ADR-002-cache-after-hydration.md) | Dexie cache trusted only after API hydration | Accepted |
| [ADR-003](ADR-003-apierror-kind-discriminator.md) | ApiError carries a `kind` discriminator | Accepted |
| [ADR-004](ADR-004-no-shared-route-tree-builder.md) | No shared route-tree builder for TanStack Router | Accepted |
| [ADR-005](ADR-005-attachment-allowlist-mirror.md) | Client attachment allow-list mirrors carbtrack-au | Accepted |
| [ADR-006](ADR-006-attachment-reorder-rollback.md) | Compensating PATCH on sort_order swap failure | Accepted |
| [ADR-007](ADR-007-same-origin-via-npm.md) | Tablet served same-origin via NPM in production | Accepted |
| [ADR-008](ADR-008-file-picker-only.md) | File picker only, no `<input capture>` mode | Accepted |
| [ADR-009](ADR-009-sonarcloud-ci-only.md) | SonarCloud Automatic Analysis disabled, CI only | Accepted |
| [ADR-010](ADR-010-date-based-tracking-ids.md) | Date-based IDs for CR / ISS / PIR / ENH | Accepted |

## Template

```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by ADR-NNN | Deprecated

## Context
What problem or need prompted this decision?

## Decision
What did we decide, and what are the key design choices?

## Alternatives Considered
What other approaches were evaluated and why were they rejected?

## Consequences
What are the trade-offs, risks, and follow-on constraints?
```

## Notes

- ADRs are **immutable once accepted** — never edit a decision after the fact. If the decision changes, create a new ADR marked "Supersedes ADR-NNN" and update the old one to "Superseded by ADR-NNN".
- ADR numbering is sequential (matches the homelab convention in `~/Code/hacs/Mikrotik/docs/decisions/`). Other tracking docs in this repo (`CHANGE-REGISTER.md`, `ISSUES.md`) use date-based IDs — see ADR-010 for the rationale.
- ADRs capture *non-obvious* architectural choices with real alternatives. Routine conventions (commit format, branch strategy, model selection) belong in `CLAUDE.md`, not here.
- For tactical work, see `docs/ISSUES.md`. For shipped change history, see `docs/CHANGE-REGISTER.md`.
