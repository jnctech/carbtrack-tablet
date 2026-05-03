# ADR-003: ApiError carries a `kind` discriminator

**Date:** 2026-05-03
**Status:** Accepted

## Context

The original `ApiError` carried only an HTTP status code. Three different failure modes were collapsing into the same shape:

1. **HTTP errors** — backend returned 4xx/5xx (`status: 404`).
2. **Schema errors** — backend returned 200 with a payload that didn't match the Zod schema (no natural status to attach).
3. **Network errors** — `fetch()` threw a `TypeError` because the device is offline or the proxy is down (no status at all).

Callers couldn't distinguish "the server said your request was bad" (don't retry, show validation message) from "we couldn't reach the server" (retry, show offline indicator) from "the server returned garbage" (don't retry, this is a deploy-coordination bug, alert loudly).

## Decision

`ApiError` carries a `kind: "http" | "schema" | "network"` discriminator alongside the status field:

- `kind: "http"` — HTTP error response. `status` is the actual response status (default if unset, for backwards compatibility).
- `kind: "schema"` — Zod parse failure. `status` is `0`. The Zod issue list is attached for diagnostics.
- `kind: "network"` — `fetch()` threw. `apiFetch()` catches `TypeError` and rewraps as this kind. `status` is `0`.

The `kind` field defaults to `"http"` so existing call sites that branched on `status` continue to work without changes.

## Alternatives Considered

**1. Three separate error classes**
Rejected — every caller would need three `instanceof` checks or a discriminator anyway. The discriminated union does the same job with less ceremony.

**2. Encode mode in the status (e.g. negative numbers)**
Rejected — fragile, surprises anyone reading the stack trace, and breaks if a real HTTP status ever uses an overlapping value.

**3. Leave as-is and let callers parse the message string**
Rejected — string parsing in error handling is a maintenance trap.

## Consequences

- Components can branch on `error.kind` to choose the right UX: validation banner vs. offline indicator vs. "something is broken, refresh" message.
- `useFoodSearch` and recipe-detail flows can suppress retry on `schema` and `http` errors but retry on `network`.
- New callers should always populate `kind` explicitly; the default is for migration only.
- Phase 2's `useFoodSearch` was the original motivating caller; Phase 3's recipe builder and Phase 4's attachments uniformly use the discriminator.
