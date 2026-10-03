-- Battle Spirits Eternal Simulator v3.6.3
-- CARD MASTERY 2.0
-- Migração incremental. Execute APÓS SOCIAL-HUB-3.6.2.sql.

begin;

alter table public.bs_match_history
  add column if not exists deck_card_ids text[] not null default '{}',
  add column if not exists cover_card_id text;

create table if not exists public.bs_card_mastery (
  user_id uuid not null references public.bs_profiles(id) on delete cascade,
  card_id text not null,
  xp integer not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  cover_matches integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id),
  check (xp >= 0), check (matches >= 0), check (wins >= 0), check (cover_matches >= 0)
);

create table if not exists public.bs_card_mastery_events (
  user_id uuid not null references public.bs_profiles(id) on delete cascade,
  match_uid text not null,
  card_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, match_uid, card_id)
);

create index if not exists bs_card_mastery_user_xp_idx on public.bs_card_mastery(user_id, xp desc);
alter table public.bs_card_mastery enable row level security;
alter table public.bs_card_mastery_events enable row level security;

drop policy if exists "card mastery owner read" on public.bs_card_mastery;
create policy "card mastery owner read" on public.bs_card_mastery for select to authenticated using (auth.uid() = user_id);

create or replace function public.bs_apply_card_mastery(
  p_match_uid text,
  p_result text,
  p_card_ids text[],
  p_cover_card_id text default null,
  p_played_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_card_id text;
  v_inserted integer;
  v_xp integer;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_match_uid), '') = '' then raise exception 'match uid required'; end if;
  if p_result not in ('win', 'loss') then raise exception 'invalid result'; end if;

  foreach v_card_id in array coalesce(p_card_ids, '{}'::text[]) loop
    v_card_id := trim(v_card_id);
    if v_card_id = '' then continue; end if;
    insert into public.bs_card_mastery_events(user_id, match_uid, card_id, created_at)
    values (v_user, p_match_uid, v_card_id, coalesce(p_played_at, now()))
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then continue; end if;

    v_xp := 40
      + case when p_result = 'win' then 20 else 0 end
      + case when p_cover_card_id is not null and v_card_id = p_cover_card_id then 15 else 0 end;

    insert into public.bs_card_mastery(user_id, card_id, xp, matches, wins, cover_matches, updated_at)
    values (v_user, v_card_id, v_xp, 1,
      case when p_result = 'win' then 1 else 0 end,
      case when p_cover_card_id is not null and v_card_id = p_cover_card_id then 1 else 0 end,
      coalesce(p_played_at, now()))
    on conflict (user_id, card_id) do update set
      xp = bs_card_mastery.xp + excluded.xp,
      matches = bs_card_mastery.matches + 1,
      wins = bs_card_mastery.wins + excluded.wins,
      cover_matches = bs_card_mastery.cover_matches + excluded.cover_matches,
      updated_at = greatest(bs_card_mastery.updated_at, excluded.updated_at);
  end loop;
end;
$$;

create or replace function public.bs_reconcile_card_mastery(p_matches jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(coalesce(p_matches, '[]'::jsonb)) <> 'array' then raise exception 'matches must be an array'; end if;
  for v_match in select value from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb)) loop
    perform public.bs_apply_card_mastery(
      v_match->>'match_uid',
      case when v_match->>'result' = 'win' then 'win' else 'loss' end,
      array(select jsonb_array_elements_text(coalesce(v_match->'deck_card_ids', '[]'::jsonb))),
      nullif(v_match->>'cover_card_id', ''),
      coalesce((v_match->>'played_at')::timestamptz, now())
    );
  end loop;
end;
$$;

create or replace function public.bs_social_health()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'version', '3.6.3');
$$;

grant select on public.bs_card_mastery to authenticated;
grant execute on function public.bs_apply_card_mastery(text,text,text[],text,timestamptz) to authenticated;
grant execute on function public.bs_reconcile_card_mastery(jsonb) to authenticated;
grant execute on function public.bs_social_health() to authenticated;

commit;
