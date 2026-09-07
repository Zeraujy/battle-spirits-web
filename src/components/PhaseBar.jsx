import { PHASES } from "../game/constants.js";
import { useLanguage } from "../i18n.jsx";

const LABELS = {
  ptBR:{ start:"Start Step", core:"Core Step", draw:"Draw Step", refresh:"Refresh Step", main:"Main Step", attack:"Attack Step", end:"End Step" },
  en:{ start:"Start Step", core:"Core Step", draw:"Draw Step", refresh:"Refresh Step", main:"Main Step", attack:"Attack Step", end:"End Step" }
};
export default function PhaseBar({ phase }) {
  const { language } = useLanguage();
  return <div className="phase-bar">{PHASES.map((p) => <div key={p} className={p === phase ? "current" : ""}>{LABELS[language]?.[p] || LABELS.en[p]}</div>)}</div>;
}
