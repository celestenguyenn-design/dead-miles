-- Dead Miles (next) 0.18 - daily challenge scores. Review, then apply as migration `next_daily`.
-- Same rules as the other next_* objects (see next/NET.md): RLS on with no policies, no table privileges for
-- anon/authenticated, all access through SECURITY DEFINER functions that check handle + token with dm_check.
-- The day is the New York date the client sends ('YYYY-MM-DD'); the server only accepts today or yesterday
-- (New York), so a run finished offline just before midnight can still be sent a little later.

create table if not exists public.next_daily (
  day     date        not null,
  handle  text        not null,
  score   int         not null check (score >= 0),
  detail  jsonb       not null default '{}'::jsonb,
  at      timestamptz not null default now(),
  primary key (day, handle)
);
create index if not exists next_daily_day_score on public.next_daily (day, score desc);
alter table public.next_daily enable row level security;
revoke all on table public.next_daily from public, anon, authenticated;

-- First submission per handle per day wins; later ones change nothing. Returns {ok:true, best:int}
-- (best = the stored score) or {ok:false, error:'auth'|'day'}.
create or replace function public.next_daily_submit(p_handle text, p_token text, p_day text, p_score int, p_detail jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h      text := lower(coalesce(p_handle, ''));
  d      date;
  ny     date := (now() at time zone 'America/New_York')::date;
  det    jsonb := p_detail;
  stored int;
begin
  if not dm_check(p_handle, p_token) then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  begin
    d := p_day::date;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'day');
  end;
  if d is null or d > ny or d < ny - 1 then
    return jsonb_build_object('ok', false, 'error', 'day');
  end if;
  if det is null or jsonb_typeof(det) <> 'object' or length(det::text) > 2000 then
    det := '{}'::jsonb;
  end if;
  insert into next_daily (day, handle, score, detail)
  values (d, h, greatest(0, least(coalesce(p_score, 0), 100000)), det)
  on conflict (day, handle) do nothing;
  select score into stored from next_daily where day = d and handle = h;
  return jsonb_build_object('ok', true, 'best', stored);
end;
$$;

-- Everyone's scores for one day, best first, top 50: [{handle, name, score, detail, at}].
-- The display name comes from next_board (what the game publishes), falling back to the handle.
create or replace function public.next_daily_board(p_day text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  d date;
begin
  begin
    d := p_day::date;
  exception when others then
    return '[]'::jsonb;
  end;
  return coalesce((
    select jsonb_agg(jsonb_build_object('handle', x.handle, 'name', x.name, 'score', x.score, 'detail', x.detail, 'at', x.at)
                     order by x.score desc, x.at asc)
    from (
      select n.handle, coalesce(nullif(b.name, ''), n.handle) as name, n.score, n.detail, n.at
      from next_daily n
      left join next_board b on b.handle = n.handle
      where n.day = d
      order by n.score desc, n.at asc
      limit 50
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.next_daily_submit(text, text, text, int, jsonb) from public, authenticated;
revoke all on function public.next_daily_board(text) from public, authenticated;
grant execute on function public.next_daily_submit(text, text, text, int, jsonb) to anon;
grant execute on function public.next_daily_board(text) to anon;

-- Optional housekeeping (run now and then, or from the next_party_shift-style pruning): keep 60 days.
-- delete from public.next_daily where day < (now() at time zone 'America/New_York')::date - 60;
