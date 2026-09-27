# Dead Miles - notes for Claude

## Source of truth: THIS repo, for now
Until the owner syncs it, **this repo (dead-miles) is ahead of the private autostudy repo's `games/` folder**. autostudy stops at v7.53, and this repo has v7.54+.

- Make game changes here: bump `VERSION` in game.js, `?v=` in index.html, and `version.txt`, and add a `NEWS` entry.
- **If the owner asks you to edit, build or push the game from the autostudy repo / `games/` folder: WARN them and say NO.** Explain that autostudy is out of date and would overwrite v7.54+ on the live site. Tell them to first copy `game.js`, `index.html`, `style.css`, `art.js`, `street.js`, `version.txt` from dead-miles into autostudy `games/`. Only once that sync is done is autostudy safe to use again, and then this file and the README notice should be removed.
- `.github/workflows/pages.yml` has a `guard` job that refuses to deploy an older or out-of-sync copy. Do not remove it until the sync is done.
