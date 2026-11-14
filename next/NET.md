# Online layer (next/net.js, next/netpanel.js)

Load order in index.html: `net.js`, then `netpanel.js`, then the game. Neither file
depends on the game. `next/nettest.html` loads only these two files for testing.

## Ground rules (the old game stays live)
- Accounts are the existing `players` rows. Same handle + token, so a friend's iPhone
  Shortcut and Android companion app keep posting to `step_posts`, and this game reads
  them with the existing `get_steps` RPC. New players sign up with the existing
  `register_player`.
- Nothing existing was altered. New objects are all `next_*`. The 35 old public
  functions were hashed before and after (`md5` of `pg_get_functiondef`), and the
  hashes match: aggregate `dfcfd5403da9cad1b3731d60f47cc228`.
- net.js only READS the old game's identity on the same origin (`deadmiles.id`,
  cookie `dm_id`, IndexedDB `deadmiles/kv/id`, Cache `deadmiles-id`, and
  `deadmiles.v3`'s `online` block for the token, `testAt` and `recovery`). It never
  writes them, and the IndexedDB and Cache lookups cannot create anything.

## Backend (Supabase project edejxfcsjqwedbgulygi)
Migrations: `next_online_layer`, `next_publish_tidy`.

| Table | Columns | Notes |
|---|---|---|
| `next_saves` | handle pk, state jsonb, version bigint, updated_at | state = `{game, net, at}` (see below) |
| `next_board` | handle pk, name, level, job, scav, looted, kills, steps_today, steps_week, typed_share real, pub jsonb, updated_at | public summary |
| `next_parties` | code pk, members jsonb array, data jsonb, created, updated_at | `data` is free for horde night |

RLS is on and there are no policies. anon/authenticated have no table privileges. All
access goes through these SECURITY DEFINER functions. Each one checks handle + token
with `dm_check`, uses `set search_path = public, extensions`, and is executable by
anon only:

| Function | Returns |
|---|---|
| `next_whoami(h,t)` | `{ok, handle, name, has_pin}` |
| `next_save(h,t,state jsonb,version bigint)` | `{ok,version}` or `{ok:false,error:'stale',version}` / `'auth'` / `'too_big'` (>256 KB) / `'format'`. Only writes when `version > stored`. |
| `next_load(h,t)` | `{ok, state, version, updated_at}` (`state:null, version:0` if none) |
| `next_publish(h,t,pub jsonb)` | `{ok}`. pub must be ≤4 KB. Numbers are clamped. `pub.extra` (object) is stored as `pub` |
| `next_get_board()` | rows published in the last 14 days, by steps_week desc, max 100 |
| `next_party_join(h,t,code)` | `{ok, code, members, data, created}` / `error:'full'` (6 max) / `'code'`. Joining a party leaves your other party. |
| `next_party_leave(h,t,code)` | `{ok}`. An empty party is deleted. |
| `next_party_get(h,t,code)` | `{ok, party:{code,members,data,created,mine}}`. Empty code = the party I am in. |
| `next_party_shift(h,t,code,week,kills,defense)` | `{ok, code, week, members, horde:{shifts:{handle:{k,d,n,at}}}, mine}`. Adds one watch shift to `next_parties.data.horde[week]`. `week` must be a Sunday within 8 days of today; kills clamped 0..200 (total 1200), defense 0..500; max 6 shifts per member per week (`error:'max'`). Errors: `auth`, `code`, `member`, `week`. Weeks older than 35 days are pruned; other `data` keys are kept. Migration `next_party_shift` (2026-11-13). |
| `next_daily_submit(h,t,day,score,detail jsonb)` | 0.18, **not applied yet - SQL in `next/daily.sql`**. `{ok:true, best}` (best = the stored score). The FIRST submission per handle per New York day is kept; later ones change nothing. `day` must be today or yesterday (New York) else `error:'day'`; score clamped 0..100000; detail ≤2 KB object. Table `next_daily` (day, handle) pk. |
| `next_daily_board(day)` | 0.18. `[{handle, name, score, detail, at}]`, score desc, top 50. `name` from `next_board`, else the handle. |

Existing RPCs used as they are: `register_player`, `recover_login`, `set_recovery`,
`get_step_key`, `get_steps`, `post_steps` (when `?steps=` arrives without a key) and
`post_steps_link` (`?k=...&steps=`).

## Client API (`window.NET`)
State: `ok, handle, name, token, status ('online'|'offline'|'checking'|'bad-key'|'signed-out'), err, pin, hasPin, idSource ('next'|'old-game'|'pin'|'key'), steps, lastPull, lastPost, party, boardRows, conflict, rotated`.

- `await NET.init()`: restores identity from `dm-next-id`, falling back to the old game's
  storage. Verifies it with `next_whoami`, or trusts it offline. Handles `?steps=` and
  `?k=`, pulls steps, flushes queued save/publish, and starts the 5-minute poll plus
  the visibility and online listeners.
- `await NET.register(handle, name)` → `{ok}` or `{ok:false, error:'taken'}`
- `await NET.signIn(handle, keyOrPin)`: a 6-digit PIN goes through `recover_login`.
  That issues a NEW key, so `NET.rotated = true`, and the Android app and the old game
  on other devices need the new key. Anything else is treated as the account key.
- `NET.signOut()` clears only `dm-next-id`.
- `await NET.setPin(pin)`, `NET.makePin()`, `await NET.getStepKey()`,
  `NET.shortcutCode()`, `NET.shortcutUrl()`
- `await NET.pullSteps()` → `{today, yesterday, src, phone, typed, lastPost}`
- `NET.typeSteps(n, 'total'|'add')`: typed steps (see below). Returns the steps handed
  to the game.
- `NET.stepsDay(date?)`, `NET.weekSteps()`, `NET.typedShare(days)`
- `NET.save(state, {now})`: writes locally at once, then debounces the cloud write
  (4 s). With `{now:true}` it returns a promise of the result.
- `NET.flush()`: pushes a queued save now.
- `await NET.load()` → `{ok, state, version, updated_at, at, local}`. `local` is the
  unsynced local state if there is one. Also merges the cloud step ledger.
- `NET.localState()`: the last state saved on this device (for an offline boot).
- `NET.publish(pub, {now})`: debounced 15 s. `steps_today`, `steps_week` and
  `typed_share` are filled from the ledger if you leave them out.
- `await NET.board()`: rows, also cached in localStorage for offline.
- `await NET.partyJoin(code)`, `NET.partyLeave()`, `NET.partyGet(code?)`
- `await NET.dailySubmit(day, score, detail)` → `{ok, best}` or `{ok:false, error:'signed-out'|'offline'|'auth'|'day'}` (0.18, daily.js)
- `await NET.dailyBoard(day)` → `{ok, rows, cached}`; the last board is kept in localStorage `dm-next-daily` for offline
- `NET.openPanel()` / `NET.closePanel()` (netpanel.js)
- Hooks: `NET.onSteps`, `NET.onConflict`, `NET.onChange`, `NET.onRemoteAdopted(state)`.
  The panel calls the last one when the player picks "the other one" in a conflict.
  A `net:change` window event also fires on every change.

## Steps: how nothing gets counted twice
Every post in `step_posts` is a running total for its day. The Shortcut and Android
both send "today so far", so a day's value is the highest post that day, never the
sum. Posts are bucketed by THIS device's local date. The old game's 1-step "Test my
key" posts (within 3 min of its `testAt`) and 0-step probes are ignored. The
Shortcut's `y` (yesterday) post is stamped one day back by the server, so it lands in
yesterday's bucket.

The ledger (`dm-next-steps`, and also inside every cloud save as `state.net`) holds,
per local day: `phone` (highest post), `typed` (the typed "my total" claim), `ap` and
`at` (steps already handed to the game as phone and as typed).

- Credited total for a day = `max(phone, min(typed, phone + 4000))`. The game only ever
  gets `credited - (ap + at)`. A reading seen twice changes nothing.
- When typed and phone overlap, the phone catching up to a typed total adds nothing.
  Only the part above the typed total is added. This is the bug that repairTypedSteps
  in the old game had to fix after the fact.
- Typed credit above the phone is capped at `NET.cfg.typedCap` (4000). The game halves
  typed value itself. `onSteps` gets `src = 'typed'`.
- Yesterday's late steps (the Shortcut's `y`, or the phone's last post before midnight)
  are handed over with `info.late = true`, `info.day = 'YYYY-MM-DD'`. This only happens
  for days on or after the account's first day on the new game (`ledger.since`).
- A second phone never re-delivers steps: before its first pull for an account, net.js
  loads the cloud save and merges its ledger, taking the max of every field.
- `?steps=N` (the Shortcut's "Open URLs" route, with or without `&k=handle|key`) is
  posted to the server (`post_steps_link`, or `post_steps` when signed in without k),
  recorded as a phone reading, and removed from the URL.

## Wiring it into game.js
```js
// boot
await NET.init();                         // safe offline
const cloud = await NET.load();           // on a signed-in device
// pick: local save vs cloud.state (cloud.at vs your local savedAt), start the game
NET.onSteps = (delta, src, info) => DM.addSteps(delta, src, info);
//   src: 'phone' | 'shortcut' | 'typed'. info: {day, late, today}
//   Return false if the game cannot take steps right now: they are offered again
//   on the next pull. Setting onSteps hands over anything already waiting.
NET.onConflict = ({local, remote}) => remote.at > local.at ? 'remote' : 'local';  // optional
NET.onRemoteAdopted = state => DM.replaceState(state);                            // optional
```
- Set `onSteps` only AFTER the save is loaded. Until it is set, steps wait in the ledger.
- Call `NET.save(DM.state)` after anything worth keeping (loot taken, house finished,
  base built, level up), and on `visibilitychange` → hidden. It is debounced, so calling
  it often is fine. Do not include the step ledger yourself. net.js wraps the state as
  `{game, net, at}`.
- Call `NET.publish({name, level, job, scav, looted, kills, extra:{av, cosmetic...}})`
  after a house is finished, on level up, and once per session start. Keep `extra`
  small (the whole pub must be ≤4 KB).
- Typed steps: call `NET.typeSteps(n,'total')` from the game's own typing UI, or let
  the panel do it. Do not add typed steps to the game directly, or the ledger cannot
  stop the overlap.
- An "Online" button opens `NET.openPanel()`.
- Party horde night: `NET.partyGet()` on boot. The wrapper is `next/horde.js` (`DM.Horde.shift`,
  `DM.Horde.flush` for shifts queued offline in `SV.horde.pending`). net.js is unchanged.

## Tests (2026-11-13)
- Live DB, via SQL with the real functions and throwaway `zz-next-test-*` handles: register;
  whoami good/bad key; save v1, v2; same-version and older-version saves refused as
  `stale`; bad token refused (`auth`); >256 KB refused (`too_big`); non-object refused
  (`format`); load; publish, bad numbers (`format`), bad token; board; party join, switch
  (old party deleted when empty), bad code, 6 members then 7th `full`, leave;
  `post_steps` (Android) and `post_steps_link` with `y` both readable via `get_steps`
  after a PIN login rotated the key. All rows (players, step_posts, next_*) were deleted
  afterwards. anon has no privileges on the next_* tables.
- Browser (Playwright, chromium 390x844 @2x, nettest.html over a local http.server): the
  sandbox's network proxy blocks supabase.co, so RPCs were answered by an in-test mock
  that follows the same contract. 41 checks pass. Covered: steps maths, typed overlap
  and cap, refused delta offered again, version conflict (hold, resolve local, handler
  picks remote), offline queue then flush, 256 KB guard, publish/board, party, PIN set
  and PIN sign-in on a second phone with no re-delivery, old-game identity pickup with
  old storage byte-identical and no IndexedDB created, `?k=&steps=`, test-post filter,
  and yesterday backfill.
