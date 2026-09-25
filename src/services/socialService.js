import { supabase } from "./supabase.js";
import { getDecks, getProfile, saveDecks, saveProfile } from "./storage.js";

export const DEFAULT_SOCIAL_PRIVACY = Object.freeze({
  profileVisibility: "public",
  friendRequestPolicy: "everyone",
  messagePolicy: "friends",
  discoverable: true,
  showOnlineStatus: true,
  showStats: true,
  showDecks: true,
  showMastery: true
});

let socialSchemaCache = null;

function currentLocalProfile() {
  return getProfile();
}

function cleanPrivacy(value = {}) {
  const source = value || {};
  const next = { ...DEFAULT_SOCIAL_PRIVACY };
  for (const key of Object.keys(next)) {
    if (source[key] !== undefined && source[key] !== null) next[key] = source[key];
  }
  return next;
}

function privacyFromRow(row = {}) {
  return cleanPrivacy({
    profileVisibility: row.profile_visibility,
    friendRequestPolicy: row.friend_request_policy,
    messagePolicy: row.message_policy,
    discoverable: row.discoverable,
    showOnlineStatus: row.show_online_status,
    showStats: row.show_stats,
    showDecks: row.show_decks,
    showMastery: row.show_mastery
  });
}

function privacyPayload(privacy = {}) {
  const value = cleanPrivacy(privacy);
  return {
    profile_visibility: value.profileVisibility,
    friend_request_policy: value.friendRequestPolicy,
    message_policy: value.messagePolicy,
    discoverable: Boolean(value.discoverable),
    show_online_status: Boolean(value.showOnlineStatus),
    show_stats: Boolean(value.showStats),
    show_decks: Boolean(value.showDecks),
    show_mastery: Boolean(value.showMastery)
  };
}

function normalizeError(error, fallback = "Não foi possível concluir esta ação.") {
  const message = String(error?.message || error || "").trim();
  if (!message) return fallback;
  if (/REQUESTS_DISABLED/i.test(message)) return "Este jogador não está aceitando pedidos de amizade.";
  if (/MUTUALS_ONLY/i.test(message)) return "Este jogador aceita pedidos apenas de amigos em comum.";
  if (/BLOCKED/i.test(message)) return "Esta interação não está disponível.";
  if (/AUTH_REQUIRED/i.test(message)) return "Entre na sua conta para usar os recursos sociais.";
  if (/PROFILE_NOT_FOUND/i.test(message)) return "Perfil não encontrado.";
  if (/REQUEST_NOT_FOUND/i.test(message)) return "Este pedido não está mais disponível.";
  if (/duplicate key|unique constraint/i.test(message)) return "Esse pedido já existe.";
  return message;
}

async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getAccountSession() {
  if (!supabase) return { mode: "local", user: null };
  const { data } = await supabase.auth.getSession();
  return { mode: "cloud", user: data.session?.user || null };
}

export async function signUp(email, password) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true, user: data.user };
}

export async function signIn(email, password) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true, user: data.user };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function getSocialSchemaStatus({ refresh = false } = {}) {
  if (!supabase) return { ready: false, version: null, mode: "local" };
  if (socialSchemaCache && !refresh) return socialSchemaCache;

  try {
    const { data, error } = await supabase.rpc("bs_social_health");
    if (error) throw error;
    socialSchemaCache = { ready: Boolean(data?.ok), version: data?.version || null, mode: "social-hub" };
  } catch {
    socialSchemaCache = { ready: false, version: null, mode: "legacy" };
  }
  return socialSchemaCache;
}

export async function syncProfileToCloud(profile = currentLocalProfile()) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };

  const basePayload = {
    id: user.id,
    username: String(profile.username || "").trim().toLowerCase(),
    display_name: profile.displayName || profile.name || "Jogador",
    bio: profile.bio || "",
    avatar: profile.avatar || null,
    banner: profile.banner || null,
    updated_at: new Date().toISOString()
  };

  const schema = await getSocialSchemaStatus();
  const payload = schema.ready
    ? { ...basePayload, ...privacyPayload(profile.privacy) }
    : basePayload;

  const { error } = await supabase.from("bs_profiles").upsert(payload);
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function loadCloudProfile() {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };

  const { data, error } = await supabase.from("bs_profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return { ok: false, error: normalizeError(error) };
  if (!data) return { ok: true, profile: null };

  const local = getProfile();
  const profile = {
    ...local,
    username: data.username || local.username,
    displayName: data.display_name || local.displayName,
    name: data.display_name || local.name,
    bio: data.bio || "",
    avatar: data.avatar || null,
    banner: data.banner || null,
    privacy: privacyFromRow(data)
  };
  saveProfile(profile);
  return { ok: true, profile };
}

export async function savePrivacySettings(privacy) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };

  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return { ok: false, error: "Execute a migração SOCIAL-HUB-3.6.sql no Supabase para ativar a privacidade avançada." };

  const next = cleanPrivacy(privacy);
  const { error } = await supabase.from("bs_profiles").update({
    ...privacyPayload(next),
    updated_at: new Date().toISOString()
  }).eq("id", user.id);

  if (error) return { ok: false, error: normalizeError(error) };

  const local = getProfile();
  saveProfile({ ...local, privacy: next });
  return { ok: true, privacy: next };
}

export async function syncDecksToCloud() {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };
  const { error } = await supabase.from("bs_player_decks").upsert({ user_id: user.id, decks: getDecks(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function loadDecksFromCloud() {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };
  const { data, error } = await supabase.from("bs_player_decks").select("decks").eq("user_id", user.id).maybeSingle();
  if (error) return { ok: false, error: normalizeError(error) };
  if (Array.isArray(data?.decks)) saveDecks(data.decks);
  return { ok: true, decks: data?.decks || [] };
}

export async function searchProfiles(query) {
  if (!supabase) return [];
  const q = String(query || "").trim();
  if (!q) return [];

  const schema = await getSocialSchemaStatus();
  if (schema.ready) {
    const { data, error } = await supabase.rpc("bs_search_profiles", { search_text: q });
    if (!error) return data || [];
  }

  const { data } = await supabase
    .from("bs_profiles")
    .select("id,username,display_name,avatar")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(12);
  return data || [];
}

export async function loadSocialProfile(targetId) {
  if (!supabase || !targetId) return null;
  const schema = await getSocialSchemaStatus();
  if (schema.ready) {
    const { data, error } = await supabase.rpc("bs_get_social_profile", { target_id: targetId });
    if (!error) return data || null;
  }

  const { data } = await supabase.from("bs_profiles")
    .select("id,username,display_name,avatar,banner,bio")
    .eq("id", targetId)
    .maybeSingle();
  return data || null;
}

export async function sendFriendRequest(targetId) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };

  const schema = await getSocialSchemaStatus();
  if (schema.ready) {
    const { data, error } = await supabase.rpc("bs_send_friend_request", { target_id: targetId });
    if (error) return { ok: false, error: normalizeError(error) };
    return data?.ok === false ? { ok: false, error: normalizeError(data?.error) } : { ok: true, status: data?.status || "pending" };
  }

  const { error } = await supabase.from("bs_friendships").insert({ requester_id: user.id, addressee_id: targetId, status: "pending" });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true, status: "pending" };
}

export async function loadFriends() {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc("bs_list_friends");
  if (error) return [];
  return data || [];
}

export async function loadFriendRequests() {
  if (!supabase) return { incoming: [], outgoing: [] };
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return { incoming: [], outgoing: [] };
  const { data, error } = await supabase.rpc("bs_list_friend_requests");
  if (error) return { incoming: [], outgoing: [] };
  const rows = data || [];
  return {
    incoming: rows.filter((row) => row.direction === "incoming"),
    outgoing: rows.filter((row) => row.direction === "outgoing")
  };
}

export async function respondFriendRequest(requestId, response) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const { data, error } = await supabase.rpc("bs_respond_friend_request", {
    request_id: Number(requestId),
    response
  });
  if (error) return { ok: false, error: normalizeError(error) };
  return data?.ok === false ? { ok: false, error: normalizeError(data?.error) } : { ok: true, status: data?.status };
}

export async function removeFriend(friendId) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const { error } = await supabase.rpc("bs_remove_friend", { target_id: friendId });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function blockUser(targetId) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const { error } = await supabase.rpc("bs_block_user", { target_id: targetId });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function unblockUser(targetId) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const { error } = await supabase.rpc("bs_unblock_user", { target_id: targetId });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function loadConversations() {
  if (!supabase) return [];
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return [];
  const { data, error } = await supabase.rpc("bs_list_conversations");
  return error ? [] : (data || []);
}

export async function loadBlockedUsers() {
  if (!supabase) return [];
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return [];
  const { data, error } = await supabase.rpc("bs_list_blocked");
  return error ? [] : (data || []);
}

export async function loadDirectMessages(friendId) {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user || !friendId) return [];
  const { data } = await supabase.from("bs_direct_messages")
    .select("id,sender_id,recipient_id,text,created_at,read_at")
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`)
    .order("created_at", { ascending: true })
    .limit(250);
  return data || [];
}

export async function sendDirectMessage(friendId, text) {
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const user = await currentUser();
  if (!user) return { ok: false, error: "Entre na conta primeiro." };
  const clean = String(text || "").trim().slice(0, 1000);
  if (!clean) return { ok: false, error: "Mensagem vazia." };
  const { error } = await supabase.from("bs_direct_messages").insert({ sender_id: user.id, recipient_id: friendId, text: clean });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function markConversationRead(friendId) {
  if (!supabase || !friendId) return { ok: false };
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return { ok: true };
  const { error } = await supabase.rpc("bs_mark_conversation_read", { friend_id: friendId });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function loadNotifications() {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user) return [];
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return [];

  const { data, error } = await supabase.from("bs_notifications")
    .select("id,type,actor_id,payload,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return data || [];
}

export async function markNotificationRead(notificationId) {
  if (!supabase || !notificationId) return { ok: false };
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return { ok: true };
  const { error } = await supabase.rpc("bs_mark_notification_read", { notification_id: Number(notificationId) });
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function markAllNotificationsRead() {
  if (!supabase) return { ok: false };
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return { ok: true };
  const { error } = await supabase.rpc("bs_mark_all_notifications_read");
  return error ? { ok: false, error: normalizeError(error) } : { ok: true };
}

export async function touchSocialPresence(status = "online") {
  if (!supabase) return false;
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return false;
  const { error } = await supabase.rpc("bs_touch_presence", { next_status: status });
  return !error;
}

export async function loadSocialBootstrap() {
  if (!supabase) {
    return {
      friends: [],
      requests: { incoming: [], outgoing: [] },
      conversations: [],
      notifications: [],
      blocked: [],
      schema: { ready: false, version: null, mode: "local" }
    };
  }

  const schema = await getSocialSchemaStatus();
  const [friends, requests, conversations, notifications, blocked] = await Promise.all([
    loadFriends(),
    loadFriendRequests(),
    loadConversations(),
    loadNotifications(),
    loadBlockedUsers()
  ]);

  return { friends, requests, conversations, notifications, blocked, schema };
}

export async function subscribeSocialEvents(onEvent) {
  if (!supabase || typeof onEvent !== "function") return () => {};
  const user = await currentUser();
  if (!user) return () => {};
  const schema = await getSocialSchemaStatus();
  if (!schema.ready) return () => {};

  const channel = supabase
    .channel(`bs-social-${user.id}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "bs_direct_messages",
      filter: `recipient_id=eq.${user.id}`
    }, (payload) => onEvent({ type: "message", payload }))
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "bs_notifications",
      filter: `user_id=eq.${user.id}`
    }, (payload) => onEvent({ type: "notification", payload }))
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "bs_friendships"
    }, (payload) => onEvent({ type: "friendship", payload }))
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
