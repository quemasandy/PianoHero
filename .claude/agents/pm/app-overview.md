# PianoHero — App Overview (PM Reference)

> Última actualización: 2026-04-19  
> Fuente: análisis automático del código fuente

---

## Qué es PianoHero

Aplicación de escritorio (Electron + React) que actúa como tutor interactivo de piano, similar a Synthesia pero gratuita, open source y con enfoque en **pedagogía jazzística**. El usuario toca en un controlador MIDI físico y la app proporciona feedback visual en tiempo real.

**Idioma de la UI:** Español  
**Público objetivo:** Músicos (especialmente estudiantes de jazz) de nivel intermedio  
**Plataformas:** macOS, Windows, Linux  
**Versión actual:** 0.1.0

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Shell de escritorio | Electron 28 |
| Frontend | React 18 + TypeScript 5 |
| Build | Vite 5 + electron-vite 2 |
| Piano SVG | Custom (SVG con sistema de coordenadas propio) |
| Partitura | VexFlow 5.0 |
| Síntesis de audio | Tone.js 14.7 |
| Parsing MIDI | @tonejs/midi |
| I/O MIDI nativo | @julusian/midi (bindings C++) |
| Gráficos canvas | Pixi.js 7.4 |

---

## Modos de la aplicación

### 1. Práctica de Escalas y Acordes (`Practice.tsx`)
- Catálogo de 10 escalas (Blues, Pentatónicas, Modales, Bebop, Alterada, Disminuida)
- 8 progresiones jazz (ii-V-I, Rhythm Changes, Turnarounds, voicings sin raíz)
- Validación nota a nota con auto-avance
- Metrónomo a 120 BPM por defecto
- Partitura en tiempo real (VexFlow)
- Retroalimentación visual en el teclado (teclas hint en neon rosa)

### 2. Práctica de Canciones (`SongPractice.tsx`)
- Catálogo estático de 9 piezas (Oda a la Alegría, Jingle Bells, When the Saints…)
- Visualización de notas que caen estilo Synthesia
- Partitura sincronizada compás a compás
- Ventana dinámica del teclado (se centra automáticamente en la octava necesaria)
- Modo practice: la nota activa espera hasta que el usuario la toca correctamente

### 3. Biblioteca / MIDI (`Library.tsx`)
- Carga de archivos MIDI externos (drag & drop o diálogo)
- Soporte multi-pista con toggles de visibilidad
- Control de velocidad de reproducción

---

## Catálogo actual

### Escalas / Ejercicios de práctica
- C Major Blues, C Minor Blues
- C Major Pentatónica, C Minor Pentatónica
- C Dórico, C Mixolidio, C Alterada
- Lick Bebop sobre ii-V-I en C
- Escala Disminuida (dominante)

### Progresiones de acordes jazz
- ii-V-I en C (voicings completos y shell voicings)
- ii-V-I en Bb y F (rotación de claves jazz comunes)
- Rhythm Changes A (Bb)
- Turnaround I-VI-ii-V en C
- Voicings rootless 9 y 13

### Canciones pre-cargadas
1. Himno a la Alegría
2. Hot Cross Buns
3. Mary Had a Little Lamb
4. Au Clair de la Lune
5. Lightly Row
6. Frère Jacques
7. Twinkle Twinkle Little Star
8. Jingle Bells
9. When the Saints Go Marching In
10. Amazing Grace

---

## Limitaciones actuales (v0.1.0)

- Sin tracking de progreso / scoring / métricas de precisión
- Sin sistema de usuarios ni perfiles
- Catálogo de canciones muy limitado (10 piezas básicas)
- Solo clave de sol (treble clef) en canciones pre-cargadas
- Sin reproducción de audio para escalas/acordes en práctica (solo síntesis mínima)
- Sin guía de tempo en modo canción (el usuario dicta el ritmo)
- Sin contenido para mano izquierda / bajo

---

## Flujo de datos simplificado

```
MIDI Controller → useMidiDevice (hook) → handleNoteAction
                                              ↓
                                    Practice Engine (validación)
                                              ↓
                              Estado React → Piano SVG + Partitura + Falling Notes
```

---

## Archivos clave para PM

| Archivo | Qué controla |
|---|---|
| `src/renderer/src/lib/practiceCatalog.ts` | Todas las escalas y progresiones (agregar ejercicios aquí) |
| `src/renderer/src/lib/songCatalog.ts` | Catálogo de canciones estáticas |
| `src/renderer/src/screens/Practice.tsx` | Lógica completa del modo práctica |
| `src/renderer/src/screens/SongPractice.tsx` | Lógica del modo canción |
| `src/renderer/src/components/Piano.tsx` | Teclado visual interactivo |
| `src/renderer/src/components/FallingNotesView.tsx` | Visualización estilo Synthesia |
| `src/renderer/src/components/SongSheetMusic.tsx` | Partitura de canciones |
