# Dead Miles: Homestead

A cozy zombie-survival farm with a short roguelite run every night, powered by how much you move.

- **Move in real life.** Steps (phone sync) and any workout you log turn into *grit*. Grit makes harvests and camp work bigger, earns extra runs, and levels you up. It never locks anything: the farm, the camp and travel are always free.
- **Farm and camp.** Plant, harvest, cook meals that buff your runs, build up the homestead, and give survivors jobs, gifts and hearts.
- **The night run.** Seven floors of card fights, events, traders and a boss, about 5-8 minutes. Five regions, heat levels, ten night conditions.
- **The Sunday horde.** Build defense all week.

Play: https://celestenguyenn-design.github.io/dead-miles/

The old walking game (v7.71) is kept, untouched, at `/classic/`.

## Files

- `content.js` - all game data (crops, meals, cards, charms, enemies, regions, events)
- `run.js` - the night run: map, card combat, rewards
- `game.js` - camp, farm, activity, saves, step sync, UI
- `art.js` - avatars, pets, zombies (shared with classic)
- `android/` - the Health Connect step-sync companion app
- `classic/` - the v7 game

## Where the game lives

**This repo is the one and only home of Dead Miles.** All game code is edited, built and deployed from here.

The private autostudy repo is for school work only. Its old `games/` folder is a stale copy that stops at v7.53. **Never build or push the game from autostudy.**

The deploy workflow has a guard that refuses to publish a copy that is older than the live site, or that is missing code that only exists here, and says why.
