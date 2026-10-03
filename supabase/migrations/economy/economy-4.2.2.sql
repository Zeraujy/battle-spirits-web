-- Battle Spirits Eternal Simulator v4.2.2
-- Shop reveal metadata, saga catalog metadata and fixed-content card sets.
-- Run AFTER ECONOMY-4.2.1.sql.

begin;

alter table public.bs_shop_products add column if not exists product_type text;
alter table public.bs_shop_products add column if not exists saga_id text;

update public.bs_shop_products
set product_type = case when category='decks' then 'deck' else 'booster' end
where product_type is null;

update public.bs_shop_products set saga_id = case
  when set_code in ('BS01','BS02','BS03','BS04','BS05','BS06','BS07','BS08','BS09','SD01','SD02','SD03') then 'wanderer-lolo'
  when set_code in ('BS10','BS11','BS12','BS13') then 'constellation'
  when set_code in ('BS19','BS20','BS21','BS22','BS23','SD10','SD11','SD12','SD13','SD14','SD15','SD16','SD17','SD18') then 'sword-blade'
  when set_code in ('BS24','BS25','BS26','BS27','BS28','BS29','BS30','SD19','SD20','SD21','SD22','SD23','SD24','SD25','SD26','SD27','SD28') then 'ultimate-battle'
  when set_code in ('SD64','PC01','PC02') then 'contract'
  else 'supplementary'
end;

update public.bs_shop_products set pack_size=9 where product_id='booster-bsc49';
update public.bs_shop_products set product_type='card-set',pack_size=null,saga_id='contract'
where product_id in ('booster-pc01','booster-pc02');

-- The _b records are the back faces of double-sided World cards, not extra physical cards.
delete from public.bs_shop_pool_cards
where product_id in ('booster-pc01','booster-pc02') and card_id ~ '_b$';

create or replace function public.bs_purchase_shop_product(p_product_id text, p_quantity integer default 1)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid := auth.uid();
  v_product public.bs_shop_products%rowtype;
  v_wallet bigint;
  v_total bigint;
  v_pack integer;
  v_slot integer;
  v_copy integer;
  v_card record;
  v_grants jsonb := '[]'::jsonb;
  v_event jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_quantity < 1 or p_quantity > 20 then raise exception 'INVALID_QUANTITY'; end if;
  select * into v_product from public.bs_shop_products where product_id=p_product_id and enabled=true;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  insert into public.bs_player_wallets(user_id) values(v_user) on conflict(user_id) do nothing;
  insert into public.bs_player_progress(user_id) values(v_user) on conflict(user_id) do nothing;
  select spirit_coins into v_wallet from public.bs_player_wallets where user_id=v_user for update;
  v_total := v_product.spirit_price::bigint * p_quantity::bigint;
  if v_wallet < v_total then raise exception 'INSUFFICIENT_SPIRIT_COINS'; end if;
  update public.bs_player_wallets set spirit_coins=spirit_coins-v_total,updated_at=now() where user_id=v_user;
  insert into public.bs_economy_ledger(user_id,currency,amount,reason)
    values(v_user,'spirit',-v_total,'shop_purchase:'||p_product_id);

  if coalesce(v_product.product_type,'booster')='booster' then
    for v_pack in 1..p_quantity loop
      for v_slot in 1..coalesce(v_product.pack_size,8) loop
        select p.card_id,p.rarity into v_card from public.bs_shop_pool_cards p
          where p.product_id=p_product_id
          order by (-ln(greatest(random(),0.000000001))) /
            (case upper(p.rarity) when 'C' then 60 when 'U' then 28 when 'R' then 9 when 'M' then 2.5
             when 'X' then .45 when 'XX' then .08 when 'CP' then 1.5 when 'CX' then .3 when 'TX' then .3 when 'PX' then .15 else 1 end)
          limit 1;
        if v_card.card_id is null then raise exception 'EMPTY_PRODUCT_POOL'; end if;
        v_event := public.bs_grant_card_copy(v_user,v_card.card_id,v_card.rarity,'booster_open:'||p_product_id)
          || jsonb_build_object('unitIndex',v_pack-1,'slotIndex',v_slot-1);
        v_grants := v_grants || jsonb_build_array(v_event);
      end loop;
    end loop;
  elsif v_product.product_type='card-set' then
    if not exists(select 1 from public.bs_shop_pool_cards where product_id=p_product_id) then raise exception 'EMPTY_PRODUCT_POOL'; end if;
    for v_copy in 1..p_quantity loop
      v_slot := 0;
      for v_card in select card_id,rarity from public.bs_shop_pool_cards where product_id=p_product_id order by card_id loop
        v_event := public.bs_grant_card_copy(v_user,v_card.card_id,v_card.rarity,'card_set_purchase:'||p_product_id)
          || jsonb_build_object('unitIndex',v_copy-1,'slotIndex',v_slot);
        v_grants := v_grants || jsonb_build_array(v_event);
        v_slot := v_slot + 1;
      end loop;
    end loop;
  elsif coalesce(v_product.product_type,'deck')='deck' or v_product.category='decks' then
    if not exists(select 1 from public.bs_shop_deck_cards where product_id=p_product_id) then raise exception 'DECK_DATA_INCOMPLETE'; end if;
    for v_copy in 1..p_quantity loop
      v_slot := 0;
      for v_card in select card_id,quantity,rarity from public.bs_shop_deck_cards where product_id=p_product_id order by card_id loop
        for v_pack in 1..v_card.quantity loop
          v_event := public.bs_grant_card_copy(v_user,v_card.card_id,v_card.rarity,'deck_purchase:'||p_product_id)
            || jsonb_build_object('unitIndex',v_copy-1,'slotIndex',v_slot);
          v_grants := v_grants || jsonb_build_array(v_event);
          v_slot := v_slot + 1;
        end loop;
      end loop;
    end loop;
    if v_product.recipe_id is not null then
      insert into public.bs_player_deck_recipes(user_id,recipe_id) values(v_user,v_product.recipe_id)
      on conflict(user_id,recipe_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('ok',true,'productId',p_product_id,'quantity',p_quantity,'totalPrice',v_total,
    'recipeId',v_product.recipe_id,'grants',v_grants);
end;
$$;

revoke all on function public.bs_purchase_shop_product(text,integer) from public;
grant execute on function public.bs_purchase_shop_product(text,integer) to authenticated;

commit;
