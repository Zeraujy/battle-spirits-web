# Project History

This document keeps only the major architectural milestones still useful for maintenance.

## v4.9.x

The Arena was rebuilt around clearer presentation boundaries, responsive behavior and a monochrome visual identity while preserving semantic Core colors.

## v5.0.0

Online play moved to a server-authoritative model. Matchmaking, synchronization, ranked flows, reconnect behavior and competitive security were expanded around the rule that the client requests and the server decides.

## v5.1.0

The automated card-effect system and content migration cycle were completed, followed by release QA. The current cleanup cycle preserves v5.1.0 gameplay behavior while reorganizing source, services, data, scripts and documentation.

Detailed historical batch and phase reports were intentionally removed after their validation responsibilities were transferred to executable audits and regression tests.

## Arena Redesign Phase 12 — Right Utility Panel

The parallel Arena gained its dedicated right utility panel with Turn Status, Phase Tracker, contextual global action slots, Recent Action, Game Log and Arena Chat. All actionable controls continue to emit controller-owned requests instead of dispatching Rules Engine actions directly.

## Arena Redesign Phase 13 — Burst, Flash and Effect Resolution UX

The parallel Arena gained a dedicated Effect Resolution layer for Burst windows, Flash priority, target prompts and structured effect choices. Pending decisions are sanitized before presentation, and every actionable control remains controller-owned rather than dispatching gameplay logic from React.

## Arena Redesign Phase 14 — Responsive and Touch Adaptation

The parallel Arena gained explicit Desktop Wide, Desktop, Laptop, Tablet Landscape and Mobile Landscape presentation profiles. Compact layouts preserve secondary zones, the utility region no longer overlays the central play surface at phone-landscape size, and touch/pen Hand drag now emits the existing controller-owned drop intent without moving legality or resolution into React.
