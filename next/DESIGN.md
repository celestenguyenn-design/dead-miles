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

## Done in 0.14.1 (owner: "I was able to build like 4 things today with just my 4k steps")
- Base build steps fill at 50% of steps walked and every piece costs 2x the steps (so ~4x the walking per piece).
  Walls tier 1 = 6,000 build steps (~12k walked), generator 16,000 (~32k walked). Materials unchanged. Existing pools kept.

## Done in 0.15 (raiders, a tidier Gear tab, item kinds, Dot moves on)
- Raiders (raiders.js; owner: "other survivors coming to raid the house we're in and we have to fight them. Rare of course").
  Only normal house runs (never the tutorial, the base, watch shifts or the weekly boss), at most once a run. Chance by danger:
  3% (1), 4% (2), 6% (3), 8% (4+) - about 1 run in 25-30 overall. Seeded per house (seed + type), so a resumed run gets the same plan.
  2 raiders, 3 in danger 3+ about 45% of the time; one has a pistol 40% of raids (70% at danger 3+). They come up the stoop
  45-120 s after she goes in, or once ~40% of the house is searched (not before 20 s in): banner "RAIDERS!", toast "Voices at the
  front door... raiders!", knocking + creak. Raider: masked survivor rig (red bandana / gas mask, dark muted coats), always-on red
  HP bar with a RAIDER tag, red dots on the minimap once seen. Brute 90 HP, walks 2.0 / chases 2.45 tiles/s (she walks 2.75, sprints 4.5),
  melee 12-16 after a 0.45 s windup; gunner 70 HP, keeps 3-6 tiles away, aims 1.05 s (red line tracks her, locks for the last 0.45 s),
  slow bullet (9 tiles/s, 16-20 dmg, dodge i-frames work), 2.4 s between shots, pistol-whips 8-11 up close. Sight 7.5 tiles (her Stealth
  ranks shrink it); her loud noises make them come for her. They loot the nearest unsearched, unlocked container (3.5-5 s, noisy:
  it draws zombies), take what is inside (never keys, notes, the hook pole or Dot's parcels - those stay in the container), 3-5
  containers each, then walk out. At 30% HP they run for the door. Zombies and raiders fight: zombies that see a raider go for it
  (z.foe), raiders hit zombies within reach, gunshots draw the whole house. Kill: 14 XP (16 the gunner); the body holds ~60% of what it
  stole + ammo, a bandage or painkillers, sometimes food, its melee weapon (40%), a lockpick (30%), a cosmetic (7%). Ones that get
  away are gone. Summary shows "Raiders: N of M down · K got away · they took X things". Resume: the run save records that a raid
  happened (never fires again); the raiders are gone, the containers they emptied stay empty (FKEEP 'raided'). Dev: DM.raidNow(),
  DM.Raid.force = true.
- Gear tab (was "Pack & stash", which wrapped onto two lines): sub-tabs Equipped (weapon, quiver, pack size, wardrobe; keyring and worn
  gear as rows; skills and eat & drink links) / Backpack n/12 (grid, Sort, Stash all) / Stash n/40 (grid, Sort, Sell junk). The base's
  stash chest shows just Backpack / Stash. Main tabs no longer wrap.
- Item kinds (data.js D.cat / D.catLine, owner: "should tell us 'materials' like for crafting or should be 'sold'"): Food, Drink,
  Medical, Weapon, Ammo, Tool, Gear, Material (anything a workbench recipe or a base piece uses; tapping it says what for), Sell
  (junk only worth caps: paperback, pocket watch, gold ring, rusty wrench), Key, Seed, Decor, Event, Blueprint, Quest, Note, Cosmetic.
  Shown on pack/stash/loot cards. Sell junk (Stash tab) sells every Sell item to Dot after a confirm; it counts as a visit.
- Dot moves on (owner: "the trader shouldn't be infinite"): after each visit (opening her shop, or Sell junk) she is away until
  3,000 more steps are walked (SV.walked: phone/watch steps, typed at half - the same total quest distances use). Her card shows
  "Dot's back in N steps" and a bar. Jobs keep progressing while she is away; turn-ins happen on the next visit. Old saves start with
  her in (SV.trader.away unset).
## Done in 0.16 (real-world map, owner: "Make the map match the layout of my actual art style. It's terrible." / "Idk what map even does LOL" / "Map takes a long time to load.")
- map.js rewritten without Leaflet or raster tiles (no CDN at all). The map is drawn on a canvas from OpenStreetMap vector data in
  the Spooky flat style: dark streets with ink edges, lighter curbs and dashed centre lines on avenues, street names along the
  streets; plum building roofs with ink outlines and a lit bevel, south-facing wall faces hanging below them (3/4 like the house
  walls, brick or painted, some windows lit orange); teal parks with ink-rimmed trees; deep blue water with ripples; faint ground
  grit; fog and drifting mist around a warm lamp-light pool. She is her own survivor sprite (walks when she moves). Places are the
  house-list type icons on round badges (a copy of game.js's TYPEICON lives in map.js - keep them in step). A few zombie
  silhouettes shuffle along the streets at the edge of the light, for mood only (they stay out of her light, they do nothing).
- Pan (drag), pinch / wheel / +- zoom, a "back to me" button; dragging the view loads the square under it.
- Speed: one Overpass query per ~700 m square (roads, building footprints, parks/water, shops + houses), 22 s timeout per mirror,
  two mirrors; if both fail a light places-only query keeps landmarks working ("Streets did not load - places still work").
  Squares are stored compactly (micro-degree ints) in IndexedDB (dm-next-map, LRU 30 squares) - not localStorage, so the map can
  never fill the save's space; 0.9's dm9.osm.* keys are deleted. Squares older than 14 days refetch in the background.
  The last square looked at opens straight away before any GPS answer; a quick low-accuracy getCurrentPosition (maximumAge
  10 min) moves the camera and starts the fetch, the precise watch does claims. The streets layer is drawn once into an
  off-screen canvas bigger than the screen and only redrawn when the view leaves it or the zoom changes. A "Scouting the
  area..." pill shows while fetching instead of blocking.
- Explaining it: a first-open explainer card (and the ? button): "This is your real neighbourhood..." with the 35 m / 3 a day /
  on foot / walk-up / privacy rules. The bottom card: 3 pips + "2 of 3 landmarks found today" and the nearest place to scout
  with a compass arrow and distance (or why nothing can be claimed: too fast, fuzzy GPS, all 3 found, "right here - walk away
  and back"). Claimable places glow, near ones pulse, claimed ones get a green check; tapping a badge shows its name and
  distance. A claim slides in "Added to your houses: Rite Aid · 512 Fulton St" (queued if two land together) with a burst.
- Rules unchanged (35 m + half the GPS accuracy up to 15 m, 3/day, 60 m accuracy cap, 3-fast-readings drive lock for 45 s,
  must have been 15 m beyond reach first, places within 700 m, houses nearest 45). One addition: a single reading that is
  itself a car-speed jump from the last one cannot claim (it used to be able to, before the 3-reading lock kicked in).
- Privacy unchanged: position only in memory while the map is open; the save holds no coordinates or OSM ids. The phone now
  also keeps which ~700 m square was shown last (a square, never a point), next to the cached squares, outside the save.

## Done in 0.19 (weapon quality tiers + per-player gamestage)
- Weapon quality (data.js D.QUAL): 1 Rusty, 2 Worn, 3 Solid, 4 Fine, 5 Masterwork. Each tier above Rusty is +8% damage and +15% max
  durability (Masterwork: +32% / +60%; e.g. bat 34/60 -> 45/96, bow 46/120 -> 61/192). Every weapon, bows and the crowbar / pry bar too
  (the lockpick set is not a weapon and has no quality). Stored on the entry: { k, n: 1, d, q }; it travels through pack, stash, hands,
  drops, swaps, stash moves and Dot's shelf. Helpers: D.qOf(e) (missing q = Worn), D.wDmg(e), D.wMax(e), D.mkWeapon(k, q, f).
- Old saves: weapons without q become Worn (+8% damage on what they did before); their durability is scaled x1.15 with the new max, so
  the bar shows the same %. Never lower. A weapon given without a quality (quest/event rewards, base, crew) is Worn at full durability.
- Where quality comes from: D.rollQuality(base, bonus, rnd) - weights e^(-1.6 x |tier - (base + bonus)|), Masterwork cut to 1/10 unless
  base >= 3.5. Bases: normal houses 1.5 (about 45/44/9/2/0 %), danger 3: 2.1, danger 4+: 2.5, locked containers 2.0, hidden stashes 2.3,
  special infected 2.6, raiders 2.7, key-locked rooms / trunks 2.8, horde crates 2.2, weekly boss 3.8 (~12% Masterwork). Deep runs can call
  D.rollQuality(3.5, bonus, rnd) (~8% Masterwork). Crafting (game.js craftQuality): never Rusty, mean 2 + level x .02 (max +.5) + .03 per
  Combat/Scavenging rank; mostly Worn-Solid; never below the weapon it was made from (spiked bat from a bat). Dot sells Worn, sometimes
  Solid from trader level 3 (+30% price). Special infected now drop a weapon 10% of the time (rolled at their higher base).
- Display: tier-coloured border + name and "★★★ SOLID" on weapon cards (loot sheet, swap sheet, backpack, stash, Equipped weapon slot,
  crew-search results, Dot's shelf, boss reward); damage shown includes quality; loot cards show "NN dmg" against what she holds;
  the run's weapon chip is tinted from Solid up. Weapons sell for 25% more per tier above Worn.
- Gamestage (per player; data.js D.gamestage / D.gsFx, game.js Game.gamestage): level + days played / 3 (max +20) + 3 per tier of the
  best weapon owned above Worn, 1-60. Days played = one per day the game is opened (s.gsDays; old saves start at the days since the save
  was made). t = (gs - 10) / 50, 0..1: gamestage <= 10 is exactly the old game. Zombie HP and hits x(1 + .25t) (never bosses or raiders;
  armour too); special-infected share +12t points at danger 3-4 (same seeded roll, higher bar); from gamestage 25 a few specials at
  danger 2 (up to 15% at 60, no screamers, separate seeded stream); weapon quality roll +0.4t; rare-find chance +6t % per search.
  Examples: Lv 1 fresh = 1; Lv 8, 30 days, Worn = 18 (+4%); Lv 16, 45 days, Fine = 37 (+13.5%); Lv 32, 120 days, Masterwork = 60 (cap).
  Shown on the Gear tab (Equipped > You) and the Skills screen with a one-line explanation; How to play has both systems.
- Determinism: game.js loot() snapshots the gamestage onto the house (h.gs) when a run starts, puts it on the layout copy (L.gs) that
  infected.js and house.js read, and reuses it on resume (tested: same zombies after her gamestage jumped 24 -> 60). A run saved before
  0.19 resumes at gamestage 0 (its original zombies). h.gs is cleared when the run ends. The house list's special tag uses the current
  gamestage. Tutorial, base, watch shifts and the weekly boss ignore the gamestage.
