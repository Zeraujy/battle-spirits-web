import { useEffect, useMemo, useRef, useState } from "react";
import CardTile from "../components/cards/CardTile.jsx";
import CoreArea from "../components/game/CoreArea.jsx";
import EffectText from "../components/cards/EffectText.jsx";
import PlayerHud from "../components/game/PlayerHud.jsx";
import ArenaCardStatus from "../components/game/ArenaCardStatus.jsx";
import ArenaBraveAttachment from "../components/game/ArenaBraveAttachment.jsx";
import ArenaBattleRole from "../components/game/ArenaBattleRole.jsx";
import PhaseBar from "../components/game/PhaseBar.jsx";
import PaymentStatus from "../components/game/PaymentStatus.jsx";
import BattleLinkOverlay from "../components/game/BattleLinkOverlay.jsx";
import Modal from "../components/common/Modal.jsx";
import { cardIndex } from "../services/cardRepository.js";
import { applyGameAction } from "../game/reducer.js";
import {
  findPhysicalCard,
  getDatabaseCard,
  getCurrentLevel,
  getEffectiveBP,
  getEffectiveSymbols
} from "../game/selectors.js";
import {
  getCardName,
  resolveCardImage
} from "../game/cardAdapter.js";
import { otherPlayerId } from "../game/utils.js";
import { legalBlockers } from "../game/battle.js";
import { getBurstActivationEvent } from "../game/burstRules.js";
import {
  calculateReduction,
  getSpendableCoreSources
} from "../game/cost.js";
import {
  getBraveSeparationPreview,
  getCombinedStats,
  getLegalBraveHosts
} from "../game/brave.js";
import { useLanguage } from "../i18n.jsx";
import { getSmartCoreClickTarget } from "../interactions/coreClickPolicy.js";
import {
  CARD_DRAG_THRESHOLD,
  getCardDropTargetAt,
  pointerDistance,
  setCardDragDocumentState
} from "../interactions/cardPointerDrag.js";

import "../styles/arena/simulatorPanels.css";
import "../styles/arena/arenaVisuals.css";
import "../styles/arena/effectDecision.css";
import "../styles/arena/braveUltimate.css";
import "../styles/arena/gameResult.css";
import "../styles/arena/arenaV31.css";
import "../styles/arena/pendingPlayV314.css";
import "../styles/arena/cardPresentationV317.css";
import "../styles/arena/battleEmphasisV317.css";
import "../styles/arena/coreCombatV318.css";
import "../styles/arena/cardInteractionV319.css";
import "../styles/arena/rulesEffectsV320.css";
import "../styles/arena/arenaLayoutV321.css";


function effectText(card, language) {
  if (!card) return "";

  if (typeof card.effectText === "string") {
    return card.effectText;
  }

  return language === "en"
    ? (
        card.effectText?.en ||
        card.textEN ||
        card.effectText?.ptBR ||
        card.textPT ||
        ""
      )
    : (
        card.effectText?.ptBR ||
        card.textPT ||
        card.effectText?.en ||
        card.textEN ||
        ""
      );
}


function getInspectorCardTheme(card) {
  if (!card) return "neutral";

  const symbols = Array.isArray(card.symbols) ? card.symbols.filter(Boolean) : [];
  const colors = Array.isArray(card.colors) ? card.colors.filter(Boolean) : [];

  if (
    card.cardType === "ultimate" ||
    symbols.includes("ultimate") ||
    colors.includes("ultimate") ||
    symbols.length > 1 ||
    colors.length > 1
  ) {
    return "rainbow";
  }

  return symbols[0] || colors[0] || "neutral";
}


function readDrag(e, type) {
  try {
    return JSON.parse(
      e.dataTransfer.getData(type)
    );
  } catch {
    return null;
  }
}


/* =========================================================
   SEQUÊNCIA ETERNAL
========================================================= */

const ETERNAL_PHASES = [
  {
    id: "start",
    number: "01",
    ptBR: "Start",
    en: "Start"
  },

  {
    id: "core",
    number: "02",
    ptBR: "Core",
    en: "Core"
  },

  {
    id: "draw",
    number: "03",
    ptBR: "Draw",
    en: "Draw"
  },

  {
    id: "refresh",
    number: "04",
    ptBR: "Refresh",
    en: "Refresh"
  },

  {
    id: "main",
    number: "05",
    ptBR: "Main",
    en: "Main"
  },

  {
    id: "attack",
    number: "06",
    ptBR: "Attack",
    en: "Attack"
  },

  {
    id: "end",
    number: "07",
    ptBR: "End",
    en: "End"
  }
];


function EternalSequence({
  phase,
  playerColor,
  language
}) {
  const foundIndex =
    ETERNAL_PHASES.findIndex(
      (item) =>
        item.id === phase
    );

  const currentIndex =
    foundIndex >= 0
      ? foundIndex
      : 0;

  return (
    <section
      className="eternal-sequence-card"
      style={{
        "--eternal-accent":
          playerColor ||
          "#d8d8d8"
      }}
    >
      <header className="eternal-sequence-header">
        <div>
          <span className="eyebrow">
            {language === "en"
              ? "TURN FLOW"
              : "FLUXO DO TURNO"}
          </span>

          <strong>
            {language === "en"
              ? "Eternal Sequence"
              : "Sequência Eternal"}
          </strong>
        </div>

        <span className="eternal-sequence-progress">
          {String(
            currentIndex + 1
          ).padStart(
            2,
            "0"
          )}
          /07
        </span>
      </header>

      <div className="eternal-phase-list">
        {ETERNAL_PHASES.map(
          (
            item,
            index
          ) => {
            const isCurrent =
              item.id === phase;

            const isPast =
              index <
              currentIndex;

            const classes = [
              "eternal-phase-step",
              isCurrent
                ? "current"
                : "",
              isPast
                ? "complete"
                : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={item.id}
                className={
                  classes
                }
              >
                <div className="eternal-phase-rail">
                  <span className="eternal-phase-node">
                    {isPast
                      ? "✓"
                      : item.number}
                  </span>
                </div>

                <div className="eternal-phase-copy">
                  <strong>
                    {language ===
                    "en"
                      ? item.en
                      : item.ptBR}
                  </strong>

                  {isCurrent && (
                    <span>
                      {language ===
                      "en"
                        ? "CURRENT PHASE"
                        : "FASE ATUAL"}
                    </span>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}


/* =========================================================
   ARENA — GLOW DE RARIDADE X+
========================================================= */

const ARENA_HIGH_RARITIES = new Set([
  "X",
  "XX",
  "10THX",
  "XV",
  "NX",
  "AX",
  "PX",
  "PXV",
  "転醒X",
  "契約X"
]);


function normalizeArenaRarity(rarity) {
  return String(rarity || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}


function hasArenaRarityGlow(card) {
  const rarity =
    normalizeArenaRarity(
      card?.rarity
    );

  if (!rarity) {
    return false;
  }

  if (
    ARENA_HIGH_RARITIES.has(
      rarity
    )
  ) {
    return true;
  }

  /*
   * Compatibilidade com futuras raridades que terminem em X,
   * sem transformar M/R/U/C em cartas brilhantes.
   */
  return (
    rarity !== "EX" &&
    rarity.endsWith("X")
  );
}


function getArenaGlowTheme(card) {
  const validColors =
    new Set([
      "red",
      "purple",
      "green",
      "white",
      "yellow",
      "blue"
    ]);


  const symbols =
    [
      ...new Set(
        (
          Array.isArray(
            card?.symbols
          )
            ? card.symbols
            : []
        )
          .map(
            (symbol) =>
              String(
                symbol
              )
                .trim()
                .toLowerCase()
          )
          .filter(Boolean)
      )
    ];


  const colors =
    [
      ...new Set(
        (
          Array.isArray(
            card?.colors
          )
            ? card.colors
            : []
        )
          .map(
            (color) =>
              String(
                color
              )
                .trim()
                .toLowerCase()
          )
          .filter(Boolean)
      )
    ];


  /*
   * Ultimates e cartas realmente multicoloridas recebem
   * a aura prismática.
   */
  if (
    card?.cardType ===
      "ultimate" ||
    symbols.includes(
      "ultimate"
    ) ||
    colors.includes(
      "ultimate"
    ) ||
    symbols.filter(
      (symbol) =>
        validColors.has(
          symbol
        )
    ).length > 1 ||
    colors.filter(
      (color) =>
        validColors.has(
          color
        )
    ).length > 1
  ) {
    return "rainbow";
  }


  const symbolColor =
    symbols.find(
      (symbol) =>
        validColors.has(
          symbol
        )
    );


  if (symbolColor) {
    return symbolColor;
  }


  const cardColor =
    colors.find(
      (color) =>
        validColors.has(
          color
        )
    );


  return (
    cardColor ||
    "neutral"
  );
}


/* =========================================================
   SIMULATOR
========================================================= */

export default function Simulator({
  match: initialMatch,
  mode = "local",
  onlineClient,
  viewerPlayerId,
  roomState: initialRoomState,
  onExit
}) {
  const {
    t,
    language
  } = useLanguage();

  const [
    match,
    setMatch
  ] = useState(
    initialMatch
  );

  const [
    roomState,
    setRoomState
  ] = useState(
    initialRoomState ||
      null
  );

  const [
    selectedId,
    setSelectedId
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const [
    notice,
    setNotice
  ] = useState("");

  const [
    showLog,
    setShowLog
  ] = useState(false);

  const [
    showChat,
    setShowChat
  ] = useState(false);

  const [
    chatText,
    setChatText
  ] = useState("");

  const [
    previewCard,
    setPreviewCard
  ] = useState(null);

  const [
    previewAnchor,
    setPreviewAnchor
  ] = useState(null);

  const [
    showInspectorDock,
    setShowInspectorDock
  ] = useState(true);

  const [
    showControlDock,
    setShowControlDock
  ] = useState(true);

  const [
    trashHover,
    setTrashHover
  ] = useState(null);

  /*
   * Pointer-driven card dragging. Unlike native HTML drag-and-drop, this keeps
   * the card sharp and opaque while moving and never shows the browser's
   * prohibited cursor.
   */
  const [
    cardDrag,
    setCardDrag
  ] = useState(null);

  const [
    pendingPlayAnchor,
    setPendingPlayAnchor
  ] = useState(null);

  const [
    effectDecisionSelection,
    setEffectDecisionSelection
  ] = useState([]);

  const [
    braveSeparationDialog,
    setBraveSeparationDialog
  ] = useState(null);

  const previewTimer =
    useRef(null);

  const cardDragRef =
    useRef(null);

  const suppressCardClickRef =
    useRef({ instanceId: null, until: 0 });

  const online =
    mode === "online";


  const effectDecision =
    match.pendingEffectDecision ||
    null;


  useEffect(() => {
    setEffectDecisionSelection([]);
  }, [
    effectDecision?.id
  ]);


  useEffect(() => () => {
    clearCardDropHover?.();
    setCardDragDocumentState(false);
  }, []);


  /* =======================================================
     ONLINE STATE
  ======================================================= */

  useEffect(() => {
    if (
      !online ||
      !onlineClient
    ) {
      return undefined;
    }

    const handler = (
      state
    ) => {
      setRoomState(
        state
      );

      if (
        state.match
      ) {
        setMatch(
          state.match
        );
      }
    };

    onlineClient.socket.on(
      "room:state",
      handler
    );

    onlineClient.connect();

    return () =>
      onlineClient.socket.off(
        "room:state",
        handler
      );
  }, [
    online,
    onlineClient
  ]);


  /* =======================================================
     PLAYER / ACTOR
  ======================================================= */

  const actorId =
    useMemo(() => {
      if (
        match.pendingEffectDecision
          ?.playerId
      ) {
        return match
          .pendingEffectDecision
          .playerId;
      }

      if (
        match.battle
          ?.stage ===
        "ultimateTrigger" &&
        match.battle
          ?.ultimateTrigger
      ) {
        const trigger =
          match.battle
            .ultimateTrigger;

        if (
          trigger.status ===
            "counterWindow" &&
          trigger.counterPlayerId
        ) {
          return trigger
            .counterPlayerId;
        }

        if (
          trigger.controllerPlayerId
        ) {
          return trigger
            .controllerPlayerId;
        }
      }

      if (
        match.battle
          ?.flash
          ?.priorityPlayerId
      ) {
        return match.battle
          .flash
          .priorityPlayerId;
      }

      if (
        match.battle
          ?.stage ===
        "block"
      ) {
        return match.battle
          .defenderPlayerId;
      }

      return match
        .activePlayerId;
    }, [match]);


  const canControlActor =
    !online ||
    viewerPlayerId ===
      actorId;


  const bottomId =
    online
      ? viewerPlayerId
      : actorId;


  const topId =
    otherPlayerId(
      match,
      bottomId
    );


  const bottom =
    match.players[
      bottomId
    ];


  const top =
    match.players[
      topId
    ];


  const actorBurstCard =
    match.players[actorId]?.burst
      ? getDatabaseCard(cardIndex, match.players[actorId].burst)
      : null;


  const actorBurstEvent =
    getBurstActivationEvent(actorBurstCard);


  const pendingPlay =
    match.pendingManualPlay;


  const pendingCost =
    match.pendingManualCost;


  const pending =
    pendingPlay ||
    pendingCost;


  /*
   * Keep the summon/deploy confirmation beside the physical card that was
   * just placed. The coordinates are recalculated on resize/scroll and are
   * clamped to the visible viewport so the panel never escapes the arena.
   */
  useEffect(() => {
    if (!pendingPlay?.instanceId) {
      setPendingPlayAnchor(null);
      return undefined;
    }

    const updateAnchor = () => {
      const element = document.querySelector(
        `[data-field-card-instance="${pendingPlay.instanceId}"]`
      );

      if (!element) {
        setPendingPlayAnchor(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const panelWidth = 248;
      const panelHeight = 248;
      const gap = 12;
      const margin = 10;

      let left = rect.right + gap;
      let side = "right";

      if (left + panelWidth > window.innerWidth - margin) {
        left = rect.left - panelWidth - gap;
        side = "left";
      }

      left = Math.max(
        margin,
        Math.min(left, window.innerWidth - panelWidth - margin)
      );

      const top = Math.max(
        64,
        Math.min(
          rect.top + rect.height / 2 - panelHeight / 2,
          window.innerHeight - panelHeight - margin
        )
      );

      setPendingPlayAnchor({ left, top, side });
    };

    const frame = requestAnimationFrame(updateAnchor);
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [
    pendingPlay?.instanceId,
    showInspectorDock,
    showControlDock,
    bottomId
  ]);


  const blockingPending =
    Boolean(
      pending ||
      effectDecision
    );


  const effectCandidateIds =
    useMemo(
      () =>
        new Set(
          (
            effectDecision
              ?.candidates ||
            []
          ).map(
            (candidate) =>
              candidate.instanceId
          )
        ),
      [effectDecision]
    );


  const canControlEffectDecision =
    Boolean(
      effectDecision
    ) &&
    (
      !online ||
      viewerPlayerId ===
        effectDecision.playerId
    );


  const selectedCtx =
    selectedId
      ? findPhysicalCard(
          match,
          selectedId
        )
      : null;


  const selectedCard =
    selectedCtx?.card
      ?.hidden
      ? null
      : getDatabaseCard(
          cardIndex,
          selectedCtx?.card
        );


  const canMoveCores =
    canControlActor &&
    !effectDecision &&
    actorId === bottomId &&
    (
      (
        match.activePlayerId ===
          bottomId &&
        match.phase ===
          "main" &&
        !match.battle
      ) ||
      Boolean(
        pendingCost
      )
    );


  /* =======================================================
     DISPATCH
  ======================================================= */

  function dispatch(
    action,
    asPlayerId = actorId
  ) {
    setError("");
    setNotice("");

    if (online) {
      if (
        viewerPlayerId !==
        asPlayerId
      ) {
        return setError(
          language === "en"
            ? "Wait for the other player."
            : "Aguarde a ação do outro jogador."
        );
      }

      onlineClient.action(
        {
          action
        },
        (
          result
        ) => {
          if (
            !result?.ok
          ) {
            setError(
              result?.error ||
                (
                  language ===
                  "en"
                    ? "Action rejected by server."
                    : "Ação recusada pelo servidor."
                )
            );
          }

          if (
            result?.manualResolutionNeeded &&
            !result?.pendingEffectDecision &&
            !result?.match?.pendingEffectDecision
          ) {
            setNotice(
              language === "en"
                ? "This effect still needs manual resolution."
                : "O efeito ainda precisa de resolução manual conforme o texto."
            );
          }
        }
      );

      return;
    }

    const result =
      applyGameAction(
        match,
        action,
        asPlayerId,
        cardIndex
      );

    if (
      !result.ok
    ) {
      return setError(
        result.error
      );
    }

    setMatch(
      result.match
    );

    if (
      result.manualResolutionNeeded &&
      !result.match?.pendingEffectDecision
    ) {
      setNotice(
        language === "en"
          ? "This effect still needs manual resolution."
          : "O efeito ainda precisa de resolução manual conforme o texto."
      );
    }
  }


  /* =======================================================
     EFFECT DECISION QUEUE
  ======================================================= */

  function effectDecisionTitle() {
    if (!effectDecision) {
      return "";
    }

    return language === "en"
      ? (
          effectDecision.titleEN ||
          effectDecision.titlePT ||
          "Effect Resolution"
        )
      : (
          effectDecision.titlePT ||
          effectDecision.titleEN ||
          "Resolução de Efeito"
        );
  }


  function effectDecisionInstruction() {
    if (!effectDecision) {
      return "";
    }

    const custom =
      language === "en"
        ? (
            effectDecision.instructionEN ||
            effectDecision.instructionPT
          )
        : (
            effectDecision.instructionPT ||
            effectDecision.instructionEN
          );

    if (custom) {
      return custom;
    }

    if (
      effectDecision.kind ===
      "chooseOption"
    ) {
      return language === "en"
        ? "Choose one effect to continue."
        : "Escolha um efeito para continuar.";
    }

    if (
      effectDecision.kind ===
      "selectMultipleTargets"
    ) {
      return language === "en"
        ? "Select the highlighted cards, then confirm."
        : "Selecione as cartas destacadas e depois confirme.";
    }

    if (
      effectDecision.kind ===
      "selectTrashTarget"
    ) {
      return language === "en"
        ? "Choose a valid card from the Trash."
        : "Escolha uma carta válida do Trash.";
    }

    return language === "en"
      ? "Click one of the highlighted valid cards."
      : "Clique em uma das cartas válidas destacadas.";
  }


  function effectDecisionSelectedBP(
    ids = effectDecisionSelection
  ) {
    return ids.reduce(
      (
        total,
        instanceId
      ) => {
        const ctx =
          findPhysicalCard(
            match,
            instanceId
          );

        if (
          !ctx ||
          ![
            "spirits",
            "nexuses",
            "other"
          ].includes(
            ctx.zone
          )
        ) {
          return total;
        }

        return total +
          Number(
            getEffectiveBP(
              match,
              cardIndex,
              ctx.card
            ) ||
            0
          );
      },
      0
    );
  }


  function effectDecisionCanConfirm() {
    if (
      !effectDecision ||
      !canControlEffectDecision
    ) {
      return false;
    }

    const count =
      effectDecisionSelection.length;

    const minimum =
      Number(
        effectDecision.minimum ||
        0
      );

    const maximum =
      Math.max(
        minimum,
        Number(
          effectDecision.maximum ||
          1
        )
      );

    if (
      count < minimum ||
      count > maximum
    ) {
      return false;
    }

    if (
      effectDecision.maxTotalBP != null &&
      effectDecisionSelectedBP() >
        Number(
          effectDecision.maxTotalBP
        )
    ) {
      return false;
    }

    return true;
  }


  function resolveEffectDecisionSelection(
    ids
  ) {
    if (
      !effectDecision ||
      !canControlEffectDecision
    ) {
      return;
    }

    dispatch(
      {
        type:
          "RESOLVE_EFFECT_DECISION",

        payload: {
          selectedInstanceIds:
            ids
        }
      },
      effectDecision.playerId
    );
  }


  function chooseEffectDecisionOption(
    optionId
  ) {
    if (
      !effectDecision ||
      !canControlEffectDecision
    ) {
      return;
    }

    dispatch(
      {
        type:
          "RESOLVE_EFFECT_DECISION",

        payload: {
          optionId
        }
      },
      effectDecision.playerId
    );
  }


  function toggleEffectDecisionTarget(
    instanceId
  ) {
    if (
      !effectDecision ||
      !canControlEffectDecision ||
      !effectCandidateIds.has(
        instanceId
      )
    ) {
      return;
    }

    if (
      effectDecision.kind !==
        "selectMultipleTargets" &&
      Number(
        effectDecision.maximum ||
        1
      ) <= 1
    ) {
      resolveEffectDecisionSelection(
        [instanceId]
      );
      return;
    }

    setEffectDecisionSelection(
      (
        current
      ) => {
        if (
          current.includes(
            instanceId
          )
        ) {
          return current.filter(
            (id) =>
              id !== instanceId
          );
        }

        const maximum =
          Math.max(
            1,
            Number(
              effectDecision.maximum ||
              1
            )
          );

        if (
          current.length >=
          maximum
        ) {
          setError(
            language === "en"
              ? `You can select up to ${maximum} card(s).`
              : `Você pode selecionar no máximo ${maximum} carta(s).`
          );
          return current;
        }

        const next = [
          ...current,
          instanceId
        ];

        if (
          effectDecision.maxTotalBP != null &&
          effectDecisionSelectedBP(
            next
          ) >
            Number(
              effectDecision.maxTotalBP
            )
        ) {
          setError(
            language === "en"
              ? `The selected cards exceed ${effectDecision.maxTotalBP} total BP.`
              : `As cartas selecionadas ultrapassam ${effectDecision.maxTotalBP} BP no total.`
          );
          return current;
        }

        setError("");
        return next;
      }
    );
  }


  function renderEffectDecisionOverlay() {
    if (!effectDecision) {
      return null;
    }

    const title =
      effectDecisionTitle();

    const instruction =
      effectDecisionInstruction();

    const sourceCard =
      effectDecision.context
        ?.sourceCard ||
      (
        effectDecision.context
          ?.sourcePhysical
          ? getDatabaseCard(
              cardIndex,
              effectDecision.context
                .sourcePhysical
            )
          : null
      );

    const sourceName =
      sourceCard
        ? getCardName(
            sourceCard
          )
        : null;

    const waiting =
      !canControlEffectDecision;

    const isTrashPicker =
      effectDecision.kind ===
      "selectTrashTarget";

    const isOptionPicker =
      effectDecision.kind ===
      "chooseOption";

    const showConfirm =
      effectDecision.kind ===
        "selectMultipleTargets" ||
      Number(
        effectDecision.maximum ||
        1
      ) > 1;

    const trashCandidates =
      isTrashPicker
        ? (
            effectDecision.candidates ||
            []
          )
            .map(
              (candidate) => {
                const ctx =
                  findPhysicalCard(
                    match,
                    candidate.instanceId
                  );

                if (!ctx) {
                  return null;
                }

                return {
                  candidate,
                  ctx,
                  card:
                    getDatabaseCard(
                      cardIndex,
                      ctx.card
                    )
                };
              }
            )
            .filter(Boolean)
        : [];

    return (
      <>
        <div className="effect-decision-dimmer" />

        <section
          className={
            `effect-decision-panel ${
              isTrashPicker ||
              isOptionPicker
                ? "picker"
                : "compact"
            }`
          }
        >
          <header className="effect-decision-header">
            <div>
              <span className="eyebrow">
                {language === "en"
                  ? "EFFECT RESOLUTION"
                  : "RESOLUÇÃO DE EFEITO"}
              </span>

              <strong>
                {title}
              </strong>

              {sourceName && (
                <small>
                  {sourceName}
                </small>
              )}
            </div>

            {waiting && (
              <span className="effect-decision-waiting">
                {language === "en"
                  ? "Waiting for the other player"
                  : "Aguardando o outro jogador"}
              </span>
            )}
          </header>

          <p>
            {instruction}
          </p>

          {isOptionPicker &&
            !waiting && (
            <div className="effect-decision-options">
              {(effectDecision.options || []).map(
                (
                  option,
                  index
                ) => (
                  <button
                    type="button"
                    key={
                      option.id ||
                      index
                    }
                    onClick={() =>
                      chooseEffectDecisionOption(
                        String(
                          option.id ??
                          index
                        )
                      )
                    }
                  >
                    {language === "en"
                      ? (
                          option.labelEN ||
                          option.labelPT ||
                          `Option ${index + 1}`
                        )
                      : (
                          option.labelPT ||
                          option.labelEN ||
                          `Opção ${index + 1}`
                        )}
                  </button>
                )
              )}
            </div>
          )}

          {isTrashPicker &&
            !waiting && (
            <div className="effect-decision-trash-grid">
              {trashCandidates.map(
                ({
                  candidate,
                  ctx,
                  card
                }) => {
                  const selected =
                    effectDecisionSelection.includes(
                      candidate.instanceId
                    );

                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      className={
                        `effect-decision-trash-card ${
                          selected
                            ? "selected"
                            : ""
                        }`
                      }
                      key={
                        candidate.instanceId
                      }
                      onClick={() =>
                        toggleEffectDecisionTarget(
                          candidate.instanceId
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" ||
                          e.key === " "
                        ) {
                          e.preventDefault();
                          toggleEffectDecisionTarget(
                            candidate.instanceId
                          );
                        }
                      }}
                    >
                      <CardTile
                        card={card}
                        physical={
                          ctx.card
                        }
                        staticPreview
                      />
                    </div>
                  );
                }
              )}
            </div>
          )}

          {!waiting &&
            !isOptionPicker && (
            <footer className="effect-decision-footer">
              <div className="effect-decision-counter">
                <b>
                  {effectDecisionSelection.length}
                  /
                  {effectDecision.maximum || 1}
                </b>

                {effectDecision.maxTotalBP != null && (
                  <span>
                    {effectDecisionSelectedBP()}
                    /
                    {effectDecision.maxTotalBP}
                    {" "}
                    BP
                  </span>
                )}
              </div>

              {showConfirm && (
                <button
                  type="button"
                  className="primary-btn"
                  disabled={
                    !effectDecisionCanConfirm()
                  }
                  onClick={() =>
                    resolveEffectDecisionSelection(
                      effectDecisionSelection
                    )
                  }
                >
                  {language === "en"
                    ? "Confirm targets"
                    : "Confirmar alvos"}
                </button>
              )}

              {Number(
                effectDecision.minimum ||
                0
              ) === 0 && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    resolveEffectDecisionSelection(
                      []
                    )
                  }
                >
                  {language === "en"
                    ? "Choose none"
                    : "Não selecionar"}
                </button>
              )}
            </footer>
          )}
        </section>
      </>
    );
  }


  /* =======================================================
     CARD PREVIEW
  ======================================================= */

  function previewStart(
    card,
    event = null
  ) {
    clearTimeout(
      previewTimer.current
    );

    const anchor = event?.clientX != null
      ? { x: event.clientX, y: event.clientY }
      : null;

    previewTimer.current =
      setTimeout(
        () => {
          setPreviewAnchor(anchor);
          setPreviewCard(card);
        },
        260
      );
  }


  function previewEnd() {
    clearTimeout(
      previewTimer.current
    );

    setPreviewCard(null);
    setPreviewAnchor(null);
  }


  /* =======================================================
     POINTER CARD DRAG
  ======================================================= */

  function shouldSuppressCardClick(instanceId) {
    const guard = suppressCardClickRef.current;
    return guard.instanceId === instanceId && Date.now() < guard.until;
  }


  function clearCardDropHover() {
    document
      .querySelectorAll(".card-drop-hover")
      .forEach((element) => {
        element.classList.remove("card-drop-hover");
        delete element.dataset.cardDropHint;
      });
  }


  function updateCardDropHover(target) {
    clearCardDropHover();
    if (!target?.element) return;

    if (target.zone === "table" && cardDragRef.current?.cardType !== "magic") {
      return;
    }

    const labels = language === "en"
      ? { field: "FIELD", hand: "HAND", trash: "TRASH", deck: "DECK", burst: "BURST", table: "MAGIC / FLASH" }
      : { field: "CAMPO", hand: "MÃO", trash: "TRASH", deck: "DECK", burst: "BURST", table: "MAGIC / FLASH" };

    target.element.dataset.cardDropHint = labels[target.zone] || "";
    target.element.classList.add("card-drop-hover");
  }


  function finishCardPointerDrop(payload, target, point) {
    if (!payload || payload.playerId !== bottomId || !canControlActor) return;

    /* Attack by dragging a battle-capable field card toward the opponent Life. */
    const lifeTarget = document
      .elementFromPoint(point.x, point.y)
      ?.closest?.(`[data-life-target="${topId}"]`);

    if (
      lifeTarget &&
      payload.zone === "spirits" &&
      match.phase === "attack" &&
      match.activePlayerId === bottomId &&
      !match.battle
    ) {
      dispatch(
        { type: "DECLARE_ATTACK", instanceId: payload.instanceId },
        bottomId
      );
      return;
    }

    /*
     * Magic is intentionally more forgiving on desktop: dropping a Magic
     * anywhere over the battlefield starts its cost flow. During battle we
     * use Flash timing; during Main Step the default action is Main.
     */
    const tableTarget = document
      .elementFromPoint(point.x, point.y)
      ?.closest?.(".table-area");

    if (
      tableTarget &&
      payload.zone === "hand" &&
      payload.cardType === "magic"
    ) {
      const mode = match.battle?.flash?.priorityPlayerId === bottomId
        ? "flash"
        : "main";

      dispatch(
        {
          type: "BEGIN_MANUAL_COST",
          instanceId: payload.instanceId,
          options: { kind: "magic", mode }
        },
        bottomId
      );
      setSelectedId(payload.instanceId);
      return;
    }

    if (!target || target.playerId !== bottomId) return;

    /* Hand -> field keeps using the official manual summon/deploy workflow. */
    if (target.zone === "field" && payload.zone === "hand") {
      if (!["spirit", "ultimate", "brave", "nexus"].includes(payload.cardType)) return;
      dispatch({ type: "BEGIN_MANUAL_PLAY", instanceId: payload.instanceId }, bottomId);
      setSelectedId(payload.instanceId);
      return;
    }

    /* Hand -> Burst remains a rule-driven Set Burst action. */
    if (target.zone === "burst" && payload.zone === "hand") {
      dispatch({ type: "SET_BURST", instanceId: payload.instanceId }, bottomId);
      setSelectedId(payload.instanceId);
      return;
    }

    if (target.zone === "trash") {
      if (payload.zone === "trash") return;
      if (["spirits", "nexuses", "other"].includes(payload.zone)) {
        dispatch(
          { type: "MANUAL", payload: { type: "destroy", instanceId: payload.instanceId } },
          bottomId
        );
      } else {
        dispatch(
          { type: "MANUAL", payload: { type: "moveCard", instanceId: payload.instanceId, destination: "trash" } },
          bottomId
        );
      }
      setSelectedId(null);
      return;
    }

    if (target.zone === "hand") {
      if (payload.zone === "hand") return;
      if (["spirits", "nexuses", "other"].includes(payload.zone)) {
        dispatch(
          { type: "MANUAL", payload: { type: "returnHand", instanceId: payload.instanceId } },
          bottomId
        );
      } else if (payload.zone === "revealed") {
        dispatch(
          { type: "MANUAL", payload: { type: "revealedToHand", playerId: bottomId, instanceId: payload.instanceId } },
          bottomId
        );
      } else {
        dispatch(
          { type: "MANUAL", payload: { type: "moveCard", instanceId: payload.instanceId, destination: "hand" } },
          bottomId
        );
      }
      setSelectedId(payload.instanceId);
      return;
    }

    if (target.zone === "deck") {
      const placement = target.placement === "bottom" ? "bottom" : "top";
      if (payload.zone === "revealed") {
        dispatch(
          {
            type: "MANUAL",
            payload: {
              type: placement === "bottom" ? "revealedToBottom" : "revealedToTop",
              playerId: bottomId,
              instanceId: payload.instanceId
            }
          },
          bottomId
        );
      } else {
        dispatch(
          {
            type: "MANUAL",
            payload: {
              type: "moveCard",
              instanceId: payload.instanceId,
              destination: "deck",
              placement
            }
          },
          bottomId
        );
      }
      setSelectedId(null);
    }
  }


  function startCardPointerDrag(e, payload) {
    if (
      e.button !== 0 ||
      !payload ||
      payload.playerId !== bottomId ||
      !canControlActor ||
      effectDecision ||
      e.target.closest(".core-token")
    ) {
      return;
    }

    previewEnd();

    const rect = e.currentTarget.getBoundingClientRect();
    const drag = {
      ...payload,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      width: Math.max(88, Math.round(rect.width)),
      image: payload.image || "./images/card-back.png"
    };

    cardDragRef.current = drag;

    const move = (event) => {
      const current = cardDragRef.current;
      if (!current) return;

      const moved = current.moved || pointerDistance(
        current.startX,
        current.startY,
        event.clientX,
        event.clientY
      ) >= CARD_DRAG_THRESHOLD;

      const next = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        moved
      };

      cardDragRef.current = next;

      if (!moved) return;

      event.preventDefault();
      setCardDragDocumentState(true);
      setCardDrag(next);

      let hoverTarget = getCardDropTargetAt(event.clientX, event.clientY);
      if (!hoverTarget && next.cardType === "magic") {
        const table = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".table-area");
        if (table) {
          hoverTarget = { element: table, zone: "table", playerId: bottomId };
        }
      }
      updateCardDropHover(hoverTarget);
    };

    const up = (event) => {
      const current = cardDragRef.current;
      cardDragRef.current = null;

      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);

      clearCardDropHover();
      setCardDragDocumentState(false);
      setCardDrag(null);

      if (!current?.moved) return;

      suppressCardClickRef.current = {
        instanceId: current.instanceId,
        until: Date.now() + 250
      };

      const target = getCardDropTargetAt(event.clientX, event.clientY);
      finishCardPointerDrop(current, target, { x: event.clientX, y: event.clientY });
    };

    const cancel = () => {
      cardDragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      clearCardDropHover();
      setCardDragDocumentState(false);
      setCardDrag(null);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
  }


  /* =======================================================
     CORE DRAG
  ======================================================= */

  function startCoreDrag(
    e,
    payload
  ) {
    e.dataTransfer.effectAllowed =
      "move";

    e.dataTransfer.setData(
      "application/x-bs-core",
      JSON.stringify(
        payload
      )
    );

    e.dataTransfer.setData(
      "text/plain",
      "bs-core"
    );
  }


  function coreDrop(
    payload,
    to
  ) {
    if (
      !payload ||
      payload.playerId !==
        bottomId
    ) {
      return;
    }

    if (
      payload.zone ===
        to.zone &&
      payload.instanceId ===
        to.instanceId
    ) {
      return;
    }

    dispatch(
      {
        type:
          "MOVE_CORE",

        move: {
          from: {
            zone:
              payload.zone,

            instanceId:
              payload.instanceId
          },

          to,

          coreType:
            payload.coreType ||
            "regular"
        }
      },
      bottomId
    );
  }


  function smartCoreClick(payload) {
    if (
      !payload ||
      payload.playerId !== bottomId ||
      !canMoveCores
    ) {
      return;
    }

    const activePendingPlay = match.pendingManualPlay?.playerId === bottomId
      ? match.pendingManualPlay
      : null;
    const activePendingCost = match.pendingManualCost?.playerId === bottomId
      ? match.pendingManualCost
      : null;
    const activePending = activePendingPlay || activePendingCost;

    const activePaidCount = activePending
      ? Number(activePending.paidRegular || 0) + (activePending.paidSoul ? 1 : 0)
      : 0;

    const pendingCardContext = activePendingPlay
      ? findPhysicalCard(match, activePendingPlay.instanceId)
      : null;
    const activePendingCoreCount = pendingCardContext
      ? Number(pendingCardContext.card?.cores?.regular || 0) +
        (pendingCardContext.card?.cores?.soul ? 1 : 0)
      : 0;

    const selectedFieldInstanceId =
      selectedCtx?.playerId === bottomId &&
      ["spirits", "nexuses", "other"].includes(selectedCtx?.zone)
        ? selectedCtx.card?.instanceId
        : null;

    const target = getSmartCoreClickTarget({
      source: payload,
      pendingPlay: activePendingPlay,
      pendingCost: activePendingCost,
      paidCount: activePaidCount,
      pendingCoreCount: activePendingCoreCount,
      selectedFieldInstanceId,
      freeMainMove:
        match.phase === "main" &&
        match.activePlayerId === bottomId &&
        !match.battle
    });

    if (!target) {
      if (activePending) {
        setNotice(
          language === "en"
            ? "The required Core payment is already complete. Confirm the action or adjust the Cores manually."
            : "Os requisitos de Cores já foram preenchidos. Confirme a jogada ou ajuste os Cores manualmente."
        );
      }
      return;
    }

    coreDrop(payload, target);
  }


  function cardCoreDrop(
    e,
    playerId,
    instanceId
  ) {
    e.preventDefault();
    e.stopPropagation();

    const payload =
      readDrag(
        e,
        "application/x-bs-core"
      );

    if (payload) {
      coreDrop(
        payload,
        {
          zone: "card",
          instanceId
        }
      );
    }
  }


  /* =======================================================
     ATTACKS

     Card attacks now use the same pointer-driven card drag used by every
     other card movement.  Keeping one interaction model avoids duplicate
     listeners and the old native/legacy drag state.
  ======================================================= */

  /* =======================================================
     COST HELPERS
  ======================================================= */

  function minimumCoresFor(
    card
  ) {
    if (
      !card ||
      card.cardType ===
        "nexus" ||
      card.cardType ===
        "magic"
    ) {
      return 0;
    }

    const levels =
      (
        card.levels ||
        []
      )
        .map(
          (level) =>
            Number(
              level.cores
            )
        )
        .filter(
          Number.isFinite
        );

    return levels.length
      ? Math.min(
          ...levels
        )
      : (
          [
            "spirit",
            "ultimate",
            "brave"
          ].includes(
            card.cardType
          )
            ? 1
            : 0
        );
  }


  function availableCores(
    playerId
  ) {
    return getSpendableCoreSources(
      match,
      playerId,
      cardIndex,
      {
        preserveMinimum:
          false
      }
    ).reduce(
      (
        sum,
        source
      ) =>
        sum +
        Number(
          source.regular ||
          0
        ) +
        (
          source.soul
            ? 1
            : 0
        ),
      0
    );
  }


  function cardUsableNow(
    card,
    playerId
  ) {
    if (
      !card ||
      blockingPending ||
      !canControlActor ||
      playerId !==
        actorId
    ) {
      return false;
    }

    const inMain =
      match.phase ===
        "main" &&
      !match.battle &&
      match.activePlayerId ===
        playerId;


    const inFlash =
      match.battle
        ?.flash
        ?.priorityPlayerId ===
      playerId;


    const hasBurst =
      card.subtypes
        ?.includes(
          "burst"
        ) ||
      card.effects
        ?.some(
          (effect) =>
            effect.type ===
            "burst"
        );


    if (
      hasBurst &&
      inMain
    ) {
      return true;
    }


    if (
      [
        "spirit",
        "ultimate",
        "brave",
        "nexus"
      ].includes(
        card.cardType
      ) &&
      !inMain
    ) {
      return false;
    }


    if (
      card.cardType ===
        "magic" &&
      !(
        inMain ||
        inFlash
      )
    ) {
      return false;
    }


    const payable =
      calculateReduction(
        match,
        playerId,
        card,
        cardIndex
      ).payable;


    const levelNeed =
      [
        "spirit",
        "ultimate",
        "brave"
      ].includes(
        card.cardType
      )
        ? minimumCoresFor(
            card
          )
        : 0;


    return (
      availableCores(
        playerId
      ) >=
      payable +
        levelNeed
    );
  }


  /* Revealed cards use the same pointer-driven drag system as hand/field cards. */


  /* =======================================================
     HAND
  ======================================================= */

  function renderHand(
    playerId
  ) {
    const player =
      match.players[
        playerId
      ];

    const reveal =
      online
        ? playerId ===
          viewerPlayerId
        : playerId ===
          actorId;


    const ownsRow =
      playerId ===
      bottomId;


    const ownDraggable =
      ownsRow &&
      playerId ===
        actorId &&
      canControlActor &&
      !effectDecision &&
      !blockingPending;


    const canManualDeck =
      ownsRow &&
      playerId ===
        actorId &&
      canControlActor &&
      !blockingPending;


    const burstPhysical =
      player.burst ||
      null;


    const canInspectBurst =
      Boolean(
        burstPhysical
      ) &&
      reveal &&
      !burstPhysical.hidden;


    const burstCard =
      canInspectBurst
        ? getDatabaseCard(
            cardIndex,
            burstPhysical
          )
        : null;


    return (
      <div
        className={`hand-row ${
          ownsRow
            ? "local-hand-row"
            : "opponent-hand-row"
        }`}
      >

        <div className="deck-stack-tools">

          <div
            className="stack-card deck-stack-main card-drop-target"
            data-card-drop-zone={ownsRow ? "deck" : undefined}
            data-card-drop-player={ownsRow ? playerId : undefined}
            data-card-drop-placement="top"
          >
            <span>
              DECK
            </span>

            <b>
              {
                player.deck
                  .length
              }
            </b>

            <img
              src="./images/card-back.png"
              alt="Deck"
            />
          </div>


          <button
            className="deck-action-btn deck-reveal-btn"
            disabled={
              !canManualDeck ||
              !player.deck
                .length
            }
            onClick={() =>
              dispatch(
                {
                  type:
                    "MANUAL",

                  payload: {
                    type:
                      "revealTop",

                    playerId
                  }
                },
                playerId
              )
            }
          >
            {language ===
            "en"
              ? "Reveal"
              : "Revelar"}
          </button>


          <button
            className="deck-action-btn deck-top-btn deck-drop-target card-drop-target"
            data-card-drop-zone={ownsRow ? "deck" : undefined}
            data-card-drop-player={ownsRow ? playerId : undefined}
            data-card-drop-placement="top"
            disabled={
              !ownsRow
            }
          >
            {language ===
            "en"
              ? "Top"
              : "Topo"}
          </button>


          <button
            className="deck-action-btn deck-bottom-btn deck-drop-target card-drop-target"
            data-card-drop-zone={ownsRow ? "deck" : undefined}
            data-card-drop-player={ownsRow ? playerId : undefined}
            data-card-drop-placement="bottom"
            disabled={
              !ownsRow
            }
          >
            {language ===
            "en"
              ? "Bottom"
              : "Fundo"}
          </button>

        </div>


        <div
          className={`hand-cards ${
            ownsRow
              ? "local-hand-cards"
              : "opponent-hand-cards"
          }`}
          data-card-drop-zone={ownsRow ? "hand" : undefined}
          data-card-drop-player={ownsRow ? playerId : undefined}
        >
          {player.hand.map(
            (
              physical,
              handIndex
            ) => {
              const hidden =
                !reveal ||
                physical.hidden;


              const card =
                hidden
                  ? null
                  : getDatabaseCard(
                      cardIndex,
                      physical
                    );


              const usable =
                hidden
                  ? true
                  : cardUsableNow(
                      card,
                      playerId
                    );


              const fanPosition =
                handIndex -
                (player.hand.length - 1) / 2;

              const fanRotation =
                Math.max(
                  -14,
                  Math.min(
                    14,
                    fanPosition *
                      2.8 *
                      (ownsRow ? 1 : -1)
                  )
                );

              const fanLift =
                Math.min(
                  ownsRow ? 14 : 7,
                  Math.abs(
                    fanPosition
                  ) *
                    (ownsRow ? 1.35 : 0.65)
                );

              return (
                <div
                  key={
                    physical.instanceId
                  }
                  className="hand-card-slot"
                  style={{
                    "--fan-rotation": `${fanRotation}deg`,
                    "--fan-lift": `${fanLift}px`,
                    "--fan-order": handIndex
                  }}
                >
                  <CardTile
                    compact

                    card={
                      card
                    }

                    physical={
                      physical
                    }

                    hidden={
                      hidden
                    }

                    selected={
                      selectedId ===
                      physical.instanceId
                    }

                    unusable={
                      !hidden &&
                      playerId ===
                        bottomId &&
                      !usable
                    }

                    onPointerDown={
                      !hidden &&
                      ownDraggable &&
                      ["spirit", "ultimate", "brave", "nexus", "magic"].includes(card?.cardType)
                        ? (e) => {
                            e.stopPropagation();
                            startCardPointerDrag(e, {
                              playerId,
                              instanceId: physical.instanceId,
                              zone: "hand",
                              cardType: card?.cardType,
                              image: resolveCardImage(card)
                            });
                          }
                        : undefined
                    }

                    onClick={() => {
                      if (shouldSuppressCardClick(physical.instanceId)) return;
                      if (!effectDecision && !hidden) {
                        setSelectedId(physical.instanceId);
                      }
                    }}

                    onPreviewStart={
                      previewStart
                    }

                    onPreviewEnd={
                      previewEnd
                    }
                  />
                </div>
              );
            }
          )}
        </div>


        <div className="hand-side-zones">

          <button
            type="button"

            className={
              `stack-card burst-stack-card card-drop-target ${
                burstPhysical
                  ? "occupied"
                  : "empty"
              }`
            }

            data-card-drop-zone={ownsRow ? "burst" : undefined}
            data-card-drop-player={ownsRow ? playerId : undefined}

            disabled={
              !burstPhysical && !ownsRow
            }

            onPointerDown={
              ownsRow && canControlActor && burstPhysical && burstCard
                ? (e) => {
                    e.stopPropagation();
                    startCardPointerDrag(e, {
                      playerId,
                      instanceId: burstPhysical.instanceId,
                      zone: "burst",
                      cardType: burstCard.cardType,
                      image: resolveCardImage(burstCard)
                    });
                  }
                : undefined
            }

            onMouseEnter={() => {
              if (
                burstCard
              ) {
                previewStart(
                  burstCard
                );
              }
            }}

            onMouseLeave={() => {
              if (
                burstCard
              ) {
                previewEnd();
              }
            }}

            onClick={() => {
              if (burstPhysical?.instanceId && shouldSuppressCardClick(burstPhysical.instanceId)) return;
              if (
                canInspectBurst &&
                burstPhysical
                  ?.instanceId
              ) {
                setSelectedId(
                  burstPhysical
                    .instanceId
                );
              }
            }}

            title={
              burstPhysical
                ? (
                    canInspectBurst &&
                    burstCard
                      ? getCardName(
                          burstCard
                        )
                      : (
                          language ===
                          "en"
                            ? "Set Burst"
                            : "Burst definido"
                        )
                  )
                : (
                    language ===
                    "en"
                      ? "No Burst set"
                      : "Nenhum Burst definido"
                  )
            }
          >
            <span>
              BURST
            </span>


            {burstPhysical
              ? (
                <>
                  <img
                    className="burst-card-back"
                    src="./images/card-back.png"
                    alt="Burst"
                  />

                  <i
                    className="burst-set-gem"
                    aria-hidden="true"
                  >
                    ◆
                  </i>

                  <b>
                    SET
                  </b>
                </>
              )
              : (
                <>
                  <i
                    className="burst-empty-gem"
                    aria-hidden="true"
                  >
                    ◇
                  </i>

                  <b>
                    —
                  </b>
                </>
              )}
          </button>


          <button
            className="stack-card trash card-drop-target"
            data-card-drop-zone={ownsRow ? "trash" : undefined}
            data-card-drop-player={ownsRow ? playerId : undefined}

            onPointerDown={
              ownsRow && canControlActor && player.trash.length
                ? (e) => {
                    const physical = player.trash.at(-1);
                    const card = getDatabaseCard(cardIndex, physical);
                    if (!physical || !card) return;
                    e.stopPropagation();
                    startCardPointerDrag(e, {
                      playerId,
                      instanceId: physical.instanceId,
                      zone: "trash",
                      cardType: card.cardType,
                      image: resolveCardImage(card)
                    });
                  }
                : undefined
            }

            onMouseEnter={() =>
              setTrashHover(
                playerId
              )
            }

            onMouseLeave={() =>
              setTrashHover(
                null
              )
            }

            onClick={() => {
              const topCard =
                player.trash.at(
                  -1
                );

              if (topCard?.instanceId && shouldSuppressCardClick(topCard.instanceId)) return;

              if (
                topCard?.cardId
              ) {
                setSelectedId(
                  topCard.instanceId
                );
              }
            }}
          >
            <span>
              TRASH
            </span>

            <b>
              {
                player.trash
                  .length
              }
            </b>

            {player.trash.length
              ? (
                <img
                  className="trash-image"

                  src={
                    getDatabaseCard(
                      cardIndex,
                      player.trash.at(
                        -1
                      )
                    )?.image ||
                    resolveCardImage(
                      getDatabaseCard(
                        cardIndex,
                        player.trash.at(
                          -1
                        )
                      )
                    )
                  }

                  alt="Trash"
                />
              )
              : null}
          </button>

        </div>

      </div>
    );
  }


  /* =======================================================
     FIELD
  ======================================================= */

  function renderField(
    playerId
  ) {
    const player =
      match.players[
        playerId
      ];

    const canOwnCoreDrag =
      canMoveCores &&
      playerId ===
        bottomId;


    // Visual-only blocker hints are derived from the Rules Engine so the
    // arena never invents its own legality rules.
    const legalBlockerIds =
      match.battle?.stage === "block" &&
      playerId === match.battle.defenderPlayerId
        ? new Set(
            legalBlockers(match, cardIndex).map(
              (physical) => physical.instanceId
            )
          )
        : null;


    const renderZone = (
      label,
      zone
    ) => (
      <div
        className={
          `field-zone ${zone} ${
            playerId ===
            bottomId
              ? "droppable-field"
              : ""
          }`
        }

        data-card-drop-zone={playerId === bottomId ? "field" : undefined}
        data-card-drop-player={playerId === bottomId ? playerId : undefined}
        data-card-drop-field-zone={zone}

      >
        <div className="zone-title">
          <span>
            {label}
          </span>

          <b>
            {
              player.field[
                zone
              ].filter(
                (
                  card
                ) =>
                  !card.combinedWith
              ).length
            }
          </b>
        </div>


        <div className="field-cards">

          {player.field[
            zone
          ]
            .filter(
              (
                card
              ) =>
                !card.combinedWith
            )
            .map(
              (
                physical
              ) => {
                const card =
                  getDatabaseCard(
                    cardIndex,
                    physical
                  );


                const brave =
                  zone ===
                  "spirits"
                    ? player.field
                        .other
                        .find(
                          (
                            braveCard
                          ) =>
                            braveCard
                              .combinedWith ===
                            physical
                              .instanceId
                        )
                    : null;

                const braveDatabaseCard = brave
                  ? getDatabaseCard(cardIndex, brave)
                  : null;

                const currentLevel = getCurrentLevel(card, physical);
                const currentBP = card?.cardType === "nexus"
                  ? 0
                  : getEffectiveBP(match, cardIndex, physical);


                const isDecisionTarget =
                  effectCandidateIds.has(
                    physical.instanceId
                  );


                const isDecisionSelected =
                  effectDecisionSelection.includes(
                    physical.instanceId
                  );


                return (
                  <div
                    className={
                      [
                        "field-card-wrap",

                        card?.cardType
                          ? `field-card-${card.cardType}`
                          : "",

                        card
                          ? `arena-theme-${getArenaGlowTheme(card)}`
                          : "arena-theme-neutral",

                        match.battle?.attackerInstanceId === physical.instanceId
                          ? "battle-card-attacker"
                          : "",

                        match.battle?.blockerInstanceId === physical.instanceId
                          ? "battle-card-blocker"
                          : "",

                        legalBlockerIds?.has(physical.instanceId)
                          ? "battle-card-can-block"
                          : "",

                        physical.exhausted
                          ? "is-exhausted"
                          : "",

                        brave
                          ? "brave-combined-host"
                          : "",

                        physical.flags
                          ?.pendingManualPlay
                          ? "pending payment-core-target"
                          : "",

                        isDecisionTarget
                          ? "effect-decision-target"
                          : "",

                        isDecisionSelected
                          ? "effect-decision-selected"
                          : "",

                        effectDecision &&
                        !isDecisionTarget
                          ? "effect-decision-unavailable"
                          : "",

                        hasArenaRarityGlow(
                          card
                        )
                          ? "x-rarity-field-glow"
                          : "",

                        hasArenaRarityGlow(
                          card
                        )
                          ? `field-glow-${getArenaGlowTheme(
                              card
                            )}`
                          : ""
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }

                    key={
                      physical.instanceId
                    }

                    data-field-card-instance={
                      physical.instanceId
                    }

                    data-blocker-label={
                      legalBlockerIds?.has(physical.instanceId)
                        ? (language === "en" ? "CAN BLOCK" : "PODE BLOQUEAR")
                        : undefined
                    }
                  >
                    {brave && (
                      <ArenaBraveAttachment
                        image={resolveCardImage(braveDatabaseCard)}
                        name={getCardName(braveDatabaseCard)}
                        exhausted={physical.exhausted}
                        highRarity={hasArenaRarityGlow(braveDatabaseCard)}
                        glowTheme={getArenaGlowTheme(braveDatabaseCard)}
                      />
                    )}

                    <ArenaBattleRole
                      role={
                        match.battle?.attackerInstanceId === physical.instanceId
                          ? "attacker"
                          : match.battle?.blockerInstanceId === physical.instanceId
                            ? "blocker"
                            : null
                      }
                      language={language}
                    />

                    <CardTile
                      card={
                        card
                      }

                      physical={
                        physical
                      }

                      selected={
                        isDecisionSelected ||
                        (
                          !effectDecision &&
                          selectedId ===
                            physical.instanceId
                        )
                      }

                      onPointerDown={
                        playerId === bottomId && canControlActor && !effectDecision
                          ? (e) => {
                              e.stopPropagation();
                              startCardPointerDrag(e, {
                                playerId,
                                instanceId: physical.instanceId,
                                zone,
                                cardType: card?.cardType,
                                image: resolveCardImage(card)
                              });
                            }
                          : undefined
                      }

                      onClick={() => {
                        if (shouldSuppressCardClick(physical.instanceId)) return;
                        if (
                          isDecisionTarget &&
                          canControlEffectDecision
                        ) {
                          toggleEffectDecisionTarget(
                            physical.instanceId
                          );
                          return;
                        }

                        if (
                          effectDecision
                        ) {
                          return;
                        }

                        setSelectedId(
                          physical.instanceId
                        );
                      }}

                      onCoreDrop={
                        playerId ===
                        bottomId
                          ? (
                              e
                            ) =>
                              cardCoreDrop(
                                e,
                                playerId,
                                physical
                                  .instanceId
                              )
                          : undefined
                      }

                      canDragCores={
                        canOwnCoreDrag
                      }

                      onCoreDragStart={(
                        e,
                        payload
                      ) =>
                        startCoreDrag(
                          e,
                          {
                            ...payload,
                            playerId
                          }
                        )
                      }

                      onCoreClick={(payload) =>
                        smartCoreClick({
                          ...payload,
                          playerId
                        })
                      }

                      onPreviewStart={
                        previewStart
                      }

                      onPreviewEnd={
                        previewEnd
                      }

                      footer={null}
                    />

                    <ArenaCardStatus
                      level={currentLevel}
                      bp={currentBP}
                      showBP={card?.cardType !== "nexus"}
                    />
                  </div>
                );
              }
            )}

        </div>
      </div>
    );


    return (
      <div className="battlefield-row">

        {renderZone(
          "BRAVES / OTHER",
          "other"
        )}

        {renderZone(
          "SPIRITS / ULTIMATES",
          "spirits"
        )}

        {renderZone(
          "NEXUS",
          "nexuses"
        )}

      </div>
    );
  }


  /* =======================================================
     CARD ACTION BUTTONS
  ======================================================= */

  function actionButtons() {
    if (
      !selectedCtx ||
      !selectedCard
    ) {
      return (
        <p className="muted">
          {t(
            "selectCardHint"
          )}
        </p>
      );
    }


    const ownerId =
      selectedCtx.playerId;


    const physical =
      selectedCtx.card;


    const buttons = [];


    const ownerCanAct =
      !online ||
      viewerPlayerId ===
        ownerId;


    if (
      selectedCtx.zone ===
        "hand" &&
      ownerId ===
        actorId &&
      canControlActor &&
      !blockingPending
    ) {

      if (
        [
          "spirit",
          "ultimate",
          "brave",
          "nexus"
        ].includes(
          selectedCard.cardType
        ) &&
        match.phase ===
          "main" &&
        !match.battle
      ) {

        buttons.push(
          <button
            key="manualplay"
            className="primary-btn"

            onClick={() =>
              dispatch(
                {
                  type:
                    "BEGIN_MANUAL_PLAY",

                  instanceId:
                    physical.instanceId
                },
                ownerId
              )
            }
          >
            {selectedCard.cardType ===
            "nexus"
              ? t(
                  "deployNexus"
                )
              : t(
                  "summon"
                )}
          </button>
        );


        if (
          selectedCard.cardType ===
          "brave"
        ) {
          const hosts =
            getLegalBraveHosts(
              match,
              ownerId,
              physical.instanceId,
              cardIndex,
              { includeManual: true }
            );


          if (
            hosts.length
          ) {
            buttons.push(
              <div
                key="directcombine"
                className="combine-box"
              >
                <span>
                  Direct Combine:
                </span>

                {hosts.map(
                  (hostEntry) => (
                    <button
                      key={
                        hostEntry.physical
                          .instanceId
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "BEGIN_MANUAL_PLAY",

                            instanceId:
                              physical.instanceId,

                            options: {
                              directCombineHostInstanceId:
                                hostEntry.physical
                                  .instanceId,
                              confirmCondition:
                                hostEntry.manual
                            }
                          },
                          ownerId
                        )
                      }
                    >
                      {getCardName(
                        hostEntry.card
                      )}
                    </button>
                  )
                )}
              </div>
            );
          }
        }
      }


      if (
        selectedCard.cardType ===
        "magic"
      ) {

        if (
          match.phase ===
            "main" &&
          !match.battle
        ) {

          buttons.push(
            <button
              key="magicmain"

              onClick={() =>
                dispatch(
                  {
                    type:
                      "BEGIN_MANUAL_COST",

                    instanceId:
                      physical.instanceId,

                    options: {
                      kind:
                        "magic",

                      mode:
                        "main"
                    }
                  },
                  ownerId
                )
              }
            >
              {t(
                "useMain"
              )}
            </button>
          );


          buttons.push(
            <button
              key="magicflash"

              onClick={() =>
                dispatch(
                  {
                    type:
                      "BEGIN_MANUAL_COST",

                    instanceId:
                      physical.instanceId,

                    options: {
                      kind:
                        "magic",

                      mode:
                        "flash"
                    }
                  },
                  ownerId
                )
              }
            >
              {t(
                "useFlash"
              )}
            </button>
          );
        }


        if (
          match.battle
            ?.flash
            ?.priorityPlayerId ===
          ownerId
        ) {

          buttons.push(
            <button
              key="battleflash"
              className="primary-btn"

              onClick={() =>
                dispatch(
                  {
                    type:
                      "BEGIN_MANUAL_COST",

                    instanceId:
                      physical.instanceId,

                    options: {
                      kind:
                        "magic",

                      mode:
                        "flash"
                    }
                  },
                  ownerId
                )
              }
            >
              {t(
                "useFlash"
              )}
            </button>
          );
        }
      }


      const hasBurst =
        selectedCard.subtypes
          ?.includes(
            "burst"
          ) ||
        selectedCard.effects
          ?.some(
            (
              effect
            ) =>
              effect.type ===
              "burst"
          );


      if (
        hasBurst &&
        match.phase ===
          "main" &&
        !match.battle
      ) {
        buttons.push(
          <button
            key="burst"

            onClick={() =>
              dispatch({
                type:
                  "SET_BURST",

                instanceId:
                  physical.instanceId
              })
            }
          >
            Set Burst
          </button>
        );
      }


      const hasMirage =
        Boolean(
          selectedCard.mirage
        ) ||
        selectedCard.effects
          ?.some(
            (
              effect
            ) =>
              effect.type ===
                "mirage" ||
              effect.timing ===
                "mirage"
          );


      if (
        hasMirage &&
        match.phase ===
          "main" &&
        !match.battle
      ) {
        buttons.push(
          <button
            key="mirage"

            onClick={() =>
              dispatch(
                {
                  type:
                    "BEGIN_MANUAL_COST",

                  instanceId:
                    physical.instanceId,

                  options: {
                    kind:
                      "mirage"
                  }
                },
                ownerId
              )
            }
          >
            Set Mirage
          </button>
        );
      }
    }


    if (
      [
        "spirits",
        "other"
      ].includes(
        selectedCtx.zone
      ) &&
      ownerId ===
        match.activePlayerId &&
      match.phase ===
        "attack" &&
      !match.battle &&
      ownerCanAct &&
      !physical.exhausted &&
      !physical.combinedWith
    ) {
      buttons.push(
        <button
          key="attack"
          className="primary-btn dangerish"

          onClick={() =>
            dispatch(
              {
                type:
                  "DECLARE_ATTACK",

                instanceId:
                  physical.instanceId
              },
              ownerId
            )
          }
        >
          {t(
            "declareAttack"
          )}
        </button>
      );
    }


    if (
      [
        "spirits",
        "other"
      ].includes(
        selectedCtx.zone
      ) &&
      match.battle
        ?.stage ===
        "block" &&
      ownerId ===
        match.battle
          .defenderPlayerId &&
      actorId ===
        ownerId &&
      !physical.exhausted &&
      !physical.combinedWith &&
      canControlActor
    ) {
      buttons.push(
        <button
          key="block"
          className="primary-btn"

          onClick={() =>
            dispatch(
              {
                type:
                  "DECLARE_BLOCK",

                instanceId:
                  physical.instanceId
              },
              ownerId
            )
          }
        >
          {t(
            "block"
          )}
        </button>
      );
    }


    const attachedBrave =
      selectedCtx.zone ===
      "spirits"
        ? match.players[
            ownerId
          ].field.other.find(
            (
              brave
            ) =>
              brave.combinedWith ===
              physical.instanceId
          )
        : null;


    if (
      attachedBrave &&
      ownerId ===
        match.activePlayerId &&
      match.phase ===
        "main" &&
      !match.battle &&
      ownerCanAct &&
      !blockingPending
    ) {

      const combinedStats =
        getCombinedStats(
          match,
          cardIndex,
          physical
        );

      buttons.push(
        <div
          key="brave-status"
          className="brave-link-card"
        >
          <span>
            {language === "en"
              ? "COMBINED BRAVE"
              : "BRAVE COMBINADO"}
          </span>

          <strong>
            {getCardName(
              combinedStats.braveCard
            )}
          </strong>

          <div>
            <small>
              +{combinedStats.bpBonus} BP
            </small>

            <small>
              {(combinedStats.symbols || [])
                .filter(Boolean)
                .join(" / ") || "—"}
            </small>
          </div>
        </div>
      );

      buttons.push(
        <button
          key="separate-attached"
          onClick={() =>
            setBraveSeparationDialog({
              playerId: ownerId,
              braveInstanceId:
                attachedBrave.instanceId
            })
          }
        >
          {language === "en"
            ? "Separate Brave"
            : "Separar Brave"}
        </button>
      );


      const exchangeHosts =
        getLegalBraveHosts(
          match,
          ownerId,
          attachedBrave.instanceId,
          cardIndex,
          { includeManual: true }
        );


      if (
        exchangeHosts.length
      ) {
        buttons.push(
          <div
            key="exchange"
            className="combine-box"
          >
            <span>
              Exchange Brave:
            </span>

            {exchangeHosts.map(
              (hostEntry) => (
                <button
                  key={
                    hostEntry.physical
                      .instanceId
                  }

                  onClick={() =>
                    dispatch(
                      {
                        type:
                          "EXCHANGE_BRAVE",

                        braveInstanceId:
                          attachedBrave.instanceId,

                        hostInstanceId:
                          hostEntry.physical
                            .instanceId,

                        options: {
                          confirmCondition:
                            hostEntry.manual
                        }
                      },
                      ownerId
                    )
                  }
                >
                  {getCardName(
                    hostEntry.card
                  )}
                </button>
              )
            )}
          </div>
        );
      }
    }


    if (
      selectedCard.cardType ===
        "brave" &&
      selectedCtx.zone ===
        "other" &&
      ownerId ===
        match.activePlayerId &&
      match.phase ===
        "main" &&
      !match.battle &&
      ownerCanAct &&
      !blockingPending
    ) {

      if (
        physical.combinedWith
      ) {
        buttons.push(
          <button
            key="separate"
            onClick={() =>
              setBraveSeparationDialog({
                playerId: ownerId,
                braveInstanceId:
                  physical.instanceId
              })
            }
          >
            {language === "en"
              ? "Separate Brave"
              : "Separar Brave"}
          </button>
        );
      } else {

        const hosts =
          getLegalBraveHosts(
            match,
            ownerId,
            physical.instanceId,
            cardIndex,
            { includeManual: true }
          );


        if (
          hosts.length
        ) {
          buttons.push(
            <div
              key="combine"
              className="combine-box"
            >
              <span>
                Combine:
              </span>

              {hosts.map(
                (hostEntry) => (
                  <button
                    key={
                      hostEntry.physical
                        .instanceId
                    }

                    onClick={() =>
                      dispatch(
                        {
                          type:
                            "COMBINE_BRAVE",

                          braveInstanceId:
                            physical.instanceId,

                          hostInstanceId:
                            hostEntry.physical
                              .instanceId,

                          options: {
                            confirmCondition:
                              hostEntry.manual
                          }
                        },
                        ownerId
                      )
                    }
                  >
                    {getCardName(
                      hostEntry.card
                    )}
                  </button>
                )
              )}
            </div>
          );
        }
      }
    }


    return buttons.length
      ? (
        <div className="inspector-actions">
          {buttons}
        </div>
      )
      : (
        <p className="muted">
          —
        </p>
      );
  }


  function renderBraveSeparationOverlay() {
    if (!braveSeparationDialog) {
      return null;
    }

    const preview =
      getBraveSeparationPreview(
        match,
        braveSeparationDialog.playerId,
        braveSeparationDialog.braveInstanceId,
        cardIndex
      );

    if (!preview) {
      return null;
    }

    return (
      <div className="brave-action-overlay">
        <section className="brave-action-modal">
          <span className="eyebrow">
            {language === "en"
              ? "BRAVE / SEPARATION"
              : "BRAVE / SEPARAÇÃO"}
          </span>

          <h2>
            {language === "en"
              ? "Separate Brave?"
              : "Separar o Brave?"}
          </h2>

          <p>
            <b>{preview.braveName}</b>
            {language === "en"
              ? " will return to Spirit State."
              : " voltará ao Spirit State."}
          </p>

          <div className="brave-separation-stats">
            <div>
              <span>LV1</span>
              <strong>{preview.minimum} Core</strong>
            </div>
            <div>
              <span>{language === "en" ? "HOST" : "ALVO"}</span>
              <strong>{preview.hostRegular}</strong>
            </div>
            <div>
              <span>RESERVE</span>
              <strong>{preview.reserve}</strong>
            </div>
          </div>

          <div
            className={
              `brave-separation-result ${
                preview.survives
                  ? "ok"
                  : "danger"
              }`
            }
          >
            {preview.survives
              ? (
                  language === "en"
                    ? "There are enough Cores to maintain the Brave at LV1."
                    : "Há Cores suficientes para manter o Brave no LV1."
                )
              : (
                  language === "en"
                    ? "There are not enough Cores. The Brave will be sent to the Trash."
                    : "Não há Cores suficientes. O Brave será enviado ao Trash."
                )}
          </div>

          <div className="brave-action-buttons">
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setBraveSeparationDialog(null)
              }
            >
              {language === "en"
                ? "Cancel"
                : "Cancelar"}
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                const data = braveSeparationDialog;
                setBraveSeparationDialog(null);
                dispatch(
                  {
                    type: "SEPARATE_BRAVE",
                    braveInstanceId:
                      data.braveInstanceId
                  },
                  data.playerId
                );
              }}
            >
              {language === "en"
                ? "Separate Brave"
                : "Separar Brave"}
            </button>
          </div>
        </section>
      </div>
    );
  }


  function renderUltimateTriggerOverlay() {
    const battle = match.battle;
    const trigger = battle?.ultimateTrigger;

    if (
      !battle ||
      battle.stage !== "ultimateTrigger" ||
      !trigger ||
      effectDecision
    ) {
      return null;
    }

    const sourceCard =
      cardIndex.get(
        trigger.sourceCardId
      );

    const revealedCard =
      trigger.revealedCardId
        ? cardIndex.get(
            trigger.revealedCardId
          )
        : null;

    const isXU =
      trigger.kind === "xu";

    const isCounterWindow =
      trigger.status ===
        "counterWindow";

    const isCountered =
      Boolean(
        trigger.countered
      );

    const resolvingPlayerId =
      isCounterWindow
        ? trigger.counterPlayerId
        : trigger.controllerPlayerId;

    const waiting =
      online &&
      viewerPlayerId !==
        resolvingPlayerId;

    const sourceName =
      sourceCard
        ? getCardName(sourceCard)
        : trigger.sourceCardId;

    const revealedName =
      revealedCard
        ? getCardName(revealedCard)
        : (
            trigger.status === "emptyDeck"
              ? (
                  language === "en"
                    ? "Empty Deck"
                    : "Deck vazio"
                )
              : trigger.revealedCardId || "—"
          );

    const triggerText =
      language === "en"
        ? (
            trigger.effectTextEN ||
            trigger.effectTextPT ||
            ""
          )
        : (
            trigger.effectTextPT ||
            trigger.effectTextEN ||
            ""
          );

    const criticalText =
      language === "en"
        ? (
            trigger.criticalHit
              ?.textEN ||
            trigger.criticalHit
              ?.textPT ||
            ""
          )
        : (
            trigger.criticalHit
              ?.textPT ||
            trigger.criticalHit
              ?.textEN ||
            ""
          );

    const counterCards =
      isCounterWindow &&
      trigger.counterPlayerId
        ? (
            match.players[
              trigger.counterPlayerId
            ]?.hand || []
          )
            .map(
              (physical) => ({
                physical,
                card:
                  cardIndex.get(
                    physical.cardId
                  )
              })
            )
            .filter(
              ({ card }) =>
                card?.cardType ===
                  "magic" &&
                (
                  card.effects || []
                ).some(
                  (effect) => {
                    const type =
                      String(
                        effect?.type ||
                        ""
                      )
                        .replace(
                          /[\s_-]+/g,
                          ""
                        )
                        .toLowerCase();

                    const timing =
                      String(
                        effect?.timing ||
                        ""
                      )
                        .replace(
                          /[\s_-]+/g,
                          ""
                        )
                        .toLowerCase();

                    return (
                      type ===
                        "triggercounter" ||
                      timing ===
                        "triggercounter"
                    );
                  }
                )
            )
        : [];

    const resultLabel =
      isCountered
        ? "COUNTERED"
        : trigger.hit
          ? "HIT"
          : "GUARD";

    return (
      <div className="ultimate-trigger-overlay">
        <section
          className={
            `ultimate-trigger-modal ${
              isXU
                ? "xu"
                : ""
            } ${
              isCountered
                ? "countered"
                : trigger.hit
                  ? "hit"
                  : "guard"
            }`
          }
        >
          <header className="ultimate-trigger-header">
            <div>
              <span className="eyebrow">
                {isXU
                  ? "XU TRIGGER"
                  : "ULTIMATE TRIGGER"}
              </span>

              <h2>
                {resultLabel}
              </h2>
            </div>

            <span className="ultimate-trigger-status">
              {isCounterWindow
                ? (
                    language === "en"
                      ? "TRIGGER COUNTER WINDOW"
                      : "JANELA DE TRIGGER COUNTER"
                  )
                : isCountered
                  ? (
                      language === "en"
                        ? "TRIGGER COUNTERED"
                        : "TRIGGER ANULADO"
                    )
                  : trigger.hit
                    ? (
                        language === "en"
                          ? "TRIGGER HIT"
                          : "TRIGGER ACERTOU"
                      )
                    : (
                        language === "en"
                          ? "TRIGGER GUARDED"
                          : "TRIGGER DEFENDIDO"
                      )}
            </span>
          </header>

          <div className="ultimate-trigger-comparison">
            <article className="ultimate-trigger-card source">
              <span>
                {isXU
                  ? "XU SOURCE"
                  : "ULTIMATE"}
              </span>

              <div className="ultimate-trigger-image">
                {sourceCard?.image ? (
                  <img
                    src={resolveCardImage(sourceCard)}
                    alt={sourceName}
                  />
                ) : (
                  <div>{sourceName}</div>
                )}
              </div>

              <strong>{sourceName}</strong>

              <b>
                COST {trigger.sourceCost}
              </b>
            </article>

            <div className="ultimate-trigger-versus">
              <span>
                {trigger.status === "emptyDeck"
                  ? "—"
                  : trigger.originalHit
                    ? ">"
                    : "≤"}
              </span>

              <small>
                {resultLabel}
              </small>
            </div>

            <article className="ultimate-trigger-card revealed">
              <span>
                {language === "en"
                  ? "REVEALED"
                  : "REVELADA"}
              </span>

              <div className="ultimate-trigger-image">
                {revealedCard?.image ? (
                  <img
                    src={resolveCardImage(revealedCard)}
                    alt={revealedName}
                  />
                ) : (
                  <div>{revealedName}</div>
                )}
              </div>

              <strong>{revealedName}</strong>

              <b>
                {trigger.revealedCost != null
                  ? `COST ${trigger.revealedCost}`
                  : "—"}
              </b>
            </article>
          </div>

          {!isCountered &&
            trigger.criticalHit
              ?.eligible && (
            <div className="ultimate-trigger-critical-hit">
              <span>
                CRITICAL HIT
              </span>

              <strong>
                {language === "en"
                  ? "Critical Hit condition met"
                  : "Condição de Critical Hit cumprida"}
              </strong>

              {criticalText && (
                <p>
                  {criticalText}
                </p>
              )}
            </div>
          )}

          {isCounterWindow && (
            <div className="trigger-counter-window">
              <span className="trigger-counter-kicker">
                TRIGGER COUNTER
              </span>

              <strong>
                {language === "en"
                  ? "Respond before the HIT effect resolves"
                  : "Responda antes da resolução do efeito de HIT"}
              </strong>

              <p>
                {language === "en"
                  ? "You may use a Trigger Counter card now, or pass the response window."
                  : "Você pode usar uma carta com Trigger Counter agora ou passar esta janela de resposta."}
              </p>

              {!waiting && (
                <div className="trigger-counter-options">
                  {counterCards.map(
                    ({
                      physical,
                      card
                    }) => (
                      <button
                        type="button"
                        className="trigger-counter-card"
                        key={
                          physical.instanceId
                        }
                        onClick={() =>
                          dispatch(
                            {
                              type:
                                "USE_TRIGGER_COUNTER",
                              instanceId:
                                physical.instanceId
                            },
                            trigger.counterPlayerId
                          )
                        }
                      >
                        <span className="trigger-counter-card-image">
                          {card?.image ? (
                            <img
                              src={resolveCardImage(card)}
                              alt={getCardName(card)}
                            />
                          ) : (
                            getCardName(card)
                          )}
                        </span>

                        <span>
                          <strong>
                            {getCardName(card)}
                          </strong>

                          <small>
                            COST {card?.cost ?? "-"}
                          </small>
                        </span>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="ghost trigger-counter-pass"
                    onClick={() =>
                      dispatch(
                        {
                          type:
                            "PASS_TRIGGER_COUNTER"
                        },
                        trigger.counterPlayerId
                      )
                    }
                  >
                    {language === "en"
                      ? "Do not use Trigger Counter"
                      : "Não usar Trigger Counter"}
                  </button>
                </div>
              )}
            </div>
          )}

          {triggerText &&
            !isCounterWindow && (
            <div className="ultimate-trigger-effect-text">
              <span>
                {isXU
                  ? "XU HIT EFFECT"
                  : trigger.hit
                    ? (
                        language === "en"
                          ? "HIT EFFECT"
                          : "EFEITO DE HIT"
                      )
                    : (
                        language === "en"
                          ? "RESULT"
                          : "RESULTADO"
                      )}
              </span>

              <p>{triggerText}</p>
            </div>
          )}

          <footer className="ultimate-trigger-footer">
            {waiting ? (
              <span>
                {isCounterWindow
                  ? (
                      language === "en"
                        ? "Waiting for the opponent's Trigger Counter response."
                        : "Aguardando a resposta de Trigger Counter do oponente."
                    )
                  : (
                      language === "en"
                        ? "Waiting for the Trigger controller to continue."
                        : "Aguardando o controlador do Trigger continuar."
                    )}
              </span>
            ) : !isCounterWindow ? (
              <button
                type="button"
                className="primary-btn ultimate-trigger-button"
                onClick={() =>
                  dispatch(
                    {
                      type:
                        "RESOLVE_ULTIMATE_TRIGGER"
                    },
                    trigger.controllerPlayerId
                  )
                }
              >
                {isCountered
                  ? (
                      language === "en"
                        ? "Continue after Trigger Counter"
                        : "Continuar após Trigger Counter"
                    )
                  : trigger.hit
                    ? (
                        language === "en"
                          ? `Resolve ${isXU ? "XU HIT" : "HIT"} and continue`
                          : `Resolver ${isXU ? "XU HIT" : "HIT"} e continuar`
                      )
                    : (
                        language === "en"
                          ? "Continue"
                          : "Continuar"
                      )}
              </button>
            ) : null}
          </footer>
        </section>
      </div>
    );
  }


  function battleCenter() {
    const battle =
      match.battle;


    if (!battle) {
      return (
        <div className="battle-center-compact idle">

          <span className="battle-center-phase">
            {
              match.phase
                .toUpperCase()
            }
          </span>

          <strong>
            {canControlActor
              ? t(
                  "priority"
                )
              : `${t(
                  "waitingPlayer"
                )} ${
                  match.players[
                    actorId
                  ].name
                }`}
          </strong>

        </div>
      );
    }


    const attacker =
      findPhysicalCard(
        match,
        battle.attackerInstanceId
      );


    const blocker =
      battle.blockerInstanceId
        ? findPhysicalCard(
            match,
            battle.blockerInstanceId
          )
        : null;


    const attackerCard =
      attacker
        ? getDatabaseCard(
            cardIndex,
            attacker.card
          )
        : null;


    const blockerCard =
      blocker
        ? getDatabaseCard(
            cardIndex,
            blocker.card
          )
        : null;


    const attackerName =
      attackerCard
        ? getCardName(
            attackerCard
          )
        : "—";


    const blockerName =
      blockerCard
        ? getCardName(
            blockerCard
          )
        : "—";


    const attackerBp =
      attackerCard
        ? getEffectiveBP(
            match,
            cardIndex,
            attacker.card
          )
        : 0;


    const blockerBp =
      blockerCard
        ? getEffectiveBP(
            match,
            cardIndex,
            blocker.card
          )
        : "—";


    const battleStageTitle = (() => {
      if (battle.stage === "block") {
        return language === "en" ? "Block Step" : "Etapa de Bloqueio";
      }
      if (battle.stage === "resolve") {
        return language === "en" ? "Battle Resolve" : "Resolução da Batalha";
      }
      if (battle.flash) {
        return `${language === "en" ? "Flash Timing" : "Flash Timing"} ${battle.flash.number || ""}`.trim();
      }
      return String(battle.stage || "battle").toUpperCase();
    })();


    const battleStageHint = (() => {
      if (battle.flash) {
        const priorityName = match.players[battle.flash.priorityPlayerId]?.name || "—";
        return language === "en"
          ? `${priorityName} may use a Flash effect or pass priority.`
          : `${priorityName} pode usar um efeito Flash ou passar a prioridade.`;
      }
      if (battle.stage === "block") {
        return language === "en"
          ? "Choose one highlighted legal blocker, or continue without blocking."
          : "Escolha um dos bloqueadores válidos destacados ou continue sem bloquear.";
      }
      if (battle.stage === "resolve") {
        return blocker
          ? (language === "en" ? "Compare BP and resolve the battle." : "Compare os BP e resolva a batalha.")
          : (language === "en" ? "Resolve the direct attack on Life." : "Resolva o ataque direto ao Life.");
      }
      return "";
    })();


    return (
      <div className="battle-center-compact active">

        <div className="battle-compact-status">

          <span>
            {t("battle")}
          </span>

          <strong>{battleStageTitle}</strong>

          {battle.flash && (
            <em>
              {language === "en" ? "FLASH PRIORITY" : "PRIORIDADE FLASH"}
            </em>
          )}

          {battleStageHint && (
            <small className="battle-stage-hint">{battleStageHint}</small>
          )}

        </div>


        <div className="battle-compact-matchup">

          <div className="battle-compact-card attacker">
            <small>
              {
                language ===
                "en"
                  ? "ATK"
                  : "ATQ"
              }
            </small>

            <b>
              {
                attackerName
              }
            </b>

            <span>
              {
                attackerBp
              }{" "}
              BP
            </span>
          </div>


          <span className="battle-compact-vs">
            VS
          </span>


          <div className="battle-compact-card defender">

            <small>
              {blocker
                ? (
                    language ===
                    "en"
                      ? "BLOCK"
                      : "BLOQ"
                  )
                : "LIFE"}
            </small>

            <b>
              {blocker
                ? blockerName
                : (
                    language ===
                    "en"
                      ? "Direct Attack"
                      : "Ataque Direto"
                  )}
            </b>

            <span>
              {blocker
                ? `${blockerBp} BP`
                : (
                    language ===
                    "en"
                      ? "Life target"
                      : "Alvo: Life"
                  )}
            </span>

          </div>

        </div>


        <div className="battle-compact-actions">

          {battle.flash && (
            <div className="battle-compact-priority">
              <span>
                {
                  language ===
                  "en"
                    ? "Current priority"
                    : "Prioridade atual"
                }
              </span>

              <b>
                {
                  match.players[
                    battle.flash
                      .priorityPlayerId
                  ].name
                }
              </b>
            </div>
          )}


          {battle.flash && (
            <button
              className="battle-compact-button"

              disabled={
                !canControlActor ||
                Boolean(
                  effectDecision
                )
              }

              onClick={() =>
                dispatch(
                  {
                    type:
                      "PASS_FLASH"
                  },
                  battle.flash
                    .priorityPlayerId
                )
              }
            >
              <span aria-hidden="true">↦</span>
              {t("passFlash")}
            </button>
          )}


          {battle.stage ===
            "block" && (
            <button
              className="battle-compact-button"

              disabled={
                !canControlActor ||
                Boolean(
                  effectDecision
                )
              }

              onClick={() =>
                dispatch(
                  {
                    type:
                      "DECLINE_BLOCK"
                  },
                  battle.defenderPlayerId
                )
              }
            >
              <span aria-hidden="true">×</span>
              {t("noBlock")}
            </button>
          )}


          {battle.stage ===
            "resolve" && (
            <button
              className="primary-btn battle-compact-button"

              disabled={
                !canControlActor ||
                Boolean(
                  effectDecision
                )
              }

              onClick={() =>
                dispatch(
                  {
                    type:
                      "RESOLVE_BATTLE"
                  },
                  actorId
                )
              }
            >
              <span aria-hidden="true">◆</span>
              {t("resolveBattle")}
            </button>
          )}

        </div>

      </div>
    );
  }

  /* =======================================================
     CHAT
  ======================================================= */

  function sendChat(
    e
  ) {
    e?.preventDefault();

    const text =
      chatText.trim();

    if (
      !text ||
      !onlineClient
    ) {
      return;
    }

    onlineClient.sendChat(
      text,
      (
        result
      ) => {
        if (
          !result?.ok
        ) {
          setError(
            result?.error ||
            "Chat error"
          );
        }
      }
    );

    setChatText("");
  }


  /* =======================================================
     PENDING PAYMENT
  ======================================================= */

  const pendingCtx =
    pending
      ? findPhysicalCard(
          match,
          pending.instanceId
        )
      : null;


  const pendingDatabaseCard =
    pendingCtx
      ? getDatabaseCard(
          cardIndex,
          pendingCtx.card
        )
      : null;


  const pendingTheme =
    pendingDatabaseCard
      ? getArenaGlowTheme(
          pendingDatabaseCard
        )
      : "neutral";


  const pendingCoreCount =
    pendingPlay &&
    pendingCtx
      ? Number(
          pendingCtx.card
            .cores
            ?.regular ||
          0
        ) +
        (
          pendingCtx.card
            .cores
            ?.soul
            ? 1
            : 0
        )
      : 0;


  const paidCount =
    pending
      ? Number(
          pending.paidRegular ||
          0
        ) +
        (
          pending.paidSoul
            ? 1
            : 0
        )
      : 0;


  const bottomSoulReserve =
    bottom.soulCore
      ?.zone ===
    "reserve";


  const bottomSoulTrash =
    bottom.soulCore
      ?.zone ===
    "trash";


  const activeBattle =
    match.battle ||
    null;


  // Keep the battle-focus accent tied to the attacking card without
  // maintaining a second, legacy drag state.
  const activeBattleAttacker =
    activeBattle
      ? findPhysicalCard(
          match,
          activeBattle.attackerInstanceId
        )
      : null;

  const activeBattleCard =
    activeBattleAttacker
      ? getDatabaseCard(
          cardIndex,
          activeBattleAttacker.card
        )
      : null;

  const activeBattleTheme =
    activeBattleCard
      ? getArenaGlowTheme(activeBattleCard)
      : "neutral";


  const battleFocusActive =
    Boolean(activeBattle);


  const directBattleTargetId =
    activeBattle &&
    !activeBattle.blockerInstanceId
      ? activeBattle.defenderPlayerId
      : null;


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="simulator-page">

      <header className="sim-topbar">

        <img
          src="./images/logo_battlespirits.png"
          alt="Battle Spirits"
        />


        <div>
          <span>
            Eternal v3.2.1 • Arena 2D
          </span>

          <strong>
            {t(
              "turn"
            )}{" "}
            {
              match.turnNumber
            }
            {" • "}
            {
              match.players[
                match.activePlayerId
              ].name
            }
          </strong>
        </div>


        <PhaseBar
          phase={
            match.phase
          }

          playerColor={
            match.players[
              match.activePlayerId
            ]?.playerColor
          }
        />


        <div className="sim-header-actions">

          <button
            className={`ghost arena-dock-toggle ${
              showInspectorDock
                ? "active"
                : ""
            }`}
            onClick={() =>
              setShowInspectorDock(
                (value) => !value
              )
            }
            title={
              language === "en"
                ? "Card inspector"
                : "Painel da carta"
            }
          >
            {language === "en"
              ? "Card"
              : "Carta"}
          </button>

          {!match.battle && (
            <button
              className="arena-next-phase-btn"
              disabled={
                !canControlActor ||
                blockingPending
              }
              onClick={() =>
                dispatch(
                  {
                    type:
                      "ADVANCE_PHASE"
                  },
                  match.activePlayerId
                )
              }
            >
              <span>
                {language === "en"
                  ? "Next"
                  : "Avançar"}
              </span>
              <b>›</b>
            </button>
          )}

          <button
            className={`ghost arena-dock-toggle ${
              showControlDock
                ? "active"
                : ""
            }`}
            onClick={() =>
              setShowControlDock(
                (value) => !value
              )
            }
            title={
              language === "en"
                ? "Match controls"
                : "Controles da partida"
            }
          >
            {language === "en"
              ? "Turn"
              : "Turno"}
          </button>

          {online && (
            <button
              className="ghost"

              onClick={() =>
                setShowChat(
                  true
                )
              }
            >
              {t(
                "chat"
              )}
            </button>
          )}


          <button
            className="ghost"

            onClick={() =>
              setShowLog(
                true
              )
            }
          >
            {t(
              "log"
            )}
          </button>


          <button
            className="ghost"

            onClick={
              onExit
            }
          >
            {t(
              "exit"
            )}
          </button>

        </div>
      </header>


      {(error ||
        notice) && (
        <div
          className={
            error
              ? "game-message error"
              : "game-message notice"
          }
        >
          {error ||
            notice}
        </div>
      )}


      {renderUltimateTriggerOverlay()}
      {renderEffectDecisionOverlay()}
      {renderBraveSeparationOverlay()}


      <div
        className={`sim-layout ${
          showInspectorDock
            ? "inspector-open"
            : "inspector-closed"
        } ${
          showControlDock
            ? "control-open"
            : "control-closed"
        }`}
      >

        {/* =================================================
            LEFT — SELECTED CARD
        ================================================= */}

        <aside
          className={`inspector panel arena-side-dock card-theme-${getInspectorCardTheme(selectedCard)} ${
            showInspectorDock
              ? "dock-open"
              : "dock-closed"
          }`}
        >

          <div className="inspector-scroll">

            <span className="eyebrow">
              {t(
                "selectedCard"
              )}
            </span>


            {selectedCard
              ? (
                <>

                  <CardTile
                    card={
                      selectedCard
                    }

                    physical={
                      selectedCtx.card
                    }

                    staticPreview
                  />


                  <h2>
                    {getCardName(
                      selectedCard
                    )}
                  </h2>


                  <div className="card-meta">

                    <span>
                      {
                        selectedCard.id
                      }
                    </span>

                    <span>
                      {
                        selectedCard.cardType
                      }
                    </span>

                    <span>
                      {t(
                        "cost"
                      )}{" "}
                      {
                        selectedCard.cost
                      }
                    </span>

                  </div>


                  <EffectText
                    text={
                      effectText(
                        selectedCard,
                        language
                      )
                    }

                    emptyText={
                      t(
                        "noEffect"
                      )
                    }
                  />


                  {actionButtons()}

                </>
              )
              : (
                <p className="muted">
                  {t(
                    "selectCardHint"
                  )}
                </p>
              )}


            <details className="manual-tools compact-manual-tools">

              <summary>
                {t(
                  "manualResolution"
                )}
              </summary>


              <div className="manual-grid">

                <button
                  disabled={
                    !canControlActor ||
                    blockingPending
                  }

                  onClick={() =>
                    dispatch(
                      {
                        type:
                          "MANUAL",

                        payload: {
                          type:
                            "draw",

                          playerId:
                            actorId,

                          count: 1
                        }
                      }
                    )
                  }
                >
                  Draw 1
                </button>


                <button
                  disabled={
                    !canControlActor ||
                    blockingPending
                  }

                  onClick={() =>
                    dispatch(
                      {
                        type:
                          "MANUAL",

                        payload: {
                          type:
                            "topDeckToTrash",

                          playerId:
                            actorId
                        }
                      }
                    )
                  }
                >
                  Top → Trash
                </button>


                <button
                  disabled={
                    !canControlActor ||
                    blockingPending
                  }

                  onClick={() =>
                    dispatch(
                      {
                        type:
                          "MANUAL",

                        payload: {
                          type:
                            "adjustLife",

                          playerId:
                            actorId,

                          delta:
                            -1
                        }
                      }
                    )
                  }
                >
                  −1 Life
                </button>


                <button
                  disabled={
                    !canControlActor ||
                    blockingPending
                  }

                  onClick={() =>
                    dispatch(
                      {
                        type:
                          "MANUAL",

                        payload: {
                          type:
                            "adjustLife",

                          playerId:
                            actorId,

                          delta:
                            1
                        }
                      }
                    )
                  }
                >
                  +1 Life
                </button>


                {selectedId && (
                  <>

                    <button
                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "temporaryBP",

                              instanceId:
                                selectedId,

                              amount:
                                1000
                            }
                          }
                        )
                      }
                    >
                      +1000 BP
                    </button>


                    <button
                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "temporaryBP",

                              instanceId:
                                selectedId,

                              amount:
                                -1000
                            }
                          }
                        )
                      }
                    >
                      −1000 BP
                    </button>


                    <button
                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "refresh",

                              instanceId:
                                selectedId
                            }
                          }
                        )
                      }
                    >
                      Refresh
                    </button>


                    <button
                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "exhaust",

                              instanceId:
                                selectedId
                            }
                          }
                        )
                      }
                    >
                      Exhaust
                    </button>


                    <button
                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "destroy",

                              instanceId:
                                selectedId
                            }
                          }
                        )
                      }
                    >
                      Destroy
                    </button>


                    <button
                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "returnHand",

                              instanceId:
                                selectedId
                            }
                          }
                        )
                      }
                    >
                      → Hand
                    </button>


                    <button
                      className="void-core-btn"

                      disabled={
                        !canControlActor ||
                        blockingPending
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MANUAL",

                            payload: {
                              type:
                                "voidToReserve",

                              playerId:
                                actorId
                            }
                          }
                        )
                      }
                    >
                      Void → Core
                    </button>

                  </>
                )}

              </div>

            </details>

          </div>


        </aside>


        {/* =================================================
            TABLE
        ================================================= */}

        <section
          data-card-drop-zone="table"
          data-card-drop-player={bottomId}
          className={
            `table-area ${
              battleFocusActive
                ? "attack-focus-active"
                : ""
            }`
          }

          style={{
            "--attack-theme":
              activeBattleTheme
          }}
        >

          <div
            className={
              battleFocusActive
                ? (
                    directBattleTargetId ===
                    topId
                      ? "attack-focus-relevant attack-focus-top-hud attack-focus-life-target"
                      : "attack-focus-dim attack-focus-top-hud"
                  )
                : "attack-focus-top-hud"
            }
          >
          <PlayerHud
            player={
              top
            }

            active={
              topId ===
              match.activePlayerId
            }

            actor={
              topId ===
              actorId
            }

            opponent

            dataLifeTarget={
              topId
            }
          />
          </div>


          <div
            className={
              battleFocusActive
                ? "attack-focus-dim"
                : ""
            }
          >
          {renderHand(
            topId
          )}
          </div>


          <div
            className={
              battleFocusActive
                ? "attack-focus-relevant attack-focus-top-field"
                : "attack-focus-top-field"
            }
          >
          {renderField(
            topId
          )}
          </div>


          <div
            className={
              `table-middle ${
                battleFocusActive
                  ? "attack-focus-relevant"
                  : ""
              }`
            }
          >
            {battleCenter()}
          </div>


          <div
            className={
              battleFocusActive
                ? "attack-focus-relevant attack-focus-bottom-field"
                : "attack-focus-bottom-field"
            }
          >
          {renderField(
            bottomId
          )}
          </div>


          <div
            className={
              battleFocusActive
                ? "attack-focus-dim"
                : ""
            }
          >
          {renderHand(
            bottomId
          )}
          </div>


          <div
            className={
              battleFocusActive
                ? (
                    directBattleTargetId ===
                    bottomId
                      ? "attack-focus-relevant attack-focus-life-target"
                      : "attack-focus-dim"
                  )
                : ""
            }
          >
          <PlayerHud
            player={
              bottom
            }

            active={
              bottomId ===
              match.activePlayerId
            }

            actor={
              bottomId ===
              actorId
            }

            dataLifeTarget={
              bottomId
            }
          />
          </div>

        </section>


        {/* =================================================
            RIGHT — MATCH CONTROL
        ================================================= */}

        <aside
          className={`turn-panel panel arena-side-dock ${
            showControlDock
              ? "dock-open"
              : "dock-closed"
          }`}
        >

          <div className="turn-panel-main">

            <span className="eyebrow">
              {t(
                "matchControl"
              )}
            </span>


            <h2>
              {
                match.players[
                  actorId
                ].name
              }
            </h2>


            <p>
              {match.battle
                ? (
                  language ===
                  "en"
                    ? "Resolve the current battle stage."
                    : "Resolva o estágio atual da batalha."
                )
                : `${t(
                    "phase"
                  )}: ${
                    match.phase
                  }.`
              }
            </p>


            {!match.battle && (
              <button
                className="primary-btn big"

                disabled={
                  !canControlActor ||
                  blockingPending
                }

                onClick={() =>
                  dispatch(
                    {
                      type:
                        "ADVANCE_PHASE"
                    },
                    match.activePlayerId
                  )
                }
              >
                {t(
                  "advancePhase"
                )}
              </button>
            )}


            {/* Pending payments are rendered near the card / center of the arena. */}


            {match.turnNumber ===
              1 &&
              match.phase ===
                "start" && (
              <div className="mulligan-box">

                <span>
                  Mulligan
                </span>


                {[
                  bottomId,
                  topId
                ].map(
                  (
                    id
                  ) => (
                    <button
                      key={
                        id
                      }

                      disabled={
                        match.players[
                          id
                        ].mulliganUsed ||
                        (
                          online &&
                          viewerPlayerId !==
                            id
                        )
                      }

                      onClick={() =>
                        dispatch(
                          {
                            type:
                              "MULLIGAN"
                          },
                          id
                        )
                      }
                    >
                      {
                        match.players[
                          id
                        ].name
                      }
                    </button>
                  )
                )}

              </div>
            )}


            {match.players[
              actorId
            ].burst &&
              !match.players[
                actorId
              ].burst.hidden && (
              <button
                disabled={
                  !canControlActor ||
                  blockingPending ||
                  (
                    actorBurstEvent === "burstLifeDecrease" &&
                    match.burstOpportunity?.playerId !== actorId
                  )
                }

                onClick={() =>
                  dispatch(
                    {
                      type:
                        "ACTIVATE_BURST",

                      options: {
                        confirmCondition:
                          match.burstOpportunity?.playerId !== actorId
                      }
                    },
                    actorId
                  )
                }
              >
                {match.burstOpportunity?.playerId === actorId
                  ? (language === "en" ? "Burst — Condition met" : "Burst — Condição cumprida")
                  : actorBurstEvent === "burstLifeDecrease"
                    ? (language === "en" ? "Burst — Waiting for condition" : "Burst — Aguardando condição")
                    : (language === "en" ? "Activate Burst" : "Ativar Burst")}
              </button>
            )}


            {/* =============================================
                NOVA SEQUÊNCIA ETERNAL
            ============================================= */}

            <EternalSequence
              phase={
                match.phase
              }

              playerColor={
                match.players[
                  match.activePlayerId
                ]?.playerColor
              }

              language={
                language
              }
            />

          </div>


        </aside>

      </div>


      {/* =================================================
          PERSISTENT CORE AREAS
          These remain visible even when Card/Turn side docks are collapsed.
      ================================================= */}

      <div className="persistent-core-area persistent-reserve-area">
        <CoreArea
          title={t("reserve")}
          playerId={bottomId}
          zone="reserve"
          regularCount={bottom.reserve}
          soul={bottomSoulReserve}
          canControl={canMoveCores}
          onCoreDrop={coreDrop}
          onCoreClick={smartCoreClick}
          accent="reserve"
        />
      </div>

      <div className="persistent-core-area persistent-trash-area">
        <CoreArea
          title={t("coreTrash")}
          playerId={bottomId}
          zone="trash"
          regularCount={bottom.trashCores}
          soul={bottomSoulTrash}
          canControl={canMoveCores && Boolean(pending)}
          onCoreDrop={coreDrop}
          onCoreClick={smartCoreClick}
          accent="trash"
        />
      </div>


      {match.burstOpportunity && match.players[match.burstOpportunity.playerId]?.burst && (
        <section className="burst-opportunity-panel" aria-live="assertive">
          <div>
            <span>BURST</span>
            <strong>
              {language === "en" ? "Activation condition detected" : "Condição de ativação detectada"}
            </strong>
            <small>
              {match.players[match.burstOpportunity.playerId].name}
              {" • "}
              {getCardName(getDatabaseCard(cardIndex, match.players[match.burstOpportunity.playerId].burst))}
            </small>
          </div>

          <div className="burst-opportunity-actions">
            <button
              className="primary-btn"
              disabled={online && viewerPlayerId !== match.burstOpportunity.playerId}
              onClick={() =>
                dispatch(
                  { type: "ACTIVATE_BURST", options: { confirmCondition: false } },
                  match.burstOpportunity.playerId
                )
              }
            >
              {language === "en" ? "Activate Burst" : "Ativar Burst"}
            </button>

            <button
              className="ghost"
              disabled={online && viewerPlayerId !== match.burstOpportunity.playerId}
              onClick={() =>
                dispatch(
                  { type: "PASS_BURST" },
                  match.burstOpportunity.playerId
                )
              }
            >
              {language === "en" ? "Pass" : "Passar"}
            </button>
          </div>
        </section>
      )}


      {activeBattle && (
        <BattleLinkOverlay
          attackerInstanceId={activeBattle.attackerInstanceId}
          blockerInstanceId={activeBattle.blockerInstanceId || null}
          defenderPlayerId={activeBattle.defenderPlayerId}
          theme={activeBattleTheme}
        />
      )}


      {/* =================================================
          PENDING PLAY — anchored next to the card on the field
      ================================================= */}

      {pendingPlay && pendingPlay.playerId === bottomId && (
        <section
          className={`pending-play-popover pending-side-${pendingPlayAnchor?.side || "right"} payment-theme-${pendingTheme}`}
          style={
            pendingPlayAnchor
              ? { left: pendingPlayAnchor.left, top: pendingPlayAnchor.top }
              : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
          }
        >
          <span className="eyebrow">{t("pendingPlay")}</span>
          <strong>
            {getCardName(getDatabaseCard(cardIndex, pendingCtx?.card))}
          </strong>

          <PaymentStatus
            printedCost={pendingPlay.printedCost ?? pendingPlay.payableCost}
            reduction={pendingPlay.reductionApplied || 0}
            finalCost={pendingPlay.payableCost}
            paid={paidCount}
            minimumCores={pendingPlay.minimumCores}
            currentCores={pendingCoreCount}
            language={language}
            mode="summon"
          />

          <small className="pending-help">
            {language === "en"
              ? "Click Reserve Cores to pay automatically. After the cost is paid, further clicks place Cores on the card. You can also drag Cores manually."
              : "Clique nos Cores da Reserve para pagar automaticamente. Após o custo, os próximos cliques colocam Cores na carta. Você também pode arrastar manualmente."}
          </small>

          <div className="pending-play-actions">
            <button
              className="primary-btn"
              disabled={
                !canControlActor ||
                paidCount !== pendingPlay.payableCost ||
                pendingCoreCount < pendingPlay.minimumCores
              }
              onClick={() =>
                dispatch({ type: "CONFIRM_MANUAL_PLAY" }, bottomId)
              }
            >
              {t("confirmPlay")}
            </button>

            <button
              className="ghost danger"
              disabled={!canControlActor}
              onClick={() =>
                dispatch({ type: "CANCEL_MANUAL_PLAY" }, bottomId)
              }
            >
              {t("cancelPlay")}
            </button>
          </div>
        </section>
      )}


      {/* =================================================
          MAGIC / FLASH PAYMENT — centered, non-blocking panel
          The field stays interactive so Cores can still be moved manually.
      ================================================= */}

      {pendingCost && pendingCost.playerId === bottomId && (
        <div className="pending-magic-layer" aria-live="polite">
          <section className={`pending-magic-modal payment-theme-${pendingTheme}`}>
            <span className="eyebrow">
              {pendingCost.mode === "flash" ? "FLASH" : "MAGIC"}
            </span>
            <strong>
              {getCardName(getDatabaseCard(cardIndex, pendingCtx?.card))}
            </strong>

            <PaymentStatus
              printedCost={pendingCost.printedCost ?? pendingCost.payableCost}
              reduction={pendingCost.reductionApplied || 0}
              finalCost={pendingCost.payableCost}
              paid={paidCount}
              language={language}
              mode="magic"
            />

            <small className="pending-help">
              {language === "en"
                ? "Click Reserve Cores to pay automatically, or drag them to Core Trash. Then confirm or cancel."
                : "Clique nos Cores da Reserve para pagar automaticamente ou arraste-os ao Core Trash. Depois confirme ou cancele."}
            </small>

            <div className="pending-play-actions">
              <button
                className="primary-btn"
                disabled={!canControlActor || paidCount !== pendingCost.payableCost}
                onClick={() =>
                  dispatch({ type: "CONFIRM_MANUAL_COST" }, bottomId)
                }
              >
                {language === "en" ? "Confirm" : "Confirmar"}
              </button>

              <button
                className="ghost danger"
                disabled={!canControlActor}
                onClick={() =>
                  dispatch({ type: "CANCEL_MANUAL_COST" }, bottomId)
                }
              >
                {language === "en" ? "Cancel" : "Cancelar"}
              </button>
            </div>
          </section>
        </div>
      )}


      {/* =================================================
          REVEALED CARDS
      ================================================= */}

      {[
        topId,
        bottomId
      ].some(
        (
          id
        ) =>
          (
            match.players[
              id
            ].revealed ||
            []
          ).length > 0
      ) && (
        <div className="revealed-cards-overlay">

          {[
            topId,
            bottomId
          ].map(
            (
              id
            ) => {
              const list =
                match.players[
                  id
                ].revealed ||
                [];


              if (
                !list.length
              ) {
                return null;
              }


              const own =
                id ===
                bottomId;


              return (
                <section
                  className="revealed-player-row"
                  key={
                    id
                  }
                >

                  <header>
                    <span>
                      {language ===
                      "en"
                        ? "REVEALED"
                        : "REVELADAS"}
                    </span>

                    <b>
                      {
                        match.players[
                          id
                        ].name
                      }
                    </b>
                  </header>


                  <div>
                    {list.map(
                      (
                        physical
                      ) => {
                        const card =
                          getDatabaseCard(
                            cardIndex,
                            physical
                          );


                        return (
                          <CardTile
                            key={
                              physical.instanceId
                            }

                            card={
                              card
                            }

                            physical={
                              physical
                            }

                            onPointerDown={
                              own && canControlActor
                                ? (e) => {
                                    e.stopPropagation();
                                    startCardPointerDrag(e, {
                                      playerId: id,
                                      instanceId: physical.instanceId,
                                      zone: "revealed",
                                      cardType: card?.cardType,
                                      image: resolveCardImage(card)
                                    });
                                  }
                                : undefined
                            }

                            onClick={() => {
                              if (shouldSuppressCardClick(physical.instanceId)) return;
                              setSelectedId(physical.instanceId);
                            }}

                            onPreviewStart={
                              previewStart
                            }

                            onPreviewEnd={
                              previewEnd
                            }
                          />
                        );
                      }
                    )}
                  </div>


                  {own && (
                    <small>
                      {language ===
                      "en"
                        ? "Drag a revealed card to your hand, Top or Bottom."
                        : "Arraste uma carta revelada para sua mão, Topo ou Fundo."}
                    </small>
                  )}

                </section>
              );
            }
          )}

        </div>
      )}


      {/* =================================================
          TRASH PREVIEW
      ================================================= */}

      {trashHover && (
        <div className="trash-hover-preview">

          <header>
            <span>
              TRASH
            </span>

            <b>
              {
                match.players[
                  trashHover
                ].name
              }
              {" • "}
              {
                match.players[
                  trashHover
                ].trash.length
              }
            </b>
          </header>


          <div>
            {match.players[
              trashHover
            ].trash.length
              ? [
                  ...match.players[
                    trashHover
                  ].trash
                ]
                  .reverse()
                  .map(
                    (
                      physical
                    ) => {
                      const card =
                        getDatabaseCard(
                          cardIndex,
                          physical
                        );


                      return (
                        <CardTile
                          key={
                            physical.instanceId
                          }

                          card={
                            card
                          }

                          physical={
                            physical
                          }

                          staticPreview

                          onClick={() =>
                            setSelectedId(
                              physical.instanceId
                            )
                          }

                          onPreviewStart={
                            previewStart
                          }

                          onPreviewEnd={
                            previewEnd
                          }
                        />
                      );
                    }
                  )
              : (
                <p className="muted">
                  {language ===
                  "en"
                    ? "Trash is empty."
                    : "Trash vazio."}
                </p>
              )}
          </div>

        </div>
      )}


      {/* =================================================
          CARD ZOOM
      ================================================= */}

      {previewCard && (
        <div
          className="card-zoom-preview"
          style={previewAnchor
            ? {
                left: Math.max(12, Math.min(
                  window.innerWidth - 278,
                  previewAnchor.x < window.innerWidth / 2
                    ? previewAnchor.x + 24
                    : previewAnchor.x - 284
                )),
                top: Math.max(74, Math.min(window.innerHeight - 430, previewAnchor.y - 84)),
                right: "auto"
              }
            : undefined}
        >

          <img
            src={
              resolveCardImage(
                previewCard
              )
            }

            alt={
              getCardName(
                previewCard
              )
            }
          />

          <div className="card-zoom-copy">
            <span>
              {language === "en"
                ? "CARD PREVIEW"
                : "VISUALIZAÇÃO"}
            </span>

            <strong>
              {getCardName(
                previewCard
              )}
            </strong>

            <small>
              {previewCard.id}
              {previewCard.cardType
                ? ` • ${previewCard.cardType}`
                : ""}
            </small>
          </div>

        </div>
      )}


      {/* =================================================
          WINNER
      ================================================= */}

      {match.winnerId && (() => {
        const winner =
          match.players[
            match.winnerId
          ];

        const defeatedId =
          otherPlayerId(
            match,
            match.winnerId
          );

        const defeated =
          match.players[
            defeatedId
          ];

        const isDefeat =
          Boolean(
            online &&
            viewerPlayerId &&
            match.winnerId !==
              viewerPlayerId
          );

        const reason =
          match.winnerReason ||
          (
            Number(
              defeated?.life ||
              0
            ) <= 0
              ? "life"
              : (
                  defeated?.deck
                    ?.length === 0
                    ? "deck"
                    : "other"
                )
          );

        const reasonTitle =
          language === "en"
            ? (
                reason === "life"
                  ? "Life depleted"
                  : reason === "deck"
                    ? "Deck depleted"
                    : reason === "concede" ||
                      reason === "surrender"
                      ? "Concession"
                      : "Victory condition"
              )
            : (
                reason === "life"
                  ? "Life reduzida a 0"
                  : reason === "deck"
                    ? "Deck esgotado"
                    : reason === "concede" ||
                      reason === "surrender"
                      ? "Desistência"
                      : "Condição de vitória"
              );

        const reasonText =
          language === "en"
            ? (
                reason === "life"
                  ? `${defeated?.name || "The opponent"} has no Life remaining.`
                  : reason === "deck"
                    ? `${defeated?.name || "The opponent"} can no longer continue with an empty Deck.`
                    : reason === "concede" ||
                      reason === "surrender"
                      ? `${defeated?.name || "The opponent"} conceded the match.`
                      : "The match victory condition was reached."
              )
            : (
                reason === "life"
                  ? `${defeated?.name || "O oponente"} ficou sem Life.`
                  : reason === "deck"
                    ? `${defeated?.name || "O oponente"} não pode continuar com o Deck vazio.`
                    : reason === "concede" ||
                      reason === "surrender"
                      ? `${defeated?.name || "O oponente"} desistiu da partida.`
                      : "A condição de vitória da partida foi alcançada."
              );

        const initials = (
          name
        ) =>
          String(
            name ||
            "?"
          )
            .trim()
            .split(
              /\s+/
            )
            .slice(
              0,
              2
            )
            .map(
              (part) =>
                part[0] ||
                ""
            )
            .join(
              ""
            )
            .toUpperCase() ||
          "?";

        return (
          <div
            className={[
              "game-result-overlay",
              isDefeat
                ? "is-defeat"
                : "is-victory"
            ]
              .filter(Boolean)
              .join(" ")}
            role="dialog"
            aria-modal="true"
            aria-label={
              language === "en"
                ? "Match result"
                : "Resultado da partida"
            }
          >
            <section className="game-result-card">
              <div className="game-result-ambient" />

              <header className="game-result-header">
                <span className="game-result-kicker">
                  {language === "en"
                    ? "MATCH COMPLETE"
                    : "PARTIDA ENCERRADA"}
                </span>

                <div className="game-result-badge">
                  <span>
                    {isDefeat
                      ? (
                          language === "en"
                            ? "DEFEAT"
                            : "DERROTA"
                        )
                      : (
                          language === "en"
                            ? "VICTORY"
                            : "VITÓRIA"
                        )}
                  </span>
                </div>

                <h2>
                  {isDefeat
                    ? (
                        language === "en"
                          ? `${winner?.name || "Opponent"} won the match`
                          : `${winner?.name || "Oponente"} venceu a partida`
                      )
                    : (
                        language === "en"
                          ? `${winner?.name || "Player"} is victorious`
                          : `${winner?.name || "Jogador"} venceu!`
                      )}
                </h2>

                <p>
                  {isDefeat
                    ? (
                        language === "en"
                          ? "The duel is over. Review the result and prepare for the next battle."
                          : "O duelo terminou. Confira o resultado e prepare-se para a próxima batalha."
                      )
                    : (
                        language === "en"
                          ? "The final blow was dealt. The duel belongs to the winner."
                          : "O golpe final foi dado. O duelo pertence ao vencedor."
                      )}
                </p>
              </header>

              <div className="game-result-versus">
                <article
                  className="game-result-player winner"
                  style={{
                    "--result-player-color":
                      winner?.playerColor ||
                      "#d8d8d8"
                  }}
                >
                  <span className="game-result-player-label">
                    {language === "en"
                      ? "WINNER"
                      : "VENCEDOR"}
                  </span>

                  <div className="game-result-avatar">
                    {winner?.avatar ? (
                      <img
                        src={winner.avatar}
                        alt=""
                      />
                    ) : (
                      <span>
                        {initials(
                          winner?.name
                        )}
                      </span>
                    )}
                  </div>

                  <strong>
                    {winner?.name ||
                      (
                        language === "en"
                          ? "Player"
                          : "Jogador"
                      )}
                  </strong>

                  <small>
                    {language === "en"
                      ? "Victory"
                      : "Vitória"}
                  </small>
                </article>

                <div className="game-result-vs-mark">
                  VS
                </div>

                <article
                  className="game-result-player defeated"
                  style={{
                    "--result-player-color":
                      defeated?.playerColor ||
                      "#929292"
                  }}
                >
                  <span className="game-result-player-label">
                    {language === "en"
                      ? "DEFEATED"
                      : "DERROTADO"}
                  </span>

                  <div className="game-result-avatar">
                    {defeated?.avatar ? (
                      <img
                        src={defeated.avatar}
                        alt=""
                      />
                    ) : (
                      <span>
                        {initials(
                          defeated?.name
                        )}
                      </span>
                    )}
                  </div>

                  <strong>
                    {defeated?.name ||
                      (
                        language === "en"
                          ? "Player"
                          : "Jogador"
                      )}
                  </strong>

                  <small>
                    {language === "en"
                      ? "Defeat"
                      : "Derrota"}
                  </small>
                </article>
              </div>

              <div className="game-result-summary">
                <div>
                  <span>
                    {language === "en"
                      ? "RESULT"
                      : "RESULTADO"}
                  </span>

                  <strong>
                    {reasonTitle}
                  </strong>

                  <p>
                    {reasonText}
                  </p>
                </div>

                <div className="game-result-turn">
                  <span>
                    {language === "en"
                      ? "FINAL TURN"
                      : "TURNO FINAL"}
                  </span>

                  <strong>
                    {match.turnNumber ||
                      "-"}
                  </strong>
                </div>
              </div>

              <footer className="game-result-actions">
                <button
                  type="button"
                  className="game-result-main-button"
                  onClick={
                    onExit
                  }
                >
                  <span>
                    {t(
                      "mainMenu"
                    )}
                  </span>

                  <b aria-hidden="true">
                    →
                  </b>
                </button>
              </footer>
            </section>
          </div>
        );
      })()}


      {/* =================================================
          LOG
      ================================================= */}

      {showLog && (
        <Modal
          title={
            t(
              "log"
            )
          }

          onClose={() =>
            setShowLog(
              false
            )
          }
        >
          <div className="game-log">

            {[
              ...(
                match.log ||
                []
              )
            ]
              .reverse()
              .map(
                (
                  entry
                ) => (
                  <div
                    key={
                      entry.id
                    }
                  >
                    <span>
                      T
                      {
                        entry.turn
                      }
                      {" • "}
                      {
                        entry.phase
                      }
                    </span>

                    <p>
                      {
                        entry.text
                      }
                    </p>
                  </div>
                )
              )}

          </div>
        </Modal>
      )}


      {/* =================================================
          CHAT
      ================================================= */}

      {showChat && (
        <Modal
          title={
            t(
              "chat"
            )
          }

          onClose={() =>
            setShowChat(
              false
            )
          }
        >
          <div className="chat-panel">

            <div className="chat-messages">

              {roomState
                ?.chat
                ?.length
                ? (
                  roomState.chat.map(
                    (
                      message
                    ) => (
                      <div
                        className={
                          `chat-message ${
                            message.playerId ===
                            viewerPlayerId
                              ? "mine"
                              : ""
                          }`
                        }

                        key={
                          message.id
                        }
                      >
                        <div>
                          <b>
                            {
                              message.name
                            }
                          </b>

                          <small>
                            {new Date(
                              message.createdAt
                            ).toLocaleTimeString(
                              [],
                              {
                                hour:
                                  "2-digit",

                                minute:
                                  "2-digit"
                              }
                            )}
                          </small>
                        </div>

                        <p>
                          {
                            message.text
                          }
                        </p>
                      </div>
                    )
                  )
                )
                : (
                  <p className="muted">
                    {t(
                      "noMessages"
                    )}
                  </p>
                )}

            </div>


            <form
              className="chat-compose"

              onSubmit={
                sendChat
              }
            >
              <input
                maxLength={
                  500
                }

                value={
                  chatText
                }

                onChange={(
                  e
                ) =>
                  setChatText(
                    e.target.value
                  )
                }

                placeholder={
                  t(
                    "chatPlaceholder"
                  )
                }

                autoFocus
              />


              <button
                className="primary-btn"
                type="submit"
              >
                {t(
                  "send"
                )}
              </button>

            </form>

          </div>
        </Modal>
      )}

      {cardDrag?.moved && (
        <div
          className={`card-pointer-drag-preview ${cardDrag.zone === "spirits" ? "from-field" : ""}`}
          style={{
            left: cardDrag.x,
            top: cardDrag.y,
            width: cardDrag.width
          }}
          aria-hidden="true"
        >
          <img src={cardDrag.image} alt="" draggable={false} />
        </div>
      )}

    </main>
  );
}