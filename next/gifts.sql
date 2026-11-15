-- Dead Miles (next) 0.41 - friend gifts (owner liked "friend gifts and trading").
-- Applied to the Supabase project as migration "next_gifts". Signed-in players only (dm_check).
-- A gift = up to 5 stacks from the sender's stash, to another registered player, with a short note.
-- The client removes the items from the sender's stash; the recipient's inbox call hands them over (claim on read).
-- Limits: 15 gifts sent per player per day, 40 unclaimed gifts waiting per recipient, 60 of a stack at most.
create table if not exists public.next_gifts (
  id bigserial primary key,
  from_h text not null,
  to_h text not null,
  items jsonb not null,
  note text,
  created timestamptz not null default now(),
  claimed timestamptz
);
create index if not exists next_gifts_to on public.next_gifts (to_h) where claimed is null;
create index if not exists next_gifts_from on public.next_gifts (from_h, created);
alter table public.next_gifts enable row level security;   -- no policies: only the functions below touch it

create or replace function public.next_gift_send(p_handle text, p_token text, p_to text, p_items jsonb, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare h text := lower(p_handle); t text := lower(btrim(coalesce(p_to, ''))); it jsonb; clean jsonb := '[]'::jsonb; n int;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if t = '' or t = h then return jsonb_build_object('ok', false, 'error', 'to'); end if;
  if not exists (select 1 from players where handle = t) then return jsonb_build_object('ok', false, 'error', 'nobody'); end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 5 then
    return jsonb_build_object('ok', false, 'error', 'items'); end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or coalesce(it->>'k', '') !~ '^[a-zA-Z0-9_]{1,32}$' then return jsonb_build_object('ok', false, 'error', 'items'); end if;
    n := least(greatest(coalesce((it->>'n')::numeric, 1), 1), 60)::int;
    clean := clean || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('k', it->>'k', 'n', n,
      'q', case when it ? 'q' then least(greatest((it->>'q')::numeric, 1), 5)::int end,
      'd', case when it ? 'd' then least(greatest((it->>'d')::numeric, 0), 10000)::int end)));
  end loop;
  if (select count(*) from next_gifts where from_h = h and created > now() - interval '1 day') >= 15 then
    return jsonb_build_object('ok', false, 'error', 'limit'); end if;
  if (select count(*) from next_gifts where to_h = t and claimed is null) >= 40 then
    return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into next_gifts (from_h, to_h, items, note) values (h, t, clean, left(coalesce(p_note, ''), 80));
  return jsonb_build_object('ok', true);
exception when invalid_text_representation or numeric_value_out_of_range then
  return jsonb_build_object('ok', false, 'error', 'format');
end $function$;

-- the recipient's unclaimed gifts; they are marked claimed as they are handed over
create or replace function public.next_gift_inbox(p_handle text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare h text := lower(p_handle); out jsonb;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  with g as (
    update next_gifts set claimed = now() where to_h = h and claimed is null
    returning id, from_h, items, note, created
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'from', g.from_h, 'name', coalesce(p.name, g.from_h), 'items', g.items, 'note', g.note, 'at', g.created) order by g.id), '[]'::jsonb)
    into out from g left join players p on p.handle = g.from_h;
  return jsonb_build_object('ok', true, 'gifts', out);
end $function$;

grant execute on function public.next_gift_send(text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.next_gift_inbox(text, text) to anon, authenticated;
