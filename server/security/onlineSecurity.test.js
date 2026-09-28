import test from "node:test";
import assert from "node:assert/strict";
import {
  OnlineEventGuard,
  OnlineGuardCode,
  constantTimeTokenEqual,
  serializedPayloadSize
} from "./OnlineEventGuard.js";

test("payload size is measured using serialized UTF-8 bytes", () => {
  assert.equal(serializedPayloadSize({ text: "abc" }), Buffer.byteLength(JSON.stringify({ text: "abc" })));
});

test("event guard rejects oversized payloads before rate accounting", () => {
  const guard = new OnlineEventGuard({
    rules: { default: { maxRequests: 10, windowMs: 1000, maxPayloadBytes: 8 } }
  });
  const result = guard.inspect("socket-a", "room:chat", { text: "0123456789" });
  assert.equal(result.ok, false);
  assert.equal(result.code, OnlineGuardCode.PAYLOAD_TOO_LARGE);
});

test("event guard rate limits per socket and event", () => {
  let now = 1000;
  const guard = new OnlineEventGuard({
    now: () => now,
    rules: { default: { maxRequests: 2, windowMs: 1000, maxPayloadBytes: 1024 } }
  });
  assert.equal(guard.inspect("socket-a", "event-a", {}).ok, true);
  assert.equal(guard.inspect("socket-a", "event-a", {}).ok, true);
  assert.equal(guard.inspect("socket-a", "event-a", {}).code, OnlineGuardCode.RATE_LIMITED);
  assert.equal(guard.inspect("socket-b", "event-a", {}).ok, true);
  assert.equal(guard.inspect("socket-a", "event-b", {}).ok, true);
  now = 2001;
  assert.equal(guard.inspect("socket-a", "event-a", {}).ok, true);
});

test("clearing a socket removes its rate-limit buckets", () => {
  const guard = new OnlineEventGuard({
    rules: { default: { maxRequests: 1, windowMs: 1000, maxPayloadBytes: 1024 } }
  });
  assert.equal(guard.inspect("socket-a", "event-a", {}).ok, true);
  assert.equal(guard.inspect("socket-a", "event-a", {}).ok, false);
  guard.clearSocket("socket-a");
  assert.equal(guard.inspect("socket-a", "event-a", {}).ok, true);
});

test("resume tokens use a constant-time equality primitive for equal-length values", () => {
  assert.equal(constantTimeTokenEqual("secret-a", "secret-a"), true);
  assert.equal(constantTimeTokenEqual("secret-a", "secret-b"), false);
  assert.equal(constantTimeTokenEqual("short", "much-longer"), false);
  assert.equal(constantTimeTokenEqual("", ""), false);
});
