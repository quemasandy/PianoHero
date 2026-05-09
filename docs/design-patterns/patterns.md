# Design Patterns in PianoHero

PianoHero utilizes several classic software design patterns to solve recurring engineering challenges.

## 🔌 1. Adapter Pattern

**Used in:** `rendererMidiAdapter.ts`, `AudioPlayer.ts`

**Problem:** We need to interact with external APIs (Web MIDI API, Tone.js) that have complex or incompatible interfaces.

**Solution:** We create "Adapters" that translate these external interfaces into a clean, domain-specific API that our application understands.

- `rendererMidiAdapter` converts raw browser MIDI events into typed `MidiEvent` domain objects.
- `AudioPlayer` abstracts Tone.js, so the rest of the app doesn't need to know how audio is synthesized.

---

## 🎯 2. Strategy Pattern

**Used in:** Practice Modes (Scales, Songs, Chords)

**Problem:** Different practice modes have different evaluation logic but share the same overall "practice" lifecycle.

**Solution:** We define different "Strategies" for evaluation. The UI can swap these strategies depending on what the user is practicing, without changing the core practice component logic.

---

## 📡 3. Observer Pattern (Pub/Sub)

**Used in:** MIDI Event Distribution

**Problem:** Multiple components (Piano UI, Practice Engine, Recording) need to react to a single MIDI event.

**Solution:** The MIDI Adapter acts as a "Subject" (Observable), and other components "Subscribe" to it. When a key is pressed, all subscribers are notified instantly.

---

## ⚙️ 4. Engine Pattern

**Used in:** `practiceEngine.ts`

**Problem:** Managing the complex state of a practice session (tempo, current note, mistakes, progress) in a centralized way.

**Solution:** An "Engine" encapsulates all the logic and state transitions. It acts as a state machine that receives inputs (MIDI events) and produces outputs (visual feedback, audio commands).

---

## 📦 5. Repository Pattern

**Used in:** `practiceCatalog.ts`, `songCatalog.ts`

**Problem:** Accessing and filtering data (scales, songs, exercises) shouldn't be mixed with UI logic.

**Solution:** Repositories provide a clean API to query domain data, hiding the complexity of how that data is stored or retrieved.

---

> By using these patterns, we keep the code modular, testable, and extensible.
