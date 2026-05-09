# Clean Architecture in PianoHero

PianoHero follows the **Clean Architecture** pattern to ensure that the business logic is independent of frameworks, UI, and external drivers like MIDI hardware or audio libraries.

## 🏗️ Layered Structure

The project is organized into four main layers, where dependencies always point **inward**.

### 1. Domain Layer (The Core)

**Location:** `src/renderer/src/lib/`, `src/renderer/src/types/`

This layer contains the pure business logic and entities. It has **zero dependencies** on React, Electron, or Tone.js.

- **`types/index.ts`**: Core domain models (Notes, Chords, Practice Sessions).
- **`practiceEngine.ts`**: Logic for evaluating player performance.
- **`chordDetection.ts`**: Algorithmic detection of chords from MIDI inputs.
- **`practiceCatalog.ts`**: Management of scales, exercises, and practice content.

### 2. Use Cases Layer

**Location:** (Orchestration logic often found in hooks or services)

Orchestrates the flow of data to and from the domain entities. It directs the entities to use their business logic to achieve the goals of the use case.

### 3. Infrastructure Layer (Adapters)

**Location:** `src/renderer/src/lib/` (Adapters), `src/main/` (Electron)

Implements the technical details required to make the app work. This layer "adapts" external libraries and hardware to our domain.

- **`AudioPlayer.ts`**: Wrapper for Tone.js.
- **`Scheduler.ts`**: High-precision timing for MIDI playback.
- **`rendererMidiAdapter.ts`**: Translates raw MIDI events into domain events.
- **`electron/main.ts`**: OS-level integration and window management.

### 4. Presentation Layer

**Location:** `src/renderer/src/screens/`, `src/renderer/src/components/`

The React UI. This layer is responsible for rendering the state and capturing user interactions. It should only consume Use Cases and Infrastructure interfaces.

---

## 🧭 The Dependency Rule

> **Dependencies only point inward.**

- **Presentation** can know about **Use Cases** and **Infrastructure**.
- **Infrastructure** can know about the **Domain**.
- **Domain** knows about **nothing** outside itself.

### Benefits

1. **Testability**: Domain logic can be tested without a browser or MIDI device.
2. **Framework Independence**: We could replace React or Tone.js with minimal impact on the core logic.
3. **Maintainability**: Clear separation of concerns makes the codebase easier to navigate.

---

_Inspired by Robert C. Martin's Clean Architecture._
