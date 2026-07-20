# Issues — CarbTrack Tablet

Date-based IDs only: `ISS-YYMMDD-<topic>`. Append a letter if multiple issues
land on the same date with similar slugs.

## In-flight

> Active line of work + next-session prompt. Overwritten by session-end each session
> so it survives beyond the 2-handoff window session-start reads. Recoverable here alone.

**2026-07-21 — repo hygiene + estate onboarding (done); voice-input feature (not started).**

Done this session (no code touched — docs/git only):
- Branch cleanup: deleted `chore/cr-deployed`, `chore/dependabot-ignore-majors`, `feature/scaffold` (all
  patch-equivalent in `develop` per `git cherry`). `main` fast-forwarded to `develop` (was 22 behind) and pushed.
  Stray untracked `AGENTS.md` deleted — it was a mangled `CLAUDE.md` derivative with wrong model names.
- Onboarded to the oob estate mailbox: slug `carbtrack-tablet`, inbox `~/oob/mailbox/to-carbtrack-tablet/`,
  wake pointer added to `CLAUDE.md`. Standards declared at
  `~/oob/registry/standards-intake/STANDARDS-carbtrack-tablet-2026-07-21.md` (oob `9556e9f`).

**Next session — pick up here:**

1. **`ISS-260721-confirm-standards-declaration`** — the declaration was written by the *carbtrack-au* seat, not by
   a tablet session. Read it and fix anything wrong; it is GREY, not ratified.
2. **`ISS-260721-api-token-vs-no-auth`** — `CLAUDE.md` §3 declares the token, but `carbtrack-au` has no auth on any
   endpoint (its ISS-004, still Open). UNVERIFIED; client code untraced. Resolve before any auth design.
   Also open: **`ISS-260721-oob-vantage-card-render`** (oob-side render limitation, not actionable here).
3. **Voice-input feature (new, operator ask 2026-07-21).** Goal: a non-technical family member asks a Google
   speaker *"carb total of 84g strawberries, 70g mango, 3 Jatz biscuits"* and hears the answer. Agreed shape is
   **Home Assistant as the voice front-end** (HA Assist ← Nabu Casa ← Google), calling `carbtrack-au` over LAN —
   so the API never needs public exposure and ISS-004 stays non-blocking. Blockers, in order:
   - **Schema gap:** *"3 Jatz biscuits"* is a count. Nutrition is stored strictly per-100g and there is no
     per-unit weight anywhere. Needs a `grams_per_unit` on the backend. **Nothing works until this lands.**
   - **AI-policy reading:** parsing free text → `{food, qty}` is arguably "query construction" (permitted) but
     that reading is not written down. Retrieval and arithmetic must stay deterministic.
   - **Safety:** this is T1D dosing input. The reply must itemise each food and its contribution, not just a
     total, and must refuse on an unmatched food rather than silently dropping it (null-not-guess).
   - **UNVERIFIED:** Google shut down Conversational Actions for speakers (believed mid-2023), so the HA route
     may be the only surviving path. Confirm against current Google docs before building.
   This repo owns the **only ADR practice in the family** (`docs/decisions/`, 10 ADRs) — `carbtrack-au` has none,
   so the cross-repo decision should probably be written as `ADR-011` here.
4. **Backend deploy gate is open** and affects this feature's data — **cross-repo ID, tracked in `carbtrack-au`,
   not here**: `carbtrack-au` → `ISS-260616-snack-chart-prod-seed`
   — the Snack & Meal chart import is merged but was never seeded to prod, so foods a voice query asks about may
   not exist in the deployed DB.

## Open

### ISS-260721-confirm-standards-declaration
**Severity:** Medium
**Surfaced by:** Estate onboarding, 2026-07-21.
**Symptom:** `~/oob/registry/standards-intake/STANDARDS-carbtrack-tablet-2026-07-21.md`
was written by the **carbtrack-au seat**, not by a tablet session (oob `9556e9f`).
It is GREY / not ratified. A tablet session should read it and confirm or correct
— particularly §5 (quality gate) and §6 (docs), which were derived from reading
`CLAUDE.md` rather than from an actual test/CI run.

### ISS-260721-api-token-vs-no-auth
**Severity:** Medium
**Surfaced by:** Standards declaration cross-check, 2026-07-21.
**Symptom:** `CLAUDE.md` §3 declares `VITE_API_TOKEN`, but `carbtrack-au` has **no
auth on any endpoint** (its ISS-004, open since 2026-03-15). Either this client
sends a token that is silently ignored, or it is dead config.
**UNVERIFIED** — client code not traced. Trace `src/` for where the token is
attached, then either remove it or record it as provisional pending backend auth.
Mirrored as `ISS-260721-api-token-vs-no-auth` in `carbtrack-au`.

### ISS-260721-oob-vantage-card-render
**Severity:** Low
**Surfaced by:** Estate onboarding render, 2026-07-21.
**Symptom:** `~/oob/registry/ONBOARDING-COMPLETENESS.md` renders this repo's
vantage-card cell 🔴 (2/4) because the join is per-slug and looks for
`PROMPT-vantage-carbtrack-tablet.md`, but the family card
`PROMPT-vantage-carbtrack.md` covers both repos. **Render limitation, not a
missing artifact.** oob owns the fix (`decision_surface.onboarding_rows()`):
follow a family/alias, or split the card per slug. Reported in the standards
declaration §7. Not actionable here — close when oob decides.

### ISS-260503-stale-cache-no-eviction
**Severity:** Low
**Surfaced by:** Phase 5 code review.
**Symptom:** `hydrateRecipeSummaries([])` (and `hydrateFoods([])`) early-return
on empty API responses, so a server-side delete leaves stale rows in the
Dexie cache. Library reports `source="api"` while rendering ghost rows.
**Plan:** When the API returns `[]` for a list query, replace the cache (or
diff-delete) instead of skipping the write. Mirrors the same gap in
`useFoodSearch` (Phase 2 Gap 2). Fix both together in a follow-up.

### ISS-260503-caption-sync-stuck-pending
**Severity:** Med
**Surfaced by:** Phase 5 silent-failure-hunter on Phase 4 fix.
**Symptom:** `AttachmentTile`'s caption sync-from-server effect skips while
`captionMutation.isPending` is true. If a PATCH gets wedged (network black
hole, no abort/timeout), the skip persists and the user can't see
server-side caption changes from another tab until they edit again.
**Plan:** Add a request timeout (AbortSignal.timeout) to the caption PATCH
or release the sync skip after N seconds with a "still saving…" indicator.
TanStack Query's default `retry: false` for mutations means a 5xx already
flips `isPending` to false, so the realistic risk is narrow — but worth
closing.

## Closed
<!-- ISS-YYMMDD-topic entries added as issues are resolved -->
