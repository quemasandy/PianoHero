# AGENTS.md

## Clean Architecture

This project follows Clean Architecture. Dependencies always point inward: Presentation → Use Cases → Domain. Never the reverse.

**Layers:**

- **Domain** (`types/index.ts`, `lib/practiceEngine.ts`, `lib/chordDetection.ts`, `lib/practiceCatalog.ts`) — pure business logic and entities. Must not import anything from React, Electron, or Tone.js.
- **Use Cases** — orchestrate domain logic. No UI or infrastructure concerns.
- **Infrastructure** (`AudioPlayer.ts`, `Scheduler.ts`, `electron/main.ts`, `useMidiDevice.ts`) — implement interfaces defined by inner layers. Adapts Tone.js, MIDI hardware, IPC.
- **Presentation** (`screens/`, `components/`) — React UI. Consumes use cases only; never calls domain logic directly.

**Migration rule:** The existing codebase is being migrated incrementally. Every time a file is touched, evaluate whether business logic can be extracted to the domain layer or side effects moved to infrastructure — even if it's not the primary goal of the task.
