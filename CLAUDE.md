# Dead Miles - notes for Claude

## This repo is the only home of the game
Dead Miles is edited, built and deployed **only from this repo (dead-miles)**. The owner's autostudy repo is for school work and is **not** part of the game. Its old `games/` folder is a stale copy (v7.53) and must not be used.

- Make game changes here: bump `VERSION` in game.js, `?v=` in index.html, and `version.txt`, and add a `NEWS` entry.
- **If the owner asks you to edit, build or push the game from autostudy or its `games/` folder: WARN them and say NO.** Remind them that the game lives in dead-miles now, and that the autostudy copy is out of date and would overwrite newer work on the live site. Do the work in dead-miles instead. Do not suggest syncing the game into autostudy; the owner does not want it there.
- `.github/workflows/pages.yml` has a `guard` job that refuses to deploy an older or out-of-date copy. Keep it.
