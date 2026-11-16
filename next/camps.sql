-- Dead Miles (next) 0.46 - camps to take over (owner: "map raids, like an NPC survivor camp you have to raid ... like the
-- Walking Dead Governor taking over every campsite ... other parties can take them ... my friends don't live in New York").
-- Applied to the Supabase project as migration "next_camps". 12 shared camps; every player sees their own local copy of each
-- (placed near where they walk), but who holds a camp is shared. Signed-in players only (dm_check).
create table if not exists public.next_camps (
  id text primary key,
  name text not null,
  owner_party text,            -- party code, or null for bandits / a solo player
  owner_handle text,           -- the player who took it (null = bandits)
  owner_name text not null default 'Bandits',
  def int not null default 40, -- garrison strength
  safe_until timestamptz,      -- a fresh capture cannot be raided for 12 h
  since timestamptz not null default now()
);
create table if not exists public.next_camp_log (
  id bigserial primary key, camp text not null, handle text not null, kind text not null, at timestamptz not null default now()
);
create index if not exists next_camp_log_h on public.next_camp_log (handle, at);
create table if not exists public.next_camp_rally (
  camp text not null, handle text not null, party text, at timestamptz not null default now(), primary key (camp, handle)
);
alter table public.next_camps enable row level security;
alter table public.next_camp_log enable row level security;
alter table public.next_camp_rally enable row level security;

insert into public.next_camps (id, name, def) values
  ('mill', 'The Mill', 40), ('kilo', 'Kilo Outpost', 55), ('agnes', 'Saint Agnes', 45), ('rail', 'The Rail Yard', 60),
  ('dock', 'Pier 9', 50), ('mall', 'Dead Mall', 70), ('farm', 'Rooftop Farm', 40), ('depot', 'Bus Depot', 65),
  ('school', 'Old P.S. 44', 50), ('church', 'Red Church', 45), ('motel', 'The Starlite Motel', 55), ('fort', 'Fort Greene', 80)
on conflict (id) do nothing;

create or replace function public.next_camps_list()
returns jsonb language sql stable security definer set search_path to 'public', 'extensions' as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'party', owner_party, 'handle', owner_handle, 'owner', owner_name,
    'def', def, 'safe', safe_until, 'since', since) order by id), '[]'::jsonb) from next_camps
$function$;

-- she won the fight: the camp becomes hers / her party's. 3 captures a day per player; a fresh capture is safe for 12 h.
create or replace function public.next_camp_take(p_handle text, p_token text, p_camp text, p_party text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); c next_camps%rowtype; nm text;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into c from next_camps where id = p_camp for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'camp'); end if;
  if c.safe_until is not null and c.safe_until > now() then return jsonb_build_object('ok', false, 'error', 'safe', 'until', c.safe_until); end if;
  if (select count(*) from next_camp_log where handle = h and kind = 'take' and at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'limit'); end if;
  select coalesce(b.name, p.name, h) into nm from players p left join next_board b on b.handle = p.handle where p.handle = h;
  update next_camps set owner_party = nullif(lower(btrim(coalesce(p_party, ''))), ''), owner_handle = h, owner_name = left(coalesce(nm, h), 24),
    def = 60, safe_until = now() + interval '12 hours', since = now() where id = p_camp;
  insert into next_camp_log (camp, handle, kind) values (p_camp, h, 'take');
  return jsonb_build_object('ok', true);
end $function$;

-- a member of the holding party (or the solo holder) walks by: +15 defence, once a day per player per camp, max 250
create or replace function public.next_camp_fortify(p_handle text, p_token text, p_camp text, p_party text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); c next_camps%rowtype; pt text := nullif(lower(btrim(coalesce(p_party, ''))), '');
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into c from next_camps where id = p_camp for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'camp'); end if;
  if not (c.owner_handle = h or (pt is not null and c.owner_party = pt)) then return jsonb_build_object('ok', false, 'error', 'notyours'); end if;
  if exists (select 1 from next_camp_log where handle = h and camp = p_camp and kind = 'fort' and at > now() - interval '20 hours') then
    return jsonb_build_object('ok', false, 'error', 'today'); end if;
  update next_camps set def = least(250, def + 15) where id = p_camp;
  insert into next_camp_log (camp, handle, kind) values (p_camp, h, 'fort');
  return jsonb_build_object('ok', true, 'def', least(250, c.def + 15));
end $function$;

-- "I'm at this camp" (refreshed while she is near it); returns the party mates rallied here in the last 30 min
create or replace function public.next_camp_rally(p_handle text, p_token text, p_camp text, p_party text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); pt text := nullif(lower(btrim(coalesce(p_party, ''))), ''); out jsonb;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  insert into next_camp_rally (camp, handle, party, at) values (p_camp, h, pt, now())
    on conflict (camp, handle) do update set party = excluded.party, at = now();
  select coalesce(jsonb_agg(jsonb_build_object('handle', r.handle, 'name', coalesce(b.name, r.handle), 'level', coalesce(b.level, 1))), '[]'::jsonb) into out
    from next_camp_rally r left join next_board b on b.handle = r.handle
    where r.camp = p_camp and pt is not null and r.party = pt and r.handle <> h and r.at > now() - interval '30 minutes';
  return jsonb_build_object('ok', true, 'mates', out);
end $function$;

grant execute on function public.next_camps_list() to anon, authenticated;
grant execute on function public.next_camp_take(text, text, text, text) to anon, authenticated;
grant execute on function public.next_camp_fortify(text, text, text, text) to anon, authenticated;
grant execute on function public.next_camp_rally(text, text, text, text) to anon, authenticated;
