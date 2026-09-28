-- v5.0.2 All Decks in New Player Onboarding
-- Every active Shop deck is valid for the initial choose-3 flow.

update public.bs_shop_products
set starter_eligible = true
where category = 'decks' and enabled = true;

create or replace function public.bs_claim_starter_decks(p_product_ids text[])
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid := auth.uid();
  v_progress public.bs_player_progress%rowtype;
  v_product_id text;
  v_product public.bs_shop_products%rowtype;
  v_card record;
  v_i integer;
  v_event jsonb;
  v_grants jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if cardinality(p_product_ids) <> 3 or (select count(distinct x) from unnest(p_product_ids) x) <> 3 then
    raise exception 'SELECT_EXACTLY_THREE';
  end if;

  insert into public.bs_player_wallets(user_id) values(v_user) on conflict(user_id) do nothing;
  insert into public.bs_player_progress(user_id) values(v_user) on conflict(user_id) do nothing;
  select * into v_progress from public.bs_player_progress where user_id=v_user for update;

  if v_progress.onboarding_complete then
    return jsonb_build_object('ok',true,'alreadyComplete',true);
  end if;

  foreach v_product_id in array p_product_ids loop
    select * into v_product from public.bs_shop_products
      where product_id=v_product_id and category='decks' and enabled=true;
    if not found then raise exception 'INVALID_STARTER_DECK'; end if;
    if not exists(select 1 from public.bs_shop_deck_cards where product_id=v_product_id) then
      raise exception 'DECK_DATA_INCOMPLETE';
    end if;

    for v_card in select card_id,quantity,rarity from public.bs_shop_deck_cards where product_id=v_product_id loop
      for v_i in 1..v_card.quantity loop
        v_event := public.bs_grant_card_copy(v_user,v_card.card_id,v_card.rarity,'starter_deck:'||v_product_id);
        v_grants := v_grants || jsonb_build_array(v_event);
      end loop;
    end loop;

    insert into public.bs_player_deck_recipes(user_id,recipe_id) values(v_user,v_product.recipe_id)
      on conflict(user_id,recipe_id) do nothing;
  end loop;

  update public.bs_player_progress
  set onboarding_complete=true,starter_deck_ids=p_product_ids,updated_at=now()
  where user_id=v_user;

  return jsonb_build_object('ok',true,'starterDeckIds',p_product_ids,'grants',v_grants);
end;
$$;

revoke all on function public.bs_claim_starter_decks(text[]) from public, anon;
grant execute on function public.bs_claim_starter_decks(text[]) to authenticated;
