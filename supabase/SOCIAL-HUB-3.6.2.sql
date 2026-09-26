-- Battle Spirits Eternal Simulator v3.6.2
-- MATCH HISTORY & PLAYER STATISTICS
-- Migração incremental. Execute APÓS SOCIAL-HUB-3.6.1.sql.

begin;

create table if not exists public.bs_match_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.bs_profiles(id) on delete cascade,
  match_uid text not null,
  mode text not null default 'local',
  result text not null,
  winner_reason text not null default 'other',
  duration_seconds integer not null default 0,
  turns integer not null default 1,
  deck_id text,
  deck_name text,
  deck_colors text[] not null default '{}',
  opponent_name text,
  opponent_username text,
  life_remaining integer not null default 0,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, match_uid),
  check (mode in ('local','ai','online')),
  check (result in ('win','loss')),
  check (duration_seconds >= 0),
  check (turns >= 1),
  check (life_remaining >= 0)
);

create index if not exists bs_match_history_user_played_idx
  on public.bs_match_history(user_id, played_at desc);

alter table public.bs_match_history enable row level security;

drop policy if exists "match history owner read" on public.bs_match_history;
create policy "match history owner read"
on public.bs_match_history for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "match history owner insert" on public.bs_match_history;
create policy "match history owner insert"
on public.bs_match_history for insert to authenticated
with check (auth.uid() = user_id);

-- Histórico normal ainda não é competitivo/ranked. O usuário pode registrar seu próprio
-- resultado final, mas não editar nem apagar linhas depois de gravadas.
drop policy if exists "match history owner update" on public.bs_match_history;
drop policy if exists "match history owner delete" on public.bs_match_history;

create or replace function public.bs_social_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('ok', true, 'version', '3.6.2');
$$;

grant select, insert on public.bs_match_history to authenticated;
grant execute on function public.bs_social_health() to authenticated;

commit;
