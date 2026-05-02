import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Piano from '../components/Piano'
import SheetMusic from '../components/SheetMusic'
import { useMidiDevice } from '../hooks/useMidiDevice'
import { useBackingTrack } from '../hooks/useBackingTrack'
import { logRendererEvent } from '../lib/diagnostics'
import {
  CHORD_EXERCISES,
  PRACTICE_KEYBOARD_WINDOW,
  SCALE_EXERCISES,
  SCALE_ROOT_OPTIONS,
  getDefaultScaleRootPitchClass,
  getScaleRootOption,
  pitchToPracticeLabel,
  transposeScaleExercise,
} from '../lib/practiceCatalog'
import {
  CHORD_SIMULTANEITY_MS,
  createChordSession,
  createScaleSession,
  evaluateChordNoteOn,
  evaluateScaleNoteOn,
  releasePracticeNote,
} from '../lib/practiceEngine'
import type {
  ChordExerciseDefinition,
  MidiControllerProfile,
  PracticeSessionState,
  PracticeView,
  ScaleExerciseDefinition,
} from '../types'
import { detectChord } from '../lib/chordDetection'
import AppNavigation, { AppMode } from '../components/AppNavigation'
import { buttonStyle } from '../components/uiStyles'

const WORLDDE_DEVICE_PATTERN = /worldde|easykey/i
const WORLDDE_KEY_COUNT = 25
const FULL_KEYBOARD_COUNT = 88
const RANGE_STATUS_LABEL = `Rango de práctica: ${pitchToPracticeLabel(PRACTICE_KEYBOARD_WINDOW.startPitch)}–${pitchToPracticeLabel(PRACTICE_KEYBOARD_WINDOW.endPitch)}`

type FeedbackKind = 'neutral' | 'correct' | 'wrong' | 'complete'

interface FeedbackState {
  kind: FeedbackKind
  message: string
}

function createControllerProfile(deviceName: string): MidiControllerProfile {
  const matchedByName = WORLDDE_DEVICE_PATTERN.test(deviceName)

  return {
    deviceName,
    keyCount: matchedByName ? WORLDDE_KEY_COUNT : FULL_KEYBOARD_COUNT,
    isWorlddeProfile: matchedByName,
    matchedByName,
  }
}

function clearLiveSessionState(session: PracticeSessionState): PracticeSessionState {
  return {
    ...session,
    pressedNotes: new Set(),
    wrongNotes: new Set(),
  }
}

export default function Practice({
  currentView,
  onViewChange,
  onNavigateMode,
}: {
  currentView: PracticeView
  onViewChange: (view: PracticeView) => void
  onNavigateMode: (mode: AppMode) => void
}) {
  const view = currentView
  const [scaleIndex, setScaleIndex] = useState(0)
  const [scaleRootSelections, setScaleRootSelections] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      SCALE_EXERCISES.map((exercise) => [exercise.id, getDefaultScaleRootPitchClass(exercise)])
    )
  )
  const [chordIndex, setChordIndex] = useState(0)
  const [scaleSession, setScaleSession] = useState(() =>
    createScaleSession(
      transposeScaleExercise(SCALE_EXERCISES[0], getDefaultScaleRootPitchClass(SCALE_EXERCISES[0]))
    )
  )
  const [chordSession, setChordSession] = useState(() => createChordSession(CHORD_EXERCISES[0]))
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: 'neutral',
    message: 'Elige una práctica y toca en tu teclado MIDI o en el piano de pantalla.',
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
  const [monitorPressedNotes, setMonitorPressedNotes] = useState<Set<number>>(() => new Set())
  const [lastMidiNote, setLastMidiNote] = useState<number | null>(null)
  const [_lastMidiActivityAt, setLastMidiActivityAt] = useState<number | null>(null)

  const rhythm = useBackingTrack(120)

  const chordNoteTimesRef = useRef<Map<number, number>>(new Map())
  const lastScaleAdvanceRef = useRef<{ pitch: number; at: number } | null>(null)
  const lastMidiLogRef = useRef<{ pitch: number; at: number } | null>(null)
  const isMountedRef = useRef(true)
  const midiStatusRef = useRef<'checking' | 'connected' | 'unavailable' | 'error'>('checking')
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (view === 'chord_session' && carouselRef.current) {
      const targetChild = carouselRef.current.children[chordSession.stepIndex] as HTMLElement
      if (targetChild) {
        targetChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [chordSession.stepIndex, view])

  useEffect(() => {
    let timeoutId: number

    // Si la banda está encendida, forzamos musicalidad: evaluamos el compás siguiente en tiempo musical.
    // Asumiremos 1 compás entero (4/4) para avanzar
    const delayMs = rhythm.isPlaying ? (60000 / rhythm.bpm) * 4 : 1500

    if (view === 'scale_session' && scaleSession.status === 'complete') {
      timeoutId = window.setTimeout(() => {
        logRendererEvent(
          'info',
          'practice.scale.autoloop',
          'Auto-looping scale exercise after completion',
          {
            exerciseId: SCALE_EXERCISES[scaleIndex].id,
            delayMs,
            trigger: 'auto',
          }
        )
        resetScaleSession(scaleIndex)
      }, delayMs)
    } else if (view === 'chord_session' && chordSession.status === 'complete') {
      timeoutId = window.setTimeout(() => {
        logRendererEvent(
          'info',
          'practice.chord.autoloop',
          'Auto-looping chord exercise after completion',
          {
            exerciseId: CHORD_EXERCISES[chordIndex].id,
            delayMs,
            trigger: 'auto',
          }
        )
        resetChordSession(chordIndex)
      }, delayMs)
    }
    return () => {
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleSession.status, chordSession.status, view, rhythm.isPlaying, rhythm.bpm])

  const activeSession =
    view === 'scale_session' ? scaleSession : view === 'chord_session' ? chordSession : null

  const activeExpectedNotes = useMemo(() => activeSession?.expectedNotes ?? [], [activeSession])
  const targetNotes = useMemo(() => new Set(activeExpectedNotes), [activeExpectedNotes])
  const correctPressedNotes = useMemo(() => {
    if (!activeSession) return new Set<number>()

    return new Set(
      [...activeSession.pressedNotes].filter((note) => activeExpectedNotes.includes(note))
    )
  }, [activeExpectedNotes, activeSession])
  const pianoActiveNotes = useMemo(() => {
    const next = new Set<number>(monitorPressedNotes)
    activeSession?.pressedNotes.forEach((note) => next.add(note))
    return next
  }, [activeSession, monitorPressedNotes])
  const lastMidiLabel = lastMidiNote === null ? null : pitchToPracticeLabel(lastMidiNote)

  const activeChordName = useMemo(() => {
    if (monitorPressedNotes.size >= 2) {
      return detectChord(Array.from(monitorPressedNotes))
    }
    return null
  }, [monitorPressedNotes])

  const _midiMonitorLabel = lastMidiLabel
    ? `Última nota MIDI: ${lastMidiLabel}`
    : midiState.status === 'connected'
      ? 'Pulsa una tecla en tu teclado MIDI para probar la conexión.'
      : 'Conecta tu teclado MIDI y vuelve a probar.'
  const _midiMonitorBadgeLabel =
    midiState.status === 'connected'
      ? 'Conectado'
      : midiState.status === 'checking'
        ? 'Buscando...'
        : midiState.status === 'unavailable'
          ? 'Sin MIDI'
          : 'Error MIDI'

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
      ? '#06d6a0'
      : midiState.status === 'checking'
        ? '#4cc9f0'
        : midiState.status === 'unavailable'
          ? '#ffd166'
          : '#f72585'

  const baseScaleExercise = SCALE_EXERCISES[scaleIndex]
  const selectedScaleRootPitchClass =
    scaleRootSelections[baseScaleExercise.id] ?? getDefaultScaleRootPitchClass(baseScaleExercise)
  const selectedScaleRoot = getScaleRootOption(selectedScaleRootPitchClass)
  const activeScaleExercise = useMemo(
    () => transposeScaleExercise(baseScaleExercise, selectedScaleRootPitchClass),
    [baseScaleExercise, selectedScaleRootPitchClass]
  )
  const activeChordExercise = CHORD_EXERCISES[chordIndex]

  function getScaleExerciseForSession(index = scaleIndex, rootPitchClass?: number) {
    const baseExercise = SCALE_EXERCISES[index]
    const selectedRootPitchClass =
      rootPitchClass ??
      scaleRootSelections[baseExercise.id] ??
      getDefaultScaleRootPitchClass(baseExercise)

    return transposeScaleExercise(baseExercise, selectedRootPitchClass)
  }

  function resetScaleSession(index = scaleIndex, rootPitchClass?: number) {
    const exercise = getScaleExerciseForSession(index, rootPitchClass)
    setScaleSession(createScaleSession(exercise))
    lastScaleAdvanceRef.current = null
    setFeedback({
      kind: 'neutral',
      message: `Escala lista: ${exercise.name}. Empieza en ${exercise.startLabel}.`,
    })
    logRendererEvent('info', 'practice.scale.reset', 'Scale exercise reset', {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rootPitchClass: getDefaultScaleRootPitchClass(exercise),
    })
  }

  function resetChordSession(index = chordIndex) {
    const exercise = CHORD_EXERCISES[index]
    setChordSession(createChordSession(exercise))
    chordNoteTimesRef.current.clear()
    setFeedback({
      kind: 'neutral',
      message: `Progresión lista: ${exercise.name}. Empieza con ${exercise.progression[0].chordName}.`,
    })
    logRendererEvent('info', 'practice.chord.reset', 'Chord exercise reset', {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
    })
  }

  function clearLiveStateAcrossSessions() {
    setScaleSession((prev) => clearLiveSessionState(prev))
    setChordSession((prev) => clearLiveSessionState(prev))
    chordNoteTimesRef.current.clear()
    lastScaleAdvanceRef.current = null
  }

  function openHome() {
    clearLiveStateAcrossSessions()
    onViewChange('practice_home')
    setFeedback({
      kind: 'neutral',
      message: 'Selecciona si quieres practicar escalas o acordes para C Jam Blues.',
    })
    logRendererEvent('info', 'practice.view.home', 'Returned to practice home')
  }

  function openScaleSession() {
    clearLiveStateAcrossSessions()
    onViewChange('scale_session')
    resetScaleSession(scaleIndex)
    logRendererEvent('info', 'practice.view.scales', 'Opened scale practice session', {
      exerciseId: activeScaleExercise.id,
      rootPitchClass: selectedScaleRoot.pitchClass,
    })
  }

  function openChordSession() {
    clearLiveStateAcrossSessions()
    onViewChange('chord_session')
    resetChordSession(chordIndex)
    logRendererEvent('info', 'practice.view.chords', 'Opened chord practice session', {
      exerciseId: activeChordExercise.id,
    })
  }

  function goToPreviousScaleExercise() {
    const nextIndex = (scaleIndex - 1 + SCALE_EXERCISES.length) % SCALE_EXERCISES.length
    setScaleIndex(nextIndex)
    onViewChange('scale_session')
    resetScaleSession(nextIndex)
    logRendererEvent('info', 'practice.scale.previous', 'Moved to previous scale exercise', {
      exerciseId: getScaleExerciseForSession(nextIndex).id,
    })
  }

  function goToNextScaleExercise() {
    const nextIndex = (scaleIndex + 1) % SCALE_EXERCISES.length
    setScaleIndex(nextIndex)
    onViewChange('scale_session')
    resetScaleSession(nextIndex)
    logRendererEvent('info', 'practice.scale.next', 'Moved to next scale exercise', {
      exerciseId: getScaleExerciseForSession(nextIndex).id,
    })
  }

  function handleScaleRootChange(nextRootPitchClass: number) {
    const nextRoot = getScaleRootOption(nextRootPitchClass)
    setScaleRootSelections((prev) => ({
      ...prev,
      [baseScaleExercise.id]: nextRoot.pitchClass,
    }))
    resetScaleSession(scaleIndex, nextRoot.pitchClass)
    logRendererEvent('info', 'practice.scale.root.changed', 'Changed scale root', {
      baseExerciseId: baseScaleExercise.id,
      rootPitchClass: nextRoot.pitchClass,
      rootLabel: nextRoot.label,
    })
  }

  function goToPreviousChordExercise() {
    const nextIndex = (chordIndex - 1 + CHORD_EXERCISES.length) % CHORD_EXERCISES.length
    setChordIndex(nextIndex)
    onViewChange('chord_session')
    resetChordSession(nextIndex)
    logRendererEvent('info', 'practice.chord.previous', 'Moved to previous chord exercise', {
      exerciseId: CHORD_EXERCISES[nextIndex].id,
    })
  }

  function goToNextChordExercise() {
    const nextIndex = (chordIndex + 1) % CHORD_EXERCISES.length
    setChordIndex(nextIndex)
    onViewChange('chord_session')
    resetChordSession(nextIndex)
    logRendererEvent('info', 'practice.chord.next', 'Moved to next chord exercise', {
      exerciseId: CHORD_EXERCISES[nextIndex].id,
    })
  }

  function restartActiveSession() {
    if (view === 'scale_session') {
      resetScaleSession(scaleIndex)
      return
    }

    if (view === 'chord_session') {
      resetChordSession(chordIndex)
    }
  }

  const refreshMidiConnection = useCallback(
    async (reason: 'initial' | 'manual' | 'retry' | 'focus' = 'manual') => {
      logRendererEvent(
        'info',
        'practice.midi.detect.start',
        'Detecting MIDI input devices for practice mode',
        {
          reason,
        }
      )
      setMidiState({
        status: 'checking',
        deviceName: null,
        profile: null,
      })

      try {
        await window.electronAPI.disconnectMidiDevice().catch(() => {})

        const devices = await window.electronAPI.getMidiDevices()
        if (!isMountedRef.current) return

        logRendererEvent('info', 'practice.midi.detect.result', 'MIDI device list resolved', {
          reason,
          devices,
        })

        if (devices.length === 0) {
          setMonitorPressedNotes(new Set())
          setMidiState({
            status: 'unavailable',
            deviceName: null,
            profile: null,
          })
          logRendererEvent(
            'warn',
            'practice.midi.unavailable',
            'No MIDI devices detected for practice mode',
            {
              reason,
            }
          )
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

        for (const candidate of candidates) {
          const ok = await window.electronAPI.connectMidiDevice(candidate.index)
          if (!isMountedRef.current) {
            if (ok) await window.electronAPI.disconnectMidiDevice().catch(() => {})
            return
          }

          if (ok) {
            const profile = createControllerProfile(candidate.deviceName)
            setMonitorPressedNotes(new Set())
            setMidiState({
              status: 'connected',
              deviceName: candidate.deviceName,
              profile,
            })
            logRendererEvent('info', 'practice.midi.connected', 'Connected MIDI input device', {
              reason,
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
          'practice.midi.connect.failed',
          'Could not connect any detected MIDI device',
          {
            reason,
            devices,
          }
        )
      } catch (error) {
        if (!isMountedRef.current) return

        setMidiState({
          status: 'error',
          deviceName: null,
          profile: null,
        })
        logRendererEvent(
          'error',
          'practice.midi.detect.failed',
          'Failed to initialize MIDI practice device',
          {
            reason,
            error,
          }
        )
      }
    },
    []
  )

  useEffect(() => {
    midiStatusRef.current = midiState.status
  }, [midiState.status])

  useEffect(() => {
    isMountedRef.current = true
    void refreshMidiConnection('initial')

    const handleWindowFocus = () => {
      if (midiStatusRef.current !== 'connected') {
        void refreshMidiConnection('focus')
      }
    }

    window.addEventListener('focus', handleWindowFocus)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('focus', handleWindowFocus)
      window.electronAPI.disconnectMidiDevice().catch(() => {})
    }
  }, [refreshMidiConnection])

  useEffect(() => {
    if (midiState.status === 'connected') return

    const retryTimer = window.setInterval(() => {
      void refreshMidiConnection('retry')
    }, 4000)

    return () => window.clearInterval(retryTimer)
  }, [midiState.status, refreshMidiConnection])

  const handleNoteInput = useCallback(
    (pitch: number, isOn: boolean, source: 'midi' | 'mouse') => {
      setMonitorPressedNotes((prev) => {
        const next = new Set(prev)
        if (isOn) next.add(pitch)
        else next.delete(pitch)
        return next
      })

      if (source === 'midi') {
        setLastMidiNote(pitch)
        setLastMidiActivityAt(Date.now())

        if (isOn) {
          const now = performance.now()
          const lastLogged = lastMidiLogRef.current
          if (!lastLogged || lastLogged.pitch !== pitch || now - lastLogged.at > 150) {
            lastMidiLogRef.current = { pitch, at: now }
            logRendererEvent('debug', 'practice.midi.note', 'Received MIDI note in practice mode', {
              pitch,
              label: pitchToPracticeLabel(pitch),
              view,
            })
          }
        }
      }

      if (view === 'practice_home') return

      if (!isOn) {
        if (view === 'scale_session') {
          setScaleSession((prev) => releasePracticeNote(prev, pitch))
        } else {
          chordNoteTimesRef.current.delete(pitch)
          setChordSession((prev) => releasePracticeNote(prev, pitch))
        }
        return
      }

      if (view === 'scale_session') {
        const now = performance.now()
        const lastAccepted = lastScaleAdvanceRef.current
        if (lastAccepted && lastAccepted.pitch === pitch && now - lastAccepted.at < 120) {
          return
        }

        let evaluation = null as ReturnType<typeof evaluateScaleNoteOn> | null
        setScaleSession((prev) => {
          evaluation = evaluateScaleNoteOn(prev, activeScaleExercise, pitch)
          return evaluation.session
        })

        if (!evaluation) return

        if (evaluation.outcome === 'wrong') {
          const expectedPitch =
            activeScaleExercise.noteSequence[
              Math.min(evaluation.session.stepIndex, activeScaleExercise.noteSequence.length - 1)
            ]
          setFeedback({
            kind: 'wrong',
            message: `Nota incorrecta: ${pitchToPracticeLabel(pitch)}. La siguiente correcta es ${pitchToPracticeLabel(expectedPitch)}.`,
          })
          logRendererEvent(
            'warn',
            'practice.scale.note.wrong',
            'Wrong note during scale practice',
            {
              source,
              pitch,
              exerciseId: activeScaleExercise.id,
              expectedPitch,
            }
          )
          return
        }

        if (evaluation.outcome === 'complete') {
          lastScaleAdvanceRef.current = { pitch, at: now }
          setFeedback({
            kind: 'complete',
            message: `${activeScaleExercise.name} completada.`,
          })
          logRendererEvent('info', 'practice.scale.complete', 'Completed scale exercise', {
            source,
            exerciseId: activeScaleExercise.id,
          })
          return
        }

        if (evaluation.outcome === 'correct') {
          lastScaleAdvanceRef.current = { pitch, at: now }
          const nextPitch = evaluation.session.expectedNotes[0]
          setFeedback({
            kind: 'correct',
            message: nextPitch
              ? `Correcto. Ahora toca ${pitchToPracticeLabel(nextPitch)}.`
              : `${activeScaleExercise.name} completada.`,
          })
          logRendererEvent(
            'info',
            'practice.scale.note.correct',
            'Correct note during scale practice',
            {
              source,
              pitch,
              exerciseId: activeScaleExercise.id,
              nextPitch,
            }
          )
        }

        return
      }

      const timestamp = performance.now()
      chordNoteTimesRef.current.set(pitch, timestamp)

      let evaluation = null as ReturnType<typeof evaluateChordNoteOn> | null
      setChordSession((prev) => {
        evaluation = evaluateChordNoteOn(
          prev,
          activeChordExercise,
          pitch,
          chordNoteTimesRef.current,
          CHORD_SIMULTANEITY_MS
        )
        return evaluation.session
      })

      if (!evaluation) return

      const currentPrompt =
        activeChordExercise.progression[
          Math.min(chordSession.stepIndex, activeChordExercise.progression.length - 1)
        ]

      if (evaluation.outcome === 'wrong') {
        setFeedback({
          kind: 'wrong',
          message: `Nota extra: ${pitchToPracticeLabel(pitch)}. Mantén el voicing de ${currentPrompt.chordName}.`,
        })
        logRendererEvent('warn', 'practice.chord.note.wrong', 'Wrong note during chord practice', {
          source,
          pitch,
          chordName: currentPrompt.chordName,
          expectedNotes: currentPrompt.targetNotes,
        })
        return
      }

      if (evaluation.outcome === 'complete') {
        chordNoteTimesRef.current.clear()
        setFeedback({
          kind: 'complete',
          message: 'Progresión completada. Buen trabajo.',
        })
        logRendererEvent(
          'info',
          'practice.chord.complete',
          'Completed chord progression practice',
          {
            source,
            exerciseId: activeChordExercise.id,
          }
        )
        return
      }

      if (evaluation.outcome === 'correct') {
        chordNoteTimesRef.current.clear()
        const nextPrompt = activeChordExercise.progression[evaluation.session.stepIndex]
        setFeedback({
          kind: 'correct',
          message: nextPrompt
            ? `Correcto. Siguiente compás: ${nextPrompt.chordName}.`
            : 'Progresión completada.',
        })
        logRendererEvent('info', 'practice.chord.bar.correct', 'Advanced chord progression bar', {
          source,
          completedChord: currentPrompt.chordName,
          nextChord: nextPrompt?.chordName,
        })
        return
      }

      if (evaluation.outcome === 'partial') {
        const matchedNotes = evaluation.session.expectedNotes.filter((note) =>
          evaluation.session.pressedNotes.has(note)
        ).length
        setFeedback({
          kind: 'neutral',
          message: `${currentPrompt.chordName}: ${matchedNotes}/3 notas correctas.`,
        })
        logRendererEvent(
          'debug',
          'practice.chord.note.partial',
          'Partial chord match during practice',
          {
            source,
            pitch,
            chordName: currentPrompt.chordName,
            matchedNotes,
          }
        )
      }
    },
    [activeChordExercise, activeScaleExercise, chordSession.stepIndex, view]
  )

  useMidiDevice(
    useCallback(
      (pitch: number, _velocity: number, isOn: boolean) => {
        handleNoteInput(pitch, isOn, 'midi')
      },
      [handleNoteInput]
    )
  )

  function handlePianoNoteOn(pitch: number) {
    handleNoteInput(pitch, true, 'mouse')
  }

  function handlePianoNoteOff(pitch: number) {
    handleNoteInput(pitch, false, 'mouse')
  }

  function renderHome() {
    return (
      <>
        <div
          className="ph-practice-home__hero"
          data-ui="practice-home-hero"
          style={{
            padding: '0 0 16px 0',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h1
            className="ph-practice-home__title"
            data-ui="practice-home-title"
            style={{
              margin: 0,
              padding: '0 20px',
              fontSize: '64px',
              letterSpacing: '2px',
              lineHeight: 1.2,
              background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--primary-base) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(6, 182, 212, 0.6))',
            }}
          >
            PianoHero
          </h1>
          <p
            className="ph-practice-home__subtitle"
            data-ui="practice-home-subtitle"
            style={{
              margin: '24px 0 0',
              color: 'var(--slate-300)',
              fontSize: '22px',
              fontWeight: 500,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
            }}
          >
            Tu estudio interactivo. Domina el piano y siente la música.
          </p>
        </div>

        <section
          className="ph-practice-home__grid"
          data-ui="practice-card-grid"
          style={homeGridStyle}
        >
          <PracticeCard
            mode="scales"
            title="Escalas"
            subtitle="C Blues, Pentatónica Menor y Pentatónica Mayor"
            description="Práctica guiada de una octava subiendo y bajando, validando cada nota en orden."
            actionLabel="Practicar escalas"
            accent="var(--neon-cyan)"
            onClick={openScaleSession}
          />
          <PracticeCard
            mode="chords"
            title="Acordes"
            subtitle="Shell voicings 1-3-b7 del blues estándar"
            description="Recorre los 12 compases de C Jam Blues y no avances hasta tocar el acorde correcto."
            actionLabel="Practicar acordes"
            accent="var(--neon-cyan)"
            onClick={openChordSession}
          />
          <PracticeCard
            mode="songs"
            title="Lectura musical"
            subtitle="Práctica de canciones"
            description="Aprende a leer partituras tocando canciones completas con acompañamiento."
            actionLabel="Practicar lectura"
            accent="var(--neon-cyan)"
            onClick={() => onNavigateMode('songs')}
          />
        </section>

        <div className="ph-practice-home__monitor-row" data-ui="practice-monitor-row">
          <div
            className="ph-practice-monitor"
            data-midi-status={midiState.status}
            data-ui="practice-monitor"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-glass)',
              borderRadius: '999px',
              fontSize: '13px',
              color: '#8892a4',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
            }}
          >
            <div className="ph-practice-monitor__midi" data-ui="practice-monitor-midi">
              <div
                className="ph-practice-monitor__status-dot"
                data-state={midiState.status === 'connected' ? 'connected' : 'inactive'}
                data-ui="midi-status-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: midiState.status === 'connected' ? '#06d6a0' : '#ff6b81',
                  boxShadow: `0 0 8px ${midiState.status === 'connected' ? 'rgba(6,214,160,0.5)' : 'rgba(255,107,129,0.5)'}`,
                }}
              />
              <span className="ph-practice-monitor__label" data-ui="midi-status-label">
                {midiState.status === 'connected' ? 'MIDI Listo' : 'MIDI Inactivo'}
              </span>
            </div>

            <div className="ph-practice-monitor__separator" data-ui="practice-monitor-separator" />

            <div
              className="ph-practice-monitor__note"
              data-note={activeChordName || lastMidiLabel || ''}
              data-state={activeChordName || lastMidiLabel ? 'active' : 'idle'}
              data-ui="practice-monitor-note"
              style={{
                width: '100px',
                textAlign: 'center',
                color: activeChordName || lastMidiLabel ? '#8be9fd' : '#8892a4',
                fontWeight: activeChordName || lastMidiLabel ? 700 : 500,
              }}
            >
              <div className="ph-truncate">
                {activeChordName
                  ? activeChordName
                  : lastMidiLabel
                    ? `Nota: ${lastMidiLabel}`
                    : 'Nota: --'}
              </div>
            </div>

            <div className="ph-practice-monitor__separator" data-ui="practice-monitor-separator" />

            <div
              className="ph-practice-monitor__active-count"
              data-count={monitorPressedNotes.size}
              data-state={monitorPressedNotes.size > 0 ? 'active' : 'idle'}
              data-ui="practice-monitor-active-count"
              style={{
                width: '70px',
                textAlign: 'center',
                fontWeight: monitorPressedNotes.size > 0 ? 600 : 500,
                color: monitorPressedNotes.size > 0 ? '#fff' : '#8892a4',
              }}
            >
              {monitorPressedNotes.size} activa{monitorPressedNotes.size !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </>
    )
  }

  function renderScaleSession(exercise: ScaleExerciseDefinition, session: PracticeSessionState) {
    return (
      <section
        className="ph-practice-session ph-practice-session--scale"
        data-exercise-id={exercise.id}
        data-state={session.status}
        data-ui="scale-session"
      >
        <div
          className="ph-practice-session__header"
          data-ui="scale-session-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div
            className="ph-practice-session__title-group"
            data-ui="scale-title-group"
            style={{ ...scaleTitleGroupStyle, flex: 1 }}
          >
            <h2
              className="ph-practice-session__title"
              data-ui="scale-title"
              style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}
            >
              {exercise.name}
            </h2>
            <label
              className="ph-scale-root-control"
              data-ui="scale-root-control"
              style={scaleRootControlStyle}
            >
              <span
                className="ph-scale-root-control__label"
                data-ui="scale-root-label"
                style={scaleRootLabelStyle}
              >
                Tonalidad
              </span>
              <select
                aria-label="Tonalidad de la escala"
                className="ph-select ph-scale-root-control__select"
                data-exercise-id={exercise.id}
                data-root={selectedScaleRoot.pitchClass}
                data-ui="scale-root-select"
                value={selectedScaleRoot.pitchClass}
                onChange={(event) => handleScaleRootChange(Number(event.target.value))}
                style={scaleRootSelectStyle}
              >
                {SCALE_ROOT_OPTIONS.map((root) => (
                  <option key={root.pitchClass} value={root.pitchClass} style={{ color: '#000' }}>
                    {root.label} · {root.localizedLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ph-practice-session__actions" data-ui="scale-session-actions">
            <button
              type="button"
              className="ph-button"
              data-ui="previous-scale-button"
              onClick={goToPreviousScaleExercise}
              disabled={false}
              style={buttonStyle('var(--bg-panel)', '#fff', false)}
            >
              ← Ejercicio
            </button>
            <button
              type="button"
              className="ph-button"
              data-ui="restart-scale-button"
              onClick={restartActiveSession}
              style={buttonStyle('var(--neon-cyan)', '#0F0F23')}
            >
              Reiniciar
            </button>
            <button
              type="button"
              className="ph-button"
              data-ui="next-scale-button"
              onClick={goToNextScaleExercise}
              disabled={false}
              style={buttonStyle('var(--bg-panel)', '#fff', false)}
            >
              Ejercicio →
            </button>
          </div>

          <div className="ph-practice-session__meta" data-ui="scale-session-meta">
            <div
              className="ph-meta-badge"
              data-ui="scale-progress-badge"
              style={metaBadgeStyle('var(--neon-cyan)')}
            >
              {session.status === 'complete'
                ? 'Completada'
                : `Paso ${Math.min(session.stepIndex + 1, exercise.noteSequence.length)} / ${exercise.noteSequence.length}`}
            </div>
          </div>
        </div>

        <div className="ph-scale-note-list" data-ui="scale-note-list">
          {exercise.noteSequence.map((pitch, index) => {
            const completed = index < session.stepIndex || session.status === 'complete'
            const current = index === session.stepIndex && session.status !== 'complete'

            return (
              <div
                key={`${exercise.id}-${index}-${pitch}`}
                className="ph-scale-note"
                data-note={pitchToPracticeLabel(pitch)}
                data-pitch={pitch}
                data-state={completed ? 'completed' : current ? 'current' : 'pending'}
                data-step-index={index}
                data-ui="scale-note"
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: current
                    ? '1px solid var(--neon-cyan)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: completed
                    ? 'rgba(59,130,246,0.18)'
                    : current
                      ? 'rgba(6,182,212,0.12)'
                      : 'var(--bg-panel)',
                  color: completed ? 'var(--neon-blue)' : current ? '#fff' : 'var(--slate-300)',
                  fontWeight: 800,
                  minWidth: '64px',
                  textAlign: 'center',
                  boxShadow: current ? '0 0 15px rgba(6,182,212,0.4)' : 'none',
                  transform: current ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s',
                }}
              >
                {pitchToPracticeLabel(pitch)}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  function renderChordSession(exercise: ChordExerciseDefinition, session: PracticeSessionState) {
    const isFirst = chordIndex === 0
    const isLast = chordIndex === CHORD_EXERCISES.length - 1

    return (
      <section
        className="ph-practice-session ph-practice-session--chord"
        data-exercise-id={exercise.id}
        data-state={session.status}
        data-ui="chord-session"
      >
        <div
          className="ph-practice-session__header"
          data-ui="chord-session-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div className="ph-practice-session__title-group" data-ui="chord-title-group">
            <h2
              className="ph-practice-session__title"
              data-ui="chord-title"
              style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}
            >
              {exercise.name}
            </h2>
          </div>

          <div className="ph-practice-session__actions" data-ui="chord-session-actions">
            <button
              type="button"
              className="ph-button"
              data-ui="previous-chord-button"
              onClick={goToPreviousChordExercise}
              disabled={isFirst}
              style={buttonStyle('var(--bg-panel)', '#fff', isFirst)}
            >
              ← Ejercicio
            </button>
            <button
              type="button"
              className="ph-button"
              data-ui="restart-chord-button"
              onClick={restartActiveSession}
              style={buttonStyle('var(--neon-cyan)', '#0F0F23')}
            >
              Reiniciar
            </button>
            <button
              type="button"
              className="ph-button"
              data-ui="next-chord-button"
              onClick={goToNextChordExercise}
              disabled={isLast}
              style={buttonStyle('var(--bg-panel)', '#fff', isLast)}
            >
              Ejercicio →
            </button>
          </div>

          <div className="ph-practice-session__meta" data-ui="chord-session-meta">
            <div
              className="ph-meta-badge"
              data-ui="chord-progress-badge"
              style={metaBadgeStyle('var(--neon-cyan)')}
            >
              {session.status === 'complete'
                ? 'Progresión completa'
                : `Compás ${Math.min(session.stepIndex + 1, exercise.progression.length)} / ${exercise.progression.length}`}
            </div>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="ph-chord-carousel ph-hide-scrollbar"
          data-ui="chord-carousel"
          style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            padding: '16px 24px',
            margin: '0 -16px',
          }}
        >
          {exercise.progression.map((prompt, index) => {
            const completed = index < session.stepIndex || session.status === 'complete'
            const current = index === session.stepIndex && session.status !== 'complete'

            return (
              <div
                key={`${exercise.id}-${prompt.barIndex}`}
                className="ph-chord-card"
                data-bar-index={prompt.barIndex}
                data-chord-name={prompt.chordName}
                data-exercise-id={exercise.id}
                data-state={completed ? 'completed' : current ? 'current' : 'pending'}
                data-ui="chord-card"
                style={{
                  flexShrink: 0,
                  width: '260px',
                  scrollSnapAlign: 'center',
                  padding: '24px',
                  borderRadius: '20px',
                  border: current ? '2px solid var(--neon-cyan)' : '1px solid var(--border-glass)',
                  background: completed
                    ? 'rgba(59,130,246,0.1)'
                    : current
                      ? 'rgba(6,182,212,0.15)'
                      : 'var(--bg-panel)',
                  boxShadow: current ? '0 0 32px rgba(6,182,212,0.3)' : 'none',
                  transform: current ? 'scale(1.04)' : 'scale(0.98)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: current || completed ? 1 : 0.6,
                }}
              >
                <div
                  className="ph-chord-card__bar"
                  data-ui="chord-card-bar"
                  style={{
                    color: current ? 'var(--neon-cyan)' : '#8892a4',
                    fontSize: '13px',
                    marginBottom: '8px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Compás {prompt.barIndex + 1}
                </div>

                <SheetMusic notes={prompt.targetNotes} active={current || completed} />

                <div
                  className="ph-chord-card__name"
                  data-ui="chord-card-name"
                  style={{
                    color: 'var(--text)',
                    fontSize: '36px',
                    fontWeight: 800,
                    textShadow: current ? '0 0 20px rgba(255,255,255,0.4)' : 'none',
                    marginTop: '-10px',
                    textAlign: 'center',
                  }}
                >
                  {prompt.chordName}
                </div>
              </div>
            )
          })}
        </div>

        {/* Resumen redundante removido para maximizar limpieza visual */}
      </section>
    )
  }

  function renderKeyboardGuide() {
    if (view === 'practice_home') {
      return null
    }

    if (view === 'scale_session') {
      const targetNote = scaleSession.expectedNotes[0]

      return (
        <div
          className="ph-keyboard-guide ph-keyboard-guide--scale"
          data-ui="keyboard-guide"
          style={{
            ...keyboardGuideStyle,
            padding: '16px 32px',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '32px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Spacer izquierdo para centrar perfectamente el pentagrama */}
          <div />

          <div className="ph-keyboard-guide__sheet-wrap" data-ui="keyboard-guide-sheet-wrap">
            {targetNote !== undefined && (
              <div
                className="ph-keyboard-guide__sheet"
                data-ui="keyboard-guide-sheet"
                style={{
                  width: '100%',
                  minWidth: '400px',
                  maxWidth: '600px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '20px',
                  border: '1px solid var(--border-glass)',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <SheetMusic
                  notes={activeScaleExercise.noteSequence}
                  mode="sequence"
                  currentIndex={scaleSession.stepIndex}
                  active={true}
                  color="var(--neon-cyan)"
                  width={Math.max(300, activeScaleExercise.noteSequence.length * 45)}
                />
              </div>
            )}
          </div>

          <div
            className="ph-keyboard-guide__prompt"
            data-ui="keyboard-guide-prompt"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'flex-end',
              textAlign: 'right',
            }}
          >
            <div
              className="ph-keyboard-guide__eyebrow"
              data-ui="keyboard-guide-eyebrow"
              style={{
                color: '#8be9fd',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Lectura en Pentagrama
            </div>
            <div className="ph-keyboard-guide__target" data-ui="keyboard-guide-target">
              {scaleSession.status === 'complete'
                ? 'Escala terminada'
                : `Siguiente nota: ${pitchToPracticeLabel(targetNote)}`}
            </div>
            <div className="ph-keyboard-guide__help" data-ui="keyboard-guide-help">
              {scaleSession.status === 'complete'
                ? 'Puedes reiniciar o pasar a la siguiente escala.'
                : 'La nota objetivo aparece también en el pentagrama.'}
            </div>

            <div
              className="ph-keyboard-legend"
              data-ui="keyboard-legend"
              style={{ ...keyboardLegendStyle, marginTop: '8px', justifyContent: 'flex-end' }}
            >
              <LegendPill label="Objetivo actual" background="var(--neon-cyan)" color="#ffffff" />
              <LegendPill label="Correcta" background="var(--neon-blue)" color="#ffffff" />
              <LegendPill label="Incorrecta" background="#ff6b81" color="#ffffff" />
            </div>
          </div>
        </div>
      )
    }

    // For chord_session, we let the new Carousel handle all UI prompting.
    return null
  }

  function renderGlobalStatusControls() {
    return (
      <div className="ph-global-controls" data-ui="global-controls">
        {midiState.status !== 'connected' && (
          <button
            type="button"
            className="ph-button"
            data-ui="reconnect-midi-button"
            onClick={() => {
              void refreshMidiConnection('manual')
            }}
            style={{ ...buttonStyle('#223a5e', '#8be9fd'), padding: '6px 16px' }}
          >
            Reconectar MIDI
          </button>
        )}

        <div
          className="ph-backing-track-control"
          data-state={rhythm.isPlaying ? 'playing' : 'stopped'}
          data-ui="backing-track-control"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '12px',
            padding: '6px 16px',
            gap: '12px',
            border: '1px solid var(--border-glass)',
          }}
        >
          <span className="ph-backing-track-control__label" data-ui="backing-track-label">
            Ensamble Jazz:
          </span>

          <button
            type="button"
            aria-pressed={rhythm.isPlaying}
            className="ph-button"
            data-state={rhythm.isPlaying ? 'playing' : 'stopped'}
            data-ui="backing-track-toggle"
            onClick={() => rhythm.togglePlay()}
            style={{
              ...buttonStyle(rhythm.isPlaying ? 'var(--neon-pink)' : '#06d6a0', '#000'),
              padding: '2px 10px',
              fontSize: '12px',
              minWidth: '70px',
              borderRadius: '8px',
            }}
          >
            {rhythm.isPlaying ? 'STOP' : 'PLAY'}
          </button>

          <div className="ph-bpm-control" data-ui="bpm-control">
            <input
              aria-label="Tempo de acompañamiento"
              className="ph-bpm-control__slider"
              data-ui="bpm-slider"
              type="range"
              min="60"
              max="240"
              value={rhythm.bpm}
              onChange={(e) => rhythm.updateBpm(Number(e.target.value))}
              style={{ width: '80px', accentColor: '#4cc9f0' }}
            />
            <span className="ph-bpm-control__value" data-ui="bpm-value">
              {rhythm.bpm} BPM
            </span>
          </div>
        </div>

        <div
          className="ph-status-pill"
          data-ui="practice-range-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '12px',
            padding: '6px 16px',
            border: '1px solid var(--border-glass)',
          }}
        >
          <span
            className="ph-status-text"
            data-ui="range-status"
            role="status"
            style={{ '--ph-status-color': '#4cc9f0' } as CSSProperties}
          >
            {RANGE_STATUS_LABEL}
          </span>
        </div>

        <div
          className="ph-status-pill"
          data-midi-status={midiState.status}
          data-ui="practice-midi-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '12px',
            padding: '6px 16px',
            border: '1px solid var(--border-glass)',
          }}
        >
          <span
            className="ph-status-text ph-status-text--truncate"
            data-ui="midi-status"
            role="status"
            style={
              {
                '--ph-status-color': midiStatusColor,
              } as CSSProperties
            }
            title={midiStatusLabel}
          >
            {midiStatusLabel}
          </span>
        </div>
      </div>
    )
  }

  return (
    <main className="ph-practice" data-ui="practice-screen" data-view={view} style={rootStyle}>
      {/* AppNavigation at the absolute top for sessions to perfectly match SongPractice alignment */}
      {view !== 'practice_home' && (
        <AppNavigation
          currentMode={view === 'scale_session' ? 'scales' : 'chords'}
          onNavigateHome={openHome}
          onNavigateMode={onNavigateMode}
        >
          {renderGlobalStatusControls()}
        </AppNavigation>
      )}

      {/* Legacy status bar shifts layout when in Home vs nested modes */}
      {view === 'practice_home' && (
        <header
          className="ph-practice__home-statusbar"
          data-ui="practice-home-statusbar"
          style={{ ...titleBarStyle, padding: '8px 40px 8px 40px', borderBottom: 'none' }}
        >
          <div
            className="ph-practice__home-statusbar-inner"
            data-ui="practice-home-statusbar-inner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              width: '100%',
            }}
          >
            {renderGlobalStatusControls()}
          </div>
        </header>
      )}

      <section
        className="ph-practice__content"
        data-ui="practice-content"
        style={{
          padding: view === 'practice_home' ? '8px 32px' : '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: view === 'practice_home' ? '16px' : '40px',
          minHeight: 0,
          overflowY: 'auto',
          justifyContent: view === 'practice_home' ? 'center' : 'flex-start',
        }}
      >
        {view === 'practice_home' ? (
          renderHome()
        ) : (
          <>
            <FeedbackBanner feedback={feedback} />
            {view === 'scale_session'
              ? renderScaleSession(activeScaleExercise, scaleSession)
              : renderChordSession(activeChordExercise, chordSession)}
          </>
        )}

        {renderKeyboardGuide()}
      </section>

      <section
        className="ph-practice__piano"
        data-ui="practice-piano-region"
        style={{ padding: '4px 32px 8px 32px', flexShrink: 0 }}
      >
        <Piano
          activeNotes={pianoActiveNotes}
          hintNotes={view === 'practice_home' ? new Set() : targetNotes}
          correctNotes={view === 'practice_home' ? undefined : correctPressedNotes}
          wrongNotes={
            view === 'practice_home' ? undefined : (activeSession?.wrongNotes ?? new Set())
          }
          keyboardWindow={PRACTICE_KEYBOARD_WINDOW}
          compactView={true}
          centerFullKeyboard={true}
          onNoteOn={handlePianoNoteOn}
          onNoteOff={handlePianoNoteOff}
        />
      </section>
    </main>
  )
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  const color =
    feedback.kind === 'wrong'
      ? '#ff6b81'
      : feedback.kind === 'correct'
        ? '#06d6a0'
        : feedback.kind === 'complete'
          ? '#ffd166'
          : '#8be9fd'

  const background =
    feedback.kind === 'wrong'
      ? 'rgba(255,107,129,0.12)'
      : feedback.kind === 'correct'
        ? 'rgba(6,214,160,0.12)'
        : feedback.kind === 'complete'
          ? 'rgba(255,209,102,0.12)'
          : 'rgba(76,201,240,0.12)'

  return (
    <div
      className="ph-feedback-banner"
      data-kind={feedback.kind}
      data-ui="feedback-banner"
      role="status"
      style={{
        padding: '14px 16px',
        borderRadius: '14px',
        border: `1px solid ${color}`,
        background,
        color,
        fontWeight: 700,
      }}
    >
      {feedback.message}
    </div>
  )
}

function LegendPill({
  label,
  background,
  color,
}: {
  label: string
  background: string
  color: string
}) {
  return (
    <span
      className="ph-legend-pill"
      data-label={label}
      data-ui="legend-pill"
      style={{
        padding: '8px 12px',
        borderRadius: '999px',
        background,
        color,
        fontSize: '12px',
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  )
}

function PracticeCard({
  mode,
  title,
  subtitle,
  description,
  actionLabel,
  accent,
  onClick,
}: {
  mode: AppMode
  title: string
  subtitle: string
  description: string
  actionLabel: string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ph-practice-card ph-glass-panel ph-hover-lift"
      data-mode={mode}
      data-ui="practice-card"
      style={{
        padding: '20px 24px',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="ph-practice-card__subtitle"
        data-ui="practice-card-subtitle"
        style={{
          color: accent,
          fontSize: '12px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
        }}
      >
        {subtitle}
      </div>
      <div
        className="ph-practice-card__title"
        data-ui="practice-card-title"
        style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 800 }}
      >
        {title}
      </div>
      <div
        className="ph-practice-card__description"
        data-ui="practice-card-description"
        style={{ color: 'var(--slate-300)', fontSize: '15px', lineHeight: 1.6, flex: 1 }}
      >
        {description}
      </div>
      <span
        className="ph-practice-card__action"
        data-ui="practice-card-action"
        style={{ color: accent, fontWeight: 700, marginTop: '8px' }}
      >
        {actionLabel} →
      </span>
    </button>
  )
}

const rootStyle: CSSProperties = {
  height: '100%',
  background: 'transparent',
  color: 'var(--text)',
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr) auto',
}

const titleBarStyle: CSSProperties = {
  padding: '16px 320px 8px 80px',
  borderBottom: '1px solid var(--border-glass)',
  background: 'rgba(11, 17, 32, 0.4)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
}

const homeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '16px',
  alignContent: 'start',
  maxWidth: '1100px',
  width: '100%',
  margin: '0 auto',
}

const keyboardGuideStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-glass)',
  borderRadius: '20px',
}

const keyboardLegendStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
}

const scaleTitleGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  minWidth: 0,
}

const scaleRootControlStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 10px',
  borderRadius: '12px',
  border: '1px solid rgba(76, 201, 240, 0.25)',
  background: 'rgba(0,0,0,0.28)',
}

const scaleRootLabelStyle: CSSProperties = {
  color: '#8be9fd',
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const scaleRootSelectStyle: CSSProperties = {
  background: '#101a2d',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '6px 28px 6px 10px',
  fontSize: '13px',
  fontWeight: 800,
  outline: 'none',
  cursor: 'pointer',
}

function metaBadgeStyle(color: string): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: '999px',
    background: `${color}1a`,
    color,
    fontWeight: 700,
    fontSize: '13px',
  }
}
