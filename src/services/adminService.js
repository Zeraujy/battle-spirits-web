import { supabase } from "./supabase.js";

export async function getAdminAccess() {
  if (!supabase) return { ok: false, allowed: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data, error } = await supabase.rpc("bs_admin_has_access");
  if (error) return { ok: false, allowed: false, error: error.message };
  return { ok: true, allowed: Boolean(data) };
}

export async function listAdminPlayers(query = "") {
  if (!supabase) return { ok: false, rows: [], error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data, error } = await supabase.rpc("bs_admin_list_players", { p_query: String(query || "").trim() });
  if (error) return { ok: false, rows: [], error: error.message };
  return { ok: true, rows: Array.isArray(data) ? data : [] };
}

export async function adjustAdminCurrency(userId, currency, amount, reason = "") {
  if (!supabase) return { ok: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data, error } = await supabase.rpc("bs_admin_adjust_currency", {
    p_target_user: userId,
    p_currency: currency,
    p_amount: Math.trunc(Number(amount || 0)),
    p_reason: String(reason || "").slice(0, 240)
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, result: data };
}

export async function setAdminPlayerStatus(userId, status) {
  if (!supabase) return { ok: false, error: "ACCOUNT_SERVICE_UNAVAILABLE" };
  const { data, error } = await supabase.rpc("bs_admin_set_player_status", {
    p_target_user: userId,
    p_status: status
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, result: data };
}
