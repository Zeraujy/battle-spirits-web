function renderInline(text, keyBase) {
  const parts = String(text).split(/(【[^】]+】|\[[^\]]+\]|Lv\s?\d+(?:\s?[-~]\s?Lv\s?\d+)?|BP\s?[+\-]?\d+)/gi);
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^【.*】$/.test(part) || /^\[.*\]$/.test(part)) return <strong className="effect-keyword" key={`${keyBase}-${i}`}>{part}</strong>;
    if (/^Lv/i.test(part)) return <strong className="effect-level" key={`${keyBase}-${i}`}>{part}</strong>;
    if (/^BP/i.test(part)) return <strong className="effect-bp" key={`${keyBase}-${i}`}>{part}</strong>;
    return <span key={`${keyBase}-${i}`}>{part}</span>;
  });
}

export default function EffectText({ text, emptyText = "" }) {
  const source = String(text || "").trim();
  if (!source) return <p className="effect-text muted">{emptyText}</p>;
  return <div className="effect-rich-text">{source.split(/\r?\n/).filter((line, i, arr)=>line.trim() || (i>0 && i<arr.length-1)).map((line, index)=>{
    const trimmed = line.trim();
    const heading = /^(main|flash|burst|when summoned|when attacks|when blocked|during your attack step|lv\d|【|\[)/i.test(trimmed);
    return <p className={heading ? "effect-line emphasized" : "effect-line"} key={index}>{renderInline(line, index)}</p>;
  })}</div>;
}
