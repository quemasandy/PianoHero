# ADR 001: Adoption of Clean Architecture

## Status

Accepted

## Context

As the PianoHero project grew, we noticed that business logic (like chord detection and practice evaluation) was becoming tightly coupled with React components and Tone.js. This made testing difficult and the codebase fragile.

## Decision

We will migrate the project to follow **Clean Architecture** principles.

- Business logic must reside in the **Domain** layer (`src/renderer/src/lib`).
- The Domain layer must not depend on any UI or Infrastructure libraries.
- All external dependencies (MIDI, Audio, Electron) must be accessed via **Adapters**.

## Consequences

- **Positive**: Increased testability, clearer separation of concerns, and framework independence.
- **Negative**: Initial overhead in creating interfaces and adapters; slightly more files to manage.
- **Neutral**: Requires a mental shift in how features are developed (Domain-first).

---

_Date: 2026-05-09_
