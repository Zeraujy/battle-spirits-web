const DEFAULT_THEME = {
  bg: "#07101e",
  panel: "#0d1a2e",
  panel2: "#12243e",
  text: "#f5f7ff",
  muted: "#9aa8bc",
  accent: "#f4bd4b",
  accent2: "#68a8ff",
  danger: "#ff6a73",
  ok: "#79dda8"
};


export const RECOMMENDED_THEMES = [
  {
    id:
      "eternal",

    name: {
      ptBR:
        "Eternal",
      en:
        "Eternal"
    },

    description: {
      ptBR:
        "O visual padrão azul-marinho e dourado do simulador.",
      en:
        "The simulator's default navy and gold look."
    },

    theme: {
      ...DEFAULT_THEME
    }
  },

  {
    id:
      "crimson-dragon",

    name: {
      ptBR:
        "Crimson Dragon",
      en:
        "Crimson Dragon"
    },

    description: {
      ptBR:
        "Vermelho profundo, preto e dourado para decks agressivos.",
      en:
        "Deep red, black and gold for an aggressive look."
    },

    theme: {
      bg: "#12080b",
      panel: "#211015",
      panel2: "#30171d",
      text: "#fff5f5",
      muted: "#c5a7aa",
      accent: "#f3c55c",
      accent2: "#df5159",
      danger: "#ff6871",
      ok: "#7ad9aa"
    }
  },

  {
    id:
      "azure-core",

    name: {
      ptBR:
        "Azure Core",
      en:
        "Azure Core"
    },

    description: {
      ptBR:
        "Azul intenso e ciano com aparência tecnológica.",
      en:
        "Deep blue and cyan with a technological feel."
    },

    theme: {
      bg: "#04111d",
      panel: "#09233a",
      panel2: "#103451",
      text: "#f2f9ff",
      muted: "#91abc0",
      accent: "#76d7ff",
      accent2: "#438fff",
      danger: "#ff6e78",
      ok: "#6ee3bd"
    }
  },

  {
    id:
      "purple-void",

    name: {
      ptBR:
        "Purple Void",
      en:
        "Purple Void"
    },

    description: {
      ptBR:
        "Roxo, violeta e dourado com clima mais misterioso.",
      en:
        "Purple, violet and gold with a mysterious atmosphere."
    },

    theme: {
      bg: "#0d0818",
      panel: "#1c1230",
      panel2: "#2a1842",
      text: "#faf5ff",
      muted: "#b4a5c5",
      accent: "#efc76b",
      accent2: "#9d73ff",
      danger: "#ff6e88",
      ok: "#78ddb1"
    }
  },

  {
    id:
      "emerald-spirit",

    name: {
      ptBR:
        "Emerald Spirit",
      en:
        "Emerald Spirit"
    },

    description: {
      ptBR:
        "Verde-esmeralda e azul petróleo para uma arena mais natural.",
      en:
        "Emerald and deep teal for a more natural arena."
    },

    theme: {
      bg: "#06120f",
      panel: "#0d2721",
      panel2: "#153a31",
      text: "#f2fff9",
      muted: "#96b8aa",
      accent: "#d9c66f",
      accent2: "#55c88a",
      danger: "#ff7075",
      ok: "#79e1a8"
    }
  },

  {
    id:
      "monochrome",

    name: {
      ptBR:
        "Monochrome",
      en:
        "Monochrome"
    },

    description: {
      ptBR:
        "Cinza, preto e branco com um toque metálico.",
      en:
        "Black, white and gray with a metallic touch."
    },

    theme: {
      bg: "#090b0e",
      panel: "#161a20",
      panel2: "#242a32",
      text: "#f6f7f8",
      muted: "#a5acb5",
      accent: "#d9dde3",
      accent2: "#8ea0b7",
      danger: "#ff6f78",
      ok: "#86d6ac"
    }
  }
];


export function normalizeTheme(
  theme = {}
) {
  return {
    ...DEFAULT_THEME,
    ...(
      theme ||
      {}
    )
  };
}


export function applyTheme(
  theme = {}
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const next =
    normalizeTheme(
      theme
    );

  const root =
    document.documentElement;

  root.style.setProperty(
    "--bg",
    next.bg
  );

  root.style.setProperty(
    "--panel-solid",
    next.panel
  );

  root.style.setProperty(
    "--panel-2-solid",
    next.panel2
  );

  root.style.setProperty(
    "--text",
    next.text
  );

  root.style.setProperty(
    "--muted",
    next.muted
  );

  root.style.setProperty(
    "--accent",
    next.accent
  );

  root.style.setProperty(
    "--accent-2",
    next.accent2
  );

  root.style.setProperty(
    "--danger",
    next.danger
  );

  root.style.setProperty(
    "--ok",
    next.ok
  );

  root.style.setProperty(
    "--panel",
    `${next.panel}eb`
  );

  root.style.setProperty(
    "--panel-2",
    `${next.panel2}db`
  );
}


export {
  DEFAULT_THEME
};
