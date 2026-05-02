# Observability Review

Review changed code and assess whether new functionality is sufficiently observable.

## Instructions

### 1. Identify changed code

Run `git diff main --name-only` to list modified files, then read the diff with `git diff main` to understand what changed.

If $ARGUMENTS specifies a scope (file, feature, or area), restrict the review to that.

### 2. Review each changed area

For every new or modified function, hook, or class ask:

- **Happy path logged?** Is the successful outcome of the key operation logged at `info` level?
- **Error path logged?** Are `catch` blocks, rejected promises, and guard clauses logged at `warn` or `error` with enough context to reproduce the failure?
- **State transitions logged?** For stateful logic (session start/end, mode changes, MIDI connect/disconnect, playback events), are entry and exit points logged?
- **Context is actionable?** Does the log include the values needed to reproduce the issue (note pitch, exercise ID, file path, MIDI device name, etc.)? A message alone is not enough.

### 3. Report

For each gap found, output one block:

```
FILE — function or area
  Missing: what is not logged
  Add: logRendererEvent('level', 'feature.event', 'message', { relevant context })
       — or —
       writeDiagnostic('level', 'source', 'feature.event', 'message', { relevant context })
```

Use `logRendererEvent` (from `src/renderer/src/lib/diagnostics.ts`) for renderer code.
Use `writeDiagnostic` (defined in `electron/main.ts`) for main-process code.

Follow the existing event naming convention: `domain.noun.verb` (e.g. `midi.device.connected`, `practice.scale.completed`, `play.scheduler.stalled`).

If a changed area is already well instrumented, say so in one line and move on.

End with a single summary line: "N gaps found across M files."
Do not suggest dashboards, metrics pipelines, or any new logging infrastructure.
