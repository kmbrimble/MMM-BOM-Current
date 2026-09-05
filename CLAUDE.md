# CLAUDE.md — MMM-BOM-Current

MagicMirror² module showing current observations for an Australian Bureau of Meteorology
station (temperature, feels-like, wind, humidity) plus locally computed sunrise / sunset /
civil twilight. Original code, MIT licensed. Full option reference in README.md.

## Layout

- `MMM-BOM-Current.js` — front-end module; renders the observation block and the sun-times
  line. Declares `suntimes.js` via `getScripts()`.
- `suntimes.js` — pure browser-side sunrise/sunset/civil-twilight calculation from
  `config.lat`/`config.lon`; no network. Runnable directly with `node suntimes.js` for a quick
  self-check.
- `node_helper.js` — fetches the BOM station JSON feed with a browser-like User-Agent and
  rate-limits fetches (5-minute floor beneath any configured `updateInterval`; stamps
  `lastFetchTime` only on success so a failed fetch can retry).

## Gotchas

- BOM's servers reject non-browser User-Agents and are sensitive to polling rate — keep the
  rate limiter in `node_helper.js`; do not add a second fetch path that bypasses it.
- The feed URL is per-station (`config.url`); the default `lat`/`lon` are Brisbane and only
  affect the sun times, not the observations.

## How this repo is consumed

This module is a **git submodule** of [kmbrimble/magicmirror2](https://github.com/kmbrimble/magicmirror2)
(at `modules/MMM-BOM-Current`), which is the MagicMirror² instance behind the household kiosk's left pane.
That parent pins a specific commit of this repo; the wall display runs whatever the parent
points at, not this repo's `master`.

**A change here is not deployed until the parent's pointer is bumped.** The flow is:

1. Commit and push here (`master`).
2. In the magicmirror2 checkout: `git -C modules/MMM-BOM-Current pull origin master`, then
   `git add modules/MMM-BOM-Current` and commit ("Bump MMM-BOM-Current to <sha>: ...") and push.
3. Deploy per magicmirror2's CLAUDE.md: pull the live clone,
   `git submodule update --init --recursive`, `docker restart MagicMirror`.

Push this repo before pushing the parent bump — a parent pointing at a commit that isn't on
GitHub breaks every other clone.

## Testing

There is no unit test suite in this repo. The parent's Playwright e2e suite
(`test/e2e/run.sh` in magicmirror2) runs this module against fixture data at the kiosk's real
1720x1440 resolution with a screenshot baseline — run it from a magicmirror2 checkout whose
submodule is on your working commit before bumping the pointer. The physical kiosk display is
still the final visual check.

## Constraints

- Keep the module standalone-installable: no dependency on anything in the parent repo
  (config values come from `config.js` via the normal MagicMirror `config` object).
- Don't commit runtime or secret files; this repo's `.gitignore` is what protects them once
  it's a submodule — the parent's ignore rules do not reach inside.
