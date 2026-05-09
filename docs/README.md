# PianoHero Documentation

Welcome to the official documentation for **PianoHero**, a high-performance piano practice application built with Electron, React, and Tone.js.

This documentation is designed to help engineers understand the system architecture, design patterns, and engineering principles used in this project.

## 📖 Table of Contents

### 1. [Architecture Overview](./architecture/clean-architecture.md)

Detailed explanation of our implementation of **Clean Architecture**. Learn how we separate business logic (Domain) from delivery mechanisms (Presentation/Infrastructure).

### 2. [System Design & C4 Model](./architecture/c4-model.md)

High-level system design using the **C4 Framework**. Visual diagrams of the system context, containers, and core components.

### 3. [Design Patterns](./design-patterns/patterns.md)

A catalog of the design patterns used throughout the codebase, including the **Adapter Pattern** for MIDI devices and the **Engine Pattern** for practice logic.

### 4. [System Design Deep Dive](./system-design/overview.md)

Understanding the technical challenges of real-time MIDI processing, audio scheduling, and synchronization.

### 5. [Technical Glossary](./glossary.md)

A definitions guide for technical terms used in the project, with code examples and file references.

### 6. [Architecture Decision Records (ADR)](./adr/)

A record of the key architectural decisions made during the evolution of the project.

---

## 🚀 Engineering Principles

- **Clean Architecture**: Dependencies always point inwards.
- **Test-Driven Development (TDD)**: Domain logic is verified with comprehensive unit tests.
- **Performance First**: Minimal latency for MIDI input and audio output.
- **Premium UX**: Modern, vibrant design with a focus on usability and visual feedback.

---

> Documentation following Google, Netflix, and Anthropic standards.
