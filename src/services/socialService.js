import { supabase } from "./supabase.js";
import { getDecks, getProfile, saveDecks, saveProfile } from "./storage.js";

function currentLocalProfile() { return getProfile(); }

export async function getAccountSession() {
  if (!supabase) return { mode:"local", user:null };
  const { data } = await supabase.auth.getSession();
  return { mode:"cloud", user:data.session?.user || null };
}

export async function signUp(email, password) {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return error ? { ok:false, error:error.message } : { ok:true, user:data.user };
}

export async function signIn(email, password) {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok:false, error:error.message } : { ok:true, user:data.user };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function syncProfileToCloud(profile = currentLocalProfile()) {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, error:"Entre na conta primeiro." };
  const payload = {
    id:user.id,
    username:String(profile.username || "").trim().toLowerCase(),
    display_name:profile.displayName || profile.name || "Jogador",
    bio:profile.bio || "",
    avatar:profile.avatar || null,
    banner:profile.banner || null,
    updated_at:new Date().toISOString()
  };
  const { error } = await supabase.from("bs_profiles").upsert(payload);
  return error ? { ok:false, error:error.message } : { ok:true };
}

export async function loadCloudProfile() {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, error:"Entre na conta primeiro." };
  const { data, error } = await supabase.from("bs_profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return { ok:false, error:error.message };
  if (!data) return { ok:true, profile:null };
  const local = getProfile();
  const profile = { ...local, username:data.username || local.username, displayName:data.display_name || local.displayName, name:data.display_name || local.name, bio:data.bio || "", avatar:data.avatar || null, banner:data.banner || null };
  saveProfile(profile);
  return { ok:true, profile };
}

export async function syncDecksToCloud() {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, error:"Entre na conta primeiro." };
  const { error } = await supabase.from("bs_player_decks").upsert({ user_id:user.id, decks:getDecks(), updated_at:new Date().toISOString() }, { onConflict:"user_id" });
  return error ? { ok:false, error:error.message } : { ok:true };
}

export async function loadDecksFromCloud() {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, error:"Entre na conta primeiro." };
  const { data, error } = await supabase.from("bs_player_decks").select("decks").eq("user_id", user.id).maybeSingle();
  if (error) return { ok:false, error:error.message };
  if (Array.isArray(data?.decks)) saveDecks(data.decks);
  return { ok:true, decks:data?.decks || [] };
}

export async function searchProfiles(query) {
  if (!supabase) return [];
  const q = String(query || "").trim();
  if (!q) return [];
  const { data } = await supabase.from("bs_profiles").select("id,username,display_name,avatar,bio").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(12);
  return data || [];
}

export async function sendFriendRequest(targetId) {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, error:"Entre na conta primeiro." };
  const { error } = await supabase.from("bs_friendships").insert({ requester_id:user.id, addressee_id:targetId, status:"accepted" });
  return error ? { ok:false, error:error.message } : { ok:true };
}

export async function loadFriends() {
  if (!supabase) return [];
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc("bs_list_friends");
  if (error) return [];
  return data || [];
}

export async function loadDirectMessages(friendId) {
  if (!supabase) return [];
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user || !friendId) return [];
  const { data } = await supabase.from("bs_direct_messages").select("*").or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`).order("created_at", { ascending:true }).limit(200);
  return data || [];
}

export async function sendDirectMessage(friendId, text) {
  if (!supabase) return { ok:false, error:"Supabase não configurado." };
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, error:"Entre na conta primeiro." };
  const clean = String(text || "").trim().slice(0,1000);
  if (!clean) return { ok:false, error:"Mensagem vazia." };
  const { error } = await supabase.from("bs_direct_messages").insert({ sender_id:user.id, recipient_id:friendId, text:clean });
  return error ? { ok:false, error:error.message } : { ok:true };
}
