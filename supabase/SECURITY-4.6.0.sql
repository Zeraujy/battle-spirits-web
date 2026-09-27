-- Battle Spirits Eternal Simulator v4.6.0
-- Client distrust, private-data isolation and critical economy/admin hardening.
-- Run after all ECONOMY 4.3.0 and SOCIAL/RANKED migrations.

begin;

-- ---------------------------------------------------------------------------
-- 1) Private player data: RLS is mandatory and direct writes to economy tables
--    remain impossible from browser/Electron clients.
-- ---------------------------------------------------------------------------
alter table if exists public.bs_player_wallets enable row level security;
alter table if exists public.bs_player_wallets force row level security;
alter table if exists public.bs_player_cards enable row level security;
alter table if exists public.bs_player_cards force row level security;
alter table if exists public.bs_economy_ledger enable row level security;
alter table if exists public.bs_economy_ledger force row level security;
alter table if exists public.bs_player_deck_recipes enable row level security;
alter table if exists public.bs_player_deck_recipes force row level security;
alter table if exists public.bs_player_progress enable row level security;
alter table if exists public.bs_player_progress force row level security;
alter table if exists public.bs_player_decks enable row level security;
alter table if exists public.bs_player_decks force row level security;
alter table if exists public.bs_match_history enable row level security;
alter table if exists public.bs_match_history force row level security;
alter table if exists public.bs_card_mastery enable row level security;
alter table if exists public.bs_card_mastery force row level security;
alter table if exists public.bs_card_mastery_events enable row level security;
alter table if exists public.bs_card_mastery_events force row level security;
alter table if exists public.bs_notifications enable row level security;
alter table if exists public.bs_notifications force row level security;

-- Explicit owner-only SELECT policies for economy/private progression.
drop policy if exists "v460 wallet owner read" on public.bs_player_wallets;
create policy "v460 wallet owner read" on public.bs_player_wallets
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "v460 cards owner read" on public.bs_player_cards;
create policy "v460 cards owner read" on public.bs_player_cards
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "v460 ledger owner read" on public.bs_economy_ledger;
create policy "v460 ledger owner read" on public.bs_economy_ledger
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "v460 recipes owner read" on public.bs_player_deck_recipes;
create policy "v460 recipes owner read" on public.bs_player_deck_recipes
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "v460 progress owner read" on public.bs_player_progress;
create policy "v460 progress owner read" on public.bs_player_progress
for select to authenticated using (auth.uid() = user_id);

-- Critical economy/progression tables are read-only to authenticated clients.
-- Mutations happen only through SECURITY DEFINER RPCs that derive identity from
-- auth.uid() or through trusted service_role backend code.
revoke insert, update, delete, truncate on public.bs_player_wallets from anon, authenticated;
revoke insert, update, delete, truncate on public.bs_player_cards from anon, authenticated;
revoke insert, update, delete, truncate on public.bs_economy_ledger from anon, authenticated;
revoke insert, update, delete, truncate on public.bs_player_deck_recipes from anon, authenticated;
revoke insert, update, delete, truncate on public.bs_player_progress from anon, authenticated;
revoke all on public.bs_admin_users from anon, authenticated;
revoke all on public.bs_admin_economy_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Authoritative card metadata and signup grant.
-- ---------------------------------------------------------------------------
create table if not exists public.bs_card_security_catalog (
  card_id text primary key,
  rarity text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.bs_card_security_catalog enable row level security;
drop policy if exists "card security catalog read" on public.bs_card_security_catalog;
create policy "card security catalog read" on public.bs_card_security_catalog
for select to authenticated using (true);
grant select on public.bs_card_security_catalog to authenticated;
revoke insert, update, delete, truncate on public.bs_card_security_catalog from anon, authenticated;

-- Seed authoritative rarity from server-side Shop data. When the same card
-- appears in multiple products, keep the highest rarity encountered.
with candidates as (
  select card_id, upper(coalesce(rarity,'C')) as rarity from public.bs_shop_pool_cards
  union all
  select card_id, upper(coalesce(rarity,'C')) as rarity from public.bs_shop_deck_cards
), ranked as (
  select card_id, rarity,
    row_number() over (
      partition by card_id
      order by case rarity
        when 'PX' then 100 when 'XX' then 95 when 'X' then 90 when 'TX' then 88
        when 'CX' then 86 when 'CP' then 84 when 'M' then 70 when 'R' then 60
        when 'U' then 40 when 'C' then 20 else 10 end desc
    ) as rn
  from candidates
  where coalesce(trim(card_id),'') <> ''
)
insert into public.bs_card_security_catalog(card_id,rarity,enabled,updated_at)
select card_id,rarity,true,now() from ranked where rn=1
on conflict(card_id) do update set rarity=excluded.rarity,enabled=true,updated_at=now();

-- Crafting keeps the legacy p_rarity argument only for API compatibility.
-- Pricing now derives rarity from the authoritative server-side catalog, so a
-- modified client cannot craft an X card while claiming it is Common.
create or replace function public.bs_craft_card(p_card_id text, p_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owned integer := 0;
  v_rarity text;
  v_base integer;
  v_cost integer;
  v_craft bigint;
  v_status text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_card_id),'') = '' then raise exception 'CARD_REQUIRED'; end if;

  select rarity into v_rarity
  from public.bs_card_security_catalog
  where card_id=p_card_id and enabled=true;
  if not found then raise exception 'CARD_NOT_CRAFTABLE'; end if;

  insert into public.bs_player_wallets(user_id) values(v_user) on conflict(user_id) do nothing;
  insert into public.bs_player_progress(user_id) values(v_user) on conflict(user_id) do nothing;
  select account_status into v_status from public.bs_player_progress where user_id=v_user;
  if coalesce(v_status,'active') <> 'active' then raise exception 'ACCOUNT_RESTRICTED'; end if;

  select quantity into v_owned
  from public.bs_player_cards
  where user_id=v_user and card_id=p_card_id
  for update;
  v_owned := coalesce(v_owned,0);
  if v_owned >= 6 then raise exception 'MAX_OWNED_COPIES'; end if;

  v_base := case upper(v_rarity)
    when 'C' then 40 when 'U' then 80 when 'R' then 160 when 'M' then 320
    when 'X' then 640 when 'XX' then 960 when 'CP' then 400
    when 'CX' then 800 when 'TX' then 800 when 'PX' then 960
    else 40 end;
  v_cost := case when v_owned > 0 then greatest(1,round(v_base * 0.75)) else v_base end;

  select craft_coins into v_craft from public.bs_player_wallets where user_id=v_user for update;
  if coalesce(v_craft,0) < v_cost then raise exception 'INSUFFICIENT_CRAFT_COINS'; end if;

  update public.bs_player_wallets
    set craft_coins=craft_coins-v_cost, updated_at=now()
    where user_id=v_user;

  insert into public.bs_player_cards(user_id,card_id,quantity,updated_at)
  values(v_user,p_card_id,1,now())
  on conflict(user_id,card_id) do update
    set quantity=least(6,bs_player_cards.quantity+1), updated_at=now();

  insert into public.bs_economy_ledger(user_id,currency,amount,reason)
  values(v_user,'craft',-v_cost,'craft_card:'||p_card_id);

  return jsonb_build_object(
    'cardId',p_card_id,'rarity',v_rarity,'before',v_owned,'after',v_owned+1,
    'cost',v_cost,'discounted',v_owned>0
  );
end;
$$;

-- Previous Guest migration trusted balances and card lists supplied by the
-- browser. A hostile client could forge that payload. v4.6.0 deliberately
-- stops importing client-authored economy/collection values. New accounts get
-- only the fixed one-time server grant; Starter Decks are claimed through the
-- separately validated starter-deck RPC.
create or replace function public.bs_claim_account_creation_bundle(
  p_guest_spirit bigint default 0,
  p_guest_craft bigint default 0,
  p_collection jsonb default '[]'::jsonb,
  p_recipes text[] default '{}',
  p_onboarding_complete boolean default false,
  p_starter_deck_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_progress public.bs_player_progress%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.bs_player_wallets(user_id) values(v_user) on conflict(user_id) do nothing;
  insert into public.bs_player_progress(user_id) values(v_user) on conflict(user_id) do nothing;
  select * into v_progress from public.bs_player_progress where user_id=v_user for update;

  if v_progress.account_creation_bonus_claimed then
    return jsonb_build_object('ok',true,'alreadyClaimed',true);
  end if;
  if not v_progress.account_creation_bonus_eligible then
    raise exception 'ACCOUNT_CREATION_BONUS_NOT_ELIGIBLE';
  end if;

  update public.bs_player_wallets set
    spirit_coins=spirit_coins+1500,
    craft_coins=craft_coins+1500,
    updated_at=now()
  where user_id=v_user;

  insert into public.bs_economy_ledger(user_id,currency,amount,reason,source_uid)
    values(v_user,'spirit',1500,'AccountCreationBonus','account-creation-bonus-spirit')
    on conflict do nothing;
  insert into public.bs_economy_ledger(user_id,currency,amount,reason,source_uid)
    values(v_user,'craft',1500,'AccountCreationBonus','account-creation-bonus-craft')
    on conflict do nothing;

  update public.bs_player_progress set
    account_creation_bonus_claimed=true,
    account_creation_bonus_eligible=false,
    updated_at=now()
  where user_id=v_user;

  return jsonb_build_object(
    'ok',true,'bonusSpirit',1500,'bonusCraft',1500,
    'migratedSpirit',0,'migratedCraft',0,'clientMigrationAccepted',false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Admin identity is never accepted from client payloads.
-- ---------------------------------------------------------------------------
create or replace function public.bs_admin_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.bs_admin_users a
      where a.user_id = auth.uid()
        and a.role in ('admin','owner')
    );
$$;

revoke all on function public.bs_admin_has_access() from public, anon;
grant execute on function public.bs_admin_has_access() to authenticated;

-- Restrict critical RPC entry points to authenticated users only. PostgreSQL
-- grants EXECUTE to PUBLIC by default, so this explicitly removes that path.
revoke all on function public.bs_admin_list_players(text) from public, anon;
revoke all on function public.bs_admin_adjust_currency(uuid,text,bigint,text) from public, anon;
revoke all on function public.bs_admin_set_player_status(uuid,text) from public, anon;
revoke all on function public.bs_craft_card(text,text) from public, anon;
revoke all on function public.bs_purchase_shop_product(text,integer) from public, anon;
revoke all on function public.bs_claim_starter_decks(text[]) from public, anon;
revoke all on function public.bs_claim_account_creation_bundle(bigint,bigint,jsonb,text[],boolean,text[]) from public, anon;
revoke all on function public.bs_ensure_economy_account() from public, anon;

grant execute on function public.bs_admin_list_players(text) to authenticated;
grant execute on function public.bs_admin_adjust_currency(uuid,text,bigint,text) to authenticated;
grant execute on function public.bs_admin_set_player_status(uuid,text) to authenticated;
grant execute on function public.bs_craft_card(text,text) to authenticated;
grant execute on function public.bs_purchase_shop_product(text,integer) to authenticated;
grant execute on function public.bs_claim_starter_decks(text[]) to authenticated;
grant execute on function public.bs_claim_account_creation_bundle(bigint,bigint,jsonb,text[],boolean,text[]) to authenticated;
grant execute on function public.bs_ensure_economy_account() to authenticated;

-- Ranked settlement remains backend-only. Never grant it to authenticated users.
revoke all on function public.bs_ranked_settle_match(text,text,uuid,uuid,integer,integer,integer,integer,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.bs_ranked_settle_match(text,text,uuid,uuid,integer,integer,integer,integer,text,text,text,text,text,text,text,text,text) to service_role;

-- auth.users (email, password hash, provider metadata, tokens) is intentionally
-- never exposed through a public view/table in this migration. Public social
-- identity remains in bs_profiles and continues to obey its visibility rules.

commit;
