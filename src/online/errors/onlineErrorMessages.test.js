import test from "node:test";
import assert from "node:assert/strict";
import { onlineErrorMessage } from "./onlineErrorMessages.js";

test("known Online error codes use stable user-facing copy", () => {
  assert.equal(onlineErrorMessage({ code: "READY_CHECK_EXPIRED", error: "internal" }), "A confirmação da partida expirou.");
});

test("unsafe technical messages are hidden", () => {
  assert.equal(onlineErrorMessage({ error: "Supabase RPC database exception" }, { fallback: "Falha segura." }), "Falha segura.");
});
