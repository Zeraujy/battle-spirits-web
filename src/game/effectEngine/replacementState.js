export function preventReplacementEvent(match, metadata = {}) {
  if (!match.replacementWindow) return match;
  return {
    ...match,
    replacementWindow: {
      ...match.replacementWindow,
      prevented: true,
      preventionSourceEffectId: metadata.sourceEffectId || null,
      preventionSourceInstanceId: metadata.sourceInstanceId || null
    }
  };
}

export function replaceCurrentEvent(match, replacement = {}, metadata = {}) {
  if (!match.replacementWindow) return match;
  return {
    ...match,
    replacementWindow: {
      ...match.replacementWindow,
      replacement: {
        ...replacement,
        sourceEffectId: metadata.sourceEffectId || null,
        sourceInstanceId: metadata.sourceInstanceId || null
      }
    }
  };
}
