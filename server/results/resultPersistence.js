export async function persistRankedResult({ supabase, payload } = {}) {
  if (!supabase) {
    return { ok: false, code: "RANKED_PERSISTENCE_UNAVAILABLE", error: "Ranked persistence is unavailable." };
  }

  const { error } = await supabase.rpc("bs_ranked_settle_match", payload);
  if (error) {
    return { ok: false, code: "RANKED_PERSISTENCE_FAILED", error: error.message || "Ranked persistence failed." };
  }

  return { ok: true };
}
