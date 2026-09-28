-- Battle Spirits: KAIHOU! Simulator v5.0.3
-- Starter Deck purchase repair. Run AFTER ECONOMY-5.0.2-ONBOARDING-ALL-DECKS.sql.

begin;

-- v5.0.1 added new Starter Deck product rows after the v4.2.2 product_type backfill.
-- Those rows could therefore keep product_type NULL and be misrouted through the booster branch.
update public.bs_shop_products
set product_type = 'deck'
where category = 'decks'
  and (product_type is null or product_type <> 'deck');

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

  select * into v_product
  from public.bs_shop_products
  where product_id = p_product_id and enabled = true;

  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  insert into public.bs_player_wallets(user_id) values(v_user) on conflict(user_id) do nothing;
  insert into public.bs_player_progress(user_id) values(v_user) on conflict(user_id) do nothing;

  select spirit_coins into v_wallet
  from public.bs_player_wallets
  where user_id=v_user
  for update;

  v_total := v_product.spirit_price::bigint * p_quantity::bigint;
  if v_wallet < v_total then raise exception 'INSUFFICIENT_SPIRIT_COINS'; end if;

  -- IMPORTANT: validate product contents before charging the wallet.
  if v_product.category='decks' or v_product.product_type='deck' then
    if not exists(select 1 from public.bs_shop_deck_cards where product_id=p_product_id) then
      raise exception 'DECK_DATA_INCOMPLETE';
    end if;
  elsif v_product.product_type='card-set' then
    if not exists(select 1 from public.bs_shop_pool_cards where product_id=p_product_id) then
      raise exception 'EMPTY_PRODUCT_POOL';
    end if;
  elsif coalesce(v_product.product_type,'booster')='booster' then
    if not exists(select 1 from public.bs_shop_pool_cards where product_id=p_product_id) then
      raise exception 'EMPTY_PRODUCT_POOL';
    end if;
  else
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  update public.bs_player_wallets
  set spirit_coins=spirit_coins-v_total, updated_at=now()
  where user_id=v_user;

  insert into public.bs_economy_ledger(user_id,currency,amount,reason)
  values(v_user,'spirit',-v_total,'shop_purchase:'||p_product_id);

  -- Category is authoritative for decks. This intentionally precedes the booster fallback.
  if v_product.category='decks' or v_product.product_type='deck' then
    for v_copy in 1..p_quantity loop
      v_slot := 0;
      for v_card in
        select card_id,quantity,rarity
        from public.bs_shop_deck_cards
        where product_id=p_product_id
        order by card_id
      loop
        for v_pack in 1..v_card.quantity loop
          v_event := public.bs_grant_card_copy(v_user,v_card.card_id,v_card.rarity,'deck_purchase:'||p_product_id)
            || jsonb_build_object('unitIndex',v_copy-1,'slotIndex',v_slot);
          v_grants := v_grants || jsonb_build_array(v_event);
          v_slot := v_slot + 1;
        end loop;
      end loop;

      if v_product.recipe_id is not null then
        insert into public.bs_player_deck_recipes(user_id,recipe_id)
        values(v_user,v_product.recipe_id)
        on conflict(user_id,recipe_id) do nothing;
      end if;
    end loop;

  elsif v_product.product_type='card-set' then
    for v_copy in 1..p_quantity loop
      v_slot := 0;
      for v_card in
        select card_id,rarity
        from public.bs_shop_pool_cards
        where product_id=p_product_id
        order by card_id
      loop
        v_event := public.bs_grant_card_copy(v_user,v_card.card_id,v_card.rarity,'card_set_purchase:'||p_product_id)
          || jsonb_build_object('unitIndex',v_copy-1,'slotIndex',v_slot);
        v_grants := v_grants || jsonb_build_array(v_event);
        v_slot := v_slot + 1;
      end loop;
    end loop;

  elsif coalesce(v_product.product_type,'booster')='booster' then
    for v_pack in 1..p_quantity loop
      for v_slot in 1..coalesce(v_product.pack_size,8) loop
        select p.card_id,p.rarity into v_card
        from public.bs_shop_pool_cards p
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
  end if;

  return jsonb_build_object(
    'ok',true,
    'productId',p_product_id,
    'quantity',p_quantity,
    'totalPrice',v_total,
    'recipeId',v_product.recipe_id,
    'grants',v_grants
  );
end;
$$;

revoke all on function public.bs_purchase_shop_product(text,integer) from public, anon;
grant execute on function public.bs_purchase_shop_product(text,integer) to authenticated;

commit;
