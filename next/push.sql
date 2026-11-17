-- 0.64: push notifications for the new game (app closed). Additive: new next_* objects only.
-- The old game's push_subs / push_targets are untouched. The same sender (push-send.js, GitHub Actions
-- every 15 min) reads both, with the same VAPID key pair and the same PUSH_SECRET (push_ok).
-- A subscription row carries a "plan": timed nudges the game worked out the last time it was open
-- (horde 24 h / 3 h, crew food, garden). The sender also adds two live ones: a quiet-evening nudge
-- from today's real phone steps and a partner nudge from next_pair_days.

create table if not exists public.next_push_subs (
  endpoint text primary key,
  handle text not null,
  p256dh text not null,
  auth text not null,
  tz int not null default 0,          -- minutes east of UTC (New York in winter = -300)
  plan jsonb not null default '[]',   -- [{tag, at (ms), title, body}]
  sent jsonb not null default '{}',   -- tag -> marker, so nothing goes twice
  updated_at timestamptz not null default now()
);
create index if not exists next_push_subs_h on public.next_push_subs (handle);
alter table public.next_push_subs enable row level security;
revoke all on public.next_push_subs from anon, authenticated;

create or replace function public.next_push_save(p_handle text, p_token text, p_endpoint text, p_p256dh text, p_auth text, p_tz int, p_plan jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if coalesce(p_endpoint, '') !~ '^https://' or length(p_endpoint) > 1000 then return jsonb_build_object('ok', false, 'error', 'format'); end if;
  if p_plan is not null and (jsonb_typeof(p_plan) <> 'array' or length(p_plan::text) > 4096) then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  insert into next_push_subs (endpoint, handle, p256dh, auth, tz, plan)
    values (p_endpoint, lower(p_handle), left(p_p256dh, 200), left(p_auth, 100), least(greatest(coalesce(p_tz, 0), -840), 840), coalesce(p_plan, '[]'))
  on conflict (endpoint) do update set handle = excluded.handle, p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz,
    plan = coalesce(p_plan, next_push_subs.plan), updated_at = now();
  return jsonb_build_object('ok', true);
end $f$;

create or replace function public.next_push_drop(p_handle text, p_token text, p_endpoint text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  delete from next_push_subs where endpoint = p_endpoint and handle = lower(p_handle);
  return jsonb_build_object('ok', true);
end $f$;

-- for the sender only (PUSH_SECRET)
create or replace function public.next_push_targets(p_secret text)
returns table(endpoint text, handle text, p256dh text, auth text, tz int, plan jsonb, sent jsonb, name text,
              steps_today int, partner text, partner_name text, partner_today int)
language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not push_ok(p_secret) then return; end if;
  return query
  with s as (
    select x.*, to_char(now() + make_interval(mins => x.tz), 'YYYY-MM-DD') as lday,
           date_trunc('day', now() + make_interval(mins => x.tz)) - make_interval(mins => x.tz) as lmid
      from next_push_subs x where x.updated_at > now() - interval '60 days'
  )
  select s.endpoint, s.handle, s.p256dh, s.auth, s.tz, s.plan, s.sent,
    coalesce(b.name, s.handle),
    greatest(
      coalesce((select max(p.steps) from step_posts p where lower(p.handle) = s.handle and p.posted_at >= s.lmid), 0),
      case when b.updated_at >= s.lmid then coalesce(b.steps_today, 0) else 0 end)::int,
    o.h, coalesce(ob.name, o.h),
    coalesce((select d.steps from next_pair_days d where d.pair_id = o.pid and d.handle = o.h and d.day = s.lday), 0)::int
  from s
  left join next_board b on b.handle = s.handle
  left join lateral (select np.id as pid, case when np.a = s.handle then np.b else np.a end as h
                       from next_pairs np where np.a = s.handle or np.b = s.handle limit 1) o on true
  left join next_board ob on ob.handle = o.h;
end $f$;

create or replace function public.next_push_mark(p_secret text, p_endpoint text, p_tag text, p_mark text)
returns boolean language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not push_ok(p_secret) then return false; end if;
  -- p_mark is the local day it went out (YYYY-MM-DD); markers older than 10 days are dropped
  update next_push_subs set sent = (select coalesce(jsonb_object_agg(e.k, e.v), '{}') from jsonb_each_text(sent) e(k, v)
                                     where e.v >= to_char(now() - interval '10 days', 'YYYY-MM-DD')) || jsonb_build_object(p_tag, p_mark)
   where endpoint = p_endpoint;
  return true;
end $f$;

create or replace function public.next_push_gone(p_secret text, p_endpoint text)
returns boolean language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not push_ok(p_secret) then return false; end if;
  delete from next_push_subs where endpoint = p_endpoint;
  return true;
end $f$;

revoke execute on function public.next_push_save(text, text, text, text, text, int, jsonb) from public;
revoke execute on function public.next_push_drop(text, text, text) from public;
revoke execute on function public.next_push_targets(text) from public;
revoke execute on function public.next_push_mark(text, text, text, text) from public;
revoke execute on function public.next_push_gone(text, text) from public;
grant execute on function public.next_push_save(text, text, text, text, text, int, jsonb) to anon, authenticated;
grant execute on function public.next_push_drop(text, text, text) to anon, authenticated;
grant execute on function public.next_push_targets(text) to anon, authenticated;
grant execute on function public.next_push_mark(text, text, text, text) to anon, authenticated;
grant execute on function public.next_push_gone(text, text) to anon, authenticated;
