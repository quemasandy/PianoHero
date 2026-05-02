import { useCallback, useEffect, useMemo, useState } from 'react'
import Piano from '../components/Piano'
import SongSheetMusic from '../components/SongSheetMusic'
import FallingNotesView from '../components/FallingNotesView'
import { useMidiDevice } from '../hooks/useMidiDevice'
import { SONG_CATALOG, Song } from '../lib/songCatalog'
import AppNavigation, { AppMode } from '../components/AppNavigation'
import { logRendererEvent } from '../lib/diagnostics'

interface PracticeState {
  measureIndex: number
  eventIndex: number
  pressedNotes: Set<number>
  mousePressedNotes: Set<number>
}

// Default 25-key window is C4 (60) to C6 (84).
function getWindowForPitches(pitches: number[]): { startPitch: number; endPitch: number } {
  if (pitches.length === 0) return { startPitch: 60, endPitch: 84 }

  const min = Math.min(...pitches)
  const max = Math.max(...pitches)

  // Try to fit in standard C4-C6 first if it's within range
  if (min >= 60 && max <= 84) return { startPitch: 60, endPitch: 84 }
  if (min >= 48 && max <= 72) return { startPitch: 48, endPitch: 72 }
  if (min >= 72 && max <= 96) return { startPitch: 72, endPitch: 96 }

  // Otherwise just center around the min
  const baseC = Math.floor(min / 12) * 12
  return { startPitch: baseC, endPitch: baseC + 24 }
}

const WORLDDE_DEVICE_PATTERN = /worldde|easykey/i

export default function SongPractice({
  onNavigateHome,
  onNavigateMode,
}: {
  onNavigateHome: () => void
  onNavigateMode: (mode: AppMode) => void
}) {
  const [song, setSong] = useState<Song>(SONG_CATALOG[0]) // Play first song
  const [state, setState] = useState<PracticeState>({
    measureIndex: 0,
    eventIndex: 0,
    pressedNotes: new Set(),
    mousePressedNotes: new Set(),
  })
  const [_midiConnected, setMidiConnected] = useState(false)

  // Connect MIDI device on mount (Practice.tsx disconnects it on unmount)
  useEffect(() => {
    let cancelled = false

    async function connectMidi() {
      try {
        const devices = await window.electronAPI.getMidiDevices()
        if (cancelled || devices.length === 0) {
          setMidiConnected(false)
          return
        }

        // Prefer Worldde/EasyKey, otherwise use the first device
        const candidates = devices
          .map((name: string, index: number) => ({
            name,
            index,
            priority: WORLDDE_DEVICE_PATTERN.test(name) ? 0 : 1,
          }))
          .sort(
            (a: { priority: number; index: number }, b: { priority: number; index: number }) =>
              a.priority - b.priority || a.index - b.index
          )

        for (const candidate of candidates) {
          const ok = await window.electronAPI.connectMidiDevice(candidate.index)
          if (cancelled) {
            if (ok) await window.electronAPI.disconnectMidiDevice().catch(() => {})
            return
          }
          if (ok) {
            setMidiConnected(true)
            logRendererEvent(
              'info',
              'songpractice.midi.connected',
              'MIDI device connected for song practice',
              { device: candidate.name }
            )
            return
          }
        }
        setMidiConnected(false)
      } catch (e) {
        if (!cancelled) setMidiConnected(false)
        logRendererEvent(
          'error',
          'songpractice.midi.error',
          'Failed to connect MIDI for song practice',
          { error: e }
        )
      }
    }

    void connectMidi()

    return () => {
      cancelled = true
      window.electronAPI.disconnectMidiDevice().catch(() => {})
    }
  }, [])

  // The active step event
  const currentMeasure = song.measures[state.measureIndex]
  const currentEvent = currentMeasure?.events[state.eventIndex]

  // Next lookup
  const expectedPitches = useMemo(() => {
    if (!currentEvent) return []
    return currentEvent.pitches
  }, [currentEvent])

  const pianoActiveNotes = useMemo(() => {
    const active = new Set(state.mousePressedNotes)
    state.pressedNotes.forEach((p) => active.add(p))
    return active
  }, [state.pressedNotes, state.mousePressedNotes])

  // Automatic View Window
  const upcomingPitches = useMemo(() => {
    if (!currentMeasure) return []
    // gather pitches in current measure
    return currentMeasure.events.flatMap((ev) => ev.pitches)
  }, [currentMeasure])

  const activeWindow = useMemo(() => getWindowForPitches(upcomingPitches), [upcomingPitches])

  const handleNoteAction = useCallback(
    (pitch: number, source: 'midi' | 'mouse', isOn: boolean) => {
      setState((prev) => {
        const nextMidi = new Set(prev.pressedNotes)
        const nextMouse = new Set(prev.mousePressedNotes)

        if (source === 'mouse') {
          if (isOn) nextMouse.add(pitch)
          else nextMouse.delete(pitch)
        } else {
          if (isOn) nextMidi.add(pitch)
          else nextMidi.delete(pitch)
        }

        let nextMs = prev.measureIndex
        let nextEv = prev.eventIndex
        let currentMeas = song.measures[nextMs]
        let currentEv = currentMeas?.events[nextEv]

        // Only auto-advance on note ON
        if (isOn) {
          let iterations = 0
          while (currentEv && iterations < 20) {
            iterations++
            const required = currentEv.pitches
            const isRest = required.length === 0
            let allPressed = true

            if (!isRest) {
              for (const p of required) {
                if (!nextMidi.has(p) && !nextMouse.has(p)) {
                  allPressed = false
                  break
                }
              }
            }

            if (isRest || allPressed) {
              nextEv++
              if (nextEv >= currentMeas.events.length) {
                nextEv = 0
                nextMs++
                currentMeas = song.measures[nextMs]
              }
              if (nextMs >= song.measures.length) {
                logRendererEvent('info', 'songpractice.complete', 'Song practice complete')
                break
              }
              currentEv = currentMeas?.events[nextEv]
            } else {
              break
            }
          }
        }

        return {
          ...prev,
          measureIndex: nextMs,
          eventIndex: nextEv,
          pressedNotes: nextMidi,
          mousePressedNotes: nextMouse,
        }
      })
    },
    [song]
  )

  useMidiDevice(
    useCallback(
      (pitch: number, _velocity: number, isOn: boolean) => {
        handleNoteAction(pitch, 'midi', isOn)
      },
      [handleNoteAction]
    )
  )

  useEffect(() => {
    if (state.measureIndex >= song.measures.length) {
      const timer = setTimeout(() => {
        setState({
          measureIndex: 0,
          eventIndex: 0,
          pressedNotes: new Set(),
          mousePressedNotes: new Set(),
        })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [state.measureIndex, song.measures.length])

  const hintNotes = new Set(expectedPitches)

  return (
    <main
      className="ph-song-practice"
      data-measure-index={state.measureIndex}
      data-song-id={song.id}
      data-ui="song-practice-screen"
    >
      {/* Header */}
      <AppNavigation
        currentMode="songs"
        onNavigateHome={onNavigateHome}
        onNavigateMode={onNavigateMode}
      >
        <div className="ph-song-practice__controls" data-ui="song-practice-controls">
          <label className="ph-field ph-song-practice__song-field" data-ui="song-field">
            <span className="ph-field__label" data-ui="song-select-label">
              Canción:
            </span>
            <select
              className="ph-select ph-song-practice__song-select"
              data-song-id={song.id}
              data-ui="song-select"
              value={song.id}
              onChange={(e) => {
                const s = SONG_CATALOG.find((s) => s.id === e.target.value)
                if (s) {
                  setSong(s)
                  setState((prev) => ({
                    ...prev,
                    measureIndex: 0,
                    eventIndex: 0,
                    pressedNotes: new Set(),
                    mousePressedNotes: new Set(),
                  }))
                }
              }}
            >
              {SONG_CATALOG.map((s) => (
                <option key={s.id} value={s.id} style={{ color: '#000' }}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          <div className="ph-song-practice__octave-badge" data-ui="song-octave-badge">
            <span className="ph-song-practice__octave-label" data-ui="song-octave-label">
              Octava
            </span>
            <span className="ph-song-practice__octave-value" data-ui="song-octave-value">
              {`C${Math.floor(activeWindow.startPitch / 12) - 1}-C${Math.floor(activeWindow.endPitch / 12) - 1}`}
            </span>
          </div>
        </div>
      </AppNavigation>

      {/* Sheet Music Section */}
      <section className="ph-song-practice__sheet" data-ui="song-sheet-section">
        {currentMeasure ? (
          <SongSheetMusic measure={currentMeasure} currentEventIndex={state.eventIndex} />
        ) : (
          <div className="ph-song-practice__complete" data-ui="song-complete-message" role="status">
            ¡Canción Completada!
          </div>
        )}
      </section>

      {/* Shared wrapper — common horizontal padding keeps FallingNotesView and Piano SVGs pixel-aligned */}
      <div className="ph-song-practice__playfield" data-ui="song-playfield">
        {/* Falling Notes */}
        <div className="ph-song-practice__falling-notes" data-ui="song-falling-notes-region">
          <FallingNotesView
            song={song}
            currentMeasureIndex={state.measureIndex}
            currentEventIndex={state.eventIndex}
            keyboardWindow={activeWindow}
          />
        </div>

        {/* Piano (songMode: no outer padding/border so it aligns edge-to-edge with FallingNotesView) */}
        <div className="ph-song-practice__piano" data-ui="song-piano-region">
          <Piano
            activeNotes={pianoActiveNotes}
            hintNotes={hintNotes}
            keyboardWindow={activeWindow}
            compactView={true}
            songMode={true}
            onNoteOn={(p) => handleNoteAction(p, 'mouse', true)}
            onNoteOff={(p) => handleNoteAction(p, 'mouse', false)}
          />
        </div>
      </div>
    </main>
  )
}
