import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../services/storage.js";
import { applyDisplaySettings, getAppInfo, openUpdater } from "../services/desktop.js";
import { applyTheme, DEFAULT_THEME, normalizeTheme } from "../services/theme.js";
import { useLanguage } from "../i18n.jsx";

const RESOLUTIONS = ["1280x720", "1366x768", "1600x900", "1920x1080", "2560x1440"];
const THEME_FIELDS = [["bg","Fundo"],["panel","Painel"],["panel2","Painel secundário"],["text","Texto"],["muted","Texto secundário"],["accent","Destaque"],["accent2","Destaque 2"],["danger","Perigo"],["ok","Sucesso"]];

export default function Settings({ onBack }) {
  const { t, language, setLanguage } = useLanguage();
  const [draft, setDraft] = useState({ ...getSettings(), language, theme:normalizeTheme(getSettings().theme) });
  const [saved, setSaved] = useState(false); const [appInfo, setAppInfo] = useState({ version:"2.3.0", packaged:false, userDataPath:null });
  useEffect(()=>{getAppInfo().then(setAppInfo).catch(()=>{});},[]);
  async function apply() { const next={...getSettings(),...draft,theme:normalizeTheme(draft.theme)}; saveSettings(next); setLanguage(next.language); applyTheme(next.theme); await applyDisplaySettings(next); setSaved(true);setTimeout(()=>setSaved(false),1800); }
  function setTheme(key,value){const theme={...normalizeTheme(draft.theme),[key]:value};setDraft({...draft,theme});applyTheme(theme);}
  function resetTheme(){const theme={...DEFAULT_THEME};setDraft({...draft,theme});applyTheme(theme);}
  return <main className="standard-page settings-page"><header className="page-header"><button className="ghost" onClick={onBack}>{t("back")}</button><div><span className="eyebrow">SYSTEM</span><h1>{t("settingsTitle")}</h1></div></header>
    <section className="panel settings-panel"><label>{t("language")}<select value={draft.language} onChange={(e)=>setDraft({...draft,language:e.target.value})}><option value="ptBR">{t("portuguese")}</option><option value="en">{t("english")}</option></select></label><label>{t("resolution")}<select value={draft.resolution||"1920x1080"} onChange={(e)=>setDraft({...draft,resolution:e.target.value})}>{RESOLUTIONS.map((r)=><option key={r}>{r}</option>)}</select></label><label>{t("displayMode")}<select value={draft.displayMode||"windowed"} onChange={(e)=>setDraft({...draft,displayMode:e.target.value})}><option value="windowed">{t("windowed")}</option><option value="fullscreen">{t("fullscreen")}</option></select></label>
      <div className="theme-customizer"><div className="settings-section-heading"><div><span className="eyebrow">THEME</span><h2>{language==="en"?"Simulator colors":"Cores do simulador"}</h2></div><button className="ghost" onClick={resetTheme}>{language==="en"?"Reset":"Restaurar"}</button></div><div className="theme-color-grid">{THEME_FIELDS.map(([key,label])=><label key={key}>{language==="en"?key:label}<div className="color-input-row"><input type="color" value={normalizeTheme(draft.theme)[key]} onChange={(e)=>setTheme(key,e.target.value)}/><code>{normalizeTheme(draft.theme)[key]}</code></div></label>)}</div></div>
      <label>{t("updateServer")}<input value={draft.updateManifestUrl||""} onChange={(e)=>setDraft({...draft,updateManifestUrl:e.target.value})} placeholder="https://seu-dominio.com/battle-spirits/latest.json"/><small>{t("updateServerHint")}</small></label><button className="primary-btn big" onClick={apply}>{t("apply")}</button>{saved&&<span className="success-text">{t("settingsSaved")}</span>}</section>
    <section className="panel settings-panel update-settings-panel"><div className="settings-section-heading"><div><span className="eyebrow">UPDATE</span><h2>{t("updates")}</h2></div><strong>v{appInfo.version}</strong></div><p>{t("updateDescription")}</p><button className="ghost" onClick={()=>openUpdater()} disabled={!window.battleSpiritsDesktop?.openUpdater}>{t("checkUpdates")}</button>{appInfo.userDataPath&&<small className="data-path-note">{t("playerDataStored")}<br/><code>{appInfo.userDataPath}</code></small>}</section>
  </main>;
}
