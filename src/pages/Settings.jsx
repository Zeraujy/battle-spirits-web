import EternalCinematicBackdrop from "../components/layout/EternalCinematicBackdrop.jsx";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getSettings,
  saveSettings
} from "../services/storage.js";

import {
  applyTheme,
  DEFAULT_THEME,
  normalizeTheme,
  RECOMMENDED_THEMES
} from "../services/theme.js";

import {
  useLanguage
} from "../i18n.jsx";

import { getAdminAccess } from "../services/adminService.js";
import { APP_VERSION_LABEL } from "../config/appVersion.js";
import "../styles/theme/themeLibrary.css";
import "../styles/pages/settingsGame.css";
import "../styles/pages/eternalInterfaceV350.css";




const THEME_FIELDS = [
  [
    "bg",
    "Fundo",
    "Background"
  ],

  [
    "panel",
    "Painel",
    "Panel"
  ],

  [
    "panel2",
    "Painel secundário",
    "Secondary panel"
  ],

  [
    "text",
    "Texto",
    "Text"
  ],

  [
    "muted",
    "Texto secundário",
    "Secondary text"
  ],

  [
    "accent",
    "Destaque",
    "Accent"
  ],

  [
    "accent2",
    "Destaque 2",
    "Accent 2"
  ],

  [
    "danger",
    "Perigo",
    "Danger"
  ],

  [
    "ok",
    "Sucesso",
    "Success"
  ]
];


function normalizeSavedThemes(
  savedThemes
) {
  if (
    !Array.isArray(
      savedThemes
    )
  ) {
    return [];
  }

  return savedThemes
    .filter(
      (item) =>
        item &&
        item.id &&
        item.name
    )
    .map(
      (item) => ({
        ...item,

        theme:
          normalizeTheme(
            item.theme
          )
      })
    );
}


function ThemeSwatches({
  theme
}) {
  const normalized =
    normalizeTheme(
      theme
    );

  const colors = [
    normalized.bg,
    normalized.panel,
    normalized.accent,
    normalized.accent2,
    normalized.text
  ];


  return (
    <div className="theme-swatches">
      {colors.map(
        (
          color,
          index
        ) => (
          <i
            key={
              `${color}-${index}`
            }

            style={{
              background:
                color
            }}
          />
        )
      )}
    </div>
  );
}


export default function Settings({
  onBack,
  onAdmin
}) {
  const {
    t,
    language,
    setLanguage
  } = useLanguage();


  const initialSettings =
    useMemo(
      () =>
        getSettings(),
      []
    );


  const [
    draft,
    setDraft
  ] = useState(
    () => ({
      ...initialSettings,

      language,

      theme:
        normalizeTheme(
          initialSettings.theme
        ),

      savedThemes:
        normalizeSavedThemes(
          initialSettings.savedThemes
        ),

      activeThemeId:
        initialSettings.activeThemeId ||
        null
    })
  );


  const [
    themeName,
    setThemeName
  ] = useState(
    ""
  );


  const [
    saved,
    setSaved
  ] = useState(
    false
  );


  const [
    themeNotice,
    setThemeNotice
  ] = useState(
    ""
  );


  const [
    activeTab,
    setActiveTab
  ] = useState(
    "general"
  );

  const [adminAllowed, setAdminAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminAccess().then((result) => {
      if (active) setAdminAllowed(Boolean(result?.allowed));
    }).catch(() => {});
    return () => { active = false; };
  }, []);


  function showThemeNotice(
    message
  ) {
    setThemeNotice(
      message
    );

    window.setTimeout(
      () =>
        setThemeNotice(
          ""
        ),
      2200
    );
  }


  async function apply() {
    const next = {
      ...getSettings(),
      ...draft,

      theme:
        normalizeTheme(
          draft.theme
        ),

      savedThemes:
        normalizeSavedThemes(
          draft.savedThemes
        )
    };


    saveSettings(
      next
    );

    setLanguage(
      next.language
    );

    applyTheme(
      next.theme
    );


    setSaved(
      true
    );

    window.setTimeout(
      () =>
        setSaved(
          false
        ),
      1800
    );
  }


  function setTheme(
    key,
    value
  ) {
    const theme = {
      ...normalizeTheme(
        draft.theme
      ),

      [key]:
        value
    };


    const keepCustomThemeId =
      String(
        draft.activeThemeId ||
        ""
      ).startsWith(
        "custom:"
      );


    setDraft({
      ...draft,
      theme,
      activeThemeId:
        keepCustomThemeId
          ? draft.activeThemeId
          : null
    });


    applyTheme(
      theme
    );
  }


  function resetTheme() {
    const theme = {
      ...DEFAULT_THEME
    };


    setDraft({
      ...draft,
      theme,
      activeThemeId:
        "recommended:eternal"
    });


    applyTheme(
      theme
    );
  }


  function persistThemeSelection(
    theme,
    activeThemeId
  ) {
    const normalized =
      normalizeTheme(
        theme
      );


    const nextDraft = {
      ...draft,

      theme:
        normalized,

      activeThemeId
    };


    setDraft(
      nextDraft
    );


    applyTheme(
      normalized
    );


    saveSettings({
      ...getSettings(),

      theme:
        normalized,

      activeThemeId,

      savedThemes:
        normalizeSavedThemes(
          draft.savedThemes
        )
    });
  }


  function applyRecommendedTheme(
    preset
  ) {
    persistThemeSelection(
      preset.theme,
      `recommended:${preset.id}`
    );


    showThemeNotice(
      language === "en"
        ? `${preset.name.en} applied.`
        : `${preset.name.ptBR} aplicado.`
    );
  }


  function saveCurrentTheme() {
    const name =
      themeName.trim();


    if (!name) {
      showThemeNotice(
        language === "en"
          ? "Choose a name for the theme first."
          : "Escolha um nome para o tema primeiro."
      );

      return;
    }


    const now =
      new Date()
        .toISOString();


    const id =
      `custom:${Date.now()}`;


    const item = {
      id,
      name,

      theme:
        normalizeTheme(
          draft.theme
        ),

      createdAt:
        now,

      updatedAt:
        now
    };


    const savedThemes = [
      ...normalizeSavedThemes(
        draft.savedThemes
      ),
      item
    ];


    const nextDraft = {
      ...draft,
      savedThemes,
      activeThemeId:
        id
    };


    setDraft(
      nextDraft
    );


    saveSettings({
      ...getSettings(),

      theme:
        normalizeTheme(
          draft.theme
        ),

      savedThemes,
      activeThemeId:
        id
    });


    setThemeName(
      ""
    );


    showThemeNotice(
      language === "en"
        ? `"${name}" saved.`
        : `"${name}" salvo.`
    );
  }


  function applyCustomTheme(
    item
  ) {
    persistThemeSelection(
      item.theme,
      item.id
    );


    showThemeNotice(
      language === "en"
        ? `${item.name} applied.`
        : `${item.name} aplicado.`
    );
  }


  function updateActiveCustomTheme() {
    if (
      !String(
        draft.activeThemeId ||
        ""
      ).startsWith(
        "custom:"
      )
    ) {
      return;
    }


    const now =
      new Date()
        .toISOString();


    const savedThemes =
      normalizeSavedThemes(
        draft.savedThemes
      )
        .map(
          (item) =>
            item.id ===
            draft.activeThemeId
              ? {
                  ...item,

                  theme:
                    normalizeTheme(
                      draft.theme
                    ),

                  updatedAt:
                    now
                }
              : item
        );


    setDraft({
      ...draft,
      savedThemes
    });


    saveSettings({
      ...getSettings(),

      theme:
        normalizeTheme(
          draft.theme
        ),

      savedThemes,

      activeThemeId:
        draft.activeThemeId
    });


    showThemeNotice(
      language === "en"
        ? "Saved theme updated."
        : "Tema salvo atualizado."
    );
  }


  function deleteCustomTheme(
    id
  ) {
    const savedThemes =
      normalizeSavedThemes(
        draft.savedThemes
      )
        .filter(
          (item) =>
            item.id !==
            id
        );


    const activeThemeId =
      draft.activeThemeId ===
      id
        ? null
        : draft.activeThemeId;


    setDraft({
      ...draft,
      savedThemes,
      activeThemeId
    });


    saveSettings({
      ...getSettings(),
      savedThemes,
      activeThemeId
    });


    showThemeNotice(
      language === "en"
        ? "Theme deleted."
        : "Tema excluído."
    );
  }


  const activeCustomTheme =
    normalizeSavedThemes(
      draft.savedThemes
    )
      .find(
        (item) =>
          item.id ===
          draft.activeThemeId
      );


  const pt = language !== "en";

  const sections = [
    { id: "general", icon: "⌂", label: pt ? "Geral" : "General", hint: pt ? "Idioma e sistema" : "Language and system" },
    { id: "display", icon: "▣", label: pt ? "Exibição" : "Display", hint: pt ? "Fundo e aparência" : "Background and appearance" },
    { id: "audio", icon: "◖", label: pt ? "Áudio" : "Audio", hint: pt ? "Sons do simulador" : "Simulator sounds" },
    { id: "interface", icon: "◇", label: pt ? "Interface" : "Interface", hint: pt ? "Preferências visuais" : "Visual preferences" },
    { id: "themes", icon: "✦", label: pt ? "Temas" : "Themes", hint: pt ? "Cores e aparência" : "Colors and appearance" },
  ];

  return (
    <main className="settings-game-page eternal-page eternal-settings-page">
      <EternalCinematicBackdrop compact />
      <div className="settings-game-bg" />

      <section className="settings-game-window" role="dialog" aria-label={t("settingsTitle")}>
      <header className="settings-game-topbar">
        <button className="ghost settings-game-back eternal-menu-action" onClick={onBack}>
          {t("back")}
        </button>

        <div className="settings-game-heading">
          <span className="eyebrow">SYSTEM</span>
          <h1>{t("settingsTitle")}</h1>
          <p>{pt ? "Personalize o simulador do seu jeito." : "Customize the simulator your way."}</p>
        </div>

        <div className="settings-game-version">
          <small>{pt ? "VERSÃO" : "VERSION"}</small>
          <strong>{APP_VERSION_LABEL}</strong>
        </div>
      </header>

      <div className="settings-game-shell">
        <aside className="settings-game-nav">
          <div className="settings-game-nav-title">
            <span>{pt ? "CONFIGURAÇÕES" : "SETTINGS"}</span>
            <small>{pt ? "Selecione uma categoria" : "Choose a category"}</small>
          </div>

          <nav>
            {sections.map((section) => (
              <button
                key={section.id}
                className={activeTab === section.id ? "active" : ""}
                onClick={() => setActiveTab(section.id)}
              >
                <span className="settings-game-nav-icon">{section.icon}</span>
                <span className="settings-game-nav-copy">
                  <b>{section.label}</b>
                  <small>{section.hint}</small>
                </span>
                <i>›</i>
              </button>
            ))}
          </nav>

          <div className="settings-game-nav-footer">
            <span className="settings-game-status-dot" />
            <div>
              <strong>Eternal Simulator</strong>
              <small>{APP_VERSION_LABEL}</small>
            </div>
          </div>
        </aside>

        <section className="settings-game-content">
          {activeTab === "general" && (
            <div className="settings-game-panel">
              <div className="settings-game-panel-heading">
                <div>
                  <span className="eyebrow">GENERAL</span>
                  <h2>{pt ? "Configurações gerais" : "General settings"}</h2>
                  <p>{pt ? "Idioma, preferências básicas e integração do sistema." : "Language, basic preferences and system integration."}</p>
                </div>
              </div>

              <div className="settings-game-grid two">
                <label className="settings-game-field">
                  <span>{t("language")}</span>
                  <small>{pt ? "Idioma usado nos menus e textos do simulador." : "Language used in menus and simulator text."}</small>
                  <select
                    value={draft.language}
                    onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                  >
                    <option value="ptBR">{t("portuguese")}</option>
                    <option value="en">{t("english")}</option>
                  </select>
                </label>

                <div className="settings-game-info-card">
                  <span>{pt ? "PLATAFORMA" : "PLATFORM"}</span>
                  <strong>Web</strong>
                  <small>{pt ? "Versão oficial para navegador." : "Official browser version."}</small>
                </div>
              </div>

              {adminAllowed && (
                <div className="settings-game-tip admin-entry-card">
                  <span>◆</span>
                  <div>
                    <strong>Admin Panel</strong>
                    <small>{pt ? "Gerencie economia e estados de gameplay das contas autorizadas." : "Manage economy and gameplay states for authorized accounts."}</small>
                  </div>
                  <button type="button" onClick={onAdmin}>{pt ? "Abrir painel" : "Open panel"}</button>
                </div>
              )}

            </div>
          )}

          {activeTab === "display" && (
            <div className="settings-game-panel">
              <div className="settings-game-panel-heading">
                <div>
                  <span className="eyebrow">DISPLAY</span>
                  <h2>{pt ? "Exibição e gráficos" : "Display and graphics"}</h2>
                  <p>{pt ? "Ajuste como o simulador aparece no seu monitor." : "Adjust how the simulator appears on your display."}</p>
                </div>
              </div>

              <div className="settings-game-grid two settings-background-controls">
                <label className="settings-game-field">
                  <span>{pt ? "Fundo do menu" : "Menu background"}</span>
                  <small>{pt ? "Alterne entre wallpapers estáticos e vídeos em loop." : "Switch between static wallpapers and looping videos."}</small>
                  <select
                    value={draft.backgroundMode || "static"}
                    onChange={(e) => setDraft({ ...draft, backgroundMode: e.target.value })}
                  >
                    <option value="static">{pt ? "Wallpapers estáticos" : "Static wallpapers"}</option>
                    <option value="video">{pt ? "Vídeo em loop" : "Looping video"}</option>
                  </select>
                </label>

                <label className={`settings-game-field ${draft.backgroundMode !== "video" ? "is-disabled" : ""}`}>
                  <span>{pt ? "Vídeo de fundo" : "Background video"}</span>
                  <small>{pt ? "Selecione o vídeo que será usado no fundo." : "Choose the video used as the background."}</small>
                  <select
                    value={draft.backgroundVideo || "background_video_01.mp4"}
                    disabled={draft.backgroundMode !== "video"}
                    onChange={(e) => setDraft({ ...draft, backgroundVideo: e.target.value })}
                  >
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = `background_video_${String(index + 1).padStart(2, "0")}.mp4`;
                      return <option key={value} value={value}>{pt ? `Vídeo ${index + 1}` : `Video ${index + 1}`}</option>;
                    })}
                  </select>
                </label>
              </div>

              <div className="settings-game-tip">
                <span>i</span>
                <div>
                  <strong>{pt ? "Dica de desempenho" : "Performance tip"}</strong>
                  <small>{pt ? "O simulador agora é focado integralmente na Web. Use o zoom padrão do navegador e prefira tela cheia do próprio navegador quando quiser mais espaço." : "The simulator is now fully focused on the Web. Use the browser default zoom and its own fullscreen mode when you want more space."}</small>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="settings-game-panel">
              <div className="settings-game-panel-heading">
                <div>
                  <span className="eyebrow">AUDIO</span>
                  <h2>{pt ? "Áudio" : "Audio"}</h2>
                  <p>{pt ? "Os controles de áudio serão disponibilizados em uma atualização futura." : "Audio controls will be available in a future update."}</p>
                </div>
                <span className="settings-coming-badge">{pt ? "EM PREPARAÇÃO" : "COMING SOON"}</span>
              </div>

              <div className="settings-game-audio-list">
                <div className="settings-audio-row disabled">
                  <span className="settings-audio-icon">◖</span>
                  <div>
                    <strong>{pt ? "Volume geral" : "Master volume"}</strong>
                    <small>{pt ? "Controlará todos os sons do simulador." : "Will control all simulator sounds."}</small>
                  </div>
                  <input type="range" min="0" max="100" value="80" readOnly disabled />
                  <b>80%</b>
                </div>

                <div className="settings-audio-row disabled">
                  <span className="settings-audio-icon">✦</span>
                  <div>
                    <strong>{pt ? "Efeitos da partida" : "Match effects"}</strong>
                    <small>{pt ? "Ataques, Cores, cartas, fases e notificações." : "Attacks, Cores, cards, phases and notifications."}</small>
                  </div>
                  <input type="range" min="0" max="100" value="85" readOnly disabled />
                  <b>85%</b>
                </div>

                <div className="settings-audio-row disabled">
                  <span className="settings-audio-icon">⌁</span>
                  <div>
                    <strong>{pt ? "Sons da interface" : "Interface sounds"}</strong>
                    <small>{pt ? "Botões, menus e confirmações." : "Buttons, menus and confirmations."}</small>
                  </div>
                  <input type="range" min="0" max="100" value="65" readOnly disabled />
                  <b>65%</b>
                </div>
              </div>

              <div className="settings-game-tip muted-tip">
                <span>!</span>
                <div>
                  <strong>{pt ? "Áudio em breve" : "Audio coming soon"}</strong>
                  <small>{pt ? "As opções de áudio serão habilitadas em uma atualização futura." : "Audio options will be enabled in a future update."}</small>
                </div>
              </div>
            </div>
          )}

          {activeTab === "interface" && (
            <div className="settings-game-panel">
              <div className="settings-game-panel-heading">
                <div>
                  <span className="eyebrow">INTERFACE</span>
                  <h2>{pt ? "Interface e jogador" : "Interface and player"}</h2>
                  <p>{pt ? "Preferências visuais usadas dentro das partidas." : "Visual preferences used during matches."}</p>
                </div>
              </div>

              <div className="settings-game-grid two">
                <label className="settings-game-field">
                  <span>{pt ? "Cor preferida do jogador" : "Preferred player color"}</span>
                  <small>{pt ? "Usada como referência visual nas telas compatíveis." : "Used as a visual reference on compatible screens."}</small>
                  <div className="settings-color-row">
                    <input
                      type="color"
                      value={draft.preferredPlayerColor || "#d8d8d8"}
                      onChange={(e) => setDraft({ ...draft, preferredPlayerColor: e.target.value })}
                    />
                    <code>{draft.preferredPlayerColor || "#d8d8d8"}</code>
                  </div>
                </label>

                <div className="settings-game-info-card">
                  <span>{pt ? "ESTILO ATIVO" : "ACTIVE STYLE"}</span>
                  <strong>{activeCustomTheme?.name || RECOMMENDED_THEMES.find((preset) => `recommended:${preset.id}` === draft.activeThemeId)?.name?.[language] || "Eternal"}</strong>
                  <ThemeSwatches theme={draft.theme} />
                </div>
              </div>

              <div className="settings-game-tip">
                <span>◇</span>
                <div>
                  <strong>{pt ? "Mais opções virão aqui" : "More options will live here"}</strong>
                  <small>{pt ? "Escala da interface, animações, zoom das cartas e outros ajustes podem ser adicionados nesta categoria sem misturar com gráficos ou temas." : "UI scale, animations, card zoom and other adjustments can be added here without mixing them with display or themes."}</small>
                </div>
              </div>
            </div>
          )}

          {activeTab === "themes" && (
            <div className="settings-game-panel themes-panel">
              <div className="theme-library settings-theme-library">
                <div className="settings-section-heading settings-game-panel-heading">
                  <div>
                    <span className="eyebrow">THEME</span>
                    <h2>{pt ? "Temas do simulador" : "Simulator themes"}</h2>
                    <p className="theme-library-subtitle">{pt ? "Use um tema recomendado ou crie e salve o seu próprio." : "Use a recommended theme or create and save your own."}</p>
                  </div>
                  <button className="ghost" onClick={resetTheme}>{pt ? "Restaurar" : "Reset"}</button>
                </div>

                <section className="theme-library-section">
                  <div className="theme-library-section-heading">
                    <div>
                      <span>{pt ? "Recomendados" : "Recommended"}</span>
                      <strong>{pt ? "Temas prontos para usar" : "Ready-to-use themes"}</strong>
                    </div>
                  </div>

                  <div className="recommended-theme-grid">
                    {RECOMMENDED_THEMES.map((preset) => {
                      const active = draft.activeThemeId === `recommended:${preset.id}`;
                      return (
                        <article className={`theme-preset-card ${active ? "active" : ""}`} key={preset.id}>
                          <div
                            className="theme-preset-preview"
                            style={{
                              "--theme-card-bg": preset.theme.bg,
                              "--theme-card-panel": preset.theme.panel,
                              "--theme-card-accent": preset.theme.accent,
                              "--theme-card-accent-2": preset.theme.accent2
                            }}
                          >
                            <div className="theme-preview-window">
                              <div className="theme-preview-topbar"><i /><i /><i /></div>
                              <div className="theme-preview-content"><span /><span /><b /></div>
                            </div>
                          </div>

                          <div className="theme-preset-copy">
                            <div className="theme-preset-title">
                              <strong>{preset.name[language] || preset.name.ptBR}</strong>
                              {active && <span className="theme-active-badge">✓ {pt ? "Ativo" : "Active"}</span>}
                            </div>
                            <p>{preset.description[language] || preset.description.ptBR}</p>
                            <ThemeSwatches theme={preset.theme} />
                            <button className={active ? "ghost" : "theme-apply-button"} onClick={() => applyRecommendedTheme(preset)}>
                              {active ? (pt ? "Aplicado" : "Applied") : (pt ? "Aplicar tema" : "Apply theme")}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="theme-library-section theme-customizer">
                  <div className="theme-library-section-heading">
                    <div>
                      <span>{pt ? "Criar" : "Create"}</span>
                      <strong>{pt ? "Monte seu próprio tema" : "Build your own theme"}</strong>
                    </div>
                    {activeCustomTheme && (
                      <button className="ghost" onClick={updateActiveCustomTheme}>{pt ? "Atualizar tema ativo" : "Update active theme"}</button>
                    )}
                  </div>

                  <div className="theme-color-grid">
                    {THEME_FIELDS.map(([key, labelPT, labelEN]) => (
                      <label key={key}>
                        {pt ? labelPT : labelEN}
                        <div className="color-input-row">
                          <input type="color" value={normalizeTheme(draft.theme)[key]} onChange={(e) => setTheme(key, e.target.value)} />
                          <code>{normalizeTheme(draft.theme)[key]}</code>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="save-theme-row">
                    <label>
                      {pt ? "Nome do tema" : "Theme name"}
                      <input
                        value={themeName}
                        maxLength={32}
                        onChange={(e) => setThemeName(e.target.value)}
                        placeholder={pt ? "Meu tema Battle Spirits" : "My Battle Spirits theme"}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveCurrentTheme();
                          }
                        }}
                      />
                    </label>
                    <button className="primary-btn" onClick={saveCurrentTheme}>{pt ? "Salvar tema" : "Save theme"}</button>
                  </div>
                </section>

                <section className="theme-library-section">
                  <div className="theme-library-section-heading">
                    <div>
                      <span>{pt ? "Biblioteca" : "Library"}</span>
                      <strong>{pt ? "Meus temas" : "My themes"}</strong>
                    </div>
                    <small>{normalizeSavedThemes(draft.savedThemes).length} {pt ? "salvos" : "saved"}</small>
                  </div>

                  {normalizeSavedThemes(draft.savedThemes).length === 0 ? (
                    <div className="theme-library-empty">
                      <strong>{pt ? "Nenhum tema personalizado ainda" : "No custom themes yet"}</strong>
                      <span>{pt ? "Ajuste as cores acima e salve seu primeiro tema." : "Adjust the colors above and save your first theme."}</span>
                    </div>
                  ) : (
                    <div className="saved-theme-list">
                      {normalizeSavedThemes(draft.savedThemes).map((item) => {
                        const active = draft.activeThemeId === item.id;
                        return (
                          <article className={`saved-theme-card ${active ? "active" : ""}`} key={item.id}>
                            <div className="saved-theme-info">
                              <div className="saved-theme-title">
                                <strong>{item.name}</strong>
                                {active && <span className="theme-active-badge">✓ {pt ? "Ativo" : "Active"}</span>}
                              </div>
                              <ThemeSwatches theme={item.theme} />
                            </div>
                            <div className="saved-theme-actions">
                              <button className={active ? "ghost" : ""} onClick={() => applyCustomTheme(item)}>{active ? (pt ? "Aplicado" : "Applied") : (pt ? "Aplicar" : "Apply")}</button>
                              <button className="ghost danger" onClick={() => deleteCustomTheme(item.id)}>{pt ? "Excluir" : "Delete"}</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {themeNotice && <div className="theme-library-notice">{themeNotice}</div>}
                </section>
              </div>
            </div>
          )}

                    <footer className="settings-game-actions">
            <div>
              {saved && <span className="success-text">✓ {t("settingsSaved")}</span>}
            </div>
            <button className="primary-btn big eternal-menu-action active" onClick={apply}>{t("apply")}</button>
          </footer>
        </section>
      </div>
      </section>
    </main>
  );
}
