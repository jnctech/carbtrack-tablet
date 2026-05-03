# ADR-007: Tablet served same-origin via NPM in production

**Date:** 2026-05-03
**Status:** Accepted

## Context

The tablet PWA needs to call carbtrack-au at runtime. Two deployment shapes are viable on the existing homelab:

1. **Cross-origin** — tablet served from one host (or path), API on another. Requires CORS configuration on carbtrack-au, including credential handling for the API token, and an explicit origin allow-list to maintain.
2. **Same-origin** — both tablet and API live behind the same Nginx Proxy Manager (NPM) host, distinguished by path or subdomain.

The homelab already runs NPM as the front door for several services. carbtrack-au sits behind it today.

## Decision

The deployed tablet is served same-origin via NPM. The same NPM host that fronts carbtrack-au will also serve the tablet PWA's static bundle. No CORS configuration is added to carbtrack-au.

Concretely (Phase 6 will wire this up):

- NPM exposes the tablet at e.g. `tablet.<homelab-domain>` or `<carbtrack-host>/tablet`.
- `/api/*` and `/attachments/*` proxy to the carbtrack-au container.
- Static PWA assets are served from a tablet container (Nginx serving the Vite build output) on the same host, under the same origin.

In development, the Vite dev server proxies `/api` and `/attachments` to carbtrack-au — this matches production semantics and keeps the tablet code origin-agnostic (no `VITE_API_BASE_URL` switching between same-origin and absolute).

## Alternatives Considered

**1. Cross-origin with CORS on carbtrack-au**
Rejected — adds an origin allow-list to maintain across deploy targets, requires `credentials: "include"` plumbing for the API token, complicates cookie/auth choices later, and contributes nothing the homelab user can perceive.

**2. Tablet bundled and served from carbtrack-au directly (FastAPI StaticFiles)**
Rejected — couples the deploy of two codebases and slows carbtrack-au's release cadence. NPM is the natural seam.

**3. Cloudflare Pages or similar external static host**
Rejected — adds an external dependency and a CORS surface for a single-household app that the homelab can host trivially.

## Consequences

- carbtrack-au keeps zero CORS configuration. Adding any cross-origin client later requires explicit reconsideration.
- API auth lives at the NPM proxy layer. The tablet's production bundle has no embedded token (`VITE_API_TOKEN` is dev-only).
- Phase 6 owns the NPM rewrite rules, the tablet container image, and the path/subdomain decision.
- Service worker scope must match the chosen URL shape — if the tablet ends up at `<host>/tablet`, the SW scope and PWA manifest `start_url` need to match.
