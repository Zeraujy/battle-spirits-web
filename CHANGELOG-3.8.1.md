# Battle Spirits Eternal Simulator v3.8.1

## Battle Experience Update

### Arena feedback
- Step transitions now receive a short cinematic cue without interrupting input.
- Flash Timing, block windows and active battles have contextual center-screen feedback.
- The attacker/target link has clearer animated flow during block and Flash windows.
- Selected field cards receive a consistent visual state.

### Resources & event readability
- Life, Reserve and Core Trash pulse when their values change.
- Recent match events briefly surface inside the arena.
- Action Log entries are visually categorized and the UI focuses on the most recent events.

### Architecture
- Visual-only update: no Battle Spirits rules were changed.
- No new Social, Mastery or Statistics data was added to Socket.IO match payloads.
- Reduced-motion preferences are respected.
