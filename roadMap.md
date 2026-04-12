# PianoHero — Roadmap

Free open-source Synthesia clone. Electron + React + Vite + TypeScript. Loads MIDI files, shows a falling-notes waterfall above a piano keyboard, with audio playback (Tone.js) and optional physical MIDI input (@julusian/midi).

## Stack
- **Electron 28** shell with `titleBarStyle: 'hiddenInset'` on macOS
- **electron-vite** for dev/build (renderer served at `localhost:5173`)
- **React 18** + StrictMode
- **@tonejs/midi** for parsing `.mid/.midi`
- **Tone.js** for audio (PolySynth fallback, Salamander piano samples via CDN)
- **@julusian/midi** native module for MIDI-in device input

## Architecture
```
electron/
  main.ts       — BrowserWindow, IPC handlers (open/read file, MIDI device)
  preload.ts    — contextBridge exposes `window.electronAPI`
src/renderer/src/
  App.tsx                 — two-screen state machine: 'library' | 'play'
  screens/Library.tsx     — drag-drop / file picker, parses MIDI, recent list
  screens/Play.tsx        — owns PlayerState, wires Scheduler + AudioPlayer,
                            renders Waterfall + Piano + Controls
  components/
    Waterfall.tsx         — canvas that draws falling notes (RAF via state)
    Piano.tsx             — SVG keyboard (88 keys, A0–C8)
    Controls.tsx          — transport, speed, learning mode, track toggles
  lib/
    MidiParser.ts         — @tonejs/midi -> ParsedSong { notes, duration, trackCount, ticksPerBeat }
    Scheduler.ts          — RAF loop, emits noteOn/noteOff/timeUpdate/waitForNotes/ended
    AudioPlayer.ts        — Tone.Sampler + PolySynth fallback
  hooks/useMidiDevice.ts  — subscribes to `window.electronAPI.onMidiNote`
  types/index.ts          — ParsedNote, ParsedSong, PlayerState, Screen
```

## Status
- [x] Library screen (drag-drop + file picker) — renders and parses MIDI
- [x] MIDI parsing (@tonejs/midi)
- [x] Scheduler with RAF loop
- [x] AudioPlayer with synth fallback
- [x] Piano SVG keyboard
- [x] Controls UI (transport, speed, track toggles, learning mode)
- [x] Waterfall canvas draw
- [x] Electron MIDI device IPC plumbing
- [ ] **BUG (active):** Play screen renders blank after loading a MIDI file
- [ ] Tested with a real physical MIDI keyboard
- [ ] Packaged build (`npm run package`) verified
- [ ] Learning mode end-to-end verified
- [ ] Multi-track color legend / naming

## Active Bug — Play screen renders blank after loading MIDI

### Symptom
- **Library screen renders fine** (Spanish UI, drag-drop zone, logo visible).
- After dropping or picking a `.mid` file, the app transitions to the Play screen but user sees **only an empty dark canvas** — no Piano keyboard, no Controls bar, no title bar text.
- A second observation: at one point after an HMR update the entire window went white and **DevTools reported "disconnected from the page"** (renderer crash or forced reload).

### What we know
- Transition Library → Play IS happening (user sees a different background than the Library layout).
- Console when DevTools reconnected showed only:
  - `Tone.js v14.9.17` banner
  - Electron CSP security warning (unrelated)
  - No red errors visible
- DevTools was disconnected before we could capture errors from the crash state.

### Things already ruled out / verified
- `Play.tsx` JSX structure is a flex column with `height: 100vh` and proper `flexShrink: 0` on Piano/Controls — layout should not push them off-screen in theory.
- `song.trackCount` comes from `midi.tracks.length` (always a valid non-negative int).
- `roundRect` is used in Waterfall draw — supported in Electron 28's Chromium.
- Build output in `out/` is up to date. Dev server running on `localhost:5173`.

### Hypotheses (ranked)
1. **Runtime error inside Play's `useEffect`** (scheduler/audio setup) that unmounts the subtree. We need the DevTools console at the moment the MIDI loads to confirm.
2. **Canvas intrinsic size inflating the flex child**, pushing Piano/Controls below the viewport. The `draw()` function sets `canvas.width/height` to W×H, which can bleed into flex min-content sizing.
3. **`ctx.roundRect` unavailable or throwing on the specific MIDI content** (less likely — widely supported in Chromium 120).
4. **HMR state desync** causing the renderer to crash after an edit (would explain the white-screen + DevTools disconnect).

### Fix attempts so far
1. **Canvas absolute positioning** in [Waterfall.tsx:111-113](src/renderer/src/components/Waterfall.tsx#L111-L113):
   - Before: `<canvas style={{ display: 'block', width: '100%', height: '100%' }} />`
   - After: `<canvas style={{ display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />`
   - Rationale: removes the canvas from normal flow so its intrinsic bitmap size cannot influence the flex parent's main-axis size.
   - Result: user reports **still broken** after HMR. Needs a clean restart to validate.

### Next steps
1. Clean restart: `Cmd+Q` Electron → `Ctrl+C` dev server → `npm run dev` → open DevTools **before** loading MIDI → drop MIDI → capture console output.
2. If a JS error surfaces → fix that directly.
3. If no error but still blank → inspect the Elements tree to confirm whether `<Piano>` and `<Controls>` are present in the DOM but off-screen (layout bug) vs. completely absent (render bug).
4. If layout bug confirmed, try wrapping Play's root as `position: fixed; inset: 0` to hard-pin to the viewport.
5. Consider adding a top-level React error boundary so future render failures show a readable error instead of a blank screen.

## Notes / gotchas
- Dev sample piano loads from `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/...` — requires network at first run; falls back to a PolySynth immediately so playback always works.
- `titleBarStyle: 'hiddenInset'` means the draggable title bar in Play.tsx uses `WebkitAppRegion: 'drag'` — clicks don't pass through that strip.
- `Play.tsx` `useEffect` depends on `[song]`. StrictMode will double-invoke it in dev (two scheduler+audio constructions on mount) — make sure the cleanup `dispose()` / `scheduler.stop()` is idempotent.
- Minimum window size is 900×600 (see [electron/main.ts:9-10](electron/main.ts#L9-L10)).
