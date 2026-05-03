# ADR-010: Date-based IDs for CR / ISS / PIR / ENH

**Date:** 2026-05-03
**Status:** Accepted

## Context

Tracking documents (`CHANGE-REGISTER.md`, `ISSUES.md`, post-incident reviews, enhancement requests) need stable, unique IDs so other docs and commits can reference them. The obvious approach is sequential numbering (`CR-001`, `CR-002`, …).

Sequential numbering has a real failure mode in this homelab workflow: two parallel branches both add the next entry to the tracking doc. Each opens a PR claiming `CR-NNN`, and the second to merge produces a Git conflict on every line in between. Even with conflict resolution, two CRs end up holding the same ID until someone notices and renumbers, which then breaks any references that already shipped.

This has burned the homelab repos before — the global `~/.claude/CLAUDE.md` documents the migration away from sequential IDs.

## Decision

All tracking IDs in this repo use the format `<PREFIX>-YYMMDD-<slug>`:

- `CR-YYMMDD-<branch-slug>` — change register entries (strip `feature/` from the branch name).
- `ISS-YYMMDD-<topic>` — issues, with a kebab-case topic.
- `PIR-YYMMDD-<topic>` — post-incident reviews, one per incident date.
- `ENH-YYMMDD-<topic>` — enhancement requests.
- Hotfixes: `<PREFIX>-YYMMDD-hotfix-<topic>`.

Letter suffixes (`-a`, `-b`, …) handle same-date slug collisions: `ISS-260319-dns-a`, `ISS-260319-dns-b`.

ADRs in this register are an **explicit exception** — they use sequential `ADR-NNN` numbering to match the homelab convention (`~/Code/hacs/Mikrotik/docs/decisions/`). ADRs are append-only, low-volume, and rarely added in parallel branches, so the conflict mode that motivates date-based IDs doesn't really apply.

## Alternatives Considered

**1. Sequential IDs (`CR-001`, `ISS-001`, …)**
Rejected — merge-conflict failure mode described above, observed in practice.

**2. UUID or short random IDs**
Rejected — unreadable, no chronological hint, and a UUID in a commit message is harder to remember and reference than `CR-260503-4-phase4-attachments`.

**3. Year-only counters (`CR-2026-001`)**
Rejected — same conflict mode as plain sequential, just with a year prefix.

## Consequences

- IDs sort chronologically when listed alphabetically. Useful for finding "what changed around date X".
- Two writers on the same day must coordinate via the slug (or land a letter suffix). Friction is real but rare; sequential's friction was rare *and* destructive.
- Same convention is used in the carbtrack-au repo, the meta `config` repo, and the HA config repo — moving between them keeps the same mental model.
- Migration history (where applicable) is tracked per-repo in `docs/ISSUES.md` under the topic `id-migration`. carbtrack-tablet started fresh with this convention so no migration is needed here.
