const KEYS = {
  decks: "bs-eternal:decks:v2",
  profile: "bs-eternal:profile:v2",
  settings: "bs-eternal:settings:v2"
};


const LEGACY_PLAYER_COLORS = new Set([
  "#e45b63",
  "#a56ce4",
  "#55c987",
  "#f4bd4b",
  "#68a8ff",
  "#ee6c78"
]);


const DEFAULT_SETTINGS = {
  language: "ptBR",

  onlineServerUrl:
    import.meta.env.VITE_ONLINE_SERVER_URL ||
    "http://localhost:3001",

  resolution:
    "1920x1080",

  displayMode:
    "windowed",

  updateManifestUrl:
    "",

  preferredPlayerColor:
    "#d8d8d8",

  activeThemeId:
    "recommended:eternal",

  savedThemes:
    [],

  theme: {
    bg: "#070707",
    panel: "#111111",
    panel2: "#1b1b1b",
    text: "#f5f5f5",
    muted: "#9b9b9b",
    accent: "#f0f0f0",
    accent2: "#b8b8b8",
    danger: "#d9d9d9",
    ok: "#c9c9c9"
  }
};


function desktop() {
  return typeof window !== "undefined"
    ? window.battleSpiritsDesktop
    : null;
}


function readLocal(
  key,
  fallback
) {
  try {
    const value =
      localStorage.getItem(
        key
      );

    return value
      ? JSON.parse(
          value
        )
      : fallback;
  } catch {
    return fallback;
  }
}


function writeLocal(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        value
      )
    );
  } catch {}

  return value;
}


function read(
  kind,
  fallback
) {
  const bridge =
    desktop();

  if (
    bridge?.storageRead
  ) {
    const result =
      bridge.storageRead(
        kind
      );

    if (
      result?.found
    ) {
      return result.value;
    }

    /*
     * Migração automática da 2.1:
     * se o JSON da versão atual ainda não existe,
     * reaproveita o localStorage antigo e já salva
     * fora da instalação.
     */
    const legacy =
      readLocal(
        KEYS[kind],
        fallback
      );

    bridge.storageWrite(
      kind,
      legacy
    );

    return legacy;
  }

  return readLocal(
    KEYS[kind],
    fallback
  );
}


function write(
  kind,
  value
) {
  const bridge =
    desktop();

  if (
    bridge?.storageWrite
  ) {
    bridge.storageWrite(
      kind,
      value
    );
  }

  /*
   * Mantemos um espelho local para compatibilidade
   * com a versão web/dev.
   */
  writeLocal(
    KEYS[kind],
    value
  );

  return value;
}


/* =========================================================
   DECKS
========================================================= */

export function getDecks() {
  return read(
    "decks",
    []
  );
}


export function saveDecks(
  decks
) {
  return write(
    "decks",
    decks
  );
}


export function upsertDeck(
  deck
) {
  const decks =
    getDecks();

  const id =
    deck.id ||
    `deck-${Date.now()}`;

  const next = [
    ...decks.filter(
      (d) =>
        d.id !== id
    ),

    {
      ...deck,
      id,
      updatedAt:
        new Date()
          .toISOString()
    }
  ];

  saveDecks(
    next
  );

  return id;
}


export function deleteDeck(
  id
) {
  saveDecks(
    getDecks().filter(
      (d) =>
        d.id !== id
    )
  );
}


/* =========================================================
   PROFILE
========================================================= */

export function getProfile() {
  return read(
    "profile",
    {
      name:
        "Jogador",

      displayName:
        "Jogador",

      username:
        "",

      bio:
        "",

      avatar:
        null,

      banner:
        null
    }
  );
}


export function saveProfile(
  profile
) {
  return write(
    "profile",
    profile
  );
}


/* =========================================================
   SETTINGS
========================================================= */

export function getSettings() {
  const saved =
    read(
      "settings",
      DEFAULT_SETTINGS
    ) || {};

  const isEternal =
    (saved.activeThemeId || DEFAULT_SETTINGS.activeThemeId) ===
    "recommended:eternal";

  const preferredPlayerColor =
    isEternal &&
    LEGACY_PLAYER_COLORS.has(
      String(saved.preferredPlayerColor || "").toLowerCase()
    )
      ? "#d8d8d8"
      : (
          saved.preferredPlayerColor ||
          DEFAULT_SETTINGS.preferredPlayerColor
        );

  const onlinePlayerColor =
    isEternal &&
    LEGACY_PLAYER_COLORS.has(
      String(saved.onlinePlayerColor || "").toLowerCase()
    )
      ? "#b8b8b8"
      : saved.onlinePlayerColor;


  return {
    ...DEFAULT_SETTINGS,
    ...saved,

    preferredPlayerColor,
    ...(onlinePlayerColor ? { onlinePlayerColor } : {}),

    // Quem continua usando o preset Eternal recebe automaticamente
    // a identidade monocromática nova. Temas customizados e outros
    // presets permanecem intactos.
    theme:
      (saved.activeThemeId || DEFAULT_SETTINGS.activeThemeId) ===
      "recommended:eternal"
        ? { ...DEFAULT_SETTINGS.theme }
        : {
            ...DEFAULT_SETTINGS.theme,
            ...(saved.theme || {})
          },

    savedThemes:
      Array.isArray(
        saved.savedThemes
      )
        ? saved.savedThemes
        : [],

    activeThemeId:
      saved.activeThemeId ||
      null
  };
}


export function saveSettings(
  settings
) {
  return write(
    "settings",
    settings
  );
}
