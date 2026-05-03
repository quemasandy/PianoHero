import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import type { KeyboardWindow, MidiControllerProfile, ParsedSong, PlayerState } from '../types'
import { Scheduler } from '../lib/Scheduler'
import Waterfall from '../components/Waterfall'
import Piano from '../components/Piano'
import Controls from '../components/Controls'
import { useMidiDevice } from '../hooks/useMidiDevice'
import { logRendererEvent } from '../lib/diagnostics'

interface PlayProps {
  song: ParsedSong
  filePath: string
  onBack: () => void
}

const WORLDDE_DEVICE_PATTERN = /worldde|easykey/i
const KEYBOARD_WINDOW_KEY_COUNT = 25
const MIN_PITCH = 21
const MAX_PITCH = 108
const SILENT_MODE_LABEL = 'Audio interno: OFF · Usa GarageBand'
const DEFAULT_WORLDDE_WINDOW: KeyboardWindow = {
  startPitch: 48,
  endPitch: 72,
  targetPitches: [],
  outOfRange: false,
}

function pitchToLabel(pitch: number) {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[pitch % 12]}${octave}`
}

function createControllerProfile(deviceName: string): MidiControllerProfile {
  const matchedByName = WORLDDE_DEVICE_PATTERN.test(deviceName)
  return {
    deviceName,
    keyCount: matchedByName ? KEYBOARD_WINDOW_KEY_COUNT : MAX_PITCH - MIN_PITCH + 1,
    isWorlddeProfile: matchedByName,
    matchedByName,
  }
}

function buildKeyboardWindow(targetGroup: number[], keyCount: number): KeyboardWindow | null {
  if (targetGroup.length === 0) return null

  const sorted = [...new Set(targetGroup)].sort((a, b) => a - b)
  const minTarget = sorted[0]
  const maxTarget = sorted[sorted.length - 1]
  const inclusiveSpan = maxTarget - minTarget + 1
  const maxStart = MAX_PITCH - keyCount + 1

  if (inclusiveSpan > keyCount) {
    const startPitch = Math.max(MIN_PITCH, Math.min(minTarget, maxStart))
    return {
      startPitch,
      endPitch: startPitch + keyCount - 1,
      targetPitches: sorted,
      outOfRange: true,
    }
  }

  const centeredStart = Math.round((minTarget + maxTarget) / 2 - (keyCount - 1) / 2)
  const startPitch = Math.max(MIN_PITCH, Math.min(centeredStart, maxStart))
  return {
    startPitch,
    endPitch: startPitch + keyCount - 1,
    targetPitches: sorted,
    outOfRange: false,
  }
}

function windowCoversTargets(window: KeyboardWindow | null, targetPitches: number[]) {
  if (!window || targetPitches.length === 0) return false
  return targetPitches.every((pitch) => pitch >= window.startPitch && pitch <= window.endPitch)
}

export default function Play({ song, filePath, onBack }: PlayProps) {
  const schedulerRef = useRef<Scheduler | null>(null)
  const noteTrackMapRef = useRef<Map<number, number>>(new Map())

  const [playerState, setPlayerState] = useState<PlayerState>({
    status: 'idle',
    currentTime: 0,
    speed: 1,
    activeNotes: new Set(),
    hintNotes: new Set(),
    learningMode: true,
    activeTrackMask: Array(song.trackCount).fill(true),
  })
  const [midiState, setMidiState] = useState<{
    status: 'checking' | 'connected' | 'unavailable' | 'error'
    deviceName: string | null
    profile: MidiControllerProfile | null
  }>({
    status: 'checking',
    deviceName: null,
    profile: null,
  })
  const [keyboardWindow, setKeyboardWindow] = useState<KeyboardWindow | null>(null)

  const midiStatusLabel =
    midiState.status === 'connected'
      ? `MIDI: ${midiState.deviceName}`
      : midiState.status === 'checking'
        ? 'MIDI: buscando teclado...'
        : midiState.status === 'unavailable'
          ? 'MIDI: no detectado'
          : 'MIDI: error de conexión'

  const midiStatusColor =
    midiState.status === 'connected'
      ? 'var(--neon-green)'
      : midiState.status === 'checking'
        ? 'var(--neon-cyan)'
        : midiState.status === 'unavailable'
          ? 'var(--neon-yellow)'
          : 'var(--neon-pink)'

  const rangeStatusLabel = keyboardWindow
    ? keyboardWindow.outOfRange
      ? 'Acorde fuera de rango de 25 teclas'
      : `Rango activo: ${pitchToLabel(keyboardWindow.startPitch)}–${pitchToLabel(keyboardWindow.endPitch)}`
    : undefined

  const rangeStatusColor = keyboardWindow?.outOfRange ? 'var(--neon-yellow)' : 'var(--neon-cyan)'
  const compactWorlddeView = !!midiState.profile?.isWorlddeProfile
  const visibleKeyboardWindow =
    compactWorlddeView && !keyboardWindow && playerState.currentTime === 0
      ? DEFAULT_WORLDDE_WINDOW
      : keyboardWindow

  // Initialize scheduler
  useEffect(() => {
    logRendererEvent('info', 'play.mount', 'Play screen effect starting', {
      filePath,
      title: song.title,
      noteCount: song.notes.length,
      trackCount: song.trackCount,
      duration: song.duration,
    })

    const scheduler = new Scheduler(song)
    schedulerRef.current = scheduler
    scheduler.setLearningMode(true)
    logRendererEvent('info', 'play.scheduler.ready', 'Scheduler created', {
      duration: song.duration,
      learningMode: true,
    })
    logRendererEvent(
      'info',
      'play.audio.disabled',
      'Internal audio disabled for external DAW workflow',
      {
        mode: 'silent',
        externalAudio: 'GarageBand',
      }
    )

    const unsubscribe = scheduler.on((event) => {
      if (event.type === 'noteOn') {
        noteTrackMapRef.current.set(event.note.pitch, event.note.track)
        setPlayerState((prev) => ({
          ...prev,
          activeNotes: new Set([...prev.activeNotes, event.note.pitch]),
        }))
      } else if (event.type === 'noteOff') {
        noteTrackMapRef.current.delete(event.note.pitch)
        setPlayerState((prev) => {
          const next = new Set(prev.activeNotes)
          next.delete(event.note.pitch)
          return { ...prev, activeNotes: next }
        })
      } else if (event.type === 'waitForNotes') {
        setPlayerState((prev) => ({
          ...prev,
          status: 'waiting',
          hintNotes: new Set(event.notes.map((n) => n.pitch)),
        }))
      } else if (event.type === 'timeUpdate') {
        setPlayerState((prev) => ({ ...prev, currentTime: event.currentTime }))
      } else if (event.type === 'ended') {
        logRendererEvent('info', 'play.ended', 'Playback reached the end of the song')
        setPlayerState((prev) => ({ ...prev, status: 'idle', activeNotes: new Set() }))
      }
    })

    return () => {
      logRendererEvent('info', 'play.unmount', 'Cleaning up play screen resources', {
        filePath,
      })
      unsubscribe()
      scheduler.stop()
    }
  }, [filePath, song])

  useEffect(() => {
    let disposed = false

    async function connectMidiDevice() {
      logRendererEvent('info', 'play.midi.detect.start', 'Detecting MIDI input devices')
      setMidiState({
        status: 'checking',
        deviceName: null,
        profile: null,
      })

      try {
        const devices = await window.electronAPI.getMidiDevices()
        if (disposed) return

        logRendererEvent('info', 'play.midi.detect.result', 'MIDI device list resolved', {
          devices,
        })

        if (devices.length === 0) {
          setMidiState({
            status: 'unavailable',
            deviceName: null,
            profile: null,
          })
          return
        }

        const candidates = devices
          .map((deviceName, index) => ({
            deviceName,
            index,
            matchedByName: WORLDDE_DEVICE_PATTERN.test(deviceName),
          }))
          .sort((a, b) => {
            if (a.matchedByName === b.matchedByName) return a.index - b.index
            return a.matchedByName ? -1 : 1
          })

        logRendererEvent('info', 'play.midi.detect.ordered', 'Ordered MIDI connection candidates', {
          candidates,
        })

        for (const candidate of candidates) {
          const ok = await window.electronAPI.connectMidiDevice(candidate.index)
          if (disposed) {
            if (ok) await window.electronAPI.disconnectMidiDevice().catch(() => {})
            return
          }

          if (ok) {
            const profile = createControllerProfile(candidate.deviceName)
            setMidiState({
              status: 'connected',
              deviceName: candidate.deviceName,
              profile,
            })
            logRendererEvent('info', 'play.midi.connected', 'Connected MIDI input device', {
              index: candidate.index,
              name: candidate.deviceName,
              profile,
            })
            return
          }
        }

        setMidiState({
          status: 'error',
          deviceName: null,
          profile: null,
        })
        logRendererEvent(
          'error',
          'play.midi.connect.failed',
          'Failed to connect to any MIDI input device',
          {
            devices,
          }
        )
      } catch (error) {
        if (disposed) return
        setMidiState({
          status: 'error',
          deviceName: null,
          profile: null,
        })
        logRendererEvent('error', 'play.midi.detect.failed', 'MIDI detection failed', {
          error,
        })
      }
    }

    connectMidiDevice()

    return () => {
      disposed = true
      window.electronAPI.disconnectMidiDevice().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const profile = midiState.profile
    const scheduler = schedulerRef.current
    setKeyboardWindow((prev) => {
      if (!profile?.isWorlddeProfile || !scheduler) {
        return prev ? null : prev
      }

      const pendingGroup = scheduler.getNextPendingNoteGroup()
      const targetPitches = pendingGroup.map((note) => note.pitch)
      const desiredWindow = buildKeyboardWindow(targetPitches, profile.keyCount)

      if (!desiredWindow) {
        return prev ? null : prev
      }

      if (
        prev &&
        !desiredWindow.outOfRange &&
        !prev.outOfRange &&
        windowCoversTargets(prev, desiredWindow.targetPitches)
      ) {
        return prev
      }

      if (
        prev &&
        prev.startPitch === desiredWindow.startPitch &&
        prev.endPitch === desiredWindow.endPitch &&
        prev.outOfRange === desiredWindow.outOfRange &&
        prev.targetPitches.join(',') === desiredWindow.targetPitches.join(',')
      ) {
        return prev
      }

      return desiredWindow
    })
  }, [
    midiState.profile,
    playerState.activeTrackMask,
    playerState.currentTime,
    playerState.hintNotes,
    playerState.learningMode,
  ])

  useEffect(() => {
    if (!keyboardWindow || !midiState.profile?.isWorlddeProfile) return
    logRendererEvent('info', 'play.keyboardWindow.updated', 'Updated 25-key controller window', {
      keyboardWindow,
      deviceName: midiState.profile.deviceName,
    })
  }, [keyboardWindow, midiState.profile])

  // MIDI physical device input
  useMidiDevice(
    useCallback((pitch: number, velocity: number, isOn: boolean) => {
      const scheduler = schedulerRef.current
      if (!scheduler) return

      if (isOn) {
        logRendererEvent('debug', 'play.midi.noteOn', 'Received MIDI note on', {
          pitch,
          velocity,
        })
        scheduler.pressMidiNote(pitch)
        setPlayerState((prev) => ({
          ...prev,
          activeNotes: new Set([...prev.activeNotes, pitch]),
          hintNotes: prev.hintNotes.has(pitch)
            ? (() => {
                const s = new Set(prev.hintNotes)
                s.delete(pitch)
                return s
              })()
            : prev.hintNotes,
        }))
      } else {
        logRendererEvent('debug', 'play.midi.noteOff', 'Received MIDI note off', {
          pitch,
        })
        scheduler.releaseMidiNote(pitch)
        setPlayerState((prev) => {
          const next = new Set(prev.activeNotes)
          next.delete(pitch)
          return { ...prev, activeNotes: next }
        })
      }
    }, [])
  )

  function handlePlay() {
    logRendererEvent('info', 'play.handlePlay', 'Play requested', {
      currentTime: playerState.currentTime,
    })
    schedulerRef.current?.play()
    setPlayerState((prev) => ({ ...prev, status: 'playing' }))
  }

  function handlePause() {
    logRendererEvent('info', 'play.handlePause', 'Pause requested', {
      currentTime: playerState.currentTime,
    })
    schedulerRef.current?.pause()
    setPlayerState((prev) => ({ ...prev, status: 'paused' }))
  }

  function handleStop() {
    logRendererEvent('info', 'play.handleStop', 'Stop requested')
    schedulerRef.current?.stop()
    setPlayerState((prev) => ({
      ...prev,
      status: 'idle',
      currentTime: 0,
      activeNotes: new Set(),
      hintNotes: new Set(),
    }))
  }

  function handleSeek(time: number) {
    logRendererEvent('info', 'play.handleSeek', 'Seek requested', { time })
    schedulerRef.current?.seekTo(time)
    setPlayerState((prev) => ({ ...prev, currentTime: time, activeNotes: new Set() }))
  }

  function handleSpeedChange(speed: number) {
    logRendererEvent('info', 'play.handleSpeedChange', 'Speed changed', { speed })
    schedulerRef.current?.setSpeed(speed)
    setPlayerState((prev) => ({ ...prev, speed }))
  }

  function handleToggleLearning() {
    const enabled = !playerState.learningMode
    logRendererEvent('info', 'play.handleToggleLearning', 'Learning mode toggled', { enabled })
    schedulerRef.current?.setLearningMode(enabled)
    setPlayerState((prev) => ({
      ...prev,
      learningMode: enabled,
      hintNotes: enabled ? prev.hintNotes : new Set(),
    }))
  }

  function handleToggleTrack(index: number) {
    const mask = [...playerState.activeTrackMask]
    mask[index] = !mask[index]
    logRendererEvent('info', 'play.handleToggleTrack', 'Track visibility toggled', {
      index,
      enabled: mask[index],
    })
    schedulerRef.current?.setActiveTrackMask(mask)
    setPlayerState((prev) => ({ ...prev, activeTrackMask: mask }))
  }

  function handlePianoNoteOn(pitch: number) {
    const scheduler = schedulerRef.current
    scheduler?.pressMidiNote(pitch)
    setPlayerState((prev) => ({
      ...prev,
      activeNotes: new Set([...prev.activeNotes, pitch]),
    }))
  }

  function handlePianoNoteOff(pitch: number) {
    const scheduler = schedulerRef.current
    scheduler?.releaseMidiNote(pitch)
    setPlayerState((prev) => {
      const next = new Set(prev.activeNotes)
      next.delete(pitch)
      return { ...prev, activeNotes: next }
    })
  }

  return (
    <main className="ph-play" data-ui="play-screen">
      {/* Title bar */}
      <header className="ph-play__titlebar" data-ui="play-titlebar">
        <div className="ph-play__song-meta" data-ui="play-song-meta">
          <span className="ph-play__song-title" data-ui="play-song-title">
            {song.title}
          </span>
          <span className="ph-play__silent-mode" data-ui="silent-mode-label">
            {SILENT_MODE_LABEL}
          </span>
        </div>
        <div className="ph-play__status-list" data-ui="play-status-list">
          <span
            className="ph-status-text"
            data-ui="midi-status"
            role="status"
            style={{ '--ph-status-color': midiStatusColor } as CSSProperties}
          >
            {midiStatusLabel}
          </span>
          {rangeStatusLabel && (
            <span
              className="ph-status-text"
              data-ui="range-status"
              role="status"
              style={{ '--ph-status-color': rangeStatusColor } as CSSProperties}
            >
              {rangeStatusLabel}
            </span>
          )}
        </div>
      </header>

      {/* Waterfall */}
      <section className="ph-play__waterfall" data-ui="play-waterfall">
        <Waterfall
          song={song}
          playerState={playerState}
          keyboardWindow={visibleKeyboardWindow}
          compactView={compactWorlddeView}
        />
      </section>

      {/* Piano keyboard */}
      <Piano
        activeNotes={playerState.activeNotes}
        hintNotes={playerState.hintNotes}
        keyboardWindow={visibleKeyboardWindow}
        compactView={compactWorlddeView}
        onNoteOn={handlePianoNoteOn}
        onNoteOff={handlePianoNoteOff}
        noteTrackMap={noteTrackMapRef.current}
      />

      {/* Controls */}
      <Controls
        state={playerState}
        duration={song.duration}
        trackCount={song.trackCount}
        midiStatusLabel={midiStatusLabel}
        midiStatusColor={midiStatusColor}
        rangeStatusLabel={rangeStatusLabel}
        rangeStatusColor={rangeStatusColor}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        onToggleLearning={handleToggleLearning}
        onToggleTrack={handleToggleTrack}
        onBack={onBack}
      />
    </main>
  )
}
