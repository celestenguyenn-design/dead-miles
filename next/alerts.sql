-- Dead Miles (next) 0.73 - friend alerts (owner said yes to "make friends' actions show up": "Isa raided your camp!").
-- Applied to the Supabase project as migration "next_alerts".
-- next_alerts holds things other players did to you. The game reads them (next_alerts_get) into its Friends feed, and
-- push-send.js (GitHub Actions, every 15 min) sends new ones to every phone of that player with notifications on.
create table if not exists public.next_alerts (
  id bigserial primary key,
  handle text not null,          -- who it is for
  kind text not null,            -- 'camp' (your camp was taken)
  title text not null,
  body text not null default '',
  at timestamptz not null default now(),
  seen boolean not null default false,
  pushed boolean not null default false
);
create index if not exists next_alerts_h on public.next_alerts (handle, at desc);
alter table public.next_alerts enable row level security;
revoke all on public.next_alerts from anon, authenticated;

-- the camp capture tells the side that lost it (the solo holder, or every member of the holding party)
create or replace function public.next_camp_take(p_handle text, p_token text, p_camp text, p_party text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare h text := lower(p_handle); c next_camps%rowtype; nm text; pt text := nullif(lower(btrim(coalesce(p_party, ''))), '');
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into c from next_camps where id = p_camp for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'camp'); end if;
  if c.safe_until is not null and c.safe_until > now() then return jsonb_build_object('ok', false, 'error', 'safe', 'until', c.safe_until); end if;
  if (select count(*) from next_camp_log where handle = h and kind = 'take' and at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'limit'); end if;
  select coalesce(b.name, p.name, h) into nm from players p left join next_board b on b.handle = p.handle where p.handle = h;
  update next_camps set owner_party = pt, owner_handle = h, owner_name = left(coalesce(nm, h), 24),
    def = 60, safe_until = now() + interval '12 hours', since = now() where id = p_camp;
  insert into next_camp_log (camp, handle, kind) values (p_camp, h, 'take');
  -- 0.73: alerts for whoever lost it (never the taker, never the taker's own party)
  if c.owner_handle is not null and c.owner_handle <> h then
    insert into next_alerts (handle, kind, title, body)
    select distinct x, 'camp', left(coalesce(nm, h), 24) || ' took ' || c.name || '!', 'Your camp fell. Walk to it with the Map open and raid it back - it is safe for 12 hours first.'
      from (
        select c.owner_handle as x
        union
        select jsonb_array_elements_text(np.members) from next_parties np where c.owner_party is not null and np.code = c.owner_party
      ) who
      where x is not null and x <> h
        and not (pt is not null and exists (select 1 from next_parties tp where tp.code = pt and tp.members ? x));
  end if;
  return jsonb_build_object('ok', true);
end $function$;

-- the game: my last 20 alerts (30 days), then mark them seen
create or replace function public.next_alerts_get(p_handle text, p_token text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $f$
declare h text := lower(p_handle); out jsonb;
begin
  if not dm_check(p_handle, p_token) then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'title', title, 'body', body, 'at', at, 'seen', seen) order by at desc), '[]'::jsonb) into out
    from (select * from next_alerts where handle = h and at > now() - interval '30 days' order by at desc limit 20) a;
  update next_alerts set seen = true where handle = h and not seen;
  return out;
end $f$;

-- push-send.js: alerts not pushed yet (last 6 hours) x every live subscription of that player
create or replace function public.next_alerts_due(p_secret text)
returns table(id bigint, endpoint text, p256dh text, auth text, title text, body text)
language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not push_ok(p_secret) then return; end if;
  return query select a.id, s.endpoint, s.p256dh, s.auth, a.title, a.body
    from next_alerts a join next_push_subs s on s.handle = a.handle
   where not a.pushed and a.at > now() - interval '6 hours' and s.updated_at > now() - interval '60 days';
end $f$;
create or replace function public.next_alerts_pushed(p_secret text, p_ids bigint[])
returns boolean language plpgsql security definer set search_path to 'public', 'extensions' as $f$
begin
  if not push_ok(p_secret) then return false; end if;
  update next_alerts set pushed = true where id = any(p_ids);
  return true;
end $f$;

grant execute on function public.next_alerts_get(text, text) to anon, authenticated;
revoke execute on function public.next_alerts_due(text) from public;
revoke execute on function public.next_alerts_pushed(text, bigint[]) from public;
grant execute on function public.next_alerts_due(text) to anon, authenticated;
grant execute on function public.next_alerts_pushed(text, bigint[]) to anon, authenticated;
