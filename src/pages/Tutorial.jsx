import { useEffect, useMemo, useState } from "react";
import EternalCinematicBackdrop from "../components/layout/EternalCinematicBackdrop.jsx";
import { useLanguage } from "../i18n.jsx";
import { ETERNAL_TUTORIAL_RULES, tutorialRuleSummary } from "../game/tutorialRules.js";
import {
  dismissTutorialWelcome,
  getTutorialProgress,
  markTutorialLessonComplete,
  markTutorialPracticeComplete,
  resetTutorialProgress
} from "../services/tutorialProgress.js";
import "../styles/pages/tutorialV395.css";

const LESSONS = [
  {
    id: "start",
    number: "01",
    title: { pt: "O objetivo", en: "The goal" },
    time: "1 MIN",
    lead: {
      pt: "Battle Spirits é uma batalha de recursos. Proteja seu Life e abra caminho para atacar.",
      en: "Battle Spirits is a battle of resources. Protect your Life and create openings to attack."
    },
    points: {
      pt: [
        "Você começa com 5 de Life.",
        "Um ataque não bloqueado reduz o Life de acordo com os símbolos do atacante.",
        "Você vence ao reduzir o Life adversário a 0. Também é possível vencer quando o oponente não consegue mais comprar por falta de cartas no Deck."
      ],
      en: [
        "You start with 5 Life.",
        "An unblocked attack reduces Life according to the attacker's symbols.",
        "You win by reducing the opponent's Life to 0. You can also win when the opponent can no longer draw because their Deck is empty."
      ]
    },
    key: { pt: "Life é defesa; Cores são seus recursos.", en: "Life is defense; Cores are your resources." }
  },
  {
    id: "setup",
    number: "02",
    title: { pt: "Prepare a mesa", en: "Set up the field" },
    time: "1 MIN",
    lead: {
      pt: "Antes do primeiro turno, cada jogador prepara Life, Reserve, Deck e mão inicial.",
      en: "Before the first turn, each player prepares Life, Reserve, Deck and opening Hand."
    },
    points: {
      pt: [
        "5 Cores formam seu Life.",
        "3 Cores normais + 1 Soul Core começam no Reserve.",
        "Compre 4 cartas para a mão inicial.",
        "Depois de definir quem começa, cada jogador pode fazer 1 mulligan completo, na ordem do primeiro para o segundo jogador."
      ],
      en: [
        "5 Cores form your Life.",
        "3 regular Cores + 1 Soul Core begin in Reserve.",
        "Draw 4 cards for your opening Hand.",
        "After choosing who goes first, each player may take 1 full mulligan, in first-player then second-player order."
      ]
    },
    key: { pt: "A mão inicial tem 4 cartas.", en: "Your opening Hand has 4 cards." }
  },
  {
    id: "turn",
    number: "03",
    title: { pt: "Seu turno", en: "Your turn" },
    time: "2 MIN",
    lead: {
      pt: "No Eternal, o turno segue sempre a mesma sequência de 7 Steps.",
      en: "In Eternal, every turn follows the same 7-Step sequence."
    },
    points: {
      pt: [
        "Start → Core → Draw → Refresh → Main → Attack → End.",
        "Core Step: mova 1 Core do Void para o Reserve.",
        "Draw Step: compre 1 carta.",
        "Refresh Step: recupere suas cartas exauridas e devolva os Cores do Core Trash ao Reserve.",
        "No primeiro turno de quem começa, Core Step e Attack Step são pulados."
      ],
      en: [
        "Start → Core → Draw → Refresh → Main → Attack → End.",
        "Core Step: move 1 Core from the Void to Reserve.",
        "Draw Step: draw 1 card.",
        "Refresh Step: refresh your exhausted cards and return Cores from Core Trash to Reserve.",
        "On the first player's first turn, Core Step and Attack Step are skipped."
      ]
    },
    key: { pt: "Eternal não possui Second Main Step.", en: "Eternal has no Second Main Step." }
  },
  {
    id: "main",
    number: "04",
    title: { pt: "Jogue suas cartas", en: "Play your cards" },
    time: "2 MIN",
    lead: {
      pt: "A Main Step é onde você constrói seu campo e organiza seus Cores.",
      en: "Main Step is where you build your Field and organize your Cores."
    },
    points: {
      pt: [
        "Pague o custo de uma carta usando Cores disponíveis.",
        "Símbolos das suas cartas em campo podem reduzir o custo quando a carta permitir aquela redução.",
        "Ao invocar um Spirit, coloque Cores suficientes nele para atingir pelo menos Lv1.",
        "Você pode mover Cores entre o Reserve e suas cartas durante a Main Step, respeitando os níveis mínimos.",
        "Nexus é colocado no campo e pode ajudar com efeitos e redução de custo. Magic normalmente é usado e vai para o Trash."
      ],
      en: [
        "Pay a card's cost using available Cores.",
        "Symbols on your Field can reduce cost when the card allows that reduction.",
        "When summoning a Spirit, place enough Cores on it to reach at least Lv1.",
        "During Main Step, you may move Cores between Reserve and your cards while respecting minimum Levels.",
        "Nexus cards stay on the Field and can provide effects and cost reduction. Magic is normally used and then sent to Trash."
      ]
    },
    key: { pt: "Sem Cores suficientes para Lv1, o Spirit não permanece em campo.", en: "Without enough Cores for Lv1, a Spirit cannot remain on the Field." }
  },
  {
    id: "battle",
    number: "05",
    title: { pt: "Ataque e bloqueio", en: "Attack and block" },
    time: "2 MIN",
    lead: {
      pt: "Ataques acontecem um por vez. Cada ataque é uma batalha completa.",
      en: "Attacks happen one at a time. Each attack is a complete battle."
    },
    points: {
      pt: [
        "Escolha 1 Spirit ou Ultimate em estado Refresh e exaura-o para atacar.",
        "Spirits e Ultimates podem atacar no mesmo turno em que foram invocados.",
        "O defensor pode bloquear com 1 Spirit ou Ultimate em estado Refresh.",
        "Sem bloqueio: o Life perde Cores de acordo com os símbolos do atacante.",
        "Com bloqueio: compare BP. O menor é destruído; em empate, ambos são destruídos."
      ],
      en: [
        "Choose 1 refreshed Spirit or Ultimate and exhaust it to attack.",
        "Spirits and Ultimates can attack on the same turn they were summoned.",
        "The defender may block with 1 refreshed Spirit or Ultimate.",
        "No block: Life loses Cores according to the attacker's symbols.",
        "With a block: compare BP. The lower BP is destroyed; on a tie, both are destroyed."
      ]
    },
    key: { pt: "Atacar e bloquear exaurem a carta.", en: "Attacking and blocking exhaust the card." }
  },
  {
    id: "advanced",
    number: "06",
    title: { pt: "Flash, Burst e Brave", en: "Flash, Burst and Brave" },
    time: "2 MIN",
    lead: {
      pt: "Essas mecânicas dão profundidade ao jogo. Você não precisa decorar tudo no primeiro duelo.",
      en: "These mechanics add depth. You do not need to memorize everything before your first duel."
    },
    points: {
      pt: [
        "Flash: durante uma batalha existem até 2 Flash Timings. O defensor recebe a primeira oportunidade de usar um efeito Flash.",
        "O segundo Flash Timing só acontece quando um bloqueio foi declarado.",
        "Burst: fica setado virado para baixo e pode ser ativado quando sua condição específica é cumprida.",
        "Brave: pode existir como Spirit ou combinar com um alvo que cumpra sua condição de Brave. Na Main Step, Brave e separação não exigem novo pagamento de custo."
      ],
      en: [
        "Flash: a battle has up to 2 Flash Timings. The defender gets the first opportunity to use a Flash effect.",
        "The second Flash Timing only happens if a block was declared.",
        "Burst: is set face down and may activate when its specific condition is fulfilled.",
        "Brave: can exist as a Spirit or combine with a legal Brave target. During Main Step, combining and separating do not require paying a new cost."
      ]
    },
    key: { pt: "Aprenda o básico primeiro; os efeitos das cartas vêm com a prática.", en: "Learn the basics first; card effects come with practice." }
  }
];

const PHASE_LABELS = {
  start: ["Start", "Start"], core: ["Core", "Core"], draw: ["Draw", "Draw"],
  refresh: ["Refresh", "Refresh"], main: ["Main", "Main"], attack: ["Attack", "Attack"], end: ["End", "End"]
};

function LessonIcon({ id }) {
  const glyph = id === "start" ? "◎" : id === "setup" ? "◆" : id === "turn" ? "↻" : id === "main" ? "CORE" : id === "battle" ? "⚔" : "✦";
  return <span className={`tutorial-glyph tutorial-glyph-${id}`}>{glyph}</span>;
}

function QuickPractice({ pt, onComplete }) {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState("block");
  const stages = pt ? [
    { title: "Seu turno chegou", text: "Observe a sequência Eternal. Em um turno normal, você passa por Core, Draw e Refresh antes da Main Step.", action: "Ir para a Main Step" },
    { title: "Main Step", text: "Você tem um Spirit pronto em campo. Para este treino, imagine que o custo e os Cores já foram pagos corretamente.", action: "Ir para Attack Step" },
    { title: "Declare o ataque", text: "Escolha o Spirit em Refresh. Ao atacar, ele fica Exaurido.", action: "Atacar" },
    { title: "Flash Timing 1", text: "Antes do bloqueio, o defensor tem a primeira oportunidade de usar Flash. Neste treino, os dois passam.", action: "Passar Flash" },
    { title: "Bloquear ou receber o ataque?", text: "O defensor decide: bloquear com um Spirit em Refresh ou deixar o ataque atingir o Life.", action: null },
    { title: "Flash Timing 2", text: "Como houve bloqueio, existe um segundo Flash Timing. Os dois passam novamente.", action: "Resolver batalha" },
    { title: "Compare o BP", text: "Atacante 4000 BP × Bloqueador 3000 BP. O bloqueador é destruído. Como o bloqueio foi declarado, o Life não é reduzido.", action: "Concluir treino" },
    { title: "Ataque direto", text: "Sem bloqueio, o símbolo do atacante reduz 1 Life. O Core removido do Life vai para o Reserve.", action: "Concluir treino" }
  ] : [
    { title: "Your turn begins", text: "Follow the Eternal sequence. On a normal turn, Core, Draw and Refresh come before Main Step.", action: "Go to Main Step" },
    { title: "Main Step", text: "You have a ready Spirit on the Field. For this practice, assume its cost and Cores were already paid correctly.", action: "Go to Attack Step" },
    { title: "Declare an attack", text: "Choose the refreshed Spirit. When it attacks, it becomes Exhausted.", action: "Attack" },
    { title: "Flash Timing 1", text: "Before blocking, the defender has the first chance to use Flash. In this practice, both players pass.", action: "Pass Flash" },
    { title: "Block or take the hit?", text: "The defender chooses: block with a refreshed Spirit or let the attack hit Life.", action: null },
    { title: "Flash Timing 2", text: "Because a block was declared, there is a second Flash Timing. Both players pass again.", action: "Resolve battle" },
    { title: "Compare BP", text: "Attacker 4000 BP × Blocker 3000 BP. The blocker is destroyed. Because a block was declared, Life is not reduced.", action: "Finish practice" },
    { title: "Direct attack", text: "With no block, the attacker's symbol reduces 1 Life. The removed Life Core goes to Reserve.", action: "Finish practice" }
  ];

  const actualStep = step === 5 && path === "life" ? 7 : step;
  const current = stages[actualStep] || stages[0];
  const attacked = step >= 3;
  const blocked = path === "block" && step >= 5;
  const defenderDestroyed = path === "block" && step >= 6;
  const lifeHit = path === "life" && step >= 5;

  function advance() {
    if (actualStep === 6 || actualStep === 7) {
      onComplete?.();
      return;
    }
    setStep((value) => value + 1);
  }

  return (
    <section className="tutorial-practice">
      <div className="tutorial-practice-board">
        <div className="tutorial-practice-opponent">
          <span>{pt ? "OPONENTE" : "OPPONENT"}</span>
          <div className="tutorial-life-row" aria-label="Life">
            {[0,1,2,3,4].map((n) => <i key={n} className={lifeHit && n === 4 ? "is-lost" : ""} />)}
          </div>
          {!defenderDestroyed && <div className={`tutorial-demo-card enemy ${blocked ? "exhausted" : ""}`}><b>3000</b><small>BP</small></div>}
          {defenderDestroyed && <div className="tutorial-destroyed">{pt ? "TRASH" : "TRASH"}</div>}
        </div>

        <div className={`tutorial-battle-line ${attacked ? "active" : ""} ${blocked ? "blocked" : ""}`}>
          <span>{blocked ? (pt ? "BLOQUEIO" : "BLOCK") : attacked ? (pt ? "ATAQUE" : "ATTACK") : ""}</span>
        </div>

        <div className="tutorial-practice-player">
          <div className={`tutorial-demo-card player ${attacked ? "exhausted" : ""}`}><b>4000</b><small>BP · ◆</small></div>
          <span>{pt ? "VOCÊ" : "YOU"}</span>
        </div>
      </div>

      <div className="tutorial-practice-copy">
        <span className="eyebrow">{pt ? "TREINO GUIADO" : "GUIDED PRACTICE"}</span>
        <strong>{current.title}</strong>
        <p>{current.text}</p>
        {actualStep === 4 ? (
          <div className="tutorial-choice-row">
            <button type="button" className="primary" onClick={() => { setPath("block"); setStep(5); }}>{pt ? "Bloquear" : "Block"}</button>
            <button type="button" className="ghost" onClick={() => { setPath("life"); setStep(5); }}>{pt ? "Não bloquear" : "Do not block"}</button>
          </div>
        ) : (
          <button type="button" className="primary" onClick={advance}>{current.action}</button>
        )}
        <button type="button" className="tutorial-practice-reset" onClick={() => { setStep(0); setPath("block"); }}>{pt ? "Recomeçar treino" : "Restart practice"}</button>
      </div>
    </section>
  );
}

export default function Tutorial({ onBack, onPlayCpu, onDeckBuilder }) {
  const { language } = useLanguage();
  const pt = language !== "en";
  const [progress, setProgress] = useState(() => getTutorialProgress());
  const [lessonId, setLessonId] = useState("start");
  const [view, setView] = useState("lessons");
  const lesson = useMemo(() => LESSONS.find((item) => item.id === lessonId) || LESSONS[0], [lessonId]);
  const locale = pt ? "pt" : "en";
  const summary = tutorialRuleSummary(language);
  const completedCount = LESSONS.filter((item) => progress.completed.includes(item.id)).length;
  const percent = Math.round(((completedCount + (progress.practiceCompleted ? 1 : 0)) / (LESSONS.length + 1)) * 100);

  useEffect(() => {
    dismissTutorialWelcome();
  }, []);

  function completeLesson() {
    const next = markTutorialLessonComplete(lesson.id);
    setProgress(next);
    const index = LESSONS.findIndex((item) => item.id === lesson.id);
    if (index < LESSONS.length - 1) setLessonId(LESSONS[index + 1].id);
    else setView("practice");
  }

  function finishPractice() {
    setProgress(markTutorialPracticeComplete());
    setView("finish");
  }

  function restart() {
    resetTutorialProgress();
    setProgress(getTutorialProgress());
    setLessonId("start");
    setView("lessons");
  }

  return (
    <main className="tutorial-page">
      <EternalCinematicBackdrop />
      <header className="tutorial-topbar">
        <button type="button" className="ghost" onClick={onBack}>← {pt ? "Voltar" : "Back"}</button>
        <div>
          <span className="eyebrow">BATTLE SPIRITS · ETERNAL</span>
          <h1>{pt ? "APRENDA A JOGAR" : "LEARN TO PLAY"}</h1>
        </div>
        <div className="tutorial-progress-pill"><b>{percent}%</b><span>{pt ? "concluído" : "complete"}</span></div>
      </header>

      <section className="tutorial-hero">
        <div>
          <span className="eyebrow">{pt ? "TUTORIAL RÁPIDO" : "QUICK TUTORIAL"}</span>
          <h2>{pt ? "Entenda o básico. Depois, jogue." : "Learn the basics. Then play."}</h2>
          <p>{pt ? "Sem paredes de texto. Em poucos minutos você aprende a mesa, o turno, Cores, batalha e as mecânicas que vai encontrar no seu primeiro duelo." : "No walls of text. In a few minutes you'll learn the field, turn flow, Cores, battle and the mechanics you'll see in your first duel."}</p>
        </div>
        <div className="tutorial-hero-facts">
          <div><b>5</b><span>Life</span></div>
          <div><b>4</b><span>{pt ? "cartas iniciais" : "opening cards"}</span></div>
          <div><b>7</b><span>Steps</span></div>
          <div><b>1</b><span>{pt ? "objetivo" : "goal"}</span></div>
        </div>
      </section>

      <div className="tutorial-tabs">
        <button type="button" className={view === "lessons" ? "active" : ""} onClick={() => setView("lessons")}>{pt ? "Fundamentos" : "Basics"}</button>
        <button type="button" className={view === "practice" ? "active" : ""} onClick={() => setView("practice")}>{pt ? "Treino guiado" : "Guided practice"}</button>
        <button type="button" className={view === "reference" ? "active" : ""} onClick={() => setView("reference")}>{pt ? "Consulta rápida" : "Quick reference"}</button>
      </div>

      {view === "lessons" && (
        <section className="tutorial-layout">
          <aside className="tutorial-lessons-list">
            {LESSONS.map((item) => {
              const done = progress.completed.includes(item.id);
              return (
                <button type="button" key={item.id} className={lesson.id === item.id ? "active" : ""} onClick={() => setLessonId(item.id)}>
                  <span>{item.number}</span>
                  <div><b>{item.title[locale]}</b><small>{done ? (pt ? "Concluído" : "Complete") : item.time}</small></div>
                  <i>{done ? "✓" : "›"}</i>
                </button>
              );
            })}
          </aside>

          <article className="tutorial-lesson-card">
            <header>
              <LessonIcon id={lesson.id} />
              <div><span className="eyebrow">{pt ? `LIÇÃO ${lesson.number}` : `LESSON ${lesson.number}`}</span><h2>{lesson.title[locale]}</h2><p>{lesson.lead[locale]}</p></div>
            </header>
            {lesson.id === "turn" && (
              <div className="tutorial-phase-strip">
                {ETERNAL_TUTORIAL_RULES.phases.map((phase, index) => <span key={phase}><b>{String(index + 1).padStart(2, "0")}</b>{PHASE_LABELS[phase][pt ? 0 : 1]}</span>)}
              </div>
            )}
            {lesson.id === "setup" && (
              <div className="tutorial-setup-visual">
                <div><b>5</b><span>Life</span></div><div><b>3 + 1</b><span>Core + Soul Core</span></div><div><b>4</b><span>{pt ? "Mão" : "Hand"}</span></div>
              </div>
            )}
            <ul className="tutorial-points">{lesson.points[locale].map((point) => <li key={point}>{point}</li>)}</ul>
            <div className="tutorial-rule-key"><span>{pt ? "LEMBRE" : "REMEMBER"}</span><b>{lesson.key[locale]}</b></div>
            <footer>
              <button type="button" className="primary" onClick={completeLesson}>{progress.completed.includes(lesson.id) ? (pt ? "Próxima lição" : "Next lesson") : (pt ? "Entendi" : "Got it")}</button>
            </footer>
          </article>
        </section>
      )}

      {view === "practice" && <QuickPractice pt={pt} onComplete={finishPractice} />}

      {view === "reference" && (
        <section className="tutorial-reference">
          <div className="tutorial-reference-card"><span>01</span><h3>{pt ? "Começo da partida" : "Game setup"}</h3><p>{summary.setup}</p></div>
          <div className="tutorial-reference-card"><span>02</span><h3>{pt ? "Objetivo" : "Goal"}</h3><p>{summary.goal}</p></div>
          <div className="tutorial-reference-card"><span>03</span><h3>{pt ? "Primeiro turno" : "First turn"}</h3><p>{summary.firstTurn}</p></div>
          <div className="tutorial-reference-card"><span>04</span><h3>Flash Timing</h3><p>{pt ? "Até 2 por batalha. O defensor tem a primeira oportunidade. O segundo só existe se houve bloqueio." : "Up to 2 per battle. The defender gets the first opportunity. The second only exists if a block was declared."}</p></div>
          <div className="tutorial-reference-card"><span>05</span><h3>Refresh / Exhaust</h3><p>{pt ? "Refresh = carta pronta. Exhaust = carta exaurida. Normalmente, apenas cartas em Refresh podem atacar ou bloquear." : "Refresh = ready card. Exhaust = exhausted card. Normally, only refreshed cards can attack or block."}</p></div>
          <div className="tutorial-reference-card"><span>06</span><h3>Brave</h3><p>{pt ? "Na Main Step, um Brave pode combinar com um alvo que cumpra sua condição. O conjunto é tratado como uma unidade combinada." : "During Main Step, a Brave can combine with a target that meets its condition. The pair is treated as one combined unit."}</p></div>
          <a className="tutorial-official-link" href="https://www.battlespirits.com/rule/official-rule-manual-eternal/" target="_blank" rel="noreferrer">{pt ? "Consultar Manual Oficial Eternal ↗" : "Open Official Eternal Rule Manual ↗"}</a>
        </section>
      )}

      {view === "finish" && (
        <section className="tutorial-finish">
          <span className="tutorial-finish-mark">✓</span>
          <span className="eyebrow">{pt ? "PRONTO PARA O PRIMEIRO DUELO" : "READY FOR YOUR FIRST DUEL"}</span>
          <h2>{pt ? "Você já sabe o necessário para começar." : "You know enough to start playing."}</h2>
          <p>{pt ? "Não tente decorar todas as cartas agora. Jogue, leia os efeitos com calma e volte ao tutorial quando precisar." : "Do not try to memorize every card now. Play, read effects at your own pace, and come back whenever you need a refresher."}</p>
          <div className="tutorial-finish-actions">
            <button type="button" className="primary" onClick={onPlayCpu}>{pt ? "Jogar contra Eternal CPU" : "Play Eternal CPU"}</button>
            <button type="button" className="ghost" onClick={onDeckBuilder}>Deck Builder</button>
            <button type="button" className="ghost" onClick={onBack}>{pt ? "Voltar ao menu" : "Back to menu"}</button>
          </div>
          <button type="button" className="tutorial-restart" onClick={restart}>{pt ? "Refazer tutorial" : "Restart tutorial"}</button>
        </section>
      )}

      <footer className="tutorial-source-note">{pt ? "Regras de referência: Manual Oficial Battle Spirits Eternal Ver.17.1." : "Rules reference: Battle Spirits Official Eternal Rule Manual Ver.17.1."}</footer>
    </main>
  );
}
