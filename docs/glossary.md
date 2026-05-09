# 📚 Glosario de Términos Técnicos

Este glosario define los conceptos fundamentales utilizados en el desarrollo de PianoHero, proporcionando ejemplos reales dentro de este repositorio.

---

## 🧠 Business Logic (Lógica de Negocio)

Es el conjunto de reglas que determinan cómo se crean, almacenan y cambian los datos. Es el "cerebro" de la aplicación y no debe depender de interfaces de usuario o bases de datos.

- **¿Dónde verla?**: `src/renderer/src/lib/chordDetection.ts`, `src/renderer/src/lib/practiceEngine.ts`
- **Ejemplo**: La detección de acordes no sabe nada de React o de si el usuario está usando Windows o Mac. Solo recibe números (pitches) y devuelve un nombre.

```typescript
// Ejemplo de Business Logic en PianoHero
// Ubicación: src/renderer/src/lib/chordDetection.ts

export function detectChord(pitches: number[]): string | null {
  // 1. Lógica pura: convertir números en una estructura de datos
  const pcSet = Array.from(new Set(pitches.map((p) => p % 12))).sort((a, b) => a - b)

  // 2. Regla de negocio: si hay menos de 2 notas, no es un acorde
  if (!pitches || pitches.length < 2) return null

  // 3. Algoritmo de detección basado en intervalos musicales
  // ... (procesamiento lógico) ...
  return 'C Major'
}
```

---

## 🏗️ Clean Architecture (Arquitectura Limpia)

Es un patrón de diseño que separa el código en capas. La regla principal es que las capas internas (Domain) no pueden conocer nada de las capas externas (UI, Frameworks).

- **¿Dónde verla?**: Revisa nuestra guía de [Clean Architecture](./architecture/clean-architecture.md).

---

## 🔌 Infrastructure (Infraestructura)

Es la capa que contiene el código que interactúa con el mundo exterior: hardware, APIs de terceros, o el sistema operativo.

- **¿Dónde verla?**: `src/renderer/src/lib/AudioPlayer.ts` (usa Tone.js), `src/renderer/src/lib/rendererMidiAdapter.ts` (usa Web MIDI API).
- **Ejemplo**: El `AudioPlayer` "adapta" la librería Tone.js para que el resto de la app pueda sonar sin importar qué librería usemos por debajo.

---

## 🎨 Presentation (Presentación)

Es la capa encargada de mostrar la información al usuario y capturar sus interacciones. En este proyecto, es todo lo relacionado con React.

- **¿Dónde verla?**: `src/renderer/src/components/`, `src/renderer/src/screens/`.

---

## ⚡ Vibe Code

Término coloquial para referirse a código escrito rápidamente, basado en "intuición" o generado por IA sin una estructura clara o arquitectura sólida.

- **En PianoHero**: Combatimos el _Vibe Code_ usando **Clean Architecture** y **TDD (Test Driven Development)** para asegurar que el código sea predecible y seguro.

---

## 📜 ADR (Architecture Decision Record)

Un documento corto que describe una decisión arquitectónica importante, su contexto y sus consecuencias. Es la "bitácora" de diseño del proyecto.

- **¿Dónde verla?**: En la carpeta [`docs/adr/`](./adr/).

---

## 🗺️ C4 Model

Un framework para documentar arquitecturas de software mediante diagramas con diferentes niveles de detalle (Contexto, Contenedor, Componente).

- **¿Dónde verla?**: [`docs/architecture/c4-model.md`](./architecture/c4-model.md).

---

> Este glosario ayuda a que todos los desarrolladores (humanos o IA) hablen el mismo idioma técnico.
