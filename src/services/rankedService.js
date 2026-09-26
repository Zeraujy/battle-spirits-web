import { supabase } from "./supabase.js";
import { getSocialSchemaStatus } from "./socialService.js";

export const RANKED_SEASON = "S0";

function versionAtLeast(version, target = "3.7.1") {
  const a = String(version || "0").split(".").map(Number);
  const b = String(target).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return true;
}

export function rankFromRp(rp = 1000) {
  const value = Math.max(0, Number(rp || 0));
  if (value >= 2400) return { tier: "MASTER", division: null, label: "MASTER" };
  if (value >= 2100) return { tier: "DIAMOND", division: division(value, 2100), label: `DIAMOND ${division(value, 2100)}` };
  if (value >= 1800) return { tier: "PLATINUM", division: division(value, 1800), label: `PLATINUM ${division(value, 1800)}` };
  if (value >= 1500) return { tier: "GOLD", division: division(value, 1500), label: `GOLD ${division(value, 1500)}` };
  if (value >= 1200) return { tier: "SILVER", division: division(value, 1200), label: `SILVER ${division(value, 1200)}` };
  const div = division(value, 900);
  return { tier: "BRONZE", division: div, label: `BRONZE ${div}` };
}

function division(rp, floor) {
  const within = Math.max(0, Number(rp) - floor);
  if (within >= 200) return "I";
  if (within >= 100) return "II";
  return "III";
}

export async function getRankedAccess() {
  if (!supabase) return { ok: false, error: "Recursos competitivos indisponíveis no momento.", signedIn: false };
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session?.user || !session?.access_token) return { ok: false, error: "Entre na sua conta para jogar Ranked.", signedIn: false };
  const schema = await getSocialSchemaStatus({ refresh: true });
  if (!schema.ready || !versionAtLeast(schema.version)) {
    return { ok: false, error: "Sua identidade competitiva está temporariamente indisponível.", signedIn: true, needsMigration: true };
  }
  return { ok: true, signedIn: true, user: session.user, accessToken: session.access_token };
}

export async function loadRankedProfile() {
  const access = await getRankedAccess();
  if (!access.ok) return { ...access, profile: null };
  const { data, error } = await supabase
    .from("bs_ranked_profiles")
    .select("season,rp,peak_rp,wins,losses,placements,updated_at")
    .eq("user_id", access.user.id)
    .eq("season", RANKED_SEASON)
    .maybeSingle();
  if (error) return { ok: false, signedIn: true, error: "Não foi possível carregar seu perfil Ranked agora.", profile: null, accessToken: access.accessToken };
  const profile = data || { season: RANKED_SEASON, rp: 1000, peak_rp: 1000, wins: 0, losses: 0, placements: 0 };
  return { ok: true, signedIn: true, profile: { ...profile, rank: rankFromRp(profile.rp) }, accessToken: access.accessToken, user: access.user };
}

export async function loadRankedHistory({ limit = 12 } = {}) {
  const access = await getRankedAccess();
  if (!access.ok) return { ...access, rows: [] };
  const { data, error } = await supabase
    .from("bs_ranked_matches")
    .select("match_uid,result,rp_before,rp_after,rp_delta,opponent_name,opponent_username,deck_id,deck_name,played_at,end_reason")
    .eq("user_id", access.user.id)
    .eq("season", RANKED_SEASON)
    .order("played_at", { ascending: false })
    .limit(limit);
  return error ? { ok: false, error: "Não foi possível carregar o histórico Ranked agora.", rows: [] } : { ok: true, rows: data || [] };
}

export function summarizeRankedHistory(rows = []) {
  const safe = Array.isArray(rows) ? rows : [];
  const deckMap = new Map();
  for (const row of safe) {
    const key = row?.deck_id || row?.deck_name;
    if (!key) continue;
    const current = deckMap.get(key) || { id: row.deck_id || null, name: row.deck_name || "Deck", matches: 0, wins: 0 };
    current.matches += 1;
    if (row.result === "win") current.wins += 1;
    deckMap.set(key, current);
  }
  const favoriteDeck = [...deckMap.values()].sort((a,b) => b.matches - a.matches || b.wins - a.wins)[0] || null;
  return { favoriteDeck };
}

export async function loadPublicRankedIdentity(targetId) {
  if (!supabase || !targetId) return null;
  const schema = await getSocialSchemaStatus();
  if (!schema.ready || !versionAtLeast(schema.version)) return null;
  const { data, error } = await supabase.rpc("bs_get_ranked_identity", { target_id: targetId });
  if (error || !data || data.visible === false) return data || null;
  return { ...data, rank: rankFromRp(data.rp) };
}

export async function loadFriendRankedIdentities() {
  if (!supabase) return {};
  const schema = await getSocialSchemaStatus();
  if (!schema.ready || !versionAtLeast(schema.version)) return {};
  const { data, error } = await supabase.rpc("bs_list_friend_ranked_profiles");
  if (error) return {};
  return Object.fromEntries((data || []).map((row) => [row.user_id, { ...row, rank: rankFromRp(row.rp) }]));
}
