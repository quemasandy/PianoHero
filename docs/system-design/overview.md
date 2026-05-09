# System Design: PianoHero

This document provides a high-level overview of the system design, the technology stack, and the technical challenges of building a real-time musical application.

## 🛠️ Technology Stack

- **Framework**: [Electron](https://www.electronjs.org/) (Main + Renderer)
- **UI Library**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Audio Engine**: [Tone.js](https://tonejs.github.io/)
- **Language**: TypeScript (Strict mode)
- **Styling**: Vanilla CSS (Modern CSS variables and Flexbox/Grid)

## 🏗️ Core System Components

### 1. Real-time MIDI Processing

One of the biggest challenges is processing MIDI input with **minimal latency**. We use the browser's Web MIDI API inside the Renderer process.

- **Optimization**: We avoid React state for the "hot path" of MIDI processing. Events are handled by the `MidiAdapter` and passed directly to the `PracticeEngine`.

### 2. Audio Scheduling

Musical timing must be precise. Tone.js handles the audio buffer, but we use a custom `Scheduler` to synchronize MIDI playback with the visual display (Piano UI and Sheet Music).

- **Technique**: We use a look-ahead scheduling algorithm to ensure notes are triggered exactly on the beat, even if the main thread is busy.

### 3. State Management

We use a hybrid approach:

- **Local State**: Component-specific UI state (hover effects, toggles).
- **Domain State**: Managed by the `PracticeEngine` (score, current note).
- **Persistence**: Managed via the Electron Main process to save user progress and settings to the local filesystem.

## ⚖️ Trade-offs and Decisions

### Electron vs. Web

**Decision:** Electron.
**Reason:** We need low-level access to MIDI devices and the ability to read/write files locally without browser security restrictions.

### Clean Architecture vs. Rapid Prototyping

**Decision:** Clean Architecture (Migration in progress).
**Reason:** Musical logic is complex and prone to bugs. Separating domain logic into pure, testable functions (TDD) is essential for long-term stability.

### Canvas vs. DOM for Piano Rendering

**Decision:** DOM (HTML/CSS).
**Reason:** Modern CSS is powerful enough for our 3D/Neon aesthetic and provides better accessibility and event handling than a raw Canvas.

---

## 📈 Data Flow

1. **User** presses a key on the **MIDI Keyboard**.
2. **Web MIDI API** triggers an event in the **MidiAdapter**.
3. **MidiAdapter** translates this to a **Domain Event**.
4. **PracticeEngine** evaluates the event against the current **Practice Session**.
5. **PracticeEngine** updates its state and notifies the **UI**.
6. **UI** updates (Green/Red glow) and **AudioPlayer** plays the corresponding sound.

---

> This design ensures that the core musical logic remains stable and performant as the application grows.
