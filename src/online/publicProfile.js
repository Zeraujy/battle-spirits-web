const ONLINE_AVATAR_SIDE = 128;
export const ONLINE_AVATAR_MAX_CHARS = 120_000;
export const ONLINE_PROFILE_MAX_JSON_CHARS = 160_000;
const REMOTE_AVATAR_MAX_CHARS = 2_048;

const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,/i;
const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const PLAYER_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function cleanText(value, maxLength, fallback = "") {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (text || fallback).slice(0, maxLength);
}

export function sanitizeOnlineAvatarSource(value) {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (!source) return null;

  if (REMOTE_IMAGE_PATTERN.test(source)) {
    return source.length <= REMOTE_AVATAR_MAX_CHARS ? source : null;
  }

  if (DATA_IMAGE_PATTERN.test(source)) {
    return source.length <= ONLINE_AVATAR_MAX_CHARS ? source : null;
  }

  return null;
}

export function createOnlineProfileBase(profile = {}, playerColor = null) {
  return {
    name: cleanText(profile.displayName || profile.name, 40, "Jogador"),
    username: cleanText(profile.username, 24),
    playerColor: PLAYER_COLOR_PATTERN.test(String(playerColor || ""))
      ? String(playerColor)
      : null
  };
}

function canResizeInThisRuntime() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof Image !== "undefined"
  );
}

function loadDataImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível preparar o avatar para o Online."));
    image.src = source;
  });
}

function drawSquareAvatar(image, side) {
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas indisponível para preparar o avatar.");

  const width = Math.max(1, Number(image.naturalWidth || image.width || 1));
  const height = Math.max(1, Number(image.naturalHeight || image.height || 1));
  const crop = Math.min(width, height);
  const sx = Math.max(0, (width - crop) / 2);
  const sy = Math.max(0, (height - crop) / 2);

  context.clearRect(0, 0, side, side);
  context.drawImage(image, sx, sy, crop, crop, 0, 0, side, side);
  return canvas;
}

function encodeWithinBudget(canvas) {
  const attempts = [
    ["image/webp", 0.76],
    ["image/webp", 0.62],
    ["image/webp", 0.48],
    ["image/jpeg", 0.72],
    ["image/jpeg", 0.56]
  ];

  for (const [type, quality] of attempts) {
    const encoded = canvas.toDataURL(type, quality);
    if (
      typeof encoded === "string" &&
      encoded.startsWith("data:image/") &&
      encoded.length <= ONLINE_AVATAR_MAX_CHARS
    ) {
      return encoded;
    }
  }

  return null;
}

export async function prepareOnlineAvatar(value) {
  const direct = sanitizeOnlineAvatarSource(value);
  if (direct) return direct;

  if (
    typeof value !== "string" ||
    !DATA_IMAGE_PATTERN.test(value) ||
    !canResizeInThisRuntime()
  ) {
    return null;
  }

  try {
    const image = await loadDataImage(value);

    for (const side of [ONLINE_AVATAR_SIDE, 112, 96]) {
      const canvas = drawSquareAvatar(image, side);
      const encoded = encodeWithinBudget(canvas);
      if (encoded) return encoded;
    }
  } catch (error) {
    console.warn("[online-profile] avatar omitido:", error?.message || error);
  }

  return null;
}

export async function createOnlinePublicProfile(profile = {}, playerColor = null) {
  const publicProfile = {
    ...createOnlineProfileBase(profile, playerColor),
    avatar: await prepareOnlineAvatar(profile.avatar)
  };

  // Safety belt: an Online profile must stay tiny. If a browser/plugin ever
  // changes the avatar encoder, we prefer playing without the avatar rather
  // than risking a Socket.IO transport close.
  if (JSON.stringify(publicProfile).length > ONLINE_PROFILE_MAX_JSON_CHARS) {
    publicProfile.avatar = null;
  }

  return publicProfile;
}
