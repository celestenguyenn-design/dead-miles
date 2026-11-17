-- Dead Miles (next) 0.60 - party invites (owner: "Can you also add a invite to party option?").
-- Applied to the Supabase project as migration "next_party_invites". Signed-in players only (dm_check).
-- The sender must be in a party; the invite carries that party's code. The recipient's inbox call hands invites
-- over (claim on read); their game shows "X invited you - Join / No thanks". Limits: 20 sent a day, 1 waiting per pair.
create table if not exists public.next_party_invites (
  id bigserial primary key,
  from_h text not null,
  to_h text not null,
  code text not null,
  created timestamptz not null default now(),
  claimed timestamptz
);
create index if not exists next_party_invites_to on public.next_party_invites (to_h) where claimed is null;
create index if not exists next_party_invites_from on public.next_party_invites (from_h, created);
alter table public.next_party_invites enable row level security;   -- no policies: only the functions below touch it

create or replace function public.next_party_invite(p_handle text, p_token text, p_to text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare h text := lower(p_handle); t text := lower(btrim(coalesce(p_to, ''))); c text; mem jsonb;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if t = '' or t = h then return jsonb_build_object('ok', false, 'error', 'to'); end if;
  if not exists (select 1 from players where handle = t) then return jsonb_build_object('ok', false, 'error', 'nobody'); end if;
  select code, members into c, mem from next_parties where members ? h order by updated_at desc limit 1;
  if c is null then return jsonb_build_object('ok', false, 'error', 'noparty'); end if;
  if mem ? t then return jsonb_build_object('ok', false, 'error', 'already'); end if;
  if jsonb_array_length(mem) >= 6 then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  if (select count(*) from next_party_invites where from_h = h and created > now() - interval '1 day') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'limit'); end if;
  if exists (select 1 from next_party_invites where from_h = h and to_h = t and claimed is null) then
    return jsonb_build_object('ok', true, 'code', c, 'again', true); end if;
  insert into next_party_invites (from_h, to_h, code) values (h, t, c);
  return jsonb_build_object('ok', true, 'code', c);
end $function$;

-- the recipient's invites from the last 2 days; marked claimed as they are handed over
create or replace function public.next_party_invites(p_handle text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare h text := lower(p_handle); out jsonb;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  with g as (
    update next_party_invites set claimed = now() where to_h = h and claimed is null and created > now() - interval '2 days'
    returning id, from_h, code, created
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'from', g.from_h, 'name', coalesce(p.name, g.from_h), 'code', g.code, 'at', g.created) order by g.id), '[]'::jsonb)
    into out from g left join players p on p.handle = g.from_h;
  return jsonb_build_object('ok', true, 'invites', out);
end $function$;

grant execute on function public.next_party_invite(text, text, text) to anon, authenticated;
grant execute on function public.next_party_invites(text, text) to anon, authenticated;
