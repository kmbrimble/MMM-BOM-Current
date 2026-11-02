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

## Forge (changed 2 Nov 2026)

**Gitea is primary; GitHub is a read-only push mirror and must never be pushed to directly** (the mirror force-syncs and prunes refs; Gitea syncs on every push and every 10 minutes).
Work on `https://git.kiztigs.com/kmbrimble/MMM-BOM-Current` (`origin`, gt credential helper); use `gt`, not `gh`, for issues and PRs. `master` is protected: PR + the green `CI / check (pull_request)` check
(`.gitea/workflows/ci.yml`); butler-bot merges its own green PRs. GitHub has Issues, Wiki, Projects, Discussions and PRs switched off. The reason this repo stays public on GitHub is that magicmirror2
consumes it as a submodule through its GitHub URL (see below), and so that others can clone the module.

## How this repo is consumed

This module is a **git submodule** of [kmbrimble/magicmirror2](https://git.kiztigs.com/kmbrimble/magicmirror2)
(at `modules/MMM-BOM-Current`), which is the MagicMirror² instance behind the household kiosk's left pane.
That parent pins a specific commit of this repo; the wall display runs whatever the parent
points at, not this repo's `master`.

**A change here is not deployed until the parent's pointer is bumped.** The flow is:

1. Change it on a branch here, push the branch **to Gitea**, open a PR (`gt pr create`); butler-bot merges it when the required `CI / check (pull_request)` is green. (Direct pushes to `master` are rejected.)
2. **Wait for the mirror to deliver the merge commit to GitHub**: `git ls-remote https://github.com/kmbrimble/MMM-BOM-Current.git refs/heads/master` must equal Gitea's (seconds, at most 10 minutes). magicmirror2's `.gitmodules`
   URL, and therefore the live host checkout's `git submodule update`, fetch this module from **GitHub**, so a commit that is not mirrored yet cannot be deployed.
3. In the magicmirror2 checkout: `git -C modules/MMM-BOM-Current fetch origin && git -C modules/MMM-BOM-Current checkout <sha>`, then
   `git add modules/MMM-BOM-Current` and commit ("Bump MMM-BOM-Current to <sha>: ...") via a magicmirror2 PR.
4. Deploy per magicmirror2's CLAUDE.md: pull the live clone,
   `git submodule update --init --recursive`, `docker restart MagicMirror`.

Merge this repo (and let it mirror) before merging the parent bump — a parent pointing at a commit that isn't on
GitHub yet breaks the live host checkout and every other clone.

## Testing

Gitea CI (`.gitea/workflows/ci.yml`) is the required gate: syntax check of every JS file, the module's own self-checks, and a load of `node_helper.js` against a stubbed MagicMirror. There is no unit test suite beyond that. The parent's Playwright e2e suite
(`test/e2e/run.sh` in magicmirror2) runs this module against fixture data at the kiosk's real
1720x1440 resolution with a screenshot baseline — run it from a magicmirror2 checkout whose
submodule is on your working commit before bumping the pointer. The physical kiosk display is
still the final visual check.

## Constraints

- Keep the module standalone-installable: no dependency on anything in the parent repo
  (config values come from `config.js` via the normal MagicMirror `config` object).
- Don't commit runtime or secret files; this repo's `.gitignore` is what protects them once
  it's a submodule — the parent's ignore rules do not reach inside.
