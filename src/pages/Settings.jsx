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
  applyDisplaySettings,
  getAppInfo,
  openUpdater
} from "../services/desktop.js";

import {
  applyTheme,
  DEFAULT_THEME,
  normalizeTheme,
  RECOMMENDED_THEMES
} from "../services/theme.js";

import {
  useLanguage
} from "../i18n.jsx";

import "../styles/themeLibrary.css";


const RESOLUTIONS = [
  "1280x720",
  "1366x768",
  "1600x900",
  "1920x1080",
  "2560x1440"
];


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
  onBack
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
    appInfo,
    setAppInfo
  ] = useState({
    version:
      "2.3.0",

    packaged:
      false,

    userDataPath:
      null
  });


  useEffect(
    () => {
      getAppInfo()
        .then(
          setAppInfo
        )
        .catch(
          () => {}
        );
    },
    []
  );


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

    await applyDisplaySettings(
      next
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


  return (
    <main className="standard-page settings-page">

      <header className="page-header">

        <button
          className="ghost"
          onClick={
            onBack
          }
        >
          {t(
            "back"
          )}
        </button>


        <div>
          <span className="eyebrow">
            SYSTEM
          </span>

          <h1>
            {t(
              "settingsTitle"
            )}
          </h1>
        </div>

      </header>


      <section className="panel settings-panel">

        <label>
          {t(
            "language"
          )}

          <select
            value={
              draft.language
            }

            onChange={(
              e
            ) =>
              setDraft({
                ...draft,

                language:
                  e.target.value
              })
            }
          >
            <option value="ptBR">
              {t(
                "portuguese"
              )}
            </option>

            <option value="en">
              {t(
                "english"
              )}
            </option>
          </select>
        </label>


        <label>
          {t(
            "resolution"
          )}

          <select
            value={
              draft.resolution ||
              "1920x1080"
            }

            onChange={(
              e
            ) =>
              setDraft({
                ...draft,

                resolution:
                  e.target.value
              })
            }
          >
            {RESOLUTIONS.map(
              (resolution) => (
                <option
                  key={
                    resolution
                  }
                >
                  {resolution}
                </option>
              )
            )}
          </select>
        </label>


        <label>
          {t(
            "displayMode"
          )}

          <select
            value={
              draft.displayMode ||
              "windowed"
            }

            onChange={(
              e
            ) =>
              setDraft({
                ...draft,

                displayMode:
                  e.target.value
              })
            }
          >
            <option value="windowed">
              {t(
                "windowed"
              )}
            </option>

            <option value="fullscreen">
              {t(
                "fullscreen"
              )}
            </option>
          </select>
        </label>


        {/* =================================================
            THEME LIBRARY
        ================================================= */}

        <div className="theme-library">

          <div className="settings-section-heading">

            <div>
              <span className="eyebrow">
                THEME
              </span>

              <h2>
                {language === "en"
                  ? "Simulator themes"
                  : "Temas do simulador"}
              </h2>

              <p className="theme-library-subtitle">
                {language === "en"
                  ? "Use a recommended theme or create and save your own."
                  : "Use um tema recomendado ou crie e salve o seu próprio."}
              </p>
            </div>


            <button
              className="ghost"
              onClick={
                resetTheme
              }
            >
              {language === "en"
                ? "Reset"
                : "Restaurar"}
            </button>

          </div>


          {/* ===============================================
              RECOMMENDED
          =============================================== */}

          <section className="theme-library-section">

            <div className="theme-library-section-heading">

              <div>
                <span>
                  {language === "en"
                    ? "Recommended"
                    : "Recomendados"}
                </span>

                <strong>
                  {language === "en"
                    ? "Ready-to-use themes"
                    : "Temas prontos para usar"}
                </strong>
              </div>

            </div>


            <div className="recommended-theme-grid">

              {RECOMMENDED_THEMES.map(
                (preset) => {
                  const active =
                    draft.activeThemeId ===
                    `recommended:${preset.id}`;


                  return (
                    <article
                      className={
                        `theme-preset-card ${
                          active
                            ? "active"
                            : ""
                        }`
                      }

                      key={
                        preset.id
                      }
                    >

                      <div
                        className="theme-preset-preview"

                        style={{
                          "--theme-card-bg":
                            preset.theme.bg,

                          "--theme-card-panel":
                            preset.theme.panel,

                          "--theme-card-accent":
                            preset.theme.accent,

                          "--theme-card-accent-2":
                            preset.theme.accent2
                        }}
                      >
                        <div className="theme-preview-window">

                          <div className="theme-preview-topbar">
                            <i />
                            <i />
                            <i />
                          </div>

                          <div className="theme-preview-content">
                            <span />
                            <span />
                            <b />
                          </div>

                        </div>
                      </div>


                      <div className="theme-preset-copy">

                        <div className="theme-preset-title">
                          <strong>
                            {
                              preset.name[
                                language
                              ] ||
                              preset.name.ptBR
                            }
                          </strong>

                          {active && (
                            <span className="theme-active-badge">
                              ✓{" "}
                              {language === "en"
                                ? "Active"
                                : "Ativo"}
                            </span>
                          )}
                        </div>


                        <p>
                          {
                            preset.description[
                              language
                            ] ||
                            preset.description.ptBR
                          }
                        </p>


                        <ThemeSwatches
                          theme={
                            preset.theme
                          }
                        />


                        <button
                          className={
                            active
                              ? "ghost"
                              : "theme-apply-button"
                          }

                          onClick={() =>
                            applyRecommendedTheme(
                              preset
                            )
                          }
                        >
                          {active
                            ? (
                                language === "en"
                                  ? "Applied"
                                  : "Aplicado"
                              )
                            : (
                                language === "en"
                                  ? "Apply theme"
                                  : "Aplicar tema"
                              )}
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </section>


          {/* ===============================================
              CUSTOMIZER
          =============================================== */}

          <section className="theme-library-section theme-customizer">

            <div className="theme-library-section-heading">

              <div>
                <span>
                  {language === "en"
                    ? "Create"
                    : "Criar"}
                </span>

                <strong>
                  {language === "en"
                    ? "Build your own theme"
                    : "Monte seu próprio tema"}
                </strong>
              </div>


              {activeCustomTheme && (
                <button
                  className="ghost"
                  onClick={
                    updateActiveCustomTheme
                  }
                >
                  {language === "en"
                    ? "Update active theme"
                    : "Atualizar tema ativo"}
                </button>
              )}

            </div>


            <div className="theme-color-grid">

              {THEME_FIELDS.map(
                ([
                  key,
                  labelPT,
                  labelEN
                ]) => (
                  <label
                    key={
                      key
                    }
                  >
                    {language === "en"
                      ? labelEN
                      : labelPT}

                    <div className="color-input-row">

                      <input
                        type="color"

                        value={
                          normalizeTheme(
                            draft.theme
                          )[key]
                        }

                        onChange={(
                          e
                        ) =>
                          setTheme(
                            key,
                            e.target.value
                          )
                        }
                      />

                      <code>
                        {
                          normalizeTheme(
                            draft.theme
                          )[key]
                        }
                      </code>

                    </div>
                  </label>
                )
              )}

            </div>


            <div className="save-theme-row">

              <label>
                {language === "en"
                  ? "Theme name"
                  : "Nome do tema"}

                <input
                  value={
                    themeName
                  }

                  maxLength={
                    32
                  }

                  onChange={(
                    e
                  ) =>
                    setThemeName(
                      e.target.value
                    )
                  }

                  placeholder={
                    language === "en"
                      ? "My Battle Spirits theme"
                      : "Meu tema Battle Spirits"
                  }

                  onKeyDown={(
                    e
                  ) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      e.preventDefault();
                      saveCurrentTheme();
                    }
                  }}
                />
              </label>


              <button
                className="primary-btn"
                onClick={
                  saveCurrentTheme
                }
              >
                {language === "en"
                  ? "Save theme"
                  : "Salvar tema"}
              </button>

            </div>

          </section>


          {/* ===============================================
              SAVED THEMES
          =============================================== */}

          <section className="theme-library-section">

            <div className="theme-library-section-heading">

              <div>
                <span>
                  {language === "en"
                    ? "Library"
                    : "Biblioteca"}
                </span>

                <strong>
                  {language === "en"
                    ? "My themes"
                    : "Meus temas"}
                </strong>
              </div>


              <small>
                {
                  normalizeSavedThemes(
                    draft.savedThemes
                  ).length
                }{" "}
                {language === "en"
                  ? "saved"
                  : "salvos"}
              </small>

            </div>


            {normalizeSavedThemes(
              draft.savedThemes
            ).length === 0
              ? (
                <div className="theme-library-empty">
                  <strong>
                    {language === "en"
                      ? "No custom themes yet"
                      : "Nenhum tema personalizado ainda"}
                  </strong>

                  <span>
                    {language === "en"
                      ? "Adjust the colors above and save your first theme."
                      : "Ajuste as cores acima e salve seu primeiro tema."}
                  </span>
                </div>
              )
              : (
                <div className="saved-theme-list">

                  {normalizeSavedThemes(
                    draft.savedThemes
                  ).map(
                    (item) => {
                      const active =
                        draft.activeThemeId ===
                        item.id;


                      return (
                        <article
                          className={
                            `saved-theme-card ${
                              active
                                ? "active"
                                : ""
                            }`
                          }

                          key={
                            item.id
                          }
                        >

                          <div className="saved-theme-info">

                            <div className="saved-theme-title">
                              <strong>
                                {
                                  item.name
                                }
                              </strong>

                              {active && (
                                <span className="theme-active-badge">
                                  ✓{" "}
                                  {language === "en"
                                    ? "Active"
                                    : "Ativo"}
                                </span>
                              )}
                            </div>


                            <ThemeSwatches
                              theme={
                                item.theme
                              }
                            />

                          </div>


                          <div className="saved-theme-actions">

                            <button
                              className={
                                active
                                  ? "ghost"
                                  : ""
                              }

                              onClick={() =>
                                applyCustomTheme(
                                  item
                                )
                              }
                            >
                              {active
                                ? (
                                    language === "en"
                                      ? "Applied"
                                      : "Aplicado"
                                  )
                                : (
                                    language === "en"
                                      ? "Apply"
                                      : "Aplicar"
                                  )}
                            </button>


                            <button
                              className="ghost danger"

                              onClick={() =>
                                deleteCustomTheme(
                                  item.id
                                )
                              }
                            >
                              {language === "en"
                                ? "Delete"
                                : "Excluir"}
                            </button>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>
              )}


            {themeNotice && (
              <div className="theme-library-notice">
                {
                  themeNotice
                }
              </div>
            )}

          </section>

        </div>


        <label>
          {t(
            "updateServer"
          )}

          <input
            value={
              draft.updateManifestUrl ||
              ""
            }

            onChange={(
              e
            ) =>
              setDraft({
                ...draft,

                updateManifestUrl:
                  e.target.value
              })
            }

            placeholder="https://seu-dominio.com/battle-spirits/latest.json"
          />

          <small>
            {t(
              "updateServerHint"
            )}
          </small>
        </label>


        <button
          className="primary-btn big"
          onClick={
            apply
          }
        >
          {t(
            "apply"
          )}
        </button>


        {saved && (
          <span className="success-text">
            {t(
              "settingsSaved"
            )}
          </span>
        )}

      </section>


      <section className="panel settings-panel update-settings-panel">

        <div className="settings-section-heading">

          <div>
            <span className="eyebrow">
              UPDATE
            </span>

            <h2>
              {t(
                "updates"
              )}
            </h2>
          </div>

          <strong>
            v
            {
              appInfo.version
            }
          </strong>

        </div>


        <p>
          {t(
            "updateDescription"
          )}
        </p>


        <button
          className="ghost"

          onClick={() =>
            openUpdater()
          }

          disabled={
            !window
              .battleSpiritsDesktop
              ?.openUpdater
          }
        >
          {t(
            "checkUpdates"
          )}
        </button>


        {appInfo.userDataPath && (
          <small className="data-path-note">

            {t(
              "playerDataStored"
            )}

            <br />

            <code>
              {
                appInfo.userDataPath
              }
            </code>

          </small>
        )}

      </section>

    </main>
  );
}
