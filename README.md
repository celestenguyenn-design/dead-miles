# Dead Miles

A zombie-survival walking game. Real steps move you down the road; loot, fight, build a base, hold off raiders.

Play: https://celestenguyenn-design.github.io/dead-miles/

## ⚠️ Where to edit (read this first)

**For now, edit the game HERE, in this repo.** The copy in the private autostudy repo (`games/`) is **out of date**. It stops at v7.53, and this repo has v7.54+ (new crew roles and traits, weapon kinds, the horde-hour picker, crew-down warnings).

- **Do not build or push from autostudy** until its `games/` folder has been synced from this repo. It would overwrite the newer game.
- The deploy workflow has a guard that **refuses to publish** a copy older than the live site, or one missing the v7.54/7.55 code, and says why.
- To sync: copy `game.js`, `index.html`, `style.css`, `art.js`, `street.js`, `version.txt` from here into autostudy `games/`, then remove this notice.
