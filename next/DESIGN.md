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
- Music: area tracks made with our own synth (0.20: Lantern Hollow home, Rust & Hum map, Brownstone Pulse
  looting, Last Light Radio base, Horde Night fights, Midnight Carol at Christmas); the live Eerie track stays
  as an option. Zombies groan by where they are.
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
## Done in 0.17 (deep runs, owner: loved the idea "but I can't walk 10k a day")
- deep.js (new). Passes come from CUMULATIVE walking: every 8,000 steps of SV.walked (phone/watch steps, typed at half - the
  same total quests and Dot use) earns a Deep Run pass, any days. Hold 2; while full, steps do not bank. Existing saves get
  their first pass free. Home card "Deep run" (after the base card): 2 pass pips, a progress bar, "Next pass in 3,120 steps ·
  1 pass ready", the last run's result, Go deep / How it works.
- Spending a pass: pick a building. Each floor is a normal generated house (DM.Gen.generate, existing types, seed per floor,
  GV 4; gen.js untouched) with a light theme on top (room + furniture names):
  - The Fulton Arms (apartment tower, 5 floors: apt, rowS, apt, rowL, rowL; leans runners/screamers; boss The Super, a
    screamer with 380 HP).
  - Kings Mercy Hospital (teaching hospital, 4: pharmacy, school, pharmacy, school - classrooms are lecture rooms, the nurse
    office the nurses' station...; leans bloaters; boss Patient Zero, a bloater with 520 HP).
  - Checkpoint Bravo (army checkpoint, 3: garage, police, police - motor pool, command post, barracks, mess...; leans
    armored; boss The Sergeant, armored, 420 HP + 240 armour).
  Floor 1 starts on the street; floors 2+ start on a "Stairwell landing" (the street strip restyled, no road, street cars
  become crates, lamp posts radiators; the house number reads as the unit number).
- Harder each floor (d = 0 on floor 1 .. 1 on the last): +f extra zombies (x0.75 in schools/police), special infected on
  every floor via infected.js L.deepInf (chance 20% -> 65%, at least 1 from floor 2, 2 on the last floor, building mix).
  Typical totals: tower 3 -> 8.5 zombies (0.7 -> 4.8 specials), hospital 4.8 -> 8.8, checkpoint 4.3 -> 8.9 (+ the boss).
  Better loot: empty containers 20% -> 5%; each container has a 10% -> 40% chance of a bonus roll from D.LOOT.deep1/2/3
  (meds/ammo/lockpicks, then blueprints/cosmetics/decor/pack upgrades/machetes, then backpacks/locksets/axes).
- One twist per floor, on the start banner and the floor chip: Power's out (a flashlight pool, the rest near black),
  Nest (twice the floor's zombies), Gas leak (all her noise x1.75, a green haze; house.js opts.noiseMul), Looted (60%
  empty but one container holds a jackpot from D.JACK.stash), Quiet (every zombie asleep). Never the same twist twice in a
  row; the boss floor only gets Power's out / Gas leak / Looted.
- The stairwell: a stairwell with a green EXIT sign in the farthest reachable room (BFS over the layout: walls, unopened
  secret doors, key-locked doors and solid furniture block; never next to a door, never in hidden rooms). "Take the
  stairs" opens the choice: what is below (floor name, twist), HP/hunger/thirst, all the run loot so far, Get out / Go
  deeper, or "Not yet - keep looting this floor". Floor 1's front door works as a way out too ("Leave the building?").
  Reaching each stairwell: +8 xp x floor. Getting out: +6 xp per floor cleared (+20 with the boss down). Boss kill +40 xp
  (plus the special's own).
- Last floor: the boss stands next to a Supply chest (deepchest table: 5-6 items, a blueprint and a cosmetic guaranteed,
  plus a D.JACK.stash prize). The chest cannot be searched until the boss is down. The stairwell there is the fire exit
  (Get out only). The floor chip shows the boss's health once its room is seen.
- Loot ownership: run.own = what she brought (pack + hands), kept as a running minimum so things she used up are not given
  back. Anything above that is run loot. Go deeper: run loot that is not food/drink/meds/tools is bagged (run.haul) so the
  pack has room on the next floor. Cosmetics found wait in run.cos. Packs, blueprints, shoes and locksets found in the run
  cannot be fitted/learned until she is out. Get out: everything goes to the stash, then the pack; whatever still does not
  fit waits on the home card ("Claim"). A found weapon she is fighting with stays in her hands. Downed: all run loot is
  lost, her own gear stays (no half-pack spill), HP 20, her own weapon goes back in her hand. Quiver and keyring are never
  spilled (as always).
- Rules: HP, hunger/thirst, pack, quiver and keyring carry between floors (no healing in between). No raiders (noRaid),
  no event mini-boss in deep runs. The crew pet comes along.
- Closing the app mid-run: the safest option is to resume. On the next start the game drops her straight back in - no home
  screen in between, so nothing can be moved to the stash - on the same floor with its saved progress (house.js
  snapRun/restoreRun via opts.onState/opts.resume), with her HP as it was when she left (saved as it changes, not the
  floor-start HP), or at the stairwell choice if that card was open. Zombies come back to their spots (as in any resumed
  house). If she was already down when the app closed she comes back home, down, run loot gone.
- Save: SV.deep = { passes, mark, seq, stats, run, last, held } (made on first use). Small hooks only: game.js (card,
  boot resume), house.js (opts.noiseMul in emitNoise), infected.js (L.deepInf).

## Done in 0.18 (daily challenge house, light infection)
- Daily challenge (daily.js): one special house a day, the same for everyone. Type and seed come only from the New York
  date (types weighted: rowhouse L, bodega, pharmacy 3 · auto shop 2.5 · apartment, school 2 · laundromat, police 1.5 ·
  mansion 1), generator pinned to GV 4. house.js seeds every loot roll from the house seed when opts.lootSeed is set:
  the empty containers, each container's pre-roll (its own stream per furniture id), the extra-find and pry-smash rolls,
  corpses (per zombie index) and the secret caches, so search order never changes what is inside. No raid, no event
  mini-boss, no hiding survivor or stray in it. Zombie AI wander is still random; skills (extra find, pack size) still apply.
- It sits at the top of the Houses tab (gold card): "Daily challenge · Pharmacy · 3 h left", address, danger, tags,
  your score / rank and the top 3. No scouting, no Crew button. Scores button: the whole board (top 50) and the rules.
- One scored attempt: the FIRST exit (leaving or going down) is scored. Going back in is for fun: the house keeps what was
  searched and who was killed (run state kept on exit, dead zombies stay dead on resume), so it cannot be farmed.
  Closing the app mid-run keeps the tally (G.dly rides in the run save).
- Score: loot value taken (D.valueOf, from containers / corpses / caches, not floor pick-ups) x4, halved if downed
  + 60 a secret + 15 a zombie (40 a special infected) + time bonus (540 - seconds inside) / 2, capped 0..150, only with
  60%+ of the containers searched - 150 if downed. Never below 0. The summary sheet shows the breakdown and the top 10.
- Backend: NET.dailySubmit / NET.dailyBoard -> next_daily_submit / next_daily_board (SQL in next/daily.sql, NOT applied:
  the owner applies it). Submitted once; offline / signed out the score waits on the phone ("Scores need sign-in /
  offline") and is sent when possible (yesterday's too). The last board is cached for offline.
- Light infection (infection.js; owner: "infection seems cool but don't do too much of it"): 10% of zombie hits that land
  infect (15% special infected; never raiders, the weekly boss or event bosses; Field medic halves it). While infected max
  HP is -5, then -5 more each real day, down to -25; it never kills and HP is only clamped to the new max. Hunger drains
  15% faster. Antibiotics (new item, Medical): rare in medicine cabinets (~4.5%), pharmacy shelves, nurse offices, pharmacy
  cages (~6%), vanities; Dot sells one at trader level 2+ (about every other day, 45 caps). Taking them cures it at once.
  Left alone it clears after 5 days. Shown on the home card ("Infected · -10 max HP", tap for details), the eat & drink
  sheet and a green chip in the run HUD; a first-time tip explains it. Old saves are simply healthy.

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

## Done in 0.22 (title screen + real weather; owner: "a home screen added to start the game that says Dead Miles. Animated, with zombies walking around and lightning flashes" / "I do want weather in the game as well")
- Title screen (title.js): on every app launch, before the home screen and before character creation. Hand-built block letters
  (SVG paths, no font needed) with a wobble filter, cream fill, thick ink outline, an orange extrusion and orange drips (3 drips
  slowly stretch). Behind it, a canvas night scene: plum sky, stars, the moon behind drifting clouds, the Manhattan skyline and
  the Brooklyn Bridge far off, a row of brownstones with stoops and a few warm windows (one boarded), a flickering street lamp,
  zombies (the game's own rig) shambling along the sidewalk (tinted back for depth) and the street, her own survivor in front
  with a flashlight if she has one. Rain by default (a drizzle; heavier in real rain, a downpour in storms), or the real snow
  or fog. Lightning every ~6-14 s (3.5-8.5 s in a real storm): the sky lights up, a jagged bolt, the street lit for a frame or
  two, then procedural thunder (weather.js W.thunder: a crack for close strikes, a long low rumble and a second roll; plays only
  once audio is unlocked by a tap). "TAP TO START" ("TAP TO BEGIN" for a new player) pulses; small Settings and How to play
  links open their sheets over the title. The tap unlocks audio, sets off one close strike with thunder and fades into the game.
- Cost: the sky and the buildings are drawn once per resize; a frame is ~3 big drawImages, 6-7 rigs and one rain path, at ~30 fps,
  stopped while the app is hidden. Reduced motion: a still picture redrawn once a second, no flashes or bolts, no pulse.
- Boot (game.js): the title goes up before the engine finishes loading; boot2 (home / character creation / a deep-run resume)
  waits for the tap, and renderHome is held while it is up (no tips or popups under it). The cloud-save picker (#msheet) sits
  above the title and the tap is refused while a sheet is open. Skipped: the ?synced=1 return from the step Shortcut, the
  reload after an auto-update (sessionStorage 'dm-title-skip', set only if she was already past the title), and ?notitle (tests).
- Weather (weather.js): Open-Meteo (free, no key), current weather_code / temperature / precipitation / wind / is_day, cached
  45 minutes in this phone's localStorage; offline = the last known weather for up to a day, then clear. WMO codes -> clear,
  cloudy, fog (45/48), rain (drizzle, rain, freezing rain, showers), storm (heavy rain 65/82 and thunderstorms 95-99; lightning
  only with thunder), snow, wind (clear/cloudy with wind >= 38 km/h); heat = above 30 C.
- Privacy: only a 0.1-degree position (~10 km) is ever sent. It comes from the Map only if she already used it: map.js leaves the
  rounded area on the phone on its first GPS fix ('dm-next-wxloc'), and for older map users DM.Map.lastArea() rounds the last
  ~700 m square it showed. Otherwise the weather area in Settings (Auto, New York, Atlanta, Savannah, Augusta, Philadelphia,
  Boston, Chicago, Miami, Los Angeles, London), default New York. Nothing about weather or location is in the save (tested);
  the only save change is base.water.rd, the day number the rain bonus was given.
- Effects (one table, weather.js W.FX): rain and storm: zombies and raiders hear 20% less (noise radius x0.8), rain barrels +1
  charge that day. Wind: hear 10% less. Fog: zombies and raiders spot her from 25% less far (7 -> 5.25 tiles), plus a lilac haze
  closing in around her. Snow: she moves 8% slower; thirst drains 15% slower, hunger 10% faster. Heat: thirst 25% faster.
  Thunderstorm: a flash every 9-26 s lifts the fog of war over the whole house for about half a second (no bolt in the top-down
  view; the light through the windows is the flash). Drain multipliers apply to the real-time hunger/thirst catch-up (food.js).
- Where: house runs, the base and watch shifts (outdoors: full rain), boss fights. The daily challenge house is visual only
  (hear/sight/move 1, no fog reveal, a lighter haze in fog). Deep runs: floor 1 only; floors 2+ have no weather. The run takes
  the weather once when it starts. The weather chip on the home card ("Rain · 48°F · zombies hear less", °F on US phones)
  opens a sheet with every effect in plain words and the area picker; How to play has a Weather entry; the test panel can
  force any weather.
## Done in 0.23 (home screen redo, owner: "I want the UI to be better." / "Go to base should be a small home icon on the top right somewhere." / "Horde night should be a small red box somewhere on the top with the timer." / "Everything is just really bunched up.")
- Layout and presentation only: no game rules changed.
- **Top bar** (sticky while the home scrolls): DEAD MILES + version on the left (5 taps on the version still opens the dev panel off GitHub), then a small **red horde pill** with the countdown ("HORDE 1d 9h"; "SHIFT OPEN 4h 59m" pulsing in the last 24 h; an orange dot when a horde result is waiting), then three icon buttons on the right: **home icon = go to base** (orange dot when the garden needs water or is ready), account & friends, settings. Base + horde only show after the first house, as before.
- Tapping the horde pill opens the old horde card in a sheet: countdown, party line, Start watch shift, Join party / Party, last horde's result + OK.
- **One hero card**: survivor (portrait, Edit look, Wardrobe + new-cosmetics badge, HP, hunger/thirst (tap = Eat & drink), infected/hungry chips, Level + Skills with the skill-point pulse, weapon) joined to the steps block (steps today, houses found, worth + next house, typed total + Log, sync status, How to sync steps / Fix sync, Sync my steps now on iPhone).
- **"This week" tiles** instead of the big stacked cards: Weekly boss (HP bar, FIGHT badge when you can), Deep run (pass progress, GO / CLAIM / BACK IN), Daily challenge (time left, GO), Crew & strays (crew/pets, NOTE / NEWS badge), plus Garden and Horde result tiles only when they have something to say. Each tile opens the full old card in a sheet (all its buttons work there); the daily tile jumps to the daily house in the Houses list. The event banner sits above the tiles in a slimmer form.
- The weekly boss is no longer shown twice: it left the Houses list (home tile only).
- The tab bar (Houses / Gear / Workbench / Map) sticks under the top bar once you scroll into the lists.
- Spacing on an 8 / 12 / 16 px scale, one border + shadow per card instead of three stacked cards; checked at 360, 375 (390) and 430 px with nothing overflowing. Shots: next/shots/250-before-*, 250-after-*, 250-compare.png.
## Done in 0.21 (the daily route map, owner approved as an extra view of the Houses tab)
- route.js (new). Houses tab gets a "List | Route" toggle (after the tutorial); the list is unchanged. The toggle remembers the
  last view (SV.route.view); a "!" badge on Route when a row is ready to pick.
- The map: new every local midnight (SV.day.key, same rollover as rollDay), seeded from seedBase + date (stable all day, same
  on reload). 6-8 rows (40/40/20%), 2-3 stops a row (row 1 and the last row: 2), each joined to 1-2 stops in the next row;
  lines never cross and every stop is reachable. Stops:
  - House: a danger 1-2 building (rowhouses, apartment, bodega, laundromat, auto shop; bigger ones a bit likelier further on).
  - Danger house ☣ (row 3+, likelier later): pharmacy, school, police (more later), mansion.
  - Elite (at most one mid-map, and always in the last row): police station or mansion; when the run starts one ordinary
    container gets a jackpot (f.jack: police gun / mansion safe table, D.JACK) and can't be empty. Crew search never finds it.
  - Safehouse (at most one random + always one in the row before the last): +30 HP, +15 hunger, +20 thirst, and one day off an
    infection (infection.js I.rest: survivor.inf.rest counts toward the 5 days; the max-HP loss is unchanged).
  - Dot (at most one): clears her away timer and offers "Visit Dot" (opening the shop starts the usual 3,000-step away).
  - Supply drop: 2-3 things (D.LOOT.routedrop) straight to the stash. Last row's Big cache: 3-4 incl. meds, a chance at a
    blueprint / decor / cosmetic (D.LOOT.routecache), weapon quality base 2.0.
  - Event (no repeats in a map): A survivor asks for food (give 1 food -> 15-25 caps + 6 xp at your next stop / walk on),
    open car (60% two car-table finds, else -12 HP bite, can infect, one find), gunshots (55% ammo x2 + maybe a bandage,
    else -15 HP), chained clinic (lockpick: meds + bandage, 20% antibiotics; crowbar/pry bar: same, 50% -10 HP bite), rain
    barrel (+30 thirst, 25% -8 HP), stray dog (share 1 food: two car-table finds + 8 xp). Outcomes are seeded per stop, so
    reloading does not reroll them. HP from events never goes below 10. Options needing an item are greyed out without it.
- Moving: every 1,500 EFFECTIVE steps today (phone/watch + typed at half: game.js effective(), what scouting uses) opens the
  next row; Isabel's trusted typed steps count as phone like everywhere else. She picks one stop per row, joined to her last
  pick (row 1: either), in order. A reached row can be picked any time that day; at midnight the map is replaced. Late steps
  for yesterday (addLateSteps) do not touch the route. Rows open at 1.5k, 3k, 4.5k ... (last row at 9k / 10.5k / 12k).
- The rule with scouting (houses per day unchanged): a pick never adds a house. Every pick, of any kind, trades in one of
  today's scouted houses - the NEWEST one she has not touched (status new, no run, not quest / landmark / daily / route);
  the details sheet names it before she confirms. A house stop puts its building in that slot (id 'rt…', h.route = kind,
  "route" / "★ elite · jackpot inside" tag on the list). If she already went into all of today's houses, the pick is owed:
  the next house walking scouts is skipped instead (route.debt, at most 1 owed; picking again waits until it is paid; an
  unpaid one carries to tomorrow's first house). Invariant tested: today's houses + non-house stops = scouted + owed.
  houses >= rows reached at every step count (1.5k: 2 vs 1 ... 12k: 8 vs 8), so normally nothing is ever owed.
- UI: header card (stops picked, "Next stop in N steps" + bar, or "Pick your next stop"), the map in its own scroll box
  (opens scrolled to her next row): final row at the top under "THE END OF THE LINE", start (tent) at the bottom. Spooky
  flat: plum/ink stops with the house-list type icons (TYPEICON via Game.ui.typeInner) and new glyphs (safehouse, Dot's cart,
  parachute crate, cache chest, "?"), ☣ badge, gold ring + crown for elite, green check on picked stops, dashed paths
  (orange when taken, animated cream when open), reachable stops pulse, an orange YOU pin, and a step progress line on the
  left with a tick per row. Tap a stop: details (house: type, address, danger, zombies, locks, keys, specials), what it
  replaces, "Go this way". Reduced motion turns the animations off.
- Save: SV.route = { ver, day, R, start, rows, picks, debt, paid, later, view, log } (~2 KB). Old saves: made on first look.
  devNewDay gives a new map (SV.routeDev salts the seed). Hooks in game.js marked "0.21 route:" (scout debt, renderHouses
  toggle + tag, loot() elite plant, Game.routeApi, Game.ui.typeInner, devNewDay, How to play "Daily route").

## Done in 0.19.1 (owner: "make it highlighted when we open a cabinet and it should say quest item")
- Game.questNeeds(): items active quests still need (supply runs, Dot's lockbox, the event job's gives). On the loot sheet those
  items glow gold with a QUEST ITEM tag, and opening a container that holds one toasts "Quest item: Duct tape (Supply run 0/3)".
- The run HUD quest chip is tappable ("▾ quests"): it drops down the full quest list with "Look for: duct tape · 0/3".

## Done in 0.19.2 (owner: "The live map doesn't work, it just loads for a very long time" / "map servers are busy, request timed out")
- One big Overpass query per ~700 m square timed out on dense Brooklyn blocks. Now three small stages: places (landmarks work
  right away), streets + parks, then building footprints in four quarters; each stage draws as soon as it lands.
- Four Overpass mirrors, hedged: the next mirror is asked if the current one has not answered in 3.5 s; first good answer wins,
  the rest are cancelled; the mirror that answered goes first next time. 20 s cap per question. With the main mirror hanging
  (mocked) the map draws in ~5 s instead of failing after 44 s.
## Done in 0.20 (area music + zombie groans; owner: loved the tracks, "especially Lantern Hollow"; "I do want the track for looting a house to have the zombies make noises if they're close by")
- Area music (music.js). Auto picks by where she is: home / menus Lantern Hollow (Midnight Carol while the Christmas
  event runs, D.EV), the real-world map Rust & Hum, house runs Brownstone Pulse, the base Last Light Radio, fights Horde
  Night. A fight = a house run where something is after her (M.tension() >= .75: a zombie chasing / attacking, or a
  raider that knows she is there) -> Horde Night in 1.5 s; after 7 s of calm it goes back (3 s). Watch shifts, the weekly
  boss (body.bossfight) and the deep-run boss floor (a live z.deepBoss) are fights from the start. Between deep floors
  (no scene, body.deeprun) the run's music carries on. The area is read from what is on screen (#mapv.on, DM.scene, body
  classes inrun / atbase / shift / bossfight / deeprun) every 100 ms, with a .4 s debounce, so no other file needed hooks.
- Settings > Sound: Music On/Off, a Track picker ("Auto (by area)" default, or pin any of the six, or Eerie), "Now
  playing", music volume, sound effects. Stored on the phone only (localStorage dm-next-audio: { music, mvol, sfx, track }).
- The files: next/music/*.mp3, mono 22.05 kHz 64 kbps, 45-53 s, 360-430 KB each (2.3 MB in all), rendered by
  mockups/music/loops.py from the same synth as the approved mockups, as SEAMLESS LOOPS: whole bars, no intro or fade,
  held layers crossfaded onto the start, the reverb tail wrapped round (circular). Each file holds [last .3 s][loop][first
  .3 s] and plays with loopStart .3 / loopEnd .3 + L, so it stays seamless whatever start delay or padding the phone's MP3
  decoder adds. Checked by rendering the real WebAudio loop across the seam: matches straight-through playback (-27 to
  -60 dB, MP3 noise) with no step at the seam. Frost on the Glass was rejected and is not shipped. Re-render: python3
  mockups/music/loops.py, then bump REV in music.js (file cache-busting, separate from the game version).
- Playback: AudioBufferSourceNode loop=true on the music bus (the engine's AudioContext, started by the first tap), through
  a low-pass and an 11 ms Haas copy on the right for width. Lazy: only the area's track is fetched, then the likely next one
  (home -> Brownstone, house -> Horde Night, fight -> Brownstone, map / base -> home's); none on data saver; a pinned track
  fetches only itself. Decoded at 22.05 kHz through an OfflineAudioContext where the browser allows (about 4.7 MB a track),
  at most 3 decoded at once (least recently used dropped, never the playing / wanted one). Fetch + decode never block: the
  old track plays until the new one is ready, then a 2.5 s crossfade (1.2 s fade-in from silence). Each track resumes about
  where it faded out. A file that fails (network, decode, too short) -> the live Eerie track, tried again after 90 s.
- Adaptive in house runs: the low-pass opens with tension (about 3 kHz calm, 6 kHz with noise, wide open in a fight), the
  track swells a little (x.8 -> x1), and a live heartbeat joins Brownstone Pulse when an awake zombie is within 7 tiles,
  on the track's own odd beats (its built-in heartbeat is on the even ones, so the pulse doubles as they close in), louder
  the nearer (full at 2 tiles); a free heartbeat (62-120 bpm) over any other pinned track. Eerie keeps its own behaviour.
- Zombie groans (engine.js SFX.groan, house.js groanZ): positional. Gain .06 + .94 x (1 - (d - 1.5) / 7.5)^1.6: full within
  1.5 tiles, faint at 8.5, silent past 9; pan = dx / 5 tiles (x.9) on a StereoPannerNode; a 650 Hz low-pass when a wall is
  in between; each zombie has its own pitch (x.86-1.14; armoured x.82, krampus x.62, bosses x.75) and favourite groan.
  Voices are procedural: a sawtooth throat + breath noise (+ a square for grit) with a pitch glide and wobble through three
  vowel band-passes gliding between two vowels. Four groans (moan, groan, gargle, sigh), a harsh snarl when one first sees
  her and starts chasing, the runner pants, the bloater gurgles, the screamer wails (its shriek is separate), the turkey
  gobbles. When: idle zombies every 3-6 s within 5 tiles (5-11 s further, heard within 9), investigating every 2.5-5 s
  (70% on the alert), rising from sleep, chasing every 3-7 s, the screamer's call, the stoop wanderer (faint from the
  street). Limits: each zombie waits 3.5-4.5 s between groans (snarls: 4 s between snarls), at most 2 at once, one start per
  .45 s (a snarl skips the spacing). SFX.play('groan') (weekly boss, horde arriving) is the new voice, centred. Respects the
  sound-effects slider (none at 0). Raiders never groan.
- Demo for the owner: mockups/music/looting-demo.mp3 (44 s), rendered offline with the game's own WebAudio code.

## Done in 0.23.1 (owner: "as a hunter if I run out of arrows I'm f*cked ... adding fists in general would help")
- A bow with no arrows (quiver + pack) is swung as a club: "Bow bash", 15 dmg (x quality/skills), fists timing, reach 1.3, no
  bow wear; a one-time toast "Out of arrows - bashing with the bow".
- The weapon swap sheet always offers Fists when she holds a weapon: the weapon goes back into the pack (needs a free slot).

## Done in 0.24.2 (owner on the synth groans: "that does not sound like zombies" -> picked prototype #5, the snarl)
- Plain zombies (and armored / bosses) now groan and snarl from a pre-rendered bank in the #5 style: vocal-fry growl source
  (jittered glottal pulses + period doubling), pulse-gated rasp, sliding vowel formants, hard throat drive
  (mockups/groans/growl.py + bank.py). One mono sprite next/sfx/zombie.mp3 (~127 KB): 4 snarls + 6 groans, loaded after the
  first tap, played through the same positional chain (distance gain, pan, wall muffle), pitch varied per zombie.
- The synth voices stay as the fallback until the file is in, and for the runner pant, bloater gurgle, screamer wail, turkey.

## Done in 0.24.3 (owner: "make it so that we can't get the same blueprints")
- D.pickBP: every blueprint roll (loot tables, jackpots, deep runs, route caches, crates) skips blueprints she already knows,
  carries (pack/stash/hands/run pack) or rolled in the last 30 min (no two of the same in one house). All known -> a pocket
  watch. One rnd() per roll either way (seeded daily house stays in step). Dot's shop and quest rewards skip carried ones too.

## Done in 0.24.4 (owner: "I'm getting arrow blueprints as a hunter")
- Hunters know Arrows from the start, so 0.24.3 already skipped bp_arrow in new rolls - but containers pre-rolled before it
  (a house's cabinets roll when she walks in; today's route was made at midnight) still held them. D.toStacks now swaps any
  blueprint she already knows for one she can use (D.pickBP) at the moment a container opens.

## Done in 0.24.5 (owner: "is there a way to increase our stash space" / "make a discard button")
- Base piece Storage (3 upgrades): Shelving unit +10, Storage lockers +10, Shipping crate +20 -> stash 40 -> 80 slots.
  Costs (before the 0.14.1 x2): 1,500 / 3,000 / 6,000 build steps + wood/nails, scrap/nails/tape. Not a horde target.
- Gear tab: Discard (or "Discard all N") on backpack and stash items, tap twice; quest items can't be discarded.

## Done in 0.24.6 (owner: a player typed 3k steps, sold to Dot, typed 3k again ... in a loop)
- Dot: at most 3 visits a day (trader.vday / trader.vn; a visit = shop opened or junk sold, as before), the same rule for
  everyone - typed steps are NOT treated differently (only one player types; a typed-only rule would just punish her).
  After the 3rd she is "closed for today". A Dot stop on the daily route still opens her and gives one extra visit
  (Game.dotBonus). Rejected: back at midnight (free daily visit), typed steps at half for Dot (unfair to the one typer).

## Done in 0.25 (owner: "The map servers are busy - timed out" on her phone)
- map.js now gets its data from OpenFreeMap vector tiles (https://tiles.openfreemap.org/planet TileJSON -> the dated tile
  URL, kept 3 days in localStorage dm-next-ofm; z14 tiles, ~0.3 s each from the CDN, CORS open). mvt.js is a small MVT
  decoder written for the game. tileEls() turns a tile into the Overpass-style elements encode() already read, so drawing,
  the IndexedDB square cache (CACHE_V 3: old Overpass squares are refetched once), landmark and privacy rules are unchanged.
  - Streets: transportation class -> highway (minor = residential, ramp = *_link, path subclasses -> footway/steps/
    pedestrian), tunnels dropped, lines clipped to the tile (no doubles at tile edges). Sidewalks are not marked in the
    tiles: a footway with 70%+ of its points within ~14 m of a street is dropped (the curbs draw sidewalks).
  - Street names: transportation_name lines become label-only records (5th field of a road record = 1).
  - Parks/woods/water: park (park, nature_reserve), landcover (wood; grass incl. park/garden), landuse (cemetery, pitch,
    playground ...), water (not swimming pools); outer rings with their holes.
  - Buildings: one footprint per outer ring, kept only by the tile its middle is in; id from its position (stable).
  - Places: poi subclass -> the old amenity/shop tables (pharmacy, police, fuel, school, laundry, bodega types, garage).
    Houses: a housenumber point inside (or within ~3 units of) a footprint; 4+ levels (render_height / 3) or the usual
    hash mix for row houses; 6+ levels or > 900 m2 = apartments; street = nearest named street within 30 m.
- Measured (Bed-Stuy, headless, real tiles): first square ready in ~1.0 s (was 13-40 s or a timeout); ~1,400 buildings,
  ~90 places per square, 123 KB record. Tiles blocked -> the 0.19.2 Overpass path runs as before (checked).
- Credit line: "OpenFreeMap (c) OpenMapTiles - (c) OpenStreetMap contributors".

## Done in 0.25.1 (Isabel types ~12k steps in one go; Dot then left after one visit and stayed away)
- Dot's return is now trader.ready (the step total when she is next back; old saves: away + 3,000). On a visit:
  ready = max(old ready, walked - 6,000) + 3,000, so steps she did not need carry to her next returns (up to 6,000 = two
  returns). 12k at once -> visit, visit, visit (then the 3-a-day cap). Same for everyone; no visit without steps.
  A route Dot stop sets ready to now.

## Done in 0.26 (owner: "more cosmetics, gachapon", "thanksgiving themes now, Christmas 2 weeks before", "an event for Christmas / Thanksgiving decorations for our base")
- Event windows: Thanksgiving from 2 weeks before Thanksgiving to the Tuesday after (2026: Nov 12 - Dec 1); Christmas
  Dec 11 - Jan 2 (was Dec 18).
- Capsule machine (gacha.js, home card on the Houses tab): a token = a random cosmetic (D.COS src 'gacha'; event ones with
  ev only while that event runs). Odds c 55 / r 30 / e 12 / l 3; pity: the 10th pull without an epic+ is epic (80) or
  legendary (20). Unowned first; duplicates are sold to Dot (Game.unlockCos). During a holiday 1 pull in 4 is holiday decor
  (to the stash). Tokens: 1 per 4,000 steps of SV.walked, max 3 a day (steps past the cap do not bank), or 50 caps; new
  saves start with 1. SV.gacha = { tok, at, day, dayTok, pulls, pity }.
- New cosmetics (art.js): all-year capsules catears, bowtie, tracksuit (c), crown, starshades, cape (r), halo (e), batwings
  (l); Thanksgiving capsules leafcrown, flannel (r), turkeyhat, cornback (e); Christmas capsules antlers, sweater (r),
  elfhat, giftpack (e); Deck the base prizes strawhat (Thanksgiving) and starhat (Christmas), legendary, src 'festive'.
- Holiday decor (D.DECOR with ev; art in base.js): Thanksgiving d_scarecrow, d_hay, d_cornu, d_fallwreath, d_garland;
  Christmas d_xtree (glows), d_snowman, d_wreath, d_stockings, d_presents. Sources: Dot's holiday shelf (2 a day,
  price v x 6 caps), event loot (pantry/storage; hutch/dresser/cellar) and the capsule machine.
- Deck the base (gacha.js, home card while the event runs): counts that event's decor placed at the base (SV.base.decor).
  2 / 5 / 8 placed -> 2 tokens + 40 caps / 3 tokens + 80 caps / ev.deckCos + 100 caps; SV.deck['<id>-<year>'] = claimed.

## Done in 0.26.1 (owner: "Decorate should have a rotate not just a turn")
- Decor edit bar: Rotate (quarter turn: front, side, back, other side) + Turn (mirror). Placed decor: r = facing 0-3,
  m = mirrored, rv 2 (old saves: a 'flip' piece with r 1 becomes m 1). Side-on (r 1/3) turns the footprint of long pieces
  (any non-wall piece now, not only rot 'swap'). Wall pieces only mirror.
- Art (base.js): side views F.<art>S (armchair, sofa, bookshelf, bench, flower box, hay bale), back views F.<art>B
  (armchair, sofa, bookshelf, gnome, scarecrow, snowman). Pieces without one: round ones mirror, the table draws itself in
  the turned footprint. Facing 3 = facing 1 mirrored.

## Done in 0.26.2 (owner: "pls add instructions to the game" / "a tutorial" / "tell them how to set up FIRST, especially the steps")
- tour.js: a guided spotlight tour of the home screen (dim + hole over each part, card with Back / Next / Skip; parts not on
  screen are skipped). It OPENS WITH SETUP: 1) why steps matter, 2) Sign in (button opens the account panel), 3) Step sync
  (button opens the sync guide; the tour waits while a panel / guide is open, then comes back to the same step), 4) typing
  as the fallback. Then ~19 parts: needs, skills, wardrobe, horde, base, event, boss / deep / crew tiles, Houses, Route,
  Dot, daily, Deck the base, capsules, a house's Loot, Gear, Workbench, Map, Settings.
- Starts by itself right after a new character is made (before the tutorial house; tips wait: showTip skips while
  DM.Tour.active(), Game.tipNext() after), and once for existing saves when home is idle. SV.tourDone. Replay: Settings >
  Game tour, How to play > Game tour.
- New first-time tips: trader, gacha, deck, decor (edit mode), route (Route view). The map keeps its own intro.

## Done in 0.26.3
- Storage (owner: "the storage sucks too much ... some way to sell besides the trader ... make the stacks higher?"):
  D.STACK about doubled (food/drink 6, bandage/meds 10, scrap/wood 20, nails 40, cloth 10, tape 6, battery 8, ammo 60,
  arrows 30, seeds 20, crops 6...), and sell junk now stacks (book/watch/jewelry 5, wrench 3). D.mergeStacks folds partial
  stacks together on load and on Sort (durability / quality items never merge). Quick sell: with Dot away or closed for
  the day, Stash > Quick sell junk pays half her price (a scrap dealer; not a Dot visit). Stash slots unchanged (40-80).
- Tour (owner: "dont move on to the next steps until they complete the tutorial"): the first run cannot be skipped, and
  setup steps lock Next until done: signed in (NET.handle); synced steps seen (NET phone reading in the last 14 days) or
  "My phone can't sync" (SV.tourNoSync) and then steps logged (the step box is tappable through the overlay). Replays from
  Settings / How to play can skip.

## Done in 0.26.4 (owner: "the tutorial didnt make the steps mandatory ... SHOW them and wait for them to set it up before moving on. everything else can be skipped ... thats the hardest part to set up")
- syncguide.js SYNC.setup(cb): the guide opens LOCKED (no close, no "type my steps" options) with a sticky banner
  "waiting for your first sync"; pulls NET every 8 s; a step post newer than setup start - 5 min (NET.lastPost) ->
  "Synced!" + Continue -> cb(true). After 3 min a small "My phone can't sync - type my steps instead" (confirm) -> cb(false).
- tour.js: the sync step opens that guide by itself and only unlocks with SV.syncSetup (a fresh sync - old phone data no
  longer counts) or SV.tourNoSync (then the typing step requires logged steps). Setup can never be skipped; everything
  after it can ("Skip the rest"). SV.setupDone; a save that finished the old tour gets the setup alone (+ "All set").

## Done in 0.26.5 (owner: "make it so that people can see which parties to join" / "Capsule machine should be in its own tab" / "thanksgiving or any event should have their own tab")
- Parties: new RPC next_party_list(h,t) (next/party.sql, applied to Supabase as migration next_party_list; read-only,
  dm_check auth) -> every party with members. NET.partyList(). Horde > Party lists them with Join (or Switch, tap twice,
  when already in one; full parties say Full) and still has "start your own" by name.
- Home tabs: Houses, Gear, Workbench, Map, Capsules (the capsule machine draws inside the tab: GA.renderPane; the last pull
  stays shown for 20 s across redraws), and an event tab (glyph + short name, only while an event runs): Deck the base
  card, the event page (eventHTML, also used by the sheet), See Dot, Holiday capsules. The event banner opens the tab.
  Two rows of three (div#mtabs wraps). The capsule and Deck cards left the Houses list. Tour steps point at the new tabs.

## Done in 0.26.6 (owner: "more character customizations, more hair unlocks somehow through gachapon, more clothes, more eyes" / "change the dead miles logo to a cuter one. With christmas theme")
- Looks (art.js LOOK): hair styles 6-11 (Ponytail, Mohawk, Afro, Side swoop, Braids, Spiky; HAIR_BACK / FRINGE / BRAIDS),
  eye styles (EYES 0-7 replace baked lines 97-100: Round, Sleepy, Happy, Wide, Sharp, Starry, Dot, Wink) + eyeC (8 iris
  colours, free), +4 jackets (Cream, Forest, Wine, Lavender), +3 pants. look.eyes / look.eyeC (LOOK.def).
- Unlocks: D.LOOKUN (data.js; D.LOOKS was already the old coat list) - hair 6-11 and eyes 1-5,7 are capsule unlocks
  (wardrobe.looks[key]); free: hair 0-5, eyes Round + Dot. The machine adds unowned looks to its pool (never duplicates),
  shows them with LOOK.previewURL head icons. Edit look shows them with a lock; tapping one says where to get it.
- Capsule outfits: overalls (c), trench (r), labcoat (e), tux (l).
- Logo (logo.js): bubbly monoline letters (ink + colour + shine strokes). Christmas season (Nov 15 - Jan 6): red/green
  MILES, snow caps, Santa hat, holly, fairy lights, snowflakes. DM.Logo.full() on the title screen, DM.Logo.mini() in the
  home header and the character screen. title.js keeps the old LOGO as a fallback.

## Done in 0.26.7 (owner: "a prompt popped up briefly that said the wall sounds hollow but it never shows again ... i also cant find what its talking about")
- house.js: a secret hint (hollow wall / creaky floor / odd shelf / attic hatch) marks the secret noticed {room, what} for
  the run. #secchip (under the quest chip) lists noticed, unfound secrets with what is still needed: "search N more spots
  first" (the gate), then the tool ("needs a crowbar or pry bar" / "a hook pole") or the action. A gold "?" pulses on the
  minimap there, and when the gate opens a toast says to go back to it.

## Done in 0.26.8 (owner: "david said hes having trouble syncing steps with android" -> "add more directions for android")
- Diagnosis: his phone posted 11 times (handle/token fine, read permission granted) but every post was 0 steps - Health
  Connect was empty because no step counter shared into it.
- Sync guide, Android step 3 rewritten: why Health Connect needs a step counter app, per-phone directions (Samsung Health,
  Google Fit, Fitbit/Garmin/Oura), and how to check today's steps in Health Connect. The Test result says "connected but
  sent 0 steps" (Android) and points to step 3. Setup mode (tutorial) does not accept a 0-step sync after 10 AM.
- Android app (StepsWorker): a 0-step read after 10 AM sets the status line to "Health Connect has 0 steps for today ..."
  with the fix. The APK is rebuilt by the Pages workflow (apk job).

## Done in 0.26.9 (owner: "how do we get it to be a homescreen app" -> "that should be step 1 for iphones AND androids")
- next/manifest.json (its own: start_url/scope ./, icons from the root) + manifest / apple-touch-icon links: installs as a
  full-screen app at /next/.
- install.js: before a new player makes a character, on a phone not opened from the icon, "Step 1 - put Dead Miles on
  your home screen" with this phone's steps (iPhone Safari Share; Android Chrome menu + a one-tap Install button when
  beforeinstallprompt fires; Samsung Internet menu). iPhone warns the home-screen app keeps its own save. "Continue in
  the browser instead" (per session; iPhone asks to confirm). The tour's setup also starts with it when still needed.

## Done in 0.26.10
- Strays (owner: "we cant approach slowly because its auto run"): a normal walk no longer scares them (limit 1.9 -> 3.2
  tiles/s; running, swinging and dodging still do), and within 4.2 tiles of a hiding stray she cannot run (crew.js sets
  G.calmUntil, house.js checks it). Hints now say "just walk up to it".
- Brass keys (owner: "brass keys have 0 use so far"): GV 5 (newly scouted + not-yet-started houses; the daily stays GV 4)
  has more locked rooms (20% default; mansion/police 50%, pharmacy 35%, school 30%) and parked cars (32%); placement still
  fails sometimes (rowhouses measured 13% rooms, 18% cars). House cards tag "🔑 locked room (· key inside)" and
  "🔑 locked car". The key's item tag says what it opens.

## Done in 0.26.11 (owner: "i always forget to bring lockpicks on my run ... something should show if we dont carry any or a crowbar")
- game.js lockCheck(h, go) before loot(): a house with locks (h.nLocks) and no lockpick / crowbar / pry bar in the pack or
  hands opens "No lockpicks or crowbar": Take N lockpicks from the stash (up to a stack) / Take the crowbar / Go in anyway
  / Cancel. With none in the stash it says where to get them. Not for the tutorial house. loot(h, checked).

## Done in 0.27 (owner: "add npcs to houses that require aid or help, we can go back to those houses to submit a quest but will take steps")
- npcq.js: 1 house in 8 (deterministic per seed; not tutorial / daily / Dot quest / route houses, never with a hiding
  survivor; the antibiotics request at half rate) has someone standing inside with a "!" bubble (crew.js draws them with a
  survivor rig and adds Talk). 7 requests (wound, family, thirst, radio, barricade, fever, lock), each with item options.
  Accept -> SV.npcq.list (max 3 open); the house keeps h.npcq and stays on the list (rollDay keeps it). After 1,500-3,000
  more steps of SV.walked the card shows Return: hand the items over from pack + stash -> caps (25-90), XP, a supply bundle,
  30% a capsule token, 12% a quest cosmetic, 20% they ask to join the crew (bunk free). Give up from the Return sheet.
  Needs show as gold QUEST ITEMs in loot, in the quest list and the HUD chip.
- Also fixed: 0.26.10 had doubled the 🔑 tags (the 0.8 ones already existed); the old tag now says "· key inside".

## Done in 0.28 (owner: "yes build armor and the streaks + expeditions + milestones")
- Armor (armor.js + data.js): survivor.armor = { k, d }; armor_pad (-10%, dur 60, craftable: cloth 5 + tape 2, blueprint),
  armor_sport (-15%, 80), armor_riot (-25%, 120, steps x1.15 louder), armor_plate (-35%, 160, x1.25 louder, speed x.93).
  house.js hurtPlayer -> DM.Armor.hit (damage x (1 - red), wear 60% of the raw hit, breaks at 0); speed and step noise
  read slow / loud. Gear > Equipped has an Armor slot (Wear / Take off / Repair with 2 cloth or 2 scrap for +50%). Loot:
  coat, wardrobe (pad), gym, garage (pads), locker, armory (vest, plate), horde crate; Dot level 2-4; icons via ART.addIcons.
- Walks tab (walks.js): daily streak (5,000 effective steps, claim; consecutive days grow it; one freeze a week covers a
  missed day; 10 + 2/day caps (max 40), bonuses day 3 / 7 / 14 / 30, every 7th after; "Iron Legs" title at 30),
  expeditions (6 Brooklyn destinations 8k-40k steps of SV.walked; finds at 25/50/75%, a crate at 100%: horde-crate
  rolls, caps = steps/100, 1-3 capsule tokens; repeatable, one at a time), milestones (lifetime SV.walked 25k ... 2.5M:
  caps, tokens, halo at 500k, bat wings at 1M, a title; pick a title shown under your name). Tab badge "!" when
  something can be claimed. Tabs: 4 per row now.

## Done in 0.28.1 (owner: "can you let isabel bypass the tutorial" / "only her")
- tour.js: handles on NET.cfg.trustedTyped (only 'isa') skip the setup steps (sign in / sync / typing); an existing save
  is just marked setupDone. Everyone else still has the required setup.

## Done in 0.28.2
- New app icon from the cute logo (regular colours - an installed icon cannot follow the seasons): next/icon-180 (iPhone
  apple-touch-icon), icon-192, icon-512, icon-maskable-512 (manifest). Rendered from DM.Logo.full(false) by headless
  Chromium. iPhone keeps the old icon until the home-screen app is removed and added again (the save comes back on
  sign-in: handle + PIN).
- Bug (owner: "when i click map and leave it, the map button gets squished"): map.js injected "#mtabs button.maptab
  { flex: .7 }" on first open (left from the one-row tabs); removed.

## Done in 0.28.3 (owner: "there should be an option to sign in before character creation if you already have an acc" / "it still prompts me to do a mandatory step sync which my acc already has ... i cant leave it")
- Create screen: "Already playing? Sign in" (opens the account panel). netpanel calls NET.onSignedIn after a sign-in;
  game.js pullCloud() (shared with boot) loads the account's cloud save at once - before, only on the next start.
- Setup: an account whose phone already synced (NET.steps.phone or a phone reading in the last 14 days of the step
  ledger) counts as set up: the tour's sync step is done, the setup-only run is skipped, and the locked sync guide
  unlocks at once (lockCheck on open + DM.Tour.syncedBefore).

## Done in 0.28.4
- Sign-in confirmation (owner: "it should say are you sure you want to sign in to this acc ... what if someone
  accidentally clicks the wrong acc"): netpanel's Sign in now asks "Sign in as @handle? This phone will switch to that
  account and load its saved game" with Cancel / Yes, sign in. NET.openPanel(tab): the create screen's "Already playing?
  Sign in" opens straight on the "I already play" form.
- Bug (owner: Deep run / Weekly boss sheets overlapped by the tabs): #msheet / #mres had no z-index, so the sticky header
  (z 5) and tabs (z 4) painted over them once the page was scrolled. Now z-index 10 (title 20, tips 25, cospop 30).

## Done in 0.28.5 (owner: "Houses aren't refreshing as i walk on the map" - the map's house icons)
- Cause: from 0.25 a house needed a tile housenumber point; outside Brooklyn most buildings have none, so few icons.
  map.js tileEls: unnumbered building footprints (35-2,500 m2, within 40 m of a named street, 1 in 3 by id) become
  houses named "House on <street>" / "Apartments on <street>". CACHE_V 4 (squares refetched once).
- The credit line had been garbled by a sed '&' in 0.25 (two overlapping lines, "copy;"); fixed. The map header now
  says "N places · N houses nearby".

## Done in 0.28.6 (owner: "Nothing happens" at a bodega she walked to; "I walked here tho")
- map.js: the walk-to rule was "a place counts once you were > reach + 15 m from it with the map open" (65 m with fuzzy
  GPS) - easy to miss, and nothing on screen said when it was met. Now M.walkedM adds up real movement with the map open
  (fixes <= 40 m accuracy, steps 6-120 m); after 80 m every place counts (the old per-place rule still works too). The
  card says "walk N m more (anywhere) to scout it". Reset when the map closes.

## Done in 0.28.7 (owner: "Auto claim kind of sucks because we walk past better areas ... The bigger better loots should replace the rowhouses" - automatically)
- Landmarks: LM_RANK police/mansion 9, school/pharmacy 8, garage 6, bodega 5, apt/laundro 4, rowL 3, rowS 2. With today's
  3 found, addLandmark replaces the lowest-ranked of today's landmark houses that is still new (no run, not a quest / NPC
  house) when the new place ranks higher; returns 'upgrade' (Game.lastReplaced). The day's count does not change.
  map.js picks the best-ranked place in reach first, and with 0 left only upgrades glow / get claimed; the banner says
  "Upgraded! Replaced <name>". New landmark houses keep h.lmKey.

## Done in 0.28.8 (owner: "the map autoclaim should work even if we don't have it open. Or change it to be something we can actually use while walking")
- A web page gets no location while closed / locked (iPhone and Android browsers), so: Pocket mode (map.js, 🚶 button in
  the map header): a nearly black, touch-locked overlay (#mvPocket) that keeps the screen awake (wake lock, re-requested
  when the page becomes visible again) and keeps claiming; shows found x/3, the next place + distance or the status, metres
  walked, the last claim (flash + sound). The map stops drawing under it. Hold the button ~1.1 s to exit.

## Done in 0.29 (owner: "a more interactive map that i wont be stopping to play" -> "Radio calls, dots deliveries, supply drops, and maybe fog of war")
- mapfx.js, driven by map.js (onPos -> MapFX.onPos(pos, walkedM); draw -> drawFog under the places, drawMarks over them;
  renderCard -> renderFx strip #mvFx; Pocket mode shows the top 2). Only while the map is open.
  - Supply drops: <= 2 on the map, 3 a day, at map places 120-450 m away; collect within 25 m (+acc/2): storage + crate
    loot. Air drop: 1 a day after 300 m walked, 20 min, 2 horde-crate rolls + 30 caps + 50% capsule token.
  - Radio calls: after 200 m, 5% per fix, max 2 a day: a place 300-700 m away, deadline = walk time x 1.6 + 4 min;
    35 caps, 20 XP, a supply item. Expires quietly with a toast.
  - Dot's delivery: 1 a day from the map card: pick-up 150-450 m, drop-off 400-900 m from it; 45 + length/40 caps,
    25 XP, 35% capsule token.
  - Fog of war: ~25 m squares (lat .000225 x lon .0003) walked = 3x3 around each good fix; dark overlay on the rest
    (toggle). XP every 40 squares, small finds (.4% a square), milestones 250 / 1k / 3k / 10k (caps + tokens).
  - Privacy: spots and squares only in localStorage dm-next-mapfx (never the save / cloud; checked: no lat in SV).

## Done in 0.29.1 (owner: "on the right side of the map there's a small room? I can't get there" - the daily store's attic)
- Attics are separate rooms (Z) reached by a ceiling hatch + a hook pole that is always hidden in the same house. Without
  the pole nothing was shown. Now: once the secret gate is open every unfound secret is marked noticed (clue chip +
  minimap "?" + "go back" toast) with its room; and standing at a hatch / hollow wall without the tool shows a NeedTool
  label ("Attic hatch · needs a hook pole (it is in this house)", "Hollow wall · needs a crowbar or pry bar").

## Done in 0.29.2 (owner: "my bow broke. Now i don't have any way of making one as a hunter" / "or even upgrading it")
- Recipe bow (wood 3, cloth 2, tape 1); hunters know it from the start (new saves and migrate()); others need bp_bow.
- Gear item actions: "Upgrade to <next tier>" for any weapon (pack, stash or hands): Rusty->Worn 2 scrap; Worn->Solid
  3 scrap + 1 tape; Solid->Fine 5 scrap + 2 tape + 40 caps; Fine->Masterwork 8 scrap + 3 tape + 100 caps. Sets q + 1
  and refills durability to the new max (+8% damage, +15% durability per tier).

## Done in 0.29.3 (owner: "in dots shop we should have an option to auto sell junk with a button")
- Dot > Sell: "Sell all junk · N items · caps" at the top (tap twice): every pack + stash item with category 'sell'
  (D.cat - no crafting / base use) at her normal price. Single-item Sell rows unchanged.

## Done in 0.29.4 (owner: "Cars should have an alarm system that activates with a 50% chance ... hordes of zombies
should come but don't make it too hard")
- house.js carAlarm(): when a parked car is unlocked with the brass key, 50% chance (seeded by L.seed, so a reload
  does not reroll) the alarm wails ~8 s (SFX alert + noise radius 7, light shake) and 3-4 plain walkers (5 at
  gamestage 20+) arrive from both ends of the street, 1.4 s apart, heading for the car. No specials, no runners.

## Done in 0.30.0 (owner: "add guns and more equips ... be goofy, a turkey squishy that makes noise every time you hit,
Christmas lights to whip" + "zombies should be more difficult as we progress")
- Guns (WEAPONS.*.gun = pack item used per shot; fireGun() in house.js, bullets ride G.arrows with a.bullet):
  pistol 58 dmg (9mm rounds, noise 8), shotgun 5 pellets x 30 short range (new item shells, noise 10), nail gun 22
  (nails, noise 2.2). No rounds = pistol-whip (18). Where: police gun locker jackpot (pistol 3/13, shotgun 2/13), trunk
  jackpot, rare in car / safe / locker / evidence / nightstand, armory shotgun + shells, Dot (pistol rank 4, shotgun 5,
  shells 3, nail gun 3). Recipes: nail gun (bp), shells (bp, scrap 2 + 9mm 4).
- Goofy melee: brass knuckles (fast; everyone knows the recipe: scrap 3 + tape 1), squeaky turkey (SQUEAK on every hit,
  1.7x knockback), light-string whip (reach 2.3, wide arc, sparkles; bp: battery 2 cloth 1 tape 2), frying pan (BONK,
  dazes +0.45 s). Loot spots in data.js (0.30 loop before hordecrate). Icons + held art in art.js.
- Difficulty: D.gsFx ramp now starts at gamestage 4 (was 10): HP up to +60%, bites +40%, chase speed +15% at gamestage
  50; specials at danger 2 from gamestage 14 (up to 20%).

## Done in 0.30.1 (owner: "when we click on stuff in our backpack or stash we have to scroll all the way to the bottom to
click eat or drink - make a pop-up next to it")
- game.js itemPop(): the selected item's action card (#sacts, built as before) moves into a fixed #ipop on <body>,
  placed under the tapped slot (above it if no room), with a pointer arrow and a close button. Follows scroll and
  resize; a tap outside it (not on another slot) closes it.

## Done in 0.30.2 (owner: "when I walk to a place that's not at my home it doesn't automatically collect ... we have to
walk like 100 m ... pinpoint where someone's base is and don't let them [claim] around that area at home")
- map.js home spot: localStorage 'dm-map-home' {lat, lon (4 dp), t}, this phone only, never synced. Asked once per map
  visit on a good fix until set ("Are you at home?"); the 🏠 top-bar button shows it / moves it (once per 7 days).
- walkedTo(pl): places more than HOME_R (250 m) from home count at once; inside the home zone (or with no home set)
  the old rule stays (been away from it with the map open, or WALK_OK 80 m walked). Dashed orange ring on the map.

## Done in 0.30.3 (owner: "how can we prevent people from cheating? ... I go to my boyfriend's every Friday, so my base
kind of changes on the weekend")
- Up to 2 home spots (dm-map-home is now an array; old single object still read). Adding one is always allowed (it only
  protects more ground); with 2 set, the oldest can be moved once a week.
- Learned home zones (dm-map-spots): the ~110 m square (lat/lon to 3 dp) she opens the map in is noted once per map visit
  per day; a square seen on 3+ different days counts as a home zone too. So a fake home far away does not free the real
  one for more than a couple of days. Learned zones draw as a fainter ring.

## Done in 0.30.4 (owner: "explain the routes and map better for new players" / "the tutorial for the map should show and
people should be able to click a ? for help if they somehow skip it")
- Map: 3-page guide (places / home spots / map jobs + Pocket mode), shown once (key dm-next-mapintro2, so existing
  players see it once too), ? in the map's top bar reopens it; the home-spot question waits until it is closed.
- Route: route.js R.guide() - 5 steps in plain words + a legend of every stop kind; shown once the first time the Route
  view opens (dm-route-guide), and from a ? in the route header.
- Home tabs: a round ? at the end of the tab bar opens the help for the current tab (Houses/Route, Gear, Workbench,
  Walks, Capsules, event) even if tips were seen or turned off (Game.help). New TIPS: gear, bench. Tour map step text.

## Done in 0.31.0 (owner: "add interactive questing on the map ... if you walk to a certain area, you can do a quest")
- mapquest.js (DM.MapQ), driven from mapfx.js onPos; localStorage dm-next-mapq (phone only).
  - Survivors (❗): 1 on the map at a time, 2 a day, at a real place 150-450 m away. Walk up -> dialog -> "I'll help".
    5 quest chains (QUESTS): dog (clues -> choice -> back), meds (bring meds / antibiotics / 3 bandages), radio (bring 2
    batteries -> choice), list (3 stops -> back), vex (a risky choice). Steps are real places picked when the step
    starts (❓ marker + line on the map card). One quest at a time, kept across days; "Drop quest" on the map card.
  - Encounters: first visit of the day to a marked (non-house) place, 45% (seeded per place + day), max 3 a day; two
    choices per building type (ENC), outcomes seeded. Hurt = HP down to 10 minimum.
- Fix: Dot > Sell "Sell all junk" showed a giant caps icon filling the button (img had no size).
- Sync guide: Open URLs always opens Safari on iPhone (Apple limit); and "more steps than Health shows" = iPhone + Watch
  summed - set Group by: Day. (Owner's server log showed the shortcut itself posting 4,783.)

## Done in 0.32.0 (owner, on the idea list: "i love all the ideas honestly") - 1 of 12: advent calendar
- advent.js (DM.Advent): Dec 1-24, 24 doors; today's door after 3,000 effective steps; after it, each extra 3,000 today
  opens one missed door (2 a day). Seeded prizes per year+door: small supplies, 6 = token, 12 = light-string whip,
  18 = blueprint, 24 = Christmas cosmetic (first not owned) + 150 caps + 2 tokens; 20+ doors -> Masterwork whip too.
  Home tile (first in This week) -> card sheet. SV.advent = { y, open, extra }.
- Build order agreed for the rest: base raids, job skill trees, bestiary, achievements + titles, weapon mods,
  companion on runs, multi-day + legendary map quests, weather/night bonus, party step goal, friends step race,
  friend gifts + trading.

## Done in 0.33.0 - 2 of 12: base raids
- base.js B.raid(): from 5 PM, once a day, a base with anything built has a 40% raid (seeded by day + seedBase).
  3 hours to defend: a 2.5-minute watch-shift-style fight (S.raid) with 7-12 walkers (+1 per 8 gamestage, scaled by
  gsFx); walls, spikes, wire and crew guards work as on a shift. Win: 25 + 3/kill caps, XP, a horde-crate roll.
  Down or leaving with walkers left = one piece breaks (B.hordeDamage). Not defended in time: defence vs strength
  (18 + 1.6 x gamestage + 2 x walkers) - held (+15 caps) or one piece breaks. Home tile "Base raid!" (first).

## Done in 0.34.0 - 3 of 12: job-only skill trees
- skills.js: a 6th tree per job (only: job id; SK.trees(s) filters): Tracker (hunter: arrows never snap, bow range
  x1.4 + 10%, sneak x2, Volley 2nd arrow), Pack mule (scavenger: +5% extra find, +2 pack, +5% rare, +10 stash),
  Shadow (thief: searches -20% noise, dodge -25% stamina, picks -35% breaks, sight -20%), Bruiser (brawler: +10 HP,
  +10% melee, Last stand heal 25 once per run under 25% HP, Cleave arc x1.3), Tinkerer (mechanic: wear -25%, +10
  base defence, guns skip a round 25%, crafted weapons +1 tier). Costs 1/2/2/3. Hooks: house.js, game.js
  (stashSlots, craftQuality), base.js (defense). Ranks from another job's tree are dropped in SK.norm.

## Done in 0.35.0 - 4+5 of 12: bestiary + feats & titles (codex.js, DM.Codex)
- Bestiary: kills per kind (walker = no kind, runner, bloater, screamer, armored, turkey, krampus) counted by wrapping
  Game.onKill; 10/50/200 kills = +5/+10/+15% damage vs that kind (house.js hitZombie, her hits only). ??? until killed.
- Feats (15, ACH): kills, runs, secrets, bestiary, pan / squeaky-turkey / gun kills (by weapon in hand), raids won
  (base.js flag), map quests, the bodega cat (mapquest ENC flag), cosmetics, base tiers, advent. Each pays caps once and
  unlocks a title; titles join the Walks title picker (W.titles). Checked on home render (+ every 5 kills). Home tile.
- SV.codex = { kills, wk, flags, got }.

## Done in 0.36.0 - 6 of 12: weapon mods
- Mod slots on the survivor (s.mods = { melee, ranged }), not on weapons (so moving weapons around never loses one):
  Grip wrap (melee: wind/recovery x0.85), Nail studs (melee: +15%), Scope (ranged: auto-aim range x1.4, +10%),
  Silencer (ranged: gun noise x0.4). Fit from the pack/stash item popup; the old mod goes to the stash. Shown in
  Gear > Equipped. Grip + nails known by everyone (BASIC + migrate); scope / silencer by blueprint, and as rare loot.

## Done in 0.37.0 - 7 of 12: a crew member on runs
- crew.js: one crew member can be marked m.mate ("Take on runs" in the crew sheet). In 'house' runs (normal + deep)
  R.mate follows her (like the pet), walks to and swings at the nearest zombie near her (16 + 3/level, guards x1.5,
  1.1 s cooldown, via House.hurtZombie so kills count). Medic: heals 12 + 3/level once per run under 40% HP.
  Scavenger: +10% (+2%/level) extra-find chance (house.js extraChance). Hungry members stay home. Drawn with a bat
  and a green name tag. Pets still come along as before (one pet + one crew member).

## Done in 0.38.0 - 8 of 12: story quests + the legendary Courier (mapquest.js)
- "The Coast Signal" (Marisol, 📖): 3 chapters (coast1-3), one a day - the day's first survivor is the next chapter
  if the last one was finished on an earlier day (s.story.coast, s.storyDay). Finale: caps, XP, token, Masterwork weapon.
- The Courier (⭐, legend): once a week (s.legWeek set when accepted), appears after 300 m walked with the map open;
  3 far drops (450-800 m apart); 200 caps, 120 XP, a token, a Masterwork weapon (payout r.master).
- Codex feats: Signal Keeper (story done), Courier's Friend (legend done).

## Done in 0.39.0 - 9 of 12: weather + night bonus
- weather.js W.bonus(): bad weather (rain/storm/snow/fog) +15% XP, +6% extra-find; night (8 PM-5 AM, or dark per the
  API near dusk/dawn) +20% XP, +8% extra-find, zombies +15% HP and +10% sight. Stack. House/deep floor 1 runs only
  (not the daily house, base, or boss arena): house.js G.wxb at run start (+ a toast), gainXP, extraChance, gsZombie,
  canSee (z.sightMul). Weather chip shows the bonus; map supply crates at night hold one more thing.

## Done in 0.40.0 - 10+11 of 12: party walk + friends race (social.js, DM.Social)
- publish() adds pub.extra.wk = { k: Monday key, s: this calendar week's steps } (from NET._ledger). No SQL change:
  next_get_board already returns pub.
- Party walk: the horde party's members' week steps vs 40,000 x members; claim half (30 caps) and goal (80 caps +
  2 tokens) once each per week. Friends race: board rows this week ranked; the phone keeps the latest standing
  (SV.social.race) and pays last week's place on the next week (1st 150+3 tokens, 2nd 100+2, 3rd 60+1, 20k+ 20 caps).
  Home tile "Walk together" (signed-in players).

## Done in 0.41.0 - 12 of 12: friend gifts & trading (gifts.js, DM.Gifts; SQL next/gifts.sql)
- Supabase migration "next_gifts": table next_gifts (RLS on, no policies), next_gift_send (auth, recipient must exist,
  1-5 stacks, n<=60, 15 sent/day, 40 waiting/recipient), next_gift_inbox (claim on read).
- Item popup (pack/stash, signed in): "🎁 Gift to a friend" - pick from the board or type a handle, how many, a note.
  Removed from her stash only after the server says ok. Inbox checked on home render (once a minute) -> stash + toast.
  Last 20 in/out in SV.gifts.log, shown in Walk together. Trading = gifting each other.
- All 12 ideas from the 2026-11-15 list are now built (0.32-0.41).

## Done in 0.41.1 (owner: "she needs 1 painkiller. I already have one on me, I should be able to submit it")
- npcq.js: talking to someone in a house who needs help, with the items already in the pack or stash: "Here - I have it
  on me" helps them on the spot (no walk, no Return). Same for a quest accepted earlier when you are back in the house.
  The reward shows in the in-run panel (reward(q, { panel, close })). A helped person just says thanks after that.

## Done in 0.42.0 (owner: "seeds should be more limited ... an overload of batteries, cloth rags, a ton of 9mm ...
either more things to craft, more storage or stacks, and reduce certain drop percentages")
- Bigger stacks: seeds 60, crops 12, wood 40, nails 80, scrap 40, cloth 30, tape 15, batteries 25, 9mm 150,
  shells 80, lockpicks 20, books 10. Old small stacks merge once on load (v.stack42).
- Drops: every LOOT table (not jackpots): seeds x0.4, batteries x0.6, 9mm x0.6, cloth x0.7.
- New recipes everyone knows: Pipe pistol (scrap 6, tape 2, wood 1; shoots 9mm, 42 dmg), Shock baton (scrap 3,
  batteries 4, tape 1, cloth 2; 26 dmg, stuns 0.6 s, sparks), Bandage roll (cloth 5 + tape 1 -> 5 bandages).
- Dot > Sell: "Sell extras" sells everything above 20 of each material / ammo / seed (pack + stash), tap twice.

## Done in 0.42.1 (owner: friends still named "Survivor"; horde night "kicked me out before I could loot the zombies";
"my crew members were useless during horde night, they weren't there")
- Names: a character still named "Survivor" takes the account name on the next publish (game.js publish, also nudged
  from the home screen); new characters with an empty name take it too. (Server: brooklyn, sheepshead, tomsoo.)
- Shift / raid end card: "Search the bodies (60 s)" - zombies still alive retreat, the gate swings open, a LOOT THE
  BODIES timer runs, Leave (or the timer) goes inside. Down = no loot phase.
- crew.js: on watch shifts and base raids every fed crew member is in the yard fighting (R.fighters, roam: chase any
  zombie within 7 tiles; guards x1.5, medics heal once). Guard defence on horde night is unchanged.

## Done in 0.43.0 (owner: "add army checkpoints or some unrealistic things to the map ... a lot more things to walk to
... unlimited things to do but not so much it's a job")
- mappoi.js (DM.MapPOI): ~1 in 14 real map places gets a made-up point of interest next to it, chosen by hash(place id
  + Monday week key) - fixed for the week, the same for friends, reshuffled on Mondays. 9 kinds (KINDS, weights):
  army checkpoint, survivor camp (rest +30 HP), vending machine, abandoned ambulance, quarantine tent, crashed
  helicopter*, zombie nest* (marks a danger house on the list, or burn it), radio tower* (clears ~260 m of fog), weapons
  cache* (a Solid/Fine weapon). * = once a week, others once a day. 8 a day max, then "done exploring for today".
  Two choices each, outcomes seeded (MapQ.ui dialogs). Nearest one shown on the map card; used ones fade.
- mapfx give() merges duplicate items in reward text. Map guide page 3 mentions them.

## Done in 0.43.1 (owner: "a ton of bandages and med stuff ... it never feels bad")
- data.js: bandages x0.45, painkillers x0.5, antibiotics x0.8 in every LOOT table, and the cut weight now goes to an
  empty draw (__none, skipped in rollLoot) - before, cutting a weight only shifted odds between the items left, so
  medicine cabinets still always gave medicine. This also makes 0.42's seed / battery / 9mm / cloth cuts really bite.
  Measured: medical containers ~0.34 bandages + ~0.24 painkillers each (was ~0.65 + ~0.47).
- Smaller medical rewards: pharmacy jackpot, bandage roll (3, was 5), NPC thank-you bonus, map places, Ray's list.

## Done in 0.43.2 (owner: "the side quests and stuff take up a lot of the screen", screenshot of a police run)
- house.js: the quest chip and the clue chip start as one-line pills ("📋 3 quests ▸", "🔍 2 hidden spots ▸"); tap to
  open the full text (G.qOpen / G.secOpen), tap again to close.

## Done in 0.44.0 (owner: "guns should have a reload and an ammo slot")
- Magazines: WEAPONS.*.mag / reload (pistol 8 / 1.3 s, shotgun 2 / 1.8 s, pipe pistol 3 / 1.9 s, nail gun 16 / 1.1 s).
  Loaded rounds live on S().hands.mag; firing uses them; empty = auto-reload from the pouch, then the pack. Manual
  reload: the ⟳ button next to the weapon chip, or R. Moving, no shooting while reloading; the grip wrap reloads 15%
  faster. Chip shows loaded/reserve. D.unloadGun puts loaded rounds back when a gun leaves her hands.
- Ammo pouch (s.pouch = { ammo <= 90, shells <= 30 }): like the quiver - no pack slot, never spilled; 9mm and shells go
  there first from any loot / reward / stash transfer (give, toStash, house addToPack), counted by countItem/takeItems.
  Gear > Equipped has an Ammo pouch card (fill from stash/pack, put in stash). Old pack ammo moves in on load.

## Done in 0.44.1 (owner: "there's sooo much 9mm ammo. Please check when things are too much of an abundance")
- Measured with a 60-house simulation (layoutOf + toStacks over every container; scratch audit.js): per house, before ->
  after: 9mm 6.6 -> 1.5, painkillers 1.5 -> 0.7, batteries 1.9 -> 1.3, nails 3.4 -> 1.7 (cloth ~2, scrap ~1.9 kept:
  crafting staples). Changes: 9mm 2-5 a find (was 4-12), shells 1-3, nails 2-5; LOOT weights 9mm x0.35, meds x0.3,
  batteries x0.42, nails x0.75 (cut weight -> empty draw); no container guarantees 9mm or painkillers any more.
  Smaller 9mm rewards: Dot (10 for 3 caps, rarer), NPC bonus 6, radio call 6, advent 6, weapons cache 5.
  RULE OF THUMB for new loot: re-run the audit; a consumable should come out below what a day of play uses.
- In-run backpack: weapon mods have "Fit (melee/ranged mod)".

## Done in 0.44.2 (owner: "I'm in a deep run on the last house. I can't leave")
- deep.js wayOut(): the FLOOR chip is tappable ("tap: way out" / "tap: get out"). Any floor: a toast with the direction
  and distance to the stairwell. Last floor: a card - walk there, or Leave now (opens the usual fire-exit choice ->
  Get out; loot goes to the stash as normal).

## Done in 0.44.3 (owner: "your crew should have HP and get attacked as well in horde night"; "before you pull the
capsule we should be able to see how many caps we have")
- crew.js: fighters (shift / raid) and the run companion have HP (80 + 8/level, guards +40), shown as a bar over the
  name tag when hurt. A zombie right next to one hits it every ~1.2 s (9 x its damage multiplier). At 0 HP: falls back,
  m.hurt = today (out of fights and runs until tomorrow, crew sheet says so), mood -8.
- gacha.js: caps shown next to tokens on the machine (tab + card); Buy is disabled when short.
- base.js tick guards a frame after the shift closed (an intermittent null S.shift error).

## Done in 0.45.0 (owner: "the UI is definitely still confusing ... for everyone that's new ... if you've never played
these type of games")
- game.js guideCard(): "What to do next" on the home screen (after the tutorial): the 3 most useful steps right now
  (defend a raid, low HP, skill points, food for the crew, a better weapon, a house to loot, sell junk to Dot, craft,
  open the map, walk to the next house), each tappable to the right place. Hide / show (SV.guideOff).
- Gradual unlocks for brand-new saves only (SV.unlocks = [] when a survivor is made with no runs yet; older saves have
  no SV.unlocks = everything open): Walks / Crew / Daily / Event tab at level 2, Capsules / Codex / Walk together at 3,
  Weekly boss / Deep runs at 4. Each unlock shows a short "Unlocked" card once (UNLOCK table, unlockPops). Game.unl(k).

## Done in 0.46.0 - camps (owner: map raids "like the Walking Dead Governor taking over every campsite", other parties can
take them, friends far away; tribute only for a special store with expensive pack/stash space; party raids; "I expect
people to die. I want it to be a real fight")
- Server (next/camps.sql, migration next_camps): next_camps (12 rows, start as Bandits), next_camp_log, next_camp_rally;
  next_camps_list, next_camp_take (12 h safe after a capture, 3 captures/day/player), next_camp_fortify (+15, once a day,
  max 250), next_camp_rally (party mates at the same camp in the last 30 min).
- camps.js (DM.Camps): every ~2 km cell (0.02 lat x 0.025 lon) has its own copy of all 12 camps, placed by hash(camp +
  cell) and snapped to the nearest loaded map place - friends walking together share spots, far-away friends get local
  ones; ownership is shared. 🏴 markers (red bandits / green yours / blue others), nearest one on the map card.
- At a camp: dialog -> Raid (3 attempts/day) or Fortify (your side). Raid = DM.House.start of a generated building with
  opts.camp: raiders.js spawnCamp puts 3-9 raiders + a leader (hp 260 + 2.2 x def) inside, hp x (1 + def/180), dmg x
  (1 + def/260); they guard, wake each other, never flee or forget her. Kill all -> opts.onCampWin -> next_camp_take
  (+40 caps, +80 XP). Dying = the normal death. Rallied party mates join as AI allies (crew.js extra.allies, roam
  fighters with HP); crew/allies now fight camp raiders and can be hurt by them.
- Tribute: 1 mark a day per camp held (+1 at 3+, +2 more at 6+), claimed from the Camps home tile (unlocks at level 4
  for new players). War chest (marks only): +1 pack slot (10/16/24/34, s.warPack), +10 stash (12/18/26/36,
  s.warStash), plated armor 14, Masterwork weapon 22, 3 capsule tokens 6. Losing a camp shows a toast.
- Codex feat "The Governor": take 5 camps.

## Done in 0.46.1 (owner: "a lot of people aren't joining parties ... they should be prompted"; "when I learn a blueprint
in my backpack it zooms my screen all the way to the top")
- Party nudges: "Join a party" in What to do next (signed in, no party) or "Sign in to play with friends" (level 2+,
  signed out); and once every 3 days a "Join a party" card (horde night, camps, step goal, boss) -> the party list.
- renderHome() now keeps #menu's scroll position on every redraw (renderHome0 is the old body).
- Server cleanup: removed the zz-next-test-* parties and test accounts (they showed in the party list).

## Done in 0.46.2 (owner: "I still don't see any armor to craft"; "no way to heal our crew when we take it out with us?")
- Armor recipes: padded jacket is now known by everyone (BASIC + migrate); new blueprint recipes Sports pads (cloth 4,
  scrap 4, tape 3) and Riot vest (scrap 10, cloth 4, tape 4, nails 10).
- crew.js: walk up to a hurt companion / ally in a fight -> "Patch up" with a bandage (+35) or painkillers (+60) from the
  pack; medics heal the most-hurt crew mate nearby every 20 s; at home a member who fell back hurt can be patched up
  with 2 bandages (crew sheet) to fight again today.

## Done in 0.46.3 (owner: "on the map, if I click one of the quests ... it should show me where on the map")
- Every line on the map card (quests, survivors, crates, air drops, radio calls, deliveries, strange places, camps)
  carries lat/lon; tapping it (map.js focusOn) stops following her, centers the map there, and pulses orange rings on
  the spot for 5 s. The target button (bottom right) comes back to her.

## Done in 0.46.4 (owner: "I clicked stash ... and I lost my Masterwork fire axe")
- Bug: Gear > Backpack "Stash all" (game.js #sAll) called addTo without the weapon quality, so weapons arrived with no q
  (= Worn). Same in deep.js (takePack / merge / bank / its own addTo) for weapons found in deep runs. All pass q now.
- repairQuality() on load (before migrateQuality): a weapon with no q whose durability is above Worn's max gets the lowest
  tier whose max fits it back. The owner's cloud save showed the axe as { d: 80, no q } = exactly a Masterwork axe's max.
  RULE: anything that moves weapon stacks must carry d AND q.

## Done in 0.47.0 (owner: "build the unbuilt stuff" + "walking caches") - walkfx.js (DM.WalkFX), runs off SV.walked
- Walk report: every 1,000 steps a find (weighted FINDS table: junk / supplies, rarely a 2 km cache, a blueprint, a 5 km
  cache) straight to the stash, max 12 a day; "On your walk" card on home until OK. mark starts at the current total.
- Gear upkeep: every 1,500 steps the weapon in hand and the worn armor get 4% of their max durability back.
- Walking caches cache2/5/10 (2,600 / 6,500 / 13,000 steps): loot in safes, attics, caches, locked rooms, wall caches,
  armories; map crates 20% (2 km), air drops 50% (5 km). Item popup "Walk it open" -> cache bag (2 slots); steps open
  them; "Walking caches" home tile -> Open: rolls (storage+crate / hordecrate+cache / 2 hordecrate+safe+blueprint), caps,
  token chance, 10 km 30% Masterwork weapon.
- Still to build from the 2026-11-16 list: daily step bounties, escorts, neighbourhood stamps, power walk, the journal
  (page-turn animation + sound).

## Done in 0.48.0 - daily bounties + escorts (walkfx.js)
- 3 bounties a day seeded by the date: one walking-at-a-time (2,000 before noon / 1,000 after 6 PM / 6,000 today) plus
  two of: 6,000 today, 2 houses, 15 kills, 2 strange map places. Progress from the day's first look (SV.wfx.bd). 20 caps
  + a small item each; all 3 -> a capsule token. Home tile "Daily bounties".
- Escort: one survivor a day (6 names), accept -> walk 3,000-4,500 steps before midnight -> 40 caps, 30 XP, 20% they
  join the crew (bunk free). No penalty for ignoring it.

## Done in 0.49.0 - neighbourhood stamps + power walk (mapfx.js stampsAndPace)
- Stamps: each new ~500 m square (0.0045 x 0.006 deg) walked into with the map open; 5 / 15 / 40 / 100 pay caps +
  tokens; Codex feat Globetrotter (40). Count shown on the map's fog button (📮 N).
- Power walk: 15 min at 1.1-2.6 m/s (map or Pocket mode on; a >90 s gap costs 2 min) -> hordecrate roll + 20 caps +
  20 XP, once a day. Progress line on the map card once she is moving.

## Done in 0.50.0 - the survival log (journal.js, DM.Journal) (owner: "make it animated with sound effects of page turning")
- One page a day, written by the game: steps, houses, kills, downs, notes from other systems (DM.Journal.note: camps
  taken, base raids, crew joining, deep runs, level-ups, walking caches, escorts), a weather line and a mood line
  (seeded by the date). Day number = days since the save was made. Pages close when the date changes (last 120 kept).
- The book: full-screen lined paper page; flip with Back / Next or a swipe - the page turns over in 3D (CSS rotateY,
  0.55 s) with a paper sound (bandpass + highpass noise). "Copy page" for sending to friends. Home tile "Survival log".
- All of the 2026-11-16 list is now built (walk report, upkeep, caches, bounties, escorts, stamps, power walk, journal).
  Not built from the ideas list: real injuries (Zomboid), skill books, moods, harder blood moons, the forge.

## Done in 0.50.1 (owner + Isabel: can't see weapon quality when selling; "getting a lot of weapons"; check drop rates -
"limited stash and backpack space")
- Audit (150 houses, scratch audit2.js): per house before -> after: weapons 0.80 -> 0.31 (knives 0.47 -> 0.15), sell-only
  junk 1.93 -> 1.34, slots filled 3.9 -> 3.0. Materials (~7.5) kept for building. data.js: weapons x0.5, knives x0.3,
  junk x0.6 in all LOOT tables (empty-draw weight).
- Dot > Sell: weapons show quality (colour) · damage · condition %, armor shows damage cut · condition. New "Sell spare
  weapons": keeps the best of each kind (quality, then durability; the one in hand counts), sells the rest, tap twice.

## Done in 0.50.2 (owner: "still getting a lot of brass keys, not many things to do with it")
- Keys: LOOT weight x0.45 (measured 0.98 -> 0.52 a house). New uses: Dot > Sell has a Brass keys row - sell 1 for 15
  caps, or 3 for a blueprint (pickBP); the cache bag's "2 keys: open now" opens a walking cache without the walk.

## Done in 0.51.0 (owner: crew "die permanently" in houses; "HP should stay ... we have to keep healing them"; "provide
our crew members with weapons ... and armor"; blueprint trade "more than 3 - I have 30 brass keys")
- crew.js: m.hp persists (C.hpOf / C.maxHp; null = full). Fights start at their saved HP and write it back on every hit
  and heal. Dropping to 0 in a 'house' run (houses, deep runs, camps) = dead: removed from the crew, journal line, their
  weapon / armor fall on the floor (pick up, quality kept). On a watch shift / base raid they still just fall back hurt.
- Healing: Patch up in a fight (bandage +35 / painkillers +60), the crew sheet (same items, from pack or stash), the
  medic, and +10 HP each fed morning (+10 more with a medic in the crew).
- Gear: crew sheet "give a weapon" (melee only) / "give armor" - moves it out of the stash onto them (m.wpn {k,q,d}, m.arm
  {k,d}); take / swap returns to the stash; dismissing returns it. Weapon: hit = 80% of its damage + 3/level, wears and
  can break; armor: cuts hits by its rating, wears and can fall apart.
- Dot: 10 brass keys per blueprint (was 3).

## Done in 0.52.0 (owner: "more things to build, also decorations... move the storage chest... change the color of our houses")
- Decorate mode can now move build pieces: tap the chest, workbench, barrels, beds, tower, generator etc., then tap
  an empty yard/shack tile. Saved in base.pos[k]. spotOf(k) applies overrides; reserved() replaces RESERVED.
- Paint (Decorate > Paint): 10 wall colours, plain/stripe/wainscot, 9 floors. base.paint {wall,wkind,floor},
  applied by DM.Base.applyPaint -> ART.paintRoom('w', ...). The shack itself can't be moved, only painted.
- New buildings: campfire (crew +10 HP, +3 mood each morning), greenhouse (crops 30% faster), sandbags (2 tiers,
  +8 def each), floodlights (2 tiers, +4 def each).
- 14 new decor items reusing house furniture art (lamppost, TV, heater, cot, crates, chair, dining table, wine rack,
  stove, fridge, desk, shelf, trash can, side table).
- Fix: base no longer shows the night/weather loot bonus.

## Done in 0.53.0 (owner: "more stuff ... definitely more walking related stuff + looting")
- Collections (collect.js, DM.Collect): 6 sets x 5. Cards (desks, nightstands, books), records (hutches, shelves, TVs),
  snow globes (side tables, registers), Mall Rangers figures (wardrobes, attics, locked rooms), license plates
  (garages, cars, workbenches), and roadside postcards, which only come from walking (walk finds, walking caches,
  map places). Piece 5 of each set is rare. New pieces file themselves on the home screen and take no bag space.
  Doubles count as junk for Dot, or can be gifted. A set pays 120 caps + 1 token; all six pay 400 caps + 3 tokens.
  'col_*' in D.LOOT is resolved by a D.rollLoot wrapper (house.js now late-binds rollLoot).
  Measured: 0.85 collectibles a house (audit2, 150 houses).
- Walking charms (charms.js, DM.Charm): one slot, survivor.charm.
  - Pedometer: walk find every 750 steps.
  - Map case: 16 finds a day.
  - Rabbit's foot: rare walk finds 2x.
  - Brass compass: caches open 25% faster.
  - Walkman: gear upkeep 2x.
  - Canteen: +8 thirst per 1,000 steps.
  Charms come from walk finds, 5/10 km caches, attics, locked rooms, horde crates, map places, and Dot (level 3+).

## NEXT UP (handoff, updated 2026-11-14)
### 1. Map: watch it on the owner's phone (0.25 switched to OpenFreeMap tiles). If it is solid for a while, the Overpass
  fallback (MIRRORS, ask(), the staged queries) can be deleted.
### 2. Owner's list (2026-11-14), still to do, in this order
- (Job-only skill trees: built in 0.34.)
- (Walking ideas: all built - supply drops 0.29, weather/night 0.39, party goal + friends race 0.40.)
### 3. Other open items
- A friend's Android blocks the step-sync app install: waiting on her handle or a screenshot (fallback: add her handle to
  NET.cfg.trustedTyped in net.js so typed steps count like phone steps).
- Not yet heard on a real iPhone: area music, positional groans (older Safari has no StereoPanner), title screen thunder.
- Balance to watch: deep-run Nest floors (~14 zombies, many specials), special-infected share as gamestage climbs.
- Oura API integration was postponed by the owner ("I'll do it next time"); steps from the ring already sync via Apple Health
  with the Shortcut's "Source is Oura" filter.
