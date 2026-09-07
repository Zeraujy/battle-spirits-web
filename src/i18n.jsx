import { createContext, useContext, useMemo, useState } from "react";
import { getSettings, saveSettings } from "./services/storage.js";

const translations = {
  ptBR: {
    back: "← Voltar", local: "Partida local", online: "Jogar online", decks: "Decks", profile: "Perfil", account: "Conta", settings: "Configurações",
    gateOpen: "Gate Open, Kaihou!", fanSimulator: "SIMULADOR NÃO OFICIAL", cardsLoaded: "cartas", savedDecks: "decks", rulesTarget: "regras",
    deckLibrary: "Meus Decks", newDeck: "Novo Deck", editDeck: "Editar deck", createDeck: "Criar deck", deleteDeck: "Excluir deck", deckCover: "Carta de capa",
    save: "Salvar", name: "Nome", playerName: "Nome do jogador", avatar: "Foto de perfil", saveProfile: "Salvar perfil", removePhoto: "Remover foto", profileSaved: "Perfil salvo.",
    local1v1: "LOCAL 1V1", prepareBattle: "Preparar batalha", player1: "Jogador 1", player2: "Jogador 2", deck: "Deck", firstPlayer: "Primeiro jogador", random: "Aleatório", startMatch: "Iniciar partida",
    online1v1: "ONLINE 1V1", roomByCode: "Sala por código", server: "Servidor", connected: "conectado", disconnected: "desconectado", createRoom: "Criar sala", join: "Entrar", roomCode: "CÓDIGO DA SALA", waiting: "Aguardando...",
    selectedCard: "CARTA SELECIONADA", selectCardHint: "Clique em uma carta visível para inspecioná-la.", matchControl: "CONTROLE DA PARTIDA", advancePhase: "Avançar fase", log: "Log", chat: "Chat", exit: "Sair",
    reserve: "RESERVE", coreTrash: "CORE TRASH", dragCores: "Arraste os Cores", pendingPlay: "JOGADA PENDENTE", confirmPlay: "Confirmar jogada", cancelPlay: "Cancelar jogada",
    cost: "Custo", paid: "Pago", minLevel: "Cores mínimos", current: "Atual", manualPaymentHint: "Mova Cores para o Core Trash e coloque os Cores de Lv na carta antes de confirmar.",
    settingsTitle: "Configurações do simulador", language: "Idioma", resolution: "Resolução", displayMode: "Modo de exibição", fullscreen: "Tela cheia", windowed: "Janela", apply: "Aplicar",
    portuguese: "Português (Brasil)", english: "English", effect: "Efeito", abilities: "Habilidades", families: "Famílias", noEffect: "Sem texto de efeito no database.",
    deckBuilder: "DECK BUILDER", eternalFormat: "Formato Eternal", currentList: "Lista atual", myDecks: "Meus decks", cards: "cartas", validDeck: "Deck válido", allTypes: "Todos os tipos", allColors: "Todas as cores", searchCards: "Buscar nome, número ou família...",
    noDecks: "Você ainda não tem decks", noDecksOnline: "Crie um deck válido antes de entrar no online.",
    manualResolution: "Resolução manual", battleSequence: "Sequência Eternal", battleSequenceText: "Start → Core → Draw → Refresh → Main → Attack → End",
    turn: "Turno", priority: "Sua prioridade", waitingPlayer: "Aguardando", phase: "Fase atual", battle: "BATALHA", passFlash: "Passar Flash", noBlock: "Não bloquear", resolveBattle: "Resolver batalha",
    summon: "Invocar", deployNexus: "Colocar Nexus", useMain: "Usar Main", useFlash: "Usar Flash", declareAttack: "Declarar ataque", block: "Bloquear com esta carta",
    chatPlaceholder: "Digite uma mensagem...", send: "Enviar", noMessages: "Nenhuma mensagem ainda.",
    settingsSaved: "Configurações aplicadas.", updates: "Atualizações", updateServer: "Servidor de atualizações", updateServerHint: "Opcional. Pode ser configurado depois quando você hospedar o latest.json.", updateDescription: "Verifique novas versões sem substituir arquivos manualmente.", checkUpdates: "Verificar atualizações", playerDataStored: "Seus decks, perfil e configurações ficam preservados em:", mainMenu: "Menu principal", opponent: "Oponente", player: "Jogador", currentTurn: "turno atual", matchEnd: "Fim da partida", wins: "venceu!", noCardsFound: "Nenhuma carta"
  },
  en: {
    back: "← Back", local: "Local match", online: "Play online", decks: "Decks", profile: "Profile", account: "Account", settings: "Settings",
    gateOpen: "Gate Open, Kaihou!", fanSimulator: "UNOFFICIAL FAN SIMULATOR", cardsLoaded: "cards", savedDecks: "decks", rulesTarget: "rules",
    deckLibrary: "My Decks", newDeck: "New Deck", editDeck: "Edit deck", createDeck: "Create deck", deleteDeck: "Delete deck", deckCover: "Cover card",
    save: "Save", name: "Name", playerName: "Player name", avatar: "Profile picture", saveProfile: "Save profile", removePhoto: "Remove picture", profileSaved: "Profile saved.",
    local1v1: "LOCAL 1V1", prepareBattle: "Prepare battle", player1: "Player 1", player2: "Player 2", deck: "Deck", firstPlayer: "First player", random: "Random", startMatch: "Start match",
    online1v1: "ONLINE 1V1", roomByCode: "Room by code", server: "Server", connected: "connected", disconnected: "disconnected", createRoom: "Create room", join: "Join", roomCode: "ROOM CODE", waiting: "Waiting...",
    selectedCard: "SELECTED CARD", selectCardHint: "Click a visible card to inspect it.", matchControl: "MATCH CONTROL", advancePhase: "Advance phase", log: "Log", chat: "Chat", exit: "Exit",
    reserve: "RESERVE", coreTrash: "CORE TRASH", dragCores: "Drag Cores", pendingPlay: "PENDING PLAY", confirmPlay: "Confirm play", cancelPlay: "Cancel play",
    cost: "Cost", paid: "Paid", minLevel: "Minimum Cores", current: "Current", manualPaymentHint: "Move Cores to the Core Trash and place the required Lv Cores on the card before confirming.",
    settingsTitle: "Simulator settings", language: "Language", resolution: "Resolution", displayMode: "Display mode", fullscreen: "Fullscreen", windowed: "Windowed", apply: "Apply",
    portuguese: "Português (Brasil)", english: "English", effect: "Effect", abilities: "Abilities", families: "Families", noEffect: "No effect text in the database.",
    deckBuilder: "DECK BUILDER", eternalFormat: "Eternal Format", currentList: "Current list", myDecks: "My decks", cards: "cards", validDeck: "Valid deck", allTypes: "All types", allColors: "All colors", searchCards: "Search name, number or family...",
    noDecks: "You do not have any decks yet", noDecksOnline: "Create a valid deck before playing online.",
    manualResolution: "Manual resolution", battleSequence: "Eternal sequence", battleSequenceText: "Start → Core → Draw → Refresh → Main → Attack → End",
    turn: "Turn", priority: "Your priority", waitingPlayer: "Waiting for", phase: "Current phase", battle: "BATTLE", passFlash: "Pass Flash", noBlock: "Do not block", resolveBattle: "Resolve battle",
    summon: "Summon", deployNexus: "Deploy Nexus", useMain: "Use Main", useFlash: "Use Flash", declareAttack: "Declare attack", block: "Block with this card",
    chatPlaceholder: "Type a message...", send: "Send", noMessages: "No messages yet.",
    settingsSaved: "Settings applied.", updates: "Updates", updateServer: "Update server", updateServerHint: "Optional. You can configure it later when latest.json is hosted.", updateDescription: "Check for new versions without replacing files manually.", checkUpdates: "Check for updates", playerDataStored: "Your decks, profile and settings are preserved in:", mainMenu: "Main menu", opponent: "Opponent", player: "Player", currentTurn: "current turn", matchEnd: "Match over", wins: "wins!", noCardsFound: "No cards found"
  }
};

const LanguageContext = createContext({ language: "ptBR", t: (key) => key, setLanguage: () => {} });

export function LanguageProvider({ children }) {
  const initial = getSettings().language || "ptBR";
  const [language, setLanguageState] = useState(initial);
  const value = useMemo(() => ({
    language,
    t: (key) => translations[language]?.[key] ?? translations.ptBR[key] ?? key,
    setLanguage(next) {
      const safe = next === "en" ? "en" : "ptBR";
      saveSettings({ ...getSettings(), language: safe });
      setLanguageState(safe);
    }
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
