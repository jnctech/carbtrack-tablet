# ADR-008: File picker only, no `<input capture>` mode

**Date:** 2026-05-03
**Status:** Accepted

## Context

The tablet target is a Fire HD 10 running the Silk browser, used on a kitchen bench. Recipe attachments are typically photos the user has already taken on a phone (and can transfer via cloud sync) or photos they take in-flight.

HTML offers `<input type="file" accept="image/*" capture="environment">` to bias the OS into opening the camera directly. On Silk, this attribute's behaviour has historically been inconsistent across versions — sometimes opening the camera, sometimes the gallery, sometimes a chooser that includes both. Adding a separate "take photo" path on top of "pick photo" doubles the UI surface and the test matrix.

## Decision

Attachment uploads use a single `<input type="file" accept="<allowlist>" multiple>` file picker. No `capture` attribute. The user takes the photo with whatever device/app they prefer and picks it from the gallery.

## Alternatives Considered

**1. Camera-first via `capture="environment"`**
Rejected — Silk inconsistency. Introduces a UX path that's correct on some Fire HD firmware versions and wrong on others. Not worth the QA burden for a single-household app.

**2. Two buttons: "take photo" (capture) and "pick photo" (no capture)**
Rejected — doubles the UI for a feature the user can already achieve in two taps via the system camera + the existing picker.

**3. WebRTC `getUserMedia()` for in-app camera**
Rejected — substantial complexity (preview rendering, capture, focus, permissions UX, tablet orientation handling) for marginal gain over the OS camera. Silk's `getUserMedia` support is also patchy.

## Consequences

- The gallery picker is the only entry point. Validation is consistent (single code path through `describeUploadRejection`).
- No requirement for camera permission prompts or media-stream handling.
- Reconsider when a camera-first device (a phone install, for example) becomes the primary target. At that point a separate `<input capture>` button could be added without disturbing the picker path.
