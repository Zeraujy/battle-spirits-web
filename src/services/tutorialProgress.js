const KEY = "bs-eternal:tutorial:v1";
const EMPTY = Object.freeze({
  dismissedWelcome: false,
  completed: [],
  practiceCompleted: false
});

function safeRead() {
  if (typeof window === "undefined" || !window.localStorage) return { ...EMPTY, completed: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, completed: [] };
    const parsed = JSON.parse(raw);
    return {
      dismissedWelcome: Boolean(parsed?.dismissedWelcome),
      completed: Array.isArray(parsed?.completed) ? [...new Set(parsed.completed.map(String))] : [],
      practiceCompleted: Boolean(parsed?.practiceCompleted)
    };
  } catch {
    return { ...EMPTY, completed: [] };
  }
}

function safeWrite(next) {
  if (typeof window === "undefined" || !window.localStorage) return next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function getTutorialProgress() {
  return safeRead();
}

export function dismissTutorialWelcome() {
  return safeWrite({ ...safeRead(), dismissedWelcome: true });
}

export function markTutorialLessonComplete(id) {
  const current = safeRead();
  return safeWrite({
    ...current,
    dismissedWelcome: true,
    completed: [...new Set([...current.completed, String(id)])]
  });
}

export function markTutorialPracticeComplete() {
  return safeWrite({ ...safeRead(), dismissedWelcome: true, practiceCompleted: true });
}

export function resetTutorialProgress() {
  return safeWrite({ ...EMPTY, completed: [] });
}
