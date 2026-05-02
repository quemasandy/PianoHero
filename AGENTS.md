# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Electron app with Vite hot-reload (renderer at localhost:5173)
npm run build    # Compile TypeScript and bundle with Vite (output: out/)
npm run package  # Build + electron-builder → .dmg / .nsis / .AppImage in release/
```

No test runner or linter is configured in this project.

## Architecture

PianoHero is an **Electron + React + TypeScript** desktop app for piano practice and MIDI playback.

### Process Boundary

- `electron/main.ts` — Main process: BrowserWindow, MIDI hardware via `@julusian/midi`, IPC handlers, diagnostics log. Runs as CommonJS (required by native modules).
- `electron/preload.ts` — Context bridge exposing `window.electronAPI` to renderer. Sandbox is disabled (`sandbox: false`) so that native MIDI bindings work.
- `src/renderer/src/` — React renderer process. Communicates with main exclusively via `window.electronAPI` (IPC invoke/on).

### Screen Routing

`App.tsx` owns all routing state — no router library is used. Two top-level routes (`practice` | `song`) and several sub-views (`practice_home`, `scale_session`, `chord_session`, `song_session`) are all plain state variables passed as props.

### MIDI Playback Pipeline

```
MidiParser.parseMidiFile()          (@tonejs/midi → ParsedSong)
    └─► Scheduler (RAF loop)
            ├─► emits noteOn / noteOff / waitForNotes / timeUpdate / ended
            ├─► AudioPlayer (Tone.js PolySynth)  ← audio synthesis
            ├─► Waterfall.tsx (Canvas, RAF)       ← falling notes visuals
            └─► Piano.tsx (SVG, 88 keys A0–C8)   ← key highlights
```

`Scheduler.ts` drives everything with a single RAF loop. In **learning mode**, playback pauses (`this.waiting = true`) until the user presses the expected notes on hardware MIDI. Listeners subscribe via `scheduler.on(callback)` which returns an unsubscribe function.

### Practice Engine

`lib/practiceEngine.ts` + `lib/practiceCatalog.ts` handle scale and chord sessions:

- **Scales**: each `noteOn` is validated against `expectedNotes[0]`. Correct → auto-advance. Incorrect → added to `wrongNotes`.
- **Chords**: `chordDetection.detectChord(pitches)` normalizes pitches to pitch classes (0–11), tries each note as root, looks up a `CHORD_DICTIONARY` by interval key. Simultaneity tolerance is hardcoded at `CHORD_SIMULTANEITY_MS = 250`.

### State Patterns

- **RAF loops + stale closure**: components like `Waterfall.tsx` use `const stateRef = useRef(playerState); stateRef.current = playerState` so the RAF callback always reads current state without being recreated.
- **Immutable session state**: `PracticeSessionState` updates always use object spread and `new Set(...)` copies — never mutate in place.
- **IPC for MIDI hardware**: `@julusian/midi` events fire in main, get serialized via `serializeDetails()` (handles `Error` objects and nested structures), and are broadcast to the renderer as `'midi:note'` IPC events. `useMidiDevice.ts` subscribes in the renderer.

### Key Types

All shared TypeScript interfaces live in `src/renderer/src/types/index.ts`: `ParsedSong`, `ParsedNote`, `PlayerState`, `PracticeSessionState`, `ScaleExercise`, `ChordExercise`, etc.

### Build Configuration

Three Vite targets in `electron.vite.config.ts`:

- **main** → `electron/main.ts`, externalizes Node/native deps
- **preload** → `electron/preload.ts`, externalizes deps
- **renderer** → `src/renderer/index.html`, full React + Vite HMR

Two `tsconfig` files for the renderer (`tsconfig.web.json`) and main/preload (`tsconfig.node.json`), unified by the root `tsconfig.json` via project references.

## Clean Architecture

This project follows Clean Architecture. Dependencies always point inward: Presentation → Use Cases → Domain. Never the reverse.

**Layers:**

- **Domain** (`types/index.ts`, `lib/practiceEngine.ts`, `lib/chordDetection.ts`, `lib/practiceCatalog.ts`) — pure business logic and entities. Must not import anything from React, Electron, or Tone.js.
- **Use Cases** — orchestrate domain logic. No UI or infrastructure concerns.
- **Infrastructure** (`AudioPlayer.ts`, `Scheduler.ts`, `electron/main.ts`, `useMidiDevice.ts`) — implement interfaces defined by inner layers. Adapts Tone.js, MIDI hardware, IPC.
- **Presentation** (`screens/`, `components/`) — React UI. Consumes use cases only; never calls domain logic directly.

**Migration rule:** The existing codebase is being migrated incrementally. Every time a file is touched, evaluate whether business logic can be extracted to the domain layer or side effects moved to infrastructure — even if it's not the primary goal of the task.

### Diagnostics

`DiagnosticsPanel.tsx` renders a floating overlay with the last 200 log entries. `main.ts` writes to `pianohero-diagnostics.log` (in `app.getPath('logs')` or `/tmp`) and calls `broadcastDiagnostics()` to push updates to the renderer in real time via `'diag:updated'` IPC.
