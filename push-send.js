/* Dead Miles notification sender. Runs on a schedule in GitHub Actions.
   Reads who is subscribed from Supabase, decides who needs a nudge right now, sends it,
   and marks it so the same nudge never goes twice in one local day. */
const webpush = require('web-push');

const SB = 'https://edejxfcsjqwedbgulygi.supabase.co';
const ANON = process.env.SB_ANON;
const SECRET = process.env.PUSH_SECRET;
const VAPID_PUBLIC = 'BDjXfxZW0UP34n25eFRp736S9ED4EInA8J-HP_0_VMz30hR06YzTEr2fyHLpmuabuU3ubSvUinRCIvM20Pmb4yw';

webpush.setVapidDetails('mailto:noreply@example.com', VAPID_PUBLIC, process.env.VAPID_PRIVATE);

async function rpc(fn, args) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const fmt = n => Number(n || 0).toLocaleString('en-US');

// What to say, given one subscriber's snapshot and their local clock.
function decide(row, everyone) {
  const pub = row.pub || {};
  const tz = row.tz || 0;
  const now = new Date();
  const local = new Date(now.getTime() + tz * 60000);
  const hour = local.getUTCHours();
  const day = local.toISOString().slice(0, 10);
  const sent = row.sent || {};
  const fresh = tag => sent[tag] !== day;
  const out = [];

  // Horde night: warn once, inside the hour before it lands.
  const hn = Number(pub.horde_next || 0);
  if (hn) {
    const mins = (hn - now.getTime()) / 60000;
    if (mins > 10 && mins <= 75 && fresh('horde')) {
      out.push({
        tag: 'horde', day,
        title: 'Horde night',
        body: `They come in about an hour. Your walls hold ${pub.defense || 0}. Get behind them.`,
      });
    }
  }

  // Raiders expected today: warn an hour before.
  const rh = Number(pub.raid_hour);
  if (rh >= 0 && hour === Math.max(0, rh - 1) && fresh('raid')) {
    out.push({
      tag: 'raid', day,
      title: 'Raiders on the way',
      body: `They hit your base at ${rh}:00. Defense ${pub.defense || 0}. Open the game to fight them yourself.`,
    });
  }

  // Streak about to break: evening, target not met, streak worth saving.
  const goal = Number(pub.goal || 6000);
  const steps = Number(row.steps_today || pub.steps_today || 0);
  const streak = Number(pub.streak || 0);
  if (hour >= 19 && hour < 22 && streak >= 3 && steps < goal && fresh('streak')) {
    out.push({
      tag: 'streak', day,
      title: `Streak of ${streak} at risk`,
      body: `${fmt(goal - steps)} steps to go before midnight. A walker gets into the scrap if you miss.`,
    });
  }

  // Your rival went past you today.
  const rival = (pub.rival || '').toLowerCase();
  if (rival && fresh('rival')) {
    const r = everyone.find(x => (x.handle || '').toLowerCase() === rival);
    if (r) {
      const theirs = Number((r.pub || {}).steps_today || r.steps_today || 0);
      if (theirs > steps + 200) {
        out.push({
          tag: 'rival', day,
          title: `${(r.pub && r.pub.name) || rival} just passed you`,
          body: `${fmt(theirs)} to your ${fmt(steps)}. ${fmt(theirs - steps)} behind.`,
        });
      }
    }
  }
  return out;
}

(async () => {
  if (!ANON || !SECRET || !process.env.VAPID_PRIVATE) {
    console.log('Missing SB_ANON, PUSH_SECRET or VAPID_PRIVATE. Nothing sent.');
    return;
  }
  const rows = await rpc('push_targets', { p_secret: SECRET });
  if (!rows || !rows.length) { console.log('No subscribers.'); return; }
  console.log(`${rows.length} subscription(s).`);

  let sent = 0, dead = 0;
  for (const row of rows) {
    for (const msg of decide(row, rows)) {
      const sub = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag }));
        await rpc('push_mark', { p_secret: SECRET, p_endpoint: row.endpoint, p_tag: msg.tag, p_day: msg.day });
        sent++;
        console.log(`sent ${msg.tag} to ${row.handle}`);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await rpc('push_gone', { p_secret: SECRET, p_endpoint: row.endpoint });
          dead++;
        } else {
          console.log(`failed ${msg.tag} for ${row.handle}: ${e.statusCode || ''} ${e.message}`);
        }
      }
    }
  }
  console.log(`done: ${sent} sent, ${dead} dead subscription(s) removed.`);
})().catch(e => { console.error(e); process.exit(1); });
