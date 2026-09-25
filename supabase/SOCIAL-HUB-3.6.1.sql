-- Battle Spirits Eternal Simulator v3.6.1
-- SOCIAL HUB POLISH & STABILITY
-- Migração incremental. Execute APÓS SOCIAL-HUB-3.6.sql.

begin;

alter table public.bs_profiles
  add column if not exists custom_status text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bs_profiles_custom_status_length') then
    alter table public.bs_profiles add constraint bs_profiles_custom_status_length
      check (char_length(custom_status) <= 80);
  end if;
end $$;

create table if not exists public.bs_social_preferences (
  user_id uuid not null references public.bs_profiles(id) on delete cascade,
  target_id uuid not null references public.bs_profiles(id) on delete cascade,
  is_favorite boolean not null default false,
  is_muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, target_id),
  check (user_id <> target_id)
);

alter table public.bs_social_preferences enable row level security;

drop policy if exists "social preferences owner read" on public.bs_social_preferences;
create policy "social preferences owner read"
on public.bs_social_preferences for select to authenticated
using (auth.uid() = user_id);

-- Escrita direta fica fechada; alterações são feitas pela RPC validada abaixo.
drop policy if exists "social preferences owner insert" on public.bs_social_preferences;
drop policy if exists "social preferences owner update" on public.bs_social_preferences;
drop policy if exists "social preferences owner delete" on public.bs_social_preferences;

create or replace function public.bs_set_friend_preference(
  target_id uuid,
  next_favorite boolean default null,
  next_muted boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.bs_social_preferences%rowtype;
  favorite_value boolean;
  muted_value boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); end if;
  if target_id = auth.uid() then return jsonb_build_object('ok', false, 'error', 'INVALID_TARGET'); end if;
  if not public.bs_are_friends(auth.uid(), target_id) then return jsonb_build_object('ok', false, 'error', 'NOT_FRIENDS'); end if;

  select * into existing from public.bs_social_preferences
  where user_id = auth.uid() and public.bs_social_preferences.target_id = bs_set_friend_preference.target_id;

  favorite_value := coalesce(next_favorite, existing.is_favorite, false);
  muted_value := coalesce(next_muted, existing.is_muted, false);

  insert into public.bs_social_preferences(user_id, target_id, is_favorite, is_muted, updated_at)
  values(auth.uid(), target_id, favorite_value, muted_value, now())
  on conflict (user_id, target_id) do update
    set is_favorite = excluded.is_favorite,
        is_muted = excluded.is_muted,
        updated_at = now();

  return jsonb_build_object('ok', true, 'favorite', favorite_value, 'muted', muted_value);
end;
$$;

drop function if exists public.bs_list_friends();
create function public.bs_list_friends()
returns table(
  friend_id uuid,
  username text,
  display_name text,
  avatar text,
  bio text,
  custom_status text,
  presence_status text,
  is_online boolean,
  last_seen_at timestamptz,
  unread_count bigint,
  is_favorite boolean,
  is_muted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    case when p.profile_visibility = 'private' then null else p.avatar end,
    case when p.profile_visibility <> 'private' then p.bio else '' end,
    p.custom_status,
    case when p.show_online_status then p.presence_status else 'hidden' end,
    case when p.show_online_status and p.presence_status <> 'invisible' and p.last_seen_at > now() - interval '2 minutes' then true else false end,
    case when p.show_online_status then p.last_seen_at else null end,
    (select count(*) from public.bs_direct_messages m where m.sender_id = p.id and m.recipient_id = auth.uid() and m.read_at is null),
    coalesce(pref.is_favorite, false),
    coalesce(pref.is_muted, false)
  from public.bs_friendships f
  join public.bs_profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join public.bs_social_preferences pref on pref.user_id = auth.uid() and pref.target_id = p.id
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    and not public.bs_is_blocked(auth.uid(), p.id)
  order by coalesce(pref.is_favorite, false) desc, 8 desc, p.display_name asc;
$$;

drop function if exists public.bs_list_conversations();
create function public.bs_list_conversations()
returns table(
  user_id uuid,
  username text,
  display_name text,
  avatar text,
  custom_status text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  is_friend boolean,
  presence_status text,
  is_online boolean,
  is_favorite boolean,
  is_muted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with peers as (
    select distinct case when m.sender_id=auth.uid() then m.recipient_id else m.sender_id end as peer_id
    from public.bs_direct_messages m
    where m.sender_id=auth.uid() or m.recipient_id=auth.uid()
  )
  select
    p.id,
    p.username,
    p.display_name,
    case when p.profile_visibility = 'private' and not public.bs_are_friends(auth.uid(), p.id) then null else p.avatar end,
    p.custom_status,
    latest.text,
    latest.created_at,
    (select count(*) from public.bs_direct_messages u where u.sender_id=p.id and u.recipient_id=auth.uid() and u.read_at is null),
    public.bs_are_friends(auth.uid(), p.id),
    case when p.show_online_status then p.presence_status else 'hidden' end,
    case when p.show_online_status and p.presence_status <> 'invisible' and p.last_seen_at > now() - interval '2 minutes' then true else false end,
    coalesce(pref.is_favorite, false),
    coalesce(pref.is_muted, false)
  from peers x
  join public.bs_profiles p on p.id=x.peer_id
  left join public.bs_social_preferences pref on pref.user_id=auth.uid() and pref.target_id=p.id
  join lateral (
    select m.text, m.created_at
    from public.bs_direct_messages m
    where (m.sender_id=auth.uid() and m.recipient_id=p.id)
       or (m.sender_id=p.id and m.recipient_id=auth.uid())
    order by m.created_at desc
    limit 1
  ) latest on true
  where not public.bs_is_blocked(auth.uid(), p.id)
  order by coalesce(pref.is_favorite, false) desc, latest.created_at desc;
$$;

-- Atualiza o perfil social retornado sem expor preferências privadas.
create or replace function public.bs_get_social_profile(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.bs_profiles%rowtype;
  can_view boolean;
  friend boolean;
begin
  select * into p from public.bs_profiles where id=target_id;
  if not found then return null; end if;
  friend := public.bs_are_friends(auth.uid(), target_id);
  can_view := auth.uid() = target_id or p.profile_visibility = 'public' or (p.profile_visibility = 'friends' and friend);
  return jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar', case when can_view then p.avatar else null end,
    'banner', case when can_view then p.banner else null end,
    'bio', case when can_view then p.bio else '' end,
    'custom_status', case when can_view then p.custom_status else '' end,
    'can_view', can_view,
    'is_friend', friend,
    'can_message', public.bs_can_message(auth.uid(), target_id)
  );
end;
$$;

create or replace function public.bs_notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.bs_social_preferences pref
    where pref.user_id = new.recipient_id
      and pref.target_id = new.sender_id
      and pref.is_muted = true
  ) then
    return new;
  end if;

  insert into public.bs_notifications(user_id, type, actor_id, payload)
  values(new.recipient_id, 'message', new.sender_id, jsonb_build_object('message_id', new.id));
  return new;
end;
$$;

drop trigger if exists bs_message_notification_trigger on public.bs_direct_messages;
create trigger bs_message_notification_trigger
after insert on public.bs_direct_messages
for each row execute function public.bs_notify_message();

create or replace function public.bs_social_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('ok', true, 'version', '3.6.1');
$$;

grant execute on function public.bs_set_friend_preference(uuid,boolean,boolean) to authenticated;
grant execute on function public.bs_list_friends() to authenticated;
grant execute on function public.bs_list_conversations() to authenticated;
grant execute on function public.bs_get_social_profile(uuid) to authenticated;
grant execute on function public.bs_social_health() to authenticated;

commit;
