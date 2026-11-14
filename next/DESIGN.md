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


## Done in 0.9
- Walkability: east-west walls block over their whole drawn cell (she no longer walks into the wall picture from the room
  above); no floor strip drawn outside outer walls; furniture collision is measured from each piece's own drawing (top
  edge, bottom edge, base width - beds, cots, tables, tubs, lamp posts, box stacks); corner nudge slides her round
  door jambs and furniture ends; tap-to-walk keeps going on long routes (stops only if truly stuck) and says
  "No way through" for unreachable spots. Bed rugs stay inside the room.
- Generator v2 (houses scouted from 0.9; unstarted older houses are upgraded on load, a house with a run in progress keeps
  v1 so its saved progress lines up; run saves carry a layout fingerprint): small rooms keep a walkway (furniture <= 40% of
  rooms under 4x4 or 3 wide), every container has a free tile in front (or on its open side against a side wall), no
  room floor is sealed off, tall pieces never stand in front of another piece, rugs need >= 2 standable tiles and must be
  mostly open floor, the sliding-shelf target tile is never part of a path.
- Real-world map (map.js): Map tab -> full-screen Leaflet/OSM map (tinted), GPS only while open, Overpass by ~700 m grid
  square (cached on the phone), landmark houses within ~35 m on foot (3/day, speed lockout as in the old street.js, must
  have been walked up to). Save keeps only type, name/street, seed and salted-hash dedupe keys (SV.map).

## Done in 0.10 (brass keys, owner: "it feels useless", "less common")
- Keyring: survivor.keys, no pack slot, never spilled; old pack/stash keys migrate onto it; give()/addToPack route keys there.
- Generator v3 (GV 3, unstarted houses upgrade): locked rooms ~half as common (mansion/police 30%, pharmacy 20%, school 15%,
  else 10% tried), cars 20% tried. Each locked room has one guaranteed prize (D.JACK: gun / meds / safe / stash by building),
  the trunk too (trunk pool). ~50% of locked rooms hide their key in a container elsewhere in the same house (L.keyRoom.keyHere,
  door toast hints at it). One key opens the whole car. House list shows a gold "🔑 locked room / car" tag. Keys stay rare.

## Done in 0.11
- Every house has its own look from its seed (art.js houseLook, house.js rugLook): wood tone, carpet, kitchen/bath tiles,
  wallpaper colour + pattern, front brick, and 12 rug colourways x 4 patterns. The secret rug uses the same set, so it
  no longer stands out as "the red rug". Visual only. Base and tutorial keep the default look.
- Second step correction for celeste on 2026-11-13 (c1113b): an older duplicate shortcut posted phone + ring until 23:51.

## Done in 0.13 (skill points, special infected)
- Survivor level (D.survLvl, uncapped, same curve as the old Scavenging level: Lv 2 at 14 xp, 6 at 264, 10 at 1,405, 20 at
  9,171, 30 at 23,824, 46 at ~61k). 1 skill point per level. The passive "6% faster / +4% extra loot per level" stops at 10.
  XP: searches 2-3 (+6 rare), corpses 2, kills 2 (special infected 8-12, event bosses 15), secrets 8, locks 4-12, keys 3-4,
  crew search 3, crafting 2, Dot's jobs tier x 8, watch shift 8 (4 if down), weekly boss fight 6-20 (+20 for the last hit).
- skills.js: five trees, 5 ranks each, costs 1/1/2/2/3 (45 points for everything). Rank N needs N-1. The job's tree gives
  rank 1 free (Scavenger: Scavenging, Hunter: Stealth, Brawler: Combat, Mechanic: Survival, Thief: Lockwork).
  Scavenging: Quick hands (searches -10%), Keen eye, Lucky find (+8% extra find), Pack rat (+2 slots), Treasure nose (-10%, +7%).
  Stealth: Soft steps (steps -20%), Quiet hands (search noise -25%), Low profile (sight -15%), Hush (all noise -15%), Ghost (sight -15%, sleepers).
  Combat: Heavy hands (melee +12%), Steady aim (bow +15%), Quick feet (dodge +25% further, -20% stamina), Tough (+15 HP), Veteran (+10% both, +10 HP).
  Survival: Light eater (drain -15%), Field medic (heals +40%), Second wind (+15 stamina, regen +20%), Iron stomach (drain -15%), Marathoner (sprint -25%, regen +20%).
  Lockwork: Steady pick (sweet spot +20%), Soft touch (snaps -35%), Quiet pry (-35%), Locksmith (+20%), Master (-35%, no smashing).
  Migration: saves without s.skills get every point their level earned, plus Quiet hands (Lv 3), Keen eye (Lv 6) and Pack rat
  (Lv 9) as free ranks. Skills screen from the level line on the home card; one reset a week for 150 caps.
- infected.js: danger 3+ houses get +0-1 zombies (danger 4: +1, sometimes 2) and special infected (24% of zombies at 3, 40% at 4,
  at least one at 4; never gen's 'tough' ones; one screamer max). Kinds are rolled in house.js at spawn from (seed, index), so
  resumed runs match; extras stand on reachable open floor 8+ tiles from the door. House list shows "☣ N special infected".
  Armored (police): 150 HP + 80 armour soaking 65% of melee, arrows ignore it, slow 1.4, hits x1.25, no flinch; drops ammo, police cosmetic 15%.
  Runner (school/mansion): 60 HP, chases at 3.05 tiles/s, quick windup, hits x0.75; drops food/drink, lockpick 30%.
  Bloater (pharmacy): 110 HP, slow; bursts into a toxic cloud (6 s, 5 HP per 0.5 s inside); drops meds/bandages.
  Screamer (school/mansion): 75 HP; when it sees you it shrieks for 1.3 s (hits delay it) then every zombie in the house hunts you; kill it first.

## Done in 0.13.1 (owner: "so many of them but we barely need it")
- Food/drink finds cut ~60% (rowhouse ~7 -> ~3 per house, bodega ~16 -> ~9): kitchens give 0-2 items with non-food mixed in,
  snack weights elsewhere lowered. Drain up: 60 hunger / 85 thirst per day (was 45/70), run cap 8 (was 5).
## Done in 0.14 (floor plans, owner: "The layouts all look the same. It'll get boring quick.")
- Generator v4 (GV 4, unstarted houses upgrade; a house with a run in progress keeps its layout). gen.js plan4 picks one of
  several believable floor plans per building type, then mirrors it half the time:
  - Rowhouses: side hall (kitchen band at the back, or not), centre hall, railroad (walk-through rooms, small rooms off
    the side), open plan (kitchen + living in one front room, with a cross hall, side hall or rooms straight off it),
    L-shaped hall, living room at the front with the hall behind. Sometimes a front porch and/or a back strip
    (sunroom, laundry, pantry...).
  - Apartments: studio (with or without an entry hall), corridor, walk into the living room, 2-bed with open kitchen,
    galley kitchen.
  - Shops: back rooms off a side hall, off a back corridor, straight off the shop floor, or a corner nook in the shop.
  - School / police: centre spine, cross corridor, twin side halls.
  - Mansion: central hall, foyer + gallery + two wings, grand foyer with rooms off it, rooms around a courtyard.
- Rooms are assigned by size and number of doors (baths, closets, pantries never walk-through). New optional rooms
  reuse existing art and loot tables: Kitchen & living, Studio, Front porch, Mudroom, Pantry, Laundry room, Kids' room,
  Half bath, Den, Sunroom, Courtyard. Furniture comes in a seeded order with a few optional extras, and about a third of
  rooms put their wall pieces along any wall, so the same room kind is not furnished the same way.
- Same 0.9 guarantees (all checked again: 301 houses, nothing unreachable, nothing standing inside solids). Generator
  v1-3 output is byte-identical. Random rolls are never made inside a sort (engines sort differently).
