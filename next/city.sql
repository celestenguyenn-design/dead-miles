-- Dead Miles (next) 0.63 - reclaim the neighborhood, the weekly city horde, long-distance survivors (co-op pairs).
-- Applied to the Supabase project as migration "next_city_coop". Signed-in players only (dm_check), except
-- next_city_get, which only returns totals per neighborhood (no handles).
-- Steps reported here are phone / watch / map steps only (the client never sends typed steps), capped per row.

-- ---------------------------------------------------------------- city: one row per player per week
create table if not exists public.next_city (
  week text not null,
  handle text not null,
  hood text not null,
  steps int not null default 0,
  updated timestamptz not null default now(),
  primary key (week, handle)
);
alter table public.next_city enable row level security;

create or replace function public.next_city_report(p_handle text, p_token text, p_week text, p_hood text, p_steps int)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); hd text := left(btrim(coalesce(p_hood, '')), 40); s int := least(greatest(coalesce(p_steps, 0), 0), 250000);
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if coalesce(p_week, '') !~ '^\d{4}-\d{2}-\d{2}$' or hd = '' then return jsonb_build_object('ok', false, 'error', 'format'); end if;
  insert into next_city (week, handle, hood, steps) values (p_week, h, hd, s)
    on conflict (week, handle) do update set hood = excluded.hood, steps = greatest(next_city.steps, excluded.steps), updated = now();
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.next_city_get(p_week text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare hoods jsonb; tot bigint; n int;
begin
  select coalesce(jsonb_agg(jsonb_build_object('hood', hood, 'steps', s, 'n', c) order by s desc), '[]'::jsonb) into hoods
    from (select hood, sum(steps)::bigint s, count(*) c from next_city where week = p_week group by hood) x;
  select coalesce(sum(steps), 0), count(*) into tot, n from next_city where week = p_week;
  return jsonb_build_object('ok', true, 'hoods', hoods, 'total', tot, 'players', n);
end $function$;

-- ---------------------------------------------------------------- long-distance survivors: pairs of two
create table if not exists public.next_pairs (
  id bigserial primary key,
  a text not null,
  b text not null,
  created timestamptz not null default now()
);
create unique index if not exists next_pairs_a on public.next_pairs (a);
create unique index if not exists next_pairs_b on public.next_pairs (b);
alter table public.next_pairs enable row level security;
create table if not exists public.next_pair_asks (
  from_h text not null,
  to_h text not null,
  created timestamptz not null default now(),
  primary key (from_h, to_h)
);
alter table public.next_pair_asks enable row level security;
create table if not exists public.next_pair_days (
  pair_id bigint not null,
  handle text not null,
  day text not null,
  steps int not null default 0,
  primary key (pair_id, handle, day)
);
alter table public.next_pair_days enable row level security;

create or replace function public.next_pair_of(h text) returns bigint language sql stable as $f$
  select id from next_pairs where a = h or b = h limit 1 $f$;

create or replace function public.next_pair_ask(p_handle text, p_token text, p_to text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); t text := lower(btrim(replace(coalesce(p_to, ''), '@', '')));
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if t = '' or t = h then return jsonb_build_object('ok', false, 'error', 'to'); end if;
  if not exists (select 1 from players where handle = t) then return jsonb_build_object('ok', false, 'error', 'nobody'); end if;
  if next_pair_of(h) is not null then return jsonb_build_object('ok', false, 'error', 'paired'); end if;
  if next_pair_of(t) is not null then return jsonb_build_object('ok', false, 'error', 'taken'); end if;
  if (select count(*) from next_pair_asks where from_h = h and created > now() - interval '1 day') >= 10 then return jsonb_build_object('ok', false, 'error', 'limit'); end if;
  -- they already asked me: pair up straight away
  if exists (select 1 from next_pair_asks where from_h = t and to_h = h) then
    insert into next_pairs (a, b) values (t, h); delete from next_pair_asks where from_h in (h, t) or to_h in (h, t);
    return jsonb_build_object('ok', true, 'paired', true);
  end if;
  insert into next_pair_asks (from_h, to_h) values (h, t) on conflict (from_h, to_h) do update set created = now();
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.next_pair_answer(p_handle text, p_token text, p_from text, p_yes boolean)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); f text := lower(btrim(coalesce(p_from, '')));
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if not exists (select 1 from next_pair_asks where from_h = f and to_h = h) then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if not p_yes then delete from next_pair_asks where from_h = f and to_h = h; return jsonb_build_object('ok', true); end if;
  if next_pair_of(h) is not null or next_pair_of(f) is not null then delete from next_pair_asks where from_h = f and to_h = h; return jsonb_build_object('ok', false, 'error', 'taken'); end if;
  insert into next_pairs (a, b) values (f, h); delete from next_pair_asks where from_h in (h, f) or to_h in (h, f);
  return jsonb_build_object('ok', true, 'paired', true);
end $function$;

create or replace function public.next_pair_leave(p_handle text, p_token text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); pid bigint;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  pid := next_pair_of(h); if pid is null then return jsonb_build_object('ok', true); end if;
  delete from next_pair_days where pair_id = pid; delete from next_pairs where id = pid;
  return jsonb_build_object('ok', true);
end $function$;

-- my steps for a day (phone / watch only, from the client) + everything the pair screen needs
create or replace function public.next_pair_sync(p_handle text, p_token text, p_day text, p_steps int)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); pid bigint; pa text; pb text; o text; asks jsonb; mine bigint; theirs bigint; dm jsonb; dt jsonb;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('from', a.from_h, 'name', coalesce(pl.name, a.from_h)) order by a.created desc), '[]'::jsonb) into asks
    from next_pair_asks a left join players pl on pl.handle = a.from_h where a.to_h = h and a.created > now() - interval '7 days';
  pid := next_pair_of(h);
  if pid is null then return jsonb_build_object('ok', true, 'pair', null, 'asks', asks); end if;
  select a, b into pa, pb from next_pairs where id = pid; o := case when pa = h then pb else pa end;
  if coalesce(p_day, '') ~ '^\d{4}-\d{2}-\d{2}$' then
    insert into next_pair_days (pair_id, handle, day, steps) values (pid, h, p_day, least(greatest(coalesce(p_steps, 0), 0), 60000))
      on conflict (pair_id, handle, day) do update set steps = greatest(next_pair_days.steps, excluded.steps);
  end if;
  select coalesce(sum(steps), 0) into mine from next_pair_days where pair_id = pid and handle = h;
  select coalesce(sum(steps), 0) into theirs from next_pair_days where pair_id = pid and handle = o;
  select coalesce(jsonb_object_agg(day, steps), '{}'::jsonb) into dm from (select day, steps from next_pair_days where pair_id = pid and handle = h order by day desc limit 14) x;
  select coalesce(jsonb_object_agg(day, steps), '{}'::jsonb) into dt from (select day, steps from next_pair_days where pair_id = pid and handle = o order by day desc limit 14) x;
  return jsonb_build_object('ok', true, 'asks', asks, 'pair', jsonb_build_object('id', pid, 'partner', o, 'name', (select coalesce(name, o) from players where handle = o),
    'since', (select created from next_pairs where id = pid), 'mine', mine, 'theirs', theirs, 'myDays', dm, 'theirDays', dt));
end $function$;

grant execute on function public.next_city_report(text, text, text, text, int) to anon, authenticated;
grant execute on function public.next_city_get(text) to anon, authenticated;
grant execute on function public.next_pair_ask(text, text, text) to anon, authenticated;
grant execute on function public.next_pair_answer(text, text, text, boolean) to anon, authenticated;
grant execute on function public.next_pair_leave(text, text) to anon, authenticated;
grant execute on function public.next_pair_sync(text, text, text, int) to anon, authenticated;
revoke execute on function public.next_pair_of(text) from anon, authenticated, public;
