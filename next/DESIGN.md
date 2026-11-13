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
- Social: (shared camp dropped - personal bases instead), weekly
  group boss over the whole week, gifts = supplies only, 1/day, 5 received/week.
- Oura: morning check-in (sleep, readiness) sets the day; workouts = training.
- Systems coming back from the old game: home base, crew of survivors, pet
  strays, real-world GPS map.
- Keep the backend: Supabase accounts (players), step posts (iPhone Shortcut,
  Android companion app), friends board, parties, bosses, gifts, camps.

## Houses (decided)
- Houses come ONLY from walking ("no walking, no houses"); further walks reach
  bigger/rarer buildings. Every house is generated and different, 7DTD-style:
  rowhouses, apartments, mansions, police station, pharmacy, bodega, school,
  garage... Hidden compartments (cracked wall, sliding bookshelf, floor safe,
  attic hatch), rarer and better the further you walk. Danger fits the place.
- Looting by hand with the joystick is THE game. Auto-search is a fallback
  the owner loves: a player's crew can search a house for them (less loot, no
  hidden rooms) so walk-only friends are not left behind.
- Loot runs short: about 3-5 minutes per house.

## Bases, farming, party horde night (decided)
- EVERYONE HAS THEIR OWN BASE (owner changed her mind on a shared base: "I want
  to be able to decorate it"). Build it with steps (walls, gate, watchtower,
  traps, workbench, rain barrels, garden beds) and DECORATE it: furniture,
  posters, rugs, lights - decorations are earned cosmetics, many found while
  looting. Friends can visit your base. No shared camp.
- Farming: plant seeds found while looting. Watering costs steps (a few hundred
  per plant per day). Plants grow over real days; unwatered plants wilt. Grown
  food is the reliable food supply. Visiting friends can water your plants.
- Party horde night (kept): one horde for the whole party, announced days ahead,
  one deadline for everyone. "Showing up" = a watch shift any time in the 24 h
  before: a 2-3 minute real-time defense (same joystick combat), at your own
  base or a friend's. Every shift thins the WHOLE horde. At the deadline each
  member's base is checked against what is left: strong bases hold (loot for
  everyone who did a shift), weak ones lose something (a wall section, the
  garden, the generator, a stash item) and get repaired with steps. Skippers get
  nothing. Two people online together can share a shift as a bonus, never
  required. Horde size grows slowly; a party of two must not be crushed.

## Looting rules (decided after playing the prototype)
- Searches start slow; a Scavenging skill (levels from searching) makes them
  faster and finds more; later this becomes skill points.
- Pack is 12 slots. Items stack with LIMITS (ammo 30, bandages/meds 5,
  food/water/snacks/drinks 3, scrap 10...); weapons/tools don't stack.
- Dropped items stay on the floor for the rest of that run (you can pick them
  back up); once you leave the house, anything left behind is gone.
- A bit fewer lootable things per house; some containers are empty.

## Hidden compartments (decided)
- 7DTD-style secrets, NOT noticeable. Only searchable after ~75% of the house
  has been looted (no announcement). No visible clue unless the Keen eye perk.
- Top-down stand-ins for 7DTD parkour: small discovery chains - a torn note
  with a vague hint, a rug hiding a loose floorboard, a sliding bookshelf, an
  attic hatch that needs a hook pole found elsewhere. 1-2 per house, mixed up
  by the generator so they can't be memorised. Summary shows "Secrets found N of M".

## Steps -> houses (decided)
- ALL daily steps count (no dedicated walks needed). Houses scouted per day
  follow the taper: ~3 at 3k, ~6 at 7k, ~9 at 15k, cap 10 at ~25k.
- More steps in a day = slightly better odds at bigger buildings, but luck
  still matters. Extra houses beyond what you can loot go to crew auto-search.
- She CHOOSES which scouted houses to loot from the day's list (type, size,
  danger shown, e.g. a police station); the rest can go to crew auto-search.
- Consistency (horde shifts, watering, streak) matters as much as volume.

## Jobs (decided - combat/survival roles, owner's call)
- Hunter (archer): bows, quiet ranged kills, recoverable arrows; best sneaker.
- Scavenger: faster searches, more loot, spots secrets sooner.
- Thief: lockpicking expert (wider sweet spots, picks break less), quieter.
- Brawler: melee damage + toughness; best on horde night.
- Mechanic: cheaper walls/traps/repairs, quieter prying.
- Medic dropped as a job ("not useful in this scenario"); healing becomes an
  optional skill anyone can level.

## Locks (decided)
- Locked doors, gun safes, pharmacy cages, toolboxes, attic trunks guard the
  best loot. Some houses are only worth it with a crowbar.
- Lockpick = a real mini-game (rotate to find the sweet spot, strain snaps the
  pick), silent, consumes picks; harder locks = smaller sweet spot.
- Crowbar = always works, loud, can smash something inside.
- Picks/crowbars are loot, trader stock, or crafted from blueprints.

## Events (decided)
- Seasonal events with limited loot, a mini-boss, a trader event quest and
  once-a-year cosmetics. First: Thanksgiving (around Nov 26): cranberry sauce,
  stuffing, pumpkin pie, whole turkey, a zombie turkey mini-boss, pilgrim hat,
  maybe a "Black Friday horde". Later: Christmas, Halloween, summer heatwave.
- Players are experienced survival gamers: depth over hand-holding.

## Trader + quests (decided, 7 Days to Die style)
- A trader is a permanent entry on the house list (never uses a scouted slot),
  a safe zone you can go back to any time. Name/personality TBD (owner may pick).
- Quest board refreshes daily. Types: Clear (kill all zombies in a given
  house), Fetch (find an item in a house), Secrets (find N hidden
  compartments), Hunt (kill N zombies anywhere), Supply run (bring items).
  Quest houses are "N steps away" and appear once you've walked that far.
- Rewards: choose one - blueprint / food / medication / ammo - plus trader
  currency for the shop.
- Quest tiers 1-5. Trader level goes up every 20 completed quests ("if you do
  20 quests, you get to trader level 2"); levels unlock the next quest tier
  and better shop stock.
- Blueprints unlock crafting at the base workbench (weapons, bigger packs,
  traps, base upgrades).

## Hunger and thirst (requested, next after crew/strays/boss)
- "There's also no food bars." Two bars, Hunger and Thirst, on the home screen
  and in the house HUD. Drain slowly with real time (about one meal and two
  drinks a day) and a little faster during house runs (running, fighting).
- Food fills hunger, water/soda/coffee fill thirst; some do both; holiday food
  extra filling. Garden food and rain-barrel water from the base.
- Low hunger: slower stamina regen, no overnight healing. Low thirst: slower
  searches, faster tiring. Empty: slow HP loss but never kills you outright.

## Build order
1. Prototype one house: joystick, rooms with lootable furniture, timed search,
   loot window, a hidden room, zombies that hear noise, real-time combat. (next/)
2. House generator (many layouts by building type), scouting from steps,
   the daily house list you choose from.
2b. Trader, quests, jobs.
3. Character, gear, inventory, cosmetics/dress-up on the top-down sprite.
4. Accounts + step sync + friends using the existing backend.
5. Weekly boss, gifts, Oura check-in, party horde night.
6. Base, crew, strays, real-world map.
7. Replace the old game (a deliberate switch the owner approves).

## Done in 0.7 (phase 5b)
- Crew (crew.js): survivors hiding in closets/secret rooms (~4%, ~10% mansions/police), talk + join if a bunk is free
  (2 bunks, bunk beds build to 4). Roles Scavenger/Guard/Medic/Gardener/Tinkerer, slow levels, 1 food/day from the
  stash, 3 hungry days = they leave a note (never take items). Crew auto-search share 35% (no crew) up to 62%.
- Strays: dogs/cats under furniture (~3%), approach slowly or offer food, max 4, one comes along. Never die.
- Weekly boss (boss.js): Mon-Sun New York, 5,000 steps to reach, 2 fights/day, shared health via next_boss_hit.
- Quiver: arrows live in survivor.quiver (max 60), no pack slot, never spilled.

## Done in 0.8
- Hunger + thirst (food.js): survivor.food {h,t,at,acc,xb}; real-time drain 45/70 per day from timestamps, small capped run drain
  (max 5 per bar per run, more sprinting/fighting). Items carry hu/th (data.js); canned coffee added. Hungry <30: stamina refill -40%,
  no overnight heal. Thirsty <30: searches +20%, max stamina 80. Empty: -1 HP/real hour, never below 10. Both >80: +10% scav XP.
  Pre-0.8 saves start at 80/80 from the moment they load. Home card bars + Eat & drink sheet; run HUD bars (tap = quick eat);
  rain barrel "Drink" at the base (+50 thirst, one charge).
- Brass keys: the only way into locked cars (street, ~22% of houses, glove box + trunk, table 'car') and key-locked rooms
  (~18%, more in mansions/police; one leaf room, door blocks until unlocked; table 'lockedroom'). Rolled from their own seeded stream
  after generation, so existing seeds keep the same house. Not in the 75% secret gate; crew never opens them. Keys rarer; Dot sells one (lv 2+).
- Secrets: board cell of a rug secret is always a reachable floor tile; secret actions win the use button; quiet hint before the gate (from main).
- Feel: furniture collision inset, taps on part-wall tiles walk next to them, wall fade only for the segment over her sprite (to ~65%).

