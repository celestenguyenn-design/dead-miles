# Dead Miles (new game) - design notes

The owner's decisions, in her words where possible. This is the brief for every
session that works on the rebuild. The old game (repo root: game.js etc.) stays
live and untouched until this one replaces it.

## What it is
A walking zombie-survival game for her and her friends (Brooklyn + Georgia,
never online at the same time). Real steps move you through the county; houses
are looted by hand, Project Zomboid / 7 Days to Die style, on a phone.

- "I want a game where I can walk, but I'm not stopping." Walking scouts
  houses; you loot them later.
- "Imitate an actual house loot like 7 Days. I watch my character walk when I
  click a cabinet in a kitchen to loot. The house details should all be there:
  kitchen, bedroom, bathroom, anything lootable. 7 Days hidden loot rooms in each
  house where we manually move our character."
- "Walking with a joystick and looting my own things. Fighting zombies in an
  actual fight and watching the animation play out, I can use a joystick to move
  and run from zombies doing a physical attack."
- "Zombies look like actual zombies, our characters look cute. Roughed up."
- "A slow grind, almost never ending, like people play Pokemon Go for years."
- Walkers (Wing, Tiff) must not race ahead; it must not be too slow for her.
- Clean wipe: new game, cosmetics are earned. She buys cosmetics in games she
  loves; dress-up matters.
- Wants to maybe make it public one day: only art/music we own or license.

## Decided
- View: top-down 3/4 (Stardew / Zomboid-like), 2D canvas, portrait phone.
- Art: Style B "Spooky flat" (mockups/blend/blend-b-*.png). Palette in s2art.js
  (INK #11142f, PLUM #3d2d61, ORA #f07b3c, CRM #f6e3bb, WALL #2a1f4a, LIL #5a4a86).
- Controls: virtual joystick + action buttons (search/interact, attack).
- Combat: real-time, physical, animated; you can run.
- Music: the Eerie generated track that speeds up with danger (s2.js MUSIC).
- Pacing: steps taper through the day (7k full, then 50%, then 15%); typed
  steps half value, max 4k/day. Loot is stingy; good gear from raids/boss.
- Social: shared party camp (Supabase camps table, camp_get/camp_add), weekly
  group boss over the whole week, gifts = supplies only, 1/day, 5 received/week.
- Oura: morning check-in (sleep, readiness) sets the day; workouts = training.
- Systems coming back from the old game: home base, crew of survivors, pet
  strays, real-world GPS map.
- Keep the backend: Supabase accounts (players), step posts (iPhone Shortcut,
  Android companion app), friends board, parties, bosses, gifts, camps.

## Build order
1. Prototype one house: joystick, rooms with lootable furniture, timed search,
   loot window, a hidden room, zombies that hear noise, real-time combat. (next/)
2. House generator (many layouts by building type), scouting from steps.
3. Character, gear, inventory, cosmetics/dress-up on the top-down sprite.
4. Accounts + step sync + friends using the existing backend.
5. Camp, weekly boss, gifts, Oura check-in.
6. Base, crew, strays, real-world map.
7. Replace the old game (a deliberate switch the owner approves).
