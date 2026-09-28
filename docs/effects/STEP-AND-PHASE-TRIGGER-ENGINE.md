# Phase 12 — Step & Phase Trigger Engine

All turn phase entries are now converted into canonical effect events through `phaseTriggerEngine.js`.

| Phase | Canonical event |
|---|---|
| start | `startStep` |
| core | `coreStep` |
| draw | `drawStep` |
| refresh | `refreshStep` |
| main | `mainStep` |
| attack | `attackStep` |
| end | `endStep` |

Phase entry happens after the built-in step action for the current simulator flow (Core gain, Draw, Refresh), and then the Trigger Dispatcher resolves matching field effects.

Effect Schema v2 should use `scope: "controllerField"` with `eventPlayer: "self"`, `"opponent"`, or `"any"`.

For migration compatibility, legacy timings such as `yourAttackStep`, `opponentAttackStep`, and `eitherAttackStep` are treated as ambient battlefield triggers. This compatibility path is limited to step/phase and Life-decrease events; legacy source effects do not become global observers generally.
