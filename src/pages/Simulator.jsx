import { useEffect, useMemo, useRef, useState } from "react";
import CardTile from "../components/CardTile.jsx";
import CoreArea from "../components/CoreArea.jsx";
import EffectText from "../components/EffectText.jsx";
import PlayerHud from "../components/PlayerHud.jsx";
import PhaseBar from "../components/PhaseBar.jsx";
import Modal from "../components/Modal.jsx";
import { cardIndex } from "../services/cardRepository.js";
import { applyGameAction } from "../game/reducer.js";
import { findPhysicalCard, getDatabaseCard, getEffectiveBP } from "../game/selectors.js";
import { getCardName, resolveCardImage } from "../game/cardAdapter.js";
import { otherPlayerId } from "../game/utils.js";
import { calculateReduction, getSpendableCoreSources } from "../game/cost.js";
import { useLanguage } from "../i18n.jsx";

function effectText(card, language) {
  if (!card) return "";
  if (typeof card.effectText === "string") return card.effectText;
  return language === "en"
    ? (card.effectText?.en || card.textEN || card.effectText?.ptBR || card.textPT || "")
    : (card.effectText?.ptBR || card.textPT || card.effectText?.en || card.textEN || "");
}

function readDrag(e, type) {
  try { return JSON.parse(e.dataTransfer.getData(type)); } catch { return null; }
}

export default function Simulator({ match: initialMatch, mode = "local", onlineClient, viewerPlayerId, roomState: initialRoomState, onExit }) {
  const { t, language } = useLanguage();
  const [match, setMatch] = useState(initialMatch);
  const [roomState, setRoomState] = useState(initialRoomState || null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState("");
  const [previewCard, setPreviewCard] = useState(null);
  const [trashHover, setTrashHover] = useState(null);
  const [attackDrag, setAttackDrag] = useState(null);
  const previewTimer = useRef(null);
  const attackRef = useRef(null);
  const online = mode === "online";

  useEffect(() => {
    if (!online || !onlineClient) return undefined;
    const handler = (state) => {
      setRoomState(state);
      if (state.match) setMatch(state.match);
    };
    onlineClient.socket.on("room:state", handler);
    onlineClient.connect();
    return () => {
      onlineClient.socket.off("room:state", handler);
      onlineClient.close?.();
    };
  }, [online, onlineClient]);

  const actorId = useMemo(() => {
    if (match.battle?.flash?.priorityPlayerId) return match.battle.flash.priorityPlayerId;
    if (match.battle?.stage === "block") return match.battle.defenderPlayerId;
    return match.activePlayerId;
  }, [match]);
  const canControlActor = !online || viewerPlayerId === actorId;
  const bottomId = online ? viewerPlayerId : actorId;
  const topId = otherPlayerId(match, bottomId);
  const bottom = match.players[bottomId];
  const top = match.players[topId];
  const pendingPlay = match.pendingManualPlay;
  const pendingCost = match.pendingManualCost;
  const pending = pendingPlay || pendingCost;
  const selectedCtx = selectedId ? findPhysicalCard(match, selectedId) : null;
  const selectedCard = selectedCtx?.card?.hidden ? null : getDatabaseCard(cardIndex, selectedCtx?.card);
  const canMoveCores = canControlActor && actorId === bottomId && ((match.activePlayerId === bottomId && match.phase === "main" && !match.battle) || Boolean(pendingCost));

  function dispatch(action, asPlayerId = actorId) {
    setError(""); setNotice("");
    if (online) {
      if (viewerPlayerId !== asPlayerId) return setError(language === "en" ? "Wait for the other player." : "Aguarde a ação do outro jogador.");
      onlineClient.action({ action }, (result) => {
        if (!result?.ok) setError(result?.error || (language === "en" ? "Action rejected by server." : "Ação recusada pelo servidor."));
        if (result?.manualResolutionNeeded) setNotice(language === "en" ? "This effect still needs manual resolution." : "O efeito ainda precisa de resolução manual conforme o texto.");
      });
      return;
    }
    const result = applyGameAction(match, action, asPlayerId, cardIndex);
    if (!result.ok) return setError(result.error);
    setMatch(result.match);
    if (result.manualResolutionNeeded) setNotice(language === "en" ? "This effect still needs manual resolution." : "O efeito ainda precisa de resolução manual conforme o texto.");
  }

  function previewStart(card) {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(()=>setPreviewCard(card), 420);
  }
  function previewEnd() { clearTimeout(previewTimer.current); setPreviewCard(null); }

  function startCoreDrag(e, payload) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-bs-core", JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", "bs-core");
  }
  function coreDrop(payload, to) {
    if (!payload || payload.playerId !== bottomId) return;
    if (payload.zone === to.zone && payload.instanceId === to.instanceId) return;
    dispatch({ type:"MOVE_CORE", move:{ from:{ zone:payload.zone, instanceId:payload.instanceId }, to, coreType:payload.coreType || "regular" } }, bottomId);
  }
  function cardCoreDrop(e, playerId, instanceId) {
    e.preventDefault(); e.stopPropagation();
    const payload = readDrag(e, "application/x-bs-core");
    if (payload) coreDrop(payload, { zone:"card", instanceId });
  }

  function handDragStart(e, physical) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-bs-card", JSON.stringify({ playerId:bottomId, instanceId:physical.instanceId }));
  }
  function fieldDrop(e, playerId) {
    e.preventDefault();
    const core = readDrag(e, "application/x-bs-core");
    if (core) return;
    const payload = readDrag(e, "application/x-bs-card");
    if (!payload || payload.playerId !== playerId || playerId !== bottomId) return;
    dispatch({ type:"BEGIN_MANUAL_PLAY", instanceId:payload.instanceId }, playerId);
    setSelectedId(payload.instanceId);
  }

  function attackPointerDown(e, playerId, physical) {
    if (playerId !== match.activePlayerId || playerId !== bottomId || match.phase !== "attack" || match.battle || physical.exhausted || physical.combinedWith || !canControlActor) return;
    if (e.button !== 0 || e.target.closest(".core-token")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const data = { instanceId:physical.instanceId, startX:rect.left + rect.width/2, startY:rect.top + rect.height/2, x:e.clientX, y:e.clientY, moved:false };
    attackRef.current = data; setAttackDrag(data);
    const move = (ev) => {
      if (!attackRef.current) return;
      const dx = ev.clientX - attackRef.current.startX, dy = ev.clientY - attackRef.current.startY;
      attackRef.current = { ...attackRef.current, x:ev.clientX, y:ev.clientY, moved:Math.hypot(dx,dy)>18 };
      setAttackDrag(attackRef.current);
    };
    const up = (ev) => {
      const current = attackRef.current;
      attackRef.current = null; setAttackDrag(null);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (!current?.moved) return;
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.(`[data-life-target="${topId}"]`);
      if (target) dispatch({ type:"DECLARE_ATTACK", instanceId:current.instanceId }, bottomId);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  function minimumCoresFor(card) {
    if (!card || card.cardType === "nexus" || card.cardType === "magic") return 0;
    const levels = (card.levels || []).map((l)=>Number(l.cores)).filter(Number.isFinite);
    return levels.length ? Math.min(...levels) : (["spirit","ultimate","brave"].includes(card.cardType) ? 1 : 0);
  }

  function availableCores(playerId) {
    return getSpendableCoreSources(match, playerId, cardIndex, { preserveMinimum:false }).reduce((sum,source)=>sum+Number(source.regular||0)+(source.soul?1:0),0);
  }

  function cardUsableNow(card, playerId) {
    if (!card || pending || !canControlActor || playerId !== actorId) return false;
    const inMain = match.phase === "main" && !match.battle && match.activePlayerId === playerId;
    const inFlash = match.battle?.flash?.priorityPlayerId === playerId;
    const hasBurst = card.subtypes?.includes("burst") || card.effects?.some((e)=>e.type==="burst");
    if (hasBurst && inMain) return true;
    if (["spirit","ultimate","brave","nexus"].includes(card.cardType) && !inMain) return false;
    if (card.cardType === "magic" && !(inMain || inFlash)) return false;
    const payable = calculateReduction(match, playerId, card, cardIndex).payable;
    const levelNeed = ["spirit","ultimate","brave"].includes(card.cardType) ? minimumCoresFor(card) : 0;
    return availableCores(playerId) >= payable + levelNeed;
  }

  function revealedDragStart(e, playerId, physical) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-bs-revealed", JSON.stringify({ playerId, instanceId:physical.instanceId }));
  }
  function revealedDrop(e, playerId, type) {
    e.preventDefault();
    const payload = readDrag(e, "application/x-bs-revealed");
    if (!payload || payload.playerId !== playerId || playerId !== bottomId) return;
    dispatch({type:"MANUAL",payload:{type,playerId,instanceId:payload.instanceId}},playerId);
  }

  function renderHand(playerId) {
    const player = match.players[playerId];
    const reveal = online ? playerId === viewerPlayerId : playerId === actorId;
    const ownsRow = playerId === bottomId;
    const ownDraggable = ownsRow && playerId === actorId && canControlActor && match.phase === "main" && !match.battle && !pending;
    const canManualDeck = ownsRow && playerId === actorId && canControlActor && !pending;
    return <div className="hand-row">
      <div className="deck-stack-tools">
        <div className="stack-card"><span>DECK</span><b>{player.deck.length}</b><img src="./images/card-back.png" alt="Deck" /></div>
        <button disabled={!canManualDeck || !player.deck.length} onClick={()=>dispatch({type:"MANUAL",payload:{type:"revealTop",playerId}},playerId)}>{language==="en"?"Reveal":"Revelar"}</button>
        <button className="deck-drop-target" disabled={!ownsRow} onDragOver={(e)=>{if(ownsRow)e.preventDefault();}} onDrop={(e)=>revealedDrop(e,playerId,"revealedToTop")}>{language==="en"?"Top":"Topo"}</button>
        <button className="deck-drop-target" disabled={!ownsRow} onDragOver={(e)=>{if(ownsRow)e.preventDefault();}} onDrop={(e)=>revealedDrop(e,playerId,"revealedToBottom")}>{language==="en"?"Bottom":"Fundo"}</button>
      </div>
      <div className="hand-cards" onDragOver={(e)=>{if(ownsRow && e.dataTransfer.types.includes("application/x-bs-revealed"))e.preventDefault();}} onDrop={(e)=>revealedDrop(e,playerId,"revealedToHand")}>{player.hand.map((physical) => {
        const hidden = !reveal || physical.hidden;
        const card = hidden ? null : getDatabaseCard(cardIndex, physical);
        const usable = hidden ? true : cardUsableNow(card,playerId);
        return <CardTile key={physical.instanceId} compact card={card} physical={physical} hidden={hidden} selected={selectedId===physical.instanceId} unusable={!hidden && playerId===bottomId && !usable}
          draggable={!hidden && ownDraggable && ["spirit","ultimate","brave","nexus"].includes(card?.cardType)}
          onDragStart={(e)=>handDragStart(e,physical)} onClick={() => !hidden && setSelectedId(physical.instanceId)} onPreviewStart={previewStart} onPreviewEnd={previewEnd} />;
      })}</div>
      <button className="stack-card trash" onMouseEnter={()=>setTrashHover(playerId)} onMouseLeave={()=>setTrashHover(null)} onClick={() => { const topCard = player.trash.at(-1); if (topCard?.cardId) setSelectedId(topCard.instanceId); }}><span>TRASH</span><b>{player.trash.length}</b>{player.trash.length ? <img className="trash-image" src={getDatabaseCard(cardIndex, player.trash.at(-1))?.image || resolveCardImage(getDatabaseCard(cardIndex, player.trash.at(-1)))} alt="Trash" /> : null}</button>
    </div>;
  }

  function renderField(playerId) {
    const player = match.players[playerId];
    const canOwnCoreDrag = canMoveCores && playerId === bottomId;
    const renderZone = (label, zone) => <div className={`field-zone ${zone} ${playerId===bottomId ? "droppable-field" : ""}`} onDragOver={(e)=>{ if (playerId===bottomId) e.preventDefault(); }} onDrop={(e)=>fieldDrop(e,playerId)}>
      <div className="zone-title"><span>{label}</span><b>{player.field[zone].filter((c)=>!c.combinedWith).length}</b></div>
      <div className="field-cards">{player.field[zone].filter((c)=>!c.combinedWith).map((physical) => {
        const card = getDatabaseCard(cardIndex, physical);
        const brave = zone === "spirits" ? player.field.other.find((b)=>b.combinedWith===physical.instanceId) : null;
        return <div className={`field-card-wrap ${physical.flags?.pendingManualPlay ? "pending" : ""}`} key={physical.instanceId} onPointerDown={(e)=>attackPointerDown(e, playerId, physical)}>
          <CardTile card={card} physical={physical} selected={selectedId===physical.instanceId} onClick={()=>setSelectedId(physical.instanceId)}
            onCoreDrop={playerId===bottomId ? (e)=>cardCoreDrop(e,playerId,physical.instanceId) : undefined}
            canDragCores={canOwnCoreDrag}
            onCoreDragStart={(e,payload)=>startCoreDrag(e,{...payload,playerId})}
            onPreviewStart={previewStart} onPreviewEnd={previewEnd}
            footer={brave ? <span className="attachment-label">+ {getCardName(getDatabaseCard(cardIndex, brave))}</span> : null} />
        </div>;
      })}</div>
    </div>;
    return <div className="battlefield-row">{renderZone("SPIRITS / ULTIMATES", "spirits")}{renderZone("NEXUS", "nexuses")}{renderZone("BRAVES / OTHER", "other")}</div>;
  }

  function actionButtons() {
    if (!selectedCtx || !selectedCard) return <p className="muted">{t("selectCardHint")}</p>;
    const ownerId = selectedCtx.playerId;
    const physical = selectedCtx.card;
    const buttons = [];
    const ownerCanAct = !online || viewerPlayerId === ownerId;

    if (selectedCtx.zone === "hand" && ownerId === actorId && canControlActor && !pending) {
      if (["spirit","ultimate","brave","nexus"].includes(selectedCard.cardType) && match.phase === "main" && !match.battle) {
        buttons.push(<button key="manualplay" className="primary-btn" onClick={()=>dispatch({type:"BEGIN_MANUAL_PLAY",instanceId:physical.instanceId},ownerId)}>{selectedCard.cardType === "nexus" ? t("deployNexus") : t("summon")}</button>);
        if (selectedCard.cardType === "brave") {
          const hosts = match.players[ownerId].field.spirits.filter((host)=>!(match.players[ownerId].field.other||[]).some((b)=>b.combinedWith===host.instanceId));
          if (hosts.length) buttons.push(<div key="directcombine" className="combine-box"><span>Direct Combine:</span>{hosts.map((host)=><button key={host.instanceId} onClick={()=>dispatch({type:"BEGIN_MANUAL_PLAY",instanceId:physical.instanceId,options:{directCombineHostInstanceId:host.instanceId}},ownerId)}>{getCardName(getDatabaseCard(cardIndex,host))}</button>)}</div>);
        }
      }
      if (selectedCard.cardType === "magic") {
        if (match.phase === "main" && !match.battle) {
          buttons.push(<button key="magicmain" onClick={()=>dispatch({type:"BEGIN_MANUAL_COST",instanceId:physical.instanceId,options:{kind:"magic",mode:"main"}}, ownerId)}>{t("useMain")}</button>);
          buttons.push(<button key="magicflash" onClick={()=>dispatch({type:"BEGIN_MANUAL_COST",instanceId:physical.instanceId,options:{kind:"magic",mode:"flash"}}, ownerId)}>{t("useFlash")}</button>);
        }
        if (match.battle?.flash?.priorityPlayerId === ownerId) buttons.push(<button key="battleflash" className="primary-btn" onClick={()=>dispatch({type:"BEGIN_MANUAL_COST",instanceId:physical.instanceId,options:{kind:"magic",mode:"flash"}}, ownerId)}>{t("useFlash")}</button>);
      }
      const hasBurst = selectedCard.subtypes?.includes("burst") || selectedCard.effects?.some((e)=>e.type==="burst");
      if (hasBurst && match.phase === "main" && !match.battle) buttons.push(<button key="burst" onClick={()=>dispatch({type:"SET_BURST",instanceId:physical.instanceId})}>Set Burst</button>);
      const hasMirage = Boolean(selectedCard.mirage) || selectedCard.effects?.some((e)=>e.type==="mirage" || e.timing==="mirage");
      if (hasMirage && match.phase === "main" && !match.battle) buttons.push(<button key="mirage" onClick={()=>dispatch({type:"BEGIN_MANUAL_COST",instanceId:physical.instanceId,options:{kind:"mirage"}}, ownerId)}>Set Mirage</button>);
    }
    if (["spirits","other"].includes(selectedCtx.zone) && ownerId === match.activePlayerId && match.phase === "attack" && !match.battle && ownerCanAct && !physical.exhausted && !physical.combinedWith) {
      buttons.push(<button key="attack" className="primary-btn dangerish" onClick={()=>dispatch({type:"DECLARE_ATTACK",instanceId:physical.instanceId}, ownerId)}>{t("declareAttack")}</button>);
    }
    if (["spirits","other"].includes(selectedCtx.zone) && match.battle?.stage === "block" && ownerId === match.battle.defenderPlayerId && actorId === ownerId && !physical.exhausted && !physical.combinedWith && canControlActor) {
      buttons.push(<button key="block" className="primary-btn" onClick={()=>dispatch({type:"DECLARE_BLOCK",instanceId:physical.instanceId}, ownerId)}>{t("block")}</button>);
    }
    const attachedBrave = selectedCtx.zone === "spirits" ? match.players[ownerId].field.other.find((b)=>b.combinedWith===physical.instanceId) : null;
    if (attachedBrave && ownerId === match.activePlayerId && match.phase === "main" && !match.battle && ownerCanAct && !pending) {
      buttons.push(<button key="separate-attached" onClick={()=>dispatch({type:"SEPARATE_BRAVE",braveInstanceId:attachedBrave.instanceId},ownerId)}>Separate Brave</button>);
      const exchangeHosts = match.players[ownerId].field.spirits.filter((host)=>host.instanceId!==physical.instanceId && !(match.players[ownerId].field.other||[]).some((b)=>b.combinedWith===host.instanceId));
      if (exchangeHosts.length) buttons.push(<div key="exchange" className="combine-box"><span>Exchange Brave:</span>{exchangeHosts.map((host)=><button key={host.instanceId} onClick={()=>dispatch({type:"EXCHANGE_BRAVE",braveInstanceId:attachedBrave.instanceId,hostInstanceId:host.instanceId,options:{confirmCondition:true}},ownerId)}>{getCardName(getDatabaseCard(cardIndex,host))}</button>)}</div>);
    }
    if (selectedCard.cardType === "brave" && selectedCtx.zone === "other" && ownerId === match.activePlayerId && match.phase === "main" && !match.battle && ownerCanAct && !pending) {
      if (physical.combinedWith) buttons.push(<button key="separate" onClick={()=>dispatch({type:"SEPARATE_BRAVE",braveInstanceId:physical.instanceId}, ownerId)}>Separate Brave</button>);
      else {
        const hosts = match.players[ownerId].field.spirits;
        if (hosts.length) buttons.push(<div key="combine" className="combine-box"><span>Combine:</span>{hosts.map((host)=><button key={host.instanceId} onClick={()=>dispatch({type:"COMBINE_BRAVE",braveInstanceId:physical.instanceId,hostInstanceId:host.instanceId,options:{confirmCondition:true}},ownerId)}>{getCardName(getDatabaseCard(cardIndex,host))}</button>)}</div>);
      }
    }
    return buttons.length ? <div className="inspector-actions">{buttons}</div> : <p className="muted">—</p>;
  }

  function battleCenter() {
    const battle = match.battle;
    if (!battle) return <div className="center-idle"><span>{match.phase.toUpperCase()}</span><strong>{canControlActor ? t("priority") : `${t("waitingPlayer")} ${match.players[actorId].name}`}</strong></div>;
    const attacker = findPhysicalCard(match, battle.attackerInstanceId);
    const blocker = battle.blockerInstanceId ? findPhysicalCard(match, battle.blockerInstanceId) : null;
    return <div className="battle-center-card">
      <div><span>{t("battle")}</span><strong>{battle.stage.toUpperCase()}</strong></div>
      <div className="battle-participants"><b>{attacker ? getCardName(getDatabaseCard(cardIndex, attacker.card)) : "—"}</b><span>{attacker ? getEffectiveBP(match,cardIndex,attacker.card) : 0} BP</span><em>VS</em><b>{blocker ? getCardName(getDatabaseCard(cardIndex, blocker.card)) : "—"}</b><span>{blocker ? getEffectiveBP(match,cardIndex,blocker.card) : "—"} BP</span></div>
      {battle.flash && <div className="battle-actions"><p>Flash {battle.flash.number}: <b>{match.players[battle.flash.priorityPlayerId].name}</b></p><button disabled={!canControlActor} onClick={()=>dispatch({type:"PASS_FLASH"},battle.flash.priorityPlayerId)}>{t("passFlash")}</button></div>}
      {battle.stage === "block" && <div className="battle-actions"><button disabled={!canControlActor} onClick={()=>dispatch({type:"DECLINE_BLOCK"},battle.defenderPlayerId)}>{t("noBlock")}</button></div>}
      {battle.stage === "resolve" && <div className="battle-actions"><button className="primary-btn" disabled={!canControlActor} onClick={()=>dispatch({type:"RESOLVE_BATTLE"},actorId)}>{t("resolveBattle")}</button></div>}
    </div>;
  }

  function sendChat(e) {
    e?.preventDefault();
    const text = chatText.trim(); if (!text || !onlineClient) return;
    onlineClient.sendChat(text, (r)=>{ if (!r?.ok) setError(r?.error || "Chat error"); });
    setChatText("");
  }

  const pendingCtx = pending ? findPhysicalCard(match, pending.instanceId) : null;
  const pendingCoreCount = pendingPlay && pendingCtx ? Number(pendingCtx.card.cores?.regular||0) + (pendingCtx.card.cores?.soul ? 1 : 0) : 0;
  const paidCount = pending ? Number(pending.paidRegular||0) + (pending.paidSoul ? 1 : 0) : 0;
  const bottomSoulReserve = bottom.soulCore?.zone === "reserve";
  const bottomSoulTrash = bottom.soulCore?.zone === "trash";

  return <main className="simulator-page">
    <header className="sim-topbar">
      <div className="sim-header-logo"><img src="./images/logo_battlespirits.png" alt="Battle Spirits" /></div>
      <div className="sim-header-steps"><PhaseBar phase={match.phase} /></div>
      <div className="sim-header-actions">{online && <button className="ghost" onClick={()=>setShowChat(true)}>{t("chat")}</button>}<button className="ghost" onClick={()=>setShowLog(true)}>{t("log")}</button><button className="ghost" onClick={onExit}>{t("exit")}</button></div>
    </header>

    {(error || notice) && <div className={error ? "game-message error" : "game-message notice"}>{error || notice}</div>}

    <div className="sim-layout">
      <aside className="inspector panel">
        <div className="inspector-scroll">
          <span className="eyebrow">{t("selectedCard")}</span>
          {selectedCard ? <>
            <CardTile card={selectedCard} physical={selectedCtx.card} staticPreview />
            <h2>{getCardName(selectedCard)}</h2>
            <div className="card-meta"><span>{selectedCard.id}</span><span>{selectedCard.cardType}</span><span>{t("cost")} {selectedCard.cost}</span></div>
            <EffectText text={effectText(selectedCard, language)} emptyText={t("noEffect")} />
            {actionButtons()}
          </> : <p className="muted">{t("selectCardHint")}</p>}
          <details className="manual-tools compact-manual-tools">
            <summary>{t("manualResolution")}</summary>
            <div className="manual-grid">
              <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"draw",playerId:actorId,count:1}})}>Draw 1</button>
              <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"topDeckToTrash",playerId:actorId}})}>Top → Trash</button>
              <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"adjustLife",playerId:actorId,delta:-1}})}>−1 Life</button>
              <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"adjustLife",playerId:actorId,delta:1}})}>+1 Life</button>
              {selectedId && <>
                <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"temporaryBP",instanceId:selectedId,amount:1000}})}>+1000 BP</button>
                <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"temporaryBP",instanceId:selectedId,amount:-1000}})}>−1000 BP</button>
                <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"refresh",instanceId:selectedId}})}>Refresh</button>
                <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"exhaust",instanceId:selectedId}})}>Exhaust</button>
                <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"destroy",instanceId:selectedId}})}>Destroy</button>
                <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"returnHand",instanceId:selectedId}})}>→ Hand</button>
                <button className="void-core-btn" disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"MANUAL",payload:{type:"voidToReserve",playerId:actorId}})}>Void → Core</button>
              </>}
            </div>
          </details>
        </div>
        <CoreArea title={t("reserve")} playerId={bottomId} zone="reserve" regularCount={bottom.reserve} soul={bottomSoulReserve} canControl={canMoveCores} onCoreDrop={coreDrop} accent="reserve" />
      </aside>

      <section className="table-area">
        <PlayerHud player={top} active={topId===match.activePlayerId} actor={topId===actorId} opponent dataLifeTarget={topId} />
        {renderHand(topId)}
        {renderField(topId)}
        <div className="table-middle">{battleCenter()}</div>
        {renderField(bottomId)}
        {renderHand(bottomId)}
        <PlayerHud player={bottom} active={bottomId===match.activePlayerId} actor={bottomId===actorId} dataLifeTarget={bottomId} />
      </section>

      <aside className="turn-panel panel">
        <div className="turn-panel-main">
          <span className="eyebrow">{t("matchControl")}</span>
          <h2>{match.players[actorId].name}</h2>
          <p>{match.battle ? (language === "en" ? "Resolve the current battle stage." : "Resolva o estágio atual da batalha.") : `${t("phase")}: ${match.phase}.`}</p>
          {!match.battle && <button className="primary-btn big" disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"ADVANCE_PHASE"},match.activePlayerId)}>{t("advancePhase")}</button>}
          {pending && pending.playerId===bottomId && <div className="pending-payment-panel">
            <span className="eyebrow">{pendingPlay ? t("pendingPlay") : (language === "en" ? "PENDING PAYMENT" : "PAGAMENTO PENDENTE")}</span>
            <strong>{getCardName(getDatabaseCard(cardIndex,pendingCtx?.card))}</strong>
            <div className="payment-meter"><span>{t("cost")}</span><b>{paidCount}/{pending.payableCost}</b></div>
            {pendingPlay && <div className="payment-meter"><span>{t("minLevel")}</span><b>{pendingCoreCount}/{pending.minimumCores}</b></div>}
            <small>{pendingPlay ? t("manualPaymentHint") : (language === "en" ? "Move the required Cores to the Core Trash, then confirm." : "Mova os Cores necessários para o Core Trash e confirme o pagamento.")}</small>
            <button className="primary-btn" disabled={!canControlActor || paidCount!==pending.payableCost || (pendingPlay && pendingCoreCount<pending.minimumCores)} onClick={()=>dispatch({type:pendingPlay ? "CONFIRM_MANUAL_PLAY" : "CONFIRM_MANUAL_COST"},bottomId)}>{t("confirmPlay")}</button>
            <button className="ghost danger" disabled={!canControlActor} onClick={()=>dispatch({type:pendingPlay ? "CANCEL_MANUAL_PLAY" : "CANCEL_MANUAL_COST"},bottomId)}>{t("cancelPlay")}</button>
          </div>}
          {match.turnNumber===1 && match.phase==="start" && <div className="mulligan-box"><span>Mulligan</span>{[bottomId,topId].map((id)=><button key={id} disabled={match.players[id].mulliganUsed || (online && viewerPlayerId!==id)} onClick={()=>dispatch({type:"MULLIGAN"},id)}>{match.players[id].name}</button>)}</div>}
          {match.players[actorId].burst && !match.players[actorId].burst.hidden && <button disabled={!canControlActor || Boolean(pending)} onClick={()=>dispatch({type:"ACTIVATE_BURST",options:{confirmCondition:true}},actorId)}>Activate Burst</button>}
          <div className="rules-note"><b>{t("battleSequence")}</b><span>{t("battleSequenceText")}</span></div>
        </div>
        <CoreArea title={t("coreTrash")} playerId={bottomId} zone="trash" regularCount={bottom.trashCores} soul={bottomSoulTrash} canControl={canMoveCores && Boolean(pending)} onCoreDrop={coreDrop} accent="trash" />
      </aside>
    </div>

    {([topId,bottomId].some((id)=>(match.players[id].revealed||[]).length>0)) && <div className="revealed-cards-overlay">
      {[topId,bottomId].map((id)=>{ const list=match.players[id].revealed||[]; if(!list.length)return null; const own=id===bottomId; return <section className="revealed-player-row" key={id}><header><span>{language==="en"?"REVEALED":"REVELADAS"}</span><b>{match.players[id].name}</b></header><div>{list.map((physical)=>{const card=getDatabaseCard(cardIndex,physical);return <CardTile key={physical.instanceId} card={card} physical={physical} draggable={own&&canControlActor} onDragStart={(e)=>revealedDragStart(e,id,physical)} onClick={()=>setSelectedId(physical.instanceId)} onPreviewStart={previewStart} onPreviewEnd={previewEnd}/>;})}</div>{own&&<small>{language==="en"?"Drag a revealed card to your hand, Top or Bottom.":"Arraste uma carta revelada para sua mão, Topo ou Fundo."}</small>}</section>;})}
    </div>}

    {trashHover && <div className="trash-hover-preview"><header><span>TRASH</span><b>{match.players[trashHover].name} • {match.players[trashHover].trash.length}</b></header><div>{match.players[trashHover].trash.length ? [...match.players[trashHover].trash].reverse().map((physical)=>{const card=getDatabaseCard(cardIndex,physical);return <CardTile key={physical.instanceId} card={card} physical={physical} staticPreview onClick={()=>setSelectedId(physical.instanceId)} onPreviewStart={previewStart} onPreviewEnd={previewEnd}/>;}) : <p className="muted">{language==="en"?"Trash is empty.":"Trash vazio."}</p>}</div></div>}

    {attackDrag && <svg className="attack-arrow-layer" width="100%" height="100%"><defs><marker id="attack-arrow-head" markerWidth="12" markerHeight="12" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" /></marker></defs><line x1={attackDrag.startX} y1={attackDrag.startY} x2={attackDrag.x} y2={attackDrag.y} markerEnd="url(#attack-arrow-head)" /></svg>}
    {previewCard && <div className="card-zoom-preview"><img src={resolveCardImage(previewCard)} alt={getCardName(previewCard)} /><strong>{getCardName(previewCard)}</strong></div>}

    {match.winnerId && <Modal title={t("matchEnd")}><div className="winner-box"><strong>{match.players[match.winnerId].name} {t("wins")}</strong><button className="primary-btn" onClick={onExit}>{t("mainMenu")}</button></div></Modal>}
    {showLog && <Modal title={t("log")} onClose={()=>setShowLog(false)}><div className="game-log">{[...(match.log||[])].reverse().map((entry)=><div key={entry.id}><span>T{entry.turn} • {entry.phase}</span><p>{entry.text}</p></div>)}</div></Modal>}
    {showChat && <Modal title={t("chat")} onClose={()=>setShowChat(false)}><div className="chat-panel"><div className="chat-messages">{roomState?.chat?.length ? roomState.chat.map((m)=><div className={`chat-message ${m.playerId===viewerPlayerId ? "mine" : ""}`} key={m.id}><div><b>{m.name}</b><small>{new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div><p>{m.text}</p></div>) : <p className="muted">{t("noMessages")}</p>}</div><form className="chat-compose" onSubmit={sendChat}><input maxLength={500} value={chatText} onChange={(e)=>setChatText(e.target.value)} placeholder={t("chatPlaceholder")} autoFocus/><button className="primary-btn" type="submit">{t("send")}</button></form></div></Modal>}
  </main>;
}
