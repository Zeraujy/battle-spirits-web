export const OnlineErrorCode = Object.freeze({
  QUEUE_FAILED: "QUEUE_FAILED",
  MATCH_NOT_FOUND: "MATCH_NOT_FOUND",
  MATCH_FULL: "MATCH_FULL",
  INVALID_ACTION: "INVALID_ACTION",
  STALE_STATE: "STALE_STATE",
  RECONNECT_FAILED: "RECONNECT_FAILED",
  READY_CHECK_EXPIRED: "READY_CHECK_EXPIRED",
  DECK_INVALID: "DECK_INVALID",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_SESSION: "INVALID_SESSION"
});

export class OnlineError extends Error {
  constructor(code, message, details = null) {
    super(message || code);
    this.name = "OnlineError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details == null ? {} : { details: this.details })
    };
  }
}
