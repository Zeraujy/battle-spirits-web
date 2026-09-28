import { OnlineErrorCode } from "../domain/onlineErrors.js";

const COPY = Object.freeze({
  ptBR: {
    [OnlineErrorCode.QUEUE_FAILED]: "Não foi possível entrar na fila agora.",
    [OnlineErrorCode.MATCH_NOT_FOUND]: "Não foi possível preparar a partida. Tente novamente.",
    [OnlineErrorCode.MATCH_FULL]: "Esta sala já está cheia.",
    [OnlineErrorCode.INVALID_ACTION]: "Esta ação não está disponível neste momento.",
    [OnlineErrorCode.STALE_STATE]: "A partida foi atualizada. Sincronizando novamente.",
    [OnlineErrorCode.RECONNECT_FAILED]: "Não foi possível retomar a partida dentro do prazo.",
    [OnlineErrorCode.READY_CHECK_EXPIRED]: "A confirmação da partida expirou.",
    [OnlineErrorCode.DECK_INVALID]: "O deck selecionado não é válido para este modo.",
    [OnlineErrorCode.SERVER_UNAVAILABLE]: "O servidor Online está indisponível no momento.",
    [OnlineErrorCode.UNAUTHORIZED]: "Entre na sua conta para continuar.",
    [OnlineErrorCode.INVALID_SESSION]: "A sessão Online não é mais válida.",
    AUTH_REQUIRED: "Entre na sua conta para continuar.",
    FRIEND_REQUIRED: "Esta ação está disponível apenas entre amigos.",
    CHALLENGE_UNAVAILABLE: "Este jogador não está disponível para um desafio agora.",
    CHALLENGE_EXPIRED: "Este desafio expirou.",
    CHALLENGE_CANCELLED: "O desafio foi cancelado.",
    DECK_LOCK_FAILED: "Não foi possível bloquear o deck para esta partida.",
    RANKED_ACCOUNT_ALREADY_QUEUED: "Esta conta já está na fila Ranked.",
    RATE_LIMITED: "Muitas ações Online em pouco tempo. Aguarde um instante e tente novamente.",
    PAYLOAD_TOO_LARGE: "Esta solicitação Online é maior do que o permitido.",
    INVALID_PAYLOAD: "A solicitação Online não pôde ser validada.",
    ACTIVITY_CONFLICT: "Conclua ou cancele a atividade Online atual antes de iniciar outra."
  },
  en: {
    [OnlineErrorCode.QUEUE_FAILED]: "Could not join the queue right now.",
    [OnlineErrorCode.MATCH_NOT_FOUND]: "Could not prepare the match. Try again.",
    [OnlineErrorCode.MATCH_FULL]: "This room is already full.",
    [OnlineErrorCode.INVALID_ACTION]: "This action is not available right now.",
    [OnlineErrorCode.STALE_STATE]: "The match was updated. Synchronizing again.",
    [OnlineErrorCode.RECONNECT_FAILED]: "Could not resume the match within the allowed time.",
    [OnlineErrorCode.READY_CHECK_EXPIRED]: "The match confirmation expired.",
    [OnlineErrorCode.DECK_INVALID]: "The selected deck is not valid for this mode.",
    [OnlineErrorCode.SERVER_UNAVAILABLE]: "The Online server is unavailable right now.",
    [OnlineErrorCode.UNAUTHORIZED]: "Sign in to continue.",
    [OnlineErrorCode.INVALID_SESSION]: "The Online session is no longer valid.",
    AUTH_REQUIRED: "Sign in to continue.",
    FRIEND_REQUIRED: "This action is available only between friends.",
    CHALLENGE_UNAVAILABLE: "This player is not available for a challenge right now.",
    CHALLENGE_EXPIRED: "This challenge expired.",
    CHALLENGE_CANCELLED: "The challenge was cancelled.",
    DECK_LOCK_FAILED: "Could not lock the deck for this match.",
    RANKED_ACCOUNT_ALREADY_QUEUED: "This account is already in the Ranked queue.",
    RATE_LIMITED: "Too many Online actions in a short time. Wait a moment and try again.",
    PAYLOAD_TOO_LARGE: "This Online request is larger than allowed.",
    INVALID_PAYLOAD: "The Online request could not be validated.",
    ACTIVITY_CONFLICT: "Finish or cancel the current Online activity before starting another."
  }
});

const UNSAFE_ERROR_PATTERN = /supabase|socket|service[_ -]?role|localhost|127\.0\.0\.1|\.sql\b|\brpc\b|\brls\b|node_modules|package\.json|vite|npm|stack|exception|database/i;

export function onlineErrorMessage(input, {
  language = "ptBR",
  fallback = null
} = {}) {
  const locale = language === "en" ? "en" : "ptBR";
  const code = String(input?.code || "").trim();
  if (code && COPY[locale][code]) return COPY[locale][code];

  const raw = String(input?.error || input?.message || (typeof input === "string" ? input : "")).trim();
  if (raw && raw.length <= 180 && !UNSAFE_ERROR_PATTERN.test(raw)) return raw;

  return fallback || (locale === "en"
    ? "Could not complete this Online action."
    : "Não foi possível concluir esta ação no Online.");
}

export function onlineConnectionErrorMessage(language = "ptBR") {
  return language === "en"
    ? "Could not connect to the Online server right now."
    : "Não foi possível conectar ao servidor Online agora.";
}
