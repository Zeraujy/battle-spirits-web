import test from "node:test";
import assert from "node:assert/strict";

import {
  ONLINE_AVATAR_MAX_CHARS,
  createOnlineProfileBase,
  createOnlinePublicProfile,
  sanitizeOnlineAvatarSource
} from "./publicProfile.js";

test("online profile keeps only public matchmaking identity fields", async () => {
  const result = await createOnlinePublicProfile({
    name: "Player",
    displayName: "Zeraujy",
    username: "zeraujy",
    bio: "private-ish profile text",
    banner: "data:image/png;base64,SHOULD_NOT_TRAVEL",
    email: "hidden@example.com",
    accessToken: "never-send-this"
  }, "#d8d8d8");

  assert.deepEqual(Object.keys(result).sort(), ["avatar", "name", "playerColor", "username"]);
  assert.equal(result.name, "Zeraujy");
  assert.equal(result.username, "zeraujy");
  assert.equal(result.playerColor, "#d8d8d8");
  assert.equal(result.avatar, null);
  assert.equal("banner" in result, false);
  assert.equal("bio" in result, false);
  assert.equal("email" in result, false);
  assert.equal("accessToken" in result, false);
});

test("online profile normalizes visible identity length and color", () => {
  const result = createOnlineProfileBase({
    displayName: "  Nome   com   espaços  ",
    username: "u".repeat(80)
  }, "not-a-color");

  assert.equal(result.name, "Nome com espaços");
  assert.equal(result.username.length, 24);
  assert.equal(result.playerColor, null);
});

test("small supported avatar data URLs are accepted", () => {
  const avatar = "data:image/webp;base64," + "A".repeat(200);
  assert.equal(sanitizeOnlineAvatarSource(avatar), avatar);
});

test("oversized data URL is rejected when browser resize is unavailable", async () => {
  const avatar = "data:image/png;base64," + "A".repeat(ONLINE_AVATAR_MAX_CHARS + 50_000);
  const result = await createOnlinePublicProfile({ name: "A", avatar }, "#d8d8d8");
  assert.equal(result.avatar, null);
});

test("remote avatar URL may travel but local/private fields never do", async () => {
  const avatar = "https://example.com/public/avatar.webp";
  const result = await createOnlinePublicProfile({
    name: "A",
    avatar,
    banner: "https://example.com/banner.webp",
    bio: "bio"
  }, "#f0f0f0");

  assert.equal(result.avatar, avatar);
  assert.equal(result.playerColor, "#f0f0f0");
  assert.equal("banner" in result, false);
  assert.equal("bio" in result, false);
});
