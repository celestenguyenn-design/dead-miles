-- Dead Miles (next) 0.26.5 - list parties so friends can pick one to join instead of asking for the code.
-- Applied to the Supabase project as migration "next_party_list". Read-only; signed-in players only (dm_check).
-- Returns { ok, parties: [{ code, members: [handles], n, mine, updated }] }: mine first, then the fullest, then the newest.
create or replace function public.next_party_list(p_handle text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare h text := lower(p_handle); out jsonb;
begin
  if not dm_check(p_handle, p_token) then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select coalesce(jsonb_agg(x order by (x->>'mine')::boolean desc, (x->>'n')::int desc, x->>'updated' desc), '[]'::jsonb) into out from (
    select jsonb_build_object('code', code, 'members', members, 'n', jsonb_array_length(members),
      'mine', members ? h, 'updated', updated_at) as x
    from next_parties
    where jsonb_array_length(members) > 0
    order by updated_at desc
    limit 40
  ) s;
  return jsonb_build_object('ok', true, 'parties', out);
end $function$;
grant execute on function public.next_party_list(text, text) to anon, authenticated;
