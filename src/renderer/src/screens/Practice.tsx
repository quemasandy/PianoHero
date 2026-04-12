import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Piano from '../components/Piano'
import { useMidiDevice } from '../hooks/useMidiDevice'
import { logRendererEvent } from '../lib/diagnostics'
import {
  CHORD_EXERCISES,
  PRACTICE_KEYBOARD_WINDOW,
  SCALE_EXERCISES,
  formatPracticeNotes,
  pitchToPracticeLabel
} from '../lib/practiceCatalog'
import {
  CHORD_SIMULTANEITY_MS,
  createChordSession,
  createScaleSession,
  evaluateChordNoteOn,
  evaluateScaleNoteOn,
  releasePracticeNote
} from '../lib/practiceEngine'
import type {
  ChordExerciseDefinition,
  MidiControllerProfile,
  PracticeSessionState,
  PracticeView,
  ScaleExerciseDefinition
} from '../types'

const WORLDDE_DEVICE_PATTERN = /worldde|easykey/i
const WORLDDE_KEY_COUNT = 25
const FULL_KEYBOARD_COUNT = 88
const RANGE_STATUS_LABEL =
  `Rango de práctica: ${pitchToPracticeLabel(PRACTICE_KEYBOARD_WINDOW.startPitch)}–${pitchToPracticeLabel(PRACTICE_KEYBOARD_WINDOW.endPitch)}`

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
    matchedByName
  }
}

function clearLiveSessionState(session: PracticeSessionState): PracticeSessionState {
  return {
    ...session,
    pressedNotes: new Set(),
    wrongNotes: new Set()
  }
}

export default function Practice() {
  const [view, setView] = useState<PracticeView>('practice_home')
  const [scaleIndex, setScaleIndex] = useState(0)
  const [chordIndex, setChordIndex] = useState(0)
  const [scaleSession, setScaleSession] = useState(() => createScaleSession(SCALE_EXERCISES[0]))
  const [chordSession, setChordSession] = useState(() => createChordSession(CHORD_EXERCISES[0]))
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: 'neutral',
    message: 'Elige una práctica y toca en tu teclado MIDI o en el piano de pantalla.'
  })
  const [midiState, setMidiState] = useState<{
    status: 'checking' | 'connected' | 'unavailable' | 'error'
    deviceName: string | null
    profile: MidiControllerProfile | null
  }>({
    status: 'checking',
    deviceName: null,
    profile: null
  })
  const [monitorPressedNotes, setMonitorPressedNotes] = useState<Set<number>>(() => new Set())
  const [lastMidiNote, setLastMidiNote] = useState<number | null>(null)
  const [lastMidiActivityAt, setLastMidiActivityAt] = useState<number | null>(null)

  const chordNoteTimesRef = useRef<Map<number, number>>(new Map())
  const lastScaleAdvanceRef = useRef<{ pitch: number; at: number } | null>(null)
  const lastMidiLogRef = useRef<{ pitch: number; at: number } | null>(null)
  const isMountedRef = useRef(true)
  const midiStatusRef = useRef<'checking' | 'connected' | 'unavailable' | 'error'>('checking')

  const activeScaleExercise = SCALE_EXERCISES[scaleIndex]
  const activeChordExercise = CHORD_EXERCISES[chordIndex]

  const activeSession = view === 'scale_session'
    ? scaleSession
    : view === 'chord_session'
      ? chordSession
      : null

  const activeExpectedNotes = activeSession?.expectedNotes ?? []
  const targetNotes = useMemo(
    () => new Set(activeExpectedNotes),
    [activeExpectedNotes]
  )
  const correctPressedNotes = useMemo(() => {
    if (!activeSession) return new Set<number>()

    return new Set(
      [...activeSession.pressedNotes].filter(note => activeExpectedNotes.includes(note))
    )
  }, [activeExpectedNotes, activeSession])
  const pianoActiveNotes = useMemo(() => {
    const next = new Set<number>(monitorPressedNotes)
    activeSession?.pressedNotes.forEach(note => next.add(note))
    return next
  }, [activeSession, monitorPressedNotes])
  const lastMidiLabel = lastMidiNote === null ? null : pitchToPracticeLabel(lastMidiNote)
  const midiMonitorLabel = lastMidiLabel
    ? `Última nota MIDI: ${lastMidiLabel}`
    : midiState.status === 'connected'
      ? 'Pulsa una tecla en tu teclado MIDI para probar la conexión.'
      : 'Conecta tu teclado MIDI y vuelve a probar.'
  const midiMonitorBadgeLabel =
    midiState.status === 'connected' ? 'Conectado' :
    midiState.status === 'checking' ? 'Buscando...' :
    midiState.status === 'unavailable' ? 'Sin MIDI' :
    'Error MIDI'

  const midiStatusLabel =
    midiState.status === 'connected' ? `MIDI: ${midiState.deviceName}` :
    midiState.status === 'checking' ? 'MIDI: buscando teclado...' :
    midiState.status === 'unavailable' ? 'MIDI: no detectado' :
    'MIDI: error de conexión'

  const midiStatusColor =
    midiState.status === 'connected' ? '#06d6a0' :
    midiState.status === 'checking' ? '#4cc9f0' :
    midiState.status === 'unavailable' ? '#ffd166' :
    '#f72585'

  function resetScaleSession(index = scaleIndex) {
    const exercise = SCALE_EXERCISES[index]
    setScaleSession(createScaleSession(exercise))
    lastScaleAdvanceRef.current = null
    setFeedback({
      kind: 'neutral',
      message: `Escala lista: ${exercise.name}. Empieza en ${exercise.startLabel}.`
    })
    logRendererEvent('info', 'practice.scale.reset', 'Scale exercise reset', {
      exerciseId: exercise.id,
      exerciseName: exercise.name
    })
  }

  function resetChordSession(index = chordIndex) {
    const exercise = CHORD_EXERCISES[index]
    setChordSession(createChordSession(exercise))
    chordNoteTimesRef.current.clear()
    setFeedback({
      kind: 'neutral',
      message: `Progresión lista: ${exercise.name}. Empieza con ${exercise.progression[0].chordName}.`
    })
    logRendererEvent('info', 'practice.chord.reset', 'Chord exercise reset', {
      exerciseId: exercise.id,
      exerciseName: exercise.name
    })
  }

  function clearLiveStateAcrossSessions() {
    setScaleSession(prev => clearLiveSessionState(prev))
    setChordSession(prev => clearLiveSessionState(prev))
    chordNoteTimesRef.current.clear()
    lastScaleAdvanceRef.current = null
  }

  function openHome() {
    clearLiveStateAcrossSessions()
    setView('practice_home')
    setFeedback({
      kind: 'neutral',
      message: 'Selecciona si quieres practicar escalas o acordes para C Jam Blues.'
    })
    logRendererEvent('info', 'practice.view.home', 'Returned to practice home')
  }

  function openScaleSession() {
    clearLiveStateAcrossSessions()
    setView('scale_session')
    resetScaleSession(scaleIndex)
    logRendererEvent('info', 'practice.view.scales', 'Opened scale practice session', {
      exerciseId: activeScaleExercise.id
    })
  }

  function openChordSession() {
    clearLiveStateAcrossSessions()
    setView('chord_session')
    resetChordSession(chordIndex)
    logRendererEvent('info', 'practice.view.chords', 'Opened chord practice session', {
      exerciseId: activeChordExercise.id
    })
  }

  function goToPreviousScaleExercise() {
    const nextIndex = (scaleIndex - 1 + SCALE_EXERCISES.length) % SCALE_EXERCISES.length
    setScaleIndex(nextIndex)
    setView('scale_session')
    resetScaleSession(nextIndex)
    logRendererEvent('info', 'practice.scale.previous', 'Moved to previous scale exercise', {
      exerciseId: SCALE_EXERCISES[nextIndex].id
    })
  }

  function goToNextScaleExercise() {
    const nextIndex = (scaleIndex + 1) % SCALE_EXERCISES.length
    setScaleIndex(nextIndex)
    setView('scale_session')
    resetScaleSession(nextIndex)
    logRendererEvent('info', 'practice.scale.next', 'Moved to next scale exercise', {
      exerciseId: SCALE_EXERCISES[nextIndex].id
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

  const refreshMidiConnection = useCallback(async (
    reason: 'initial' | 'manual' | 'retry' | 'focus' = 'manual'
  ) => {
    logRendererEvent('info', 'practice.midi.detect.start', 'Detecting MIDI input devices for practice mode', {
      reason
    })
    setMidiState({
      status: 'checking',
      deviceName: null,
      profile: null
    })

    try {
      await window.electronAPI.disconnectMidiDevice().catch(() => {})

      const devices = await window.electronAPI.getMidiDevices()
      if (!isMountedRef.current) return

      logRendererEvent('info', 'practice.midi.detect.result', 'MIDI device list resolved', {
        reason,
        devices
      })

      if (devices.length === 0) {
        setMonitorPressedNotes(new Set())
        setMidiState({
          status: 'unavailable',
          deviceName: null,
          profile: null
        })
        logRendererEvent('warn', 'practice.midi.unavailable', 'No MIDI devices detected for practice mode', {
          reason
        })
        return
      }

      const candidates = devices
        .map((deviceName, index) => ({
          deviceName,
          index,
          matchedByName: WORLDDE_DEVICE_PATTERN.test(deviceName)
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
            profile
          })
          logRendererEvent('info', 'practice.midi.connected', 'Connected MIDI input device', {
            reason,
            name: candidate.deviceName,
            profile
          })
          return
        }
      }

      setMidiState({
        status: 'error',
        deviceName: null,
        profile: null
      })
      logRendererEvent('error', 'practice.midi.connect.failed', 'Could not connect any detected MIDI device', {
        reason,
        devices
      })
    } catch (error) {
      if (!isMountedRef.current) return

      setMidiState({
        status: 'error',
        deviceName: null,
        profile: null
      })
      logRendererEvent('error', 'practice.midi.detect.failed', 'Failed to initialize MIDI practice device', {
        reason,
        error
      })
    }
  }, [])

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

  const handleNoteInput = useCallback((pitch: number, isOn: boolean, source: 'midi' | 'mouse') => {
    setMonitorPressedNotes(prev => {
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
            view
          })
        }
      }
    }

    if (view === 'practice_home') return

    if (!isOn) {
      if (view === 'scale_session') {
        setScaleSession(prev => releasePracticeNote(prev, pitch))
      } else {
        chordNoteTimesRef.current.delete(pitch)
        setChordSession(prev => releasePracticeNote(prev, pitch))
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
      setScaleSession(prev => {
        evaluation = evaluateScaleNoteOn(prev, activeScaleExercise, pitch)
        return evaluation.session
      })

      if (!evaluation) return

      if (evaluation.outcome === 'wrong') {
        const expectedPitch = activeScaleExercise.noteSequence[Math.min(
          evaluation.session.stepIndex,
          activeScaleExercise.noteSequence.length - 1
        )]
        setFeedback({
          kind: 'wrong',
          message: `Nota incorrecta: ${pitchToPracticeLabel(pitch)}. La siguiente correcta es ${pitchToPracticeLabel(expectedPitch)}.`
        })
        logRendererEvent('warn', 'practice.scale.note.wrong', 'Wrong note during scale practice', {
          source,
          pitch,
          exerciseId: activeScaleExercise.id,
          expectedPitch
        })
        return
      }

      if (evaluation.outcome === 'complete') {
        lastScaleAdvanceRef.current = { pitch, at: now }
        setFeedback({
          kind: 'complete',
          message: `${activeScaleExercise.name} completada.`
        })
        logRendererEvent('info', 'practice.scale.complete', 'Completed scale exercise', {
          source,
          exerciseId: activeScaleExercise.id
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
            : `${activeScaleExercise.name} completada.`
        })
        logRendererEvent('info', 'practice.scale.note.correct', 'Correct note during scale practice', {
          source,
          pitch,
          exerciseId: activeScaleExercise.id,
          nextPitch
        })
      }

      return
    }

    const timestamp = performance.now()
    chordNoteTimesRef.current.set(pitch, timestamp)

    let evaluation = null as ReturnType<typeof evaluateChordNoteOn> | null
    setChordSession(prev => {
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

    const currentPrompt = activeChordExercise.progression[Math.min(chordSession.stepIndex, activeChordExercise.progression.length - 1)]

    if (evaluation.outcome === 'wrong') {
      setFeedback({
        kind: 'wrong',
        message: `Nota extra: ${pitchToPracticeLabel(pitch)}. Mantén el voicing de ${currentPrompt.chordName}.`
      })
      logRendererEvent('warn', 'practice.chord.note.wrong', 'Wrong note during chord practice', {
        source,
        pitch,
        chordName: currentPrompt.chordName,
        expectedNotes: currentPrompt.targetNotes
      })
      return
    }

    if (evaluation.outcome === 'complete') {
      chordNoteTimesRef.current.clear()
      setFeedback({
        kind: 'complete',
        message: 'Progresión completada. Buen trabajo.'
      })
      logRendererEvent('info', 'practice.chord.complete', 'Completed chord progression practice', {
        source,
        exerciseId: activeChordExercise.id
      })
      return
    }

    if (evaluation.outcome === 'correct') {
      chordNoteTimesRef.current.clear()
      const nextPrompt = activeChordExercise.progression[evaluation.session.stepIndex]
      setFeedback({
        kind: 'correct',
        message: nextPrompt
          ? `Correcto. Siguiente compás: ${nextPrompt.chordName}.`
          : 'Progresión completada.'
      })
      logRendererEvent('info', 'practice.chord.bar.correct', 'Advanced chord progression bar', {
        source,
        completedChord: currentPrompt.chordName,
        nextChord: nextPrompt?.chordName
      })
      return
    }

    if (evaluation.outcome === 'partial') {
      const matchedNotes = evaluation.session.expectedNotes.filter(note => evaluation.session.pressedNotes.has(note)).length
      setFeedback({
        kind: 'neutral',
        message: `${currentPrompt.chordName}: ${matchedNotes}/3 notas correctas.`
      })
      logRendererEvent('debug', 'practice.chord.note.partial', 'Partial chord match during practice', {
        source,
        pitch,
        chordName: currentPrompt.chordName,
        matchedNotes
      })
    }
  }, [
    activeChordExercise,
    activeScaleExercise,
    chordSession.stepIndex,
    scaleSession.stepIndex,
    view
  ])

  useMidiDevice(useCallback((pitch: number, _velocity: number, isOn: boolean) => {
    handleNoteInput(pitch, isOn, 'midi')
  }, [handleNoteInput]))

  function handlePianoNoteOn(pitch: number) {
    handleNoteInput(pitch, true, 'mouse')
  }

  function handlePianoNoteOff(pitch: number) {
    handleNoteInput(pitch, false, 'mouse')
  }

  function renderHome() {
    return (
      <>
        <div style={homeGridStyle}>
          <PracticeCard
            title="Escalas"
            subtitle="C Blues, Pentatónica Menor y Pentatónica Mayor"
            description="Práctica guiada de una octava subiendo y bajando, validando cada nota en orden."
            actionLabel="Practicar escalas"
            accent="#4cc9f0"
            onClick={openScaleSession}
          />
          <PracticeCard
            title="Acordes"
            subtitle="Shell voicings 1-3-b7 del blues estándar"
            description="Recorre los 12 compases de C Jam Blues y no avances hasta tocar el acorde correcto."
            actionLabel="Practicar acordes"
            accent="#f72585"
            onClick={openChordSession}
          />
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Prueba tu teclado MIDI</h2>
              <p style={panelBodyStyle}>
                Esta vista ya escucha el teclado aunque todavía no hayas entrado en un ejercicio.
              </p>
            </div>
            <div style={metaBadgeStyle(midiStatusColor)}>
              {midiMonitorBadgeLabel}
            </div>
          </div>

          <div style={practiceSummaryRowStyle}>
            <span style={{ color: '#8be9fd' }}>{midiMonitorLabel}</span>
            <span style={{ color: '#8892a4' }}>
              {monitorPressedNotes.size > 0
                ? `${monitorPressedNotes.size} tecla(s) activas`
                : lastMidiActivityAt
                  ? `Última actividad: ${new Date(lastMidiActivityAt).toLocaleTimeString()}`
                  : 'Sin actividad todavía'}
            </span>
          </div>

          {midiState.status !== 'connected' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                onClick={() => { void refreshMidiConnection('manual') }}
                style={buttonStyle('#4cc9f0', '#001219')}
              >
                Reconectar MIDI
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  function renderScaleSession(exercise: ScaleExerciseDefinition, session: PracticeSessionState) {
    return (
      <>
        <SessionControls
          mode="scales"
          onBack={openHome}
          onPrevious={goToPreviousScaleExercise}
          onNext={goToNextScaleExercise}
          onReset={restartActiveSession}
          nextDisabled={false}
          previousDisabled={false}
          onSwitchToScales={openScaleSession}
          onSwitchToChords={openChordSession}
        />

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>{exercise.name}</h2>
              <p style={panelBodyStyle}>{exercise.description}</p>
            </div>
            <div style={metaBadgeStyle('#4cc9f0')}>
              {session.status === 'complete'
                ? 'Completada'
                : `Paso ${Math.min(session.stepIndex + 1, exercise.noteSequence.length)} / ${exercise.noteSequence.length}`}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {exercise.noteSequence.map((pitch, index) => {
              const completed = index < session.stepIndex || session.status === 'complete'
              const current = index === session.stepIndex && session.status !== 'complete'

              return (
                <div
                  key={`${exercise.id}-${index}-${pitch}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: current ? '1px solid #4cc9f0' : '1px solid #2d3a56',
                    background: completed ? 'rgba(6,214,160,0.18)' : current ? 'rgba(76,201,240,0.12)' : 'rgba(255,255,255,0.03)',
                    color: completed ? '#06d6a0' : current ? '#8be9fd' : '#c8d1e8',
                    fontWeight: 700,
                    minWidth: '64px',
                    textAlign: 'center'
                  }}
                >
                  {pitchToPracticeLabel(pitch)}
                </div>
              )
            })}
          </div>

          <div style={practiceSummaryRowStyle}>
            <span style={{ color: '#8be9fd' }}>
              {session.expectedNotes[0]
                ? `Toca ahora: ${pitchToPracticeLabel(session.expectedNotes[0])}`
                : 'Escala terminada'}
            </span>
            <span style={{ color: '#8892a4' }}>
              Registro: {exercise.startLabel}–{exercise.endLabel}
            </span>
          </div>
        </div>
      </>
    )
  }

  function renderChordSession(exercise: ChordExerciseDefinition, session: PracticeSessionState) {
    const currentPrompt = exercise.progression[Math.min(session.stepIndex, exercise.progression.length - 1)]

    return (
      <>
        <SessionControls
          mode="chords"
          onBack={openHome}
          onPrevious={() => {}}
          onNext={() => {}}
          onReset={restartActiveSession}
          nextDisabled={true}
          previousDisabled={true}
          onSwitchToScales={openScaleSession}
          onSwitchToChords={openChordSession}
        />

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>{exercise.name}</h2>
              <p style={panelBodyStyle}>{exercise.description}</p>
            </div>
            <div style={metaBadgeStyle('#f72585')}>
              {session.status === 'complete'
                ? 'Progresión completa'
                : `Compás ${Math.min(session.stepIndex + 1, exercise.progression.length)} / ${exercise.progression.length}`}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' }}>
            {exercise.progression.map((prompt, index) => {
              const completed = index < session.stepIndex || session.status === 'complete'
              const current = index === session.stepIndex && session.status !== 'complete'

              return (
                <div
                  key={`${exercise.id}-${prompt.barIndex}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: current ? '1px solid #f72585' : '1px solid #2d3a56',
                    background: completed ? 'rgba(6,214,160,0.18)' : current ? 'rgba(247,37,133,0.12)' : 'rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ color: '#8892a4', fontSize: '11px', marginBottom: '2px' }}>
                    Compás {prompt.barIndex + 1}
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 800 }}>
                    {prompt.chordName}
                  </div>
                  <div style={{ color: 'var(--slate-300)', fontSize: '11px', marginTop: '2px' }}>
                    {formatPracticeNotes(prompt.targetNotes)}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={practiceSummaryRowStyle}>
            <span style={{ color: '#ff7ab6' }}>
              {session.status === 'complete'
                ? 'Progresión terminada'
                : `Toca: ${currentPrompt.chordName} · ${formatPracticeNotes(currentPrompt.targetNotes)}`}
            </span>
            <span style={{ color: '#8892a4' }}>
              Tolerancia: {CHORD_SIMULTANEITY_MS} ms
            </span>
          </div>
        </div>
      </>
    )
  }

  function renderKeyboardGuide() {
    if (view === 'practice_home') {
      return (
        <div style={keyboardGuideStyle}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ color: '#8be9fd', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Monitor del teclado
            </div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>
              {lastMidiLabel ? `Entrando: ${lastMidiLabel}` : 'Toca cualquier tecla para verificar MIDI'}
            </div>
            <div style={{ color: '#8892a4', fontSize: '14px' }}>
              El teclado inferior se ilumina en tiempo real cuando llega una nota MIDI.
            </div>
          </div>
          <div style={keyboardLegendStyle}>
            <LegendPill label="Objetivo" background="#ffd166" color="#18131a" />
            <LegendPill label="Correcta" background="#06d6a0" color="#ffffff" />
            <LegendPill label="Incorrecta" background="#ff6b81" color="#ffffff" />
          </div>
        </div>
      )
    }

    if (view === 'scale_session') {
      const nextNotes = activeScaleExercise.noteSequence.slice(scaleSession.stepIndex, scaleSession.stepIndex + 4)

      return (
        <div style={keyboardGuideStyle}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ color: '#8be9fd', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Guía del teclado
            </div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>
              {scaleSession.status === 'complete'
                ? 'Escala terminada'
                : `Siguiente nota: ${pitchToPracticeLabel(scaleSession.expectedNotes[0])}`}
            </div>
            <div style={{ color: '#c8d1e8', fontSize: '14px' }}>
              {scaleSession.status === 'complete'
                ? 'Puedes reiniciar o pasar a la siguiente escala.'
                : 'La nota objetivo aparece marcada en amarillo sobre el teclado.'}
            </div>
          </div>

          <div style={keyboardGuideNotesRowStyle}>
            {nextNotes.map((pitch, index) => (
              <NoteGuideChip
                key={`scale-guide-${pitch}-${index}`}
                label={pitchToPracticeLabel(pitch)}
                tone={index === 0 ? 'target' : 'muted'}
              />
            ))}
          </div>

          <div style={keyboardLegendStyle}>
            <LegendPill label="Objetivo actual" background="#ffd166" color="#18131a" />
            <LegendPill label="Próximas" background="rgba(255,255,255,0.08)" color="#c8d1e8" />
            <LegendPill label="Correcta" background="#06d6a0" color="#ffffff" />
            <LegendPill label="Incorrecta" background="#ff6b81" color="#ffffff" />
          </div>
        </div>
      )
    }

    const currentPrompt = activeChordExercise.progression[Math.min(chordSession.stepIndex, activeChordExercise.progression.length - 1)]

    return (
      <div style={keyboardGuideStyle}>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ color: '#ff7ab6', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Guía del teclado
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>
            {chordSession.status === 'complete'
              ? 'Progresión terminada'
              : `Toca ${currentPrompt.chordName} con una sola mano`}
          </div>
          <div style={{ color: '#c8d1e8', fontSize: '14px' }}>
            {chordSession.status === 'complete'
              ? 'Puedes reiniciar para volver a practicar la progresión.'
              : 'Pulsa juntas las tres notas amarillas del voicing actual.'}
          </div>
        </div>

        <div style={keyboardGuideNotesRowStyle}>
          {currentPrompt.targetNotes.map(pitch => (
            <NoteGuideChip
              key={`chord-guide-${currentPrompt.chordName}-${pitch}`}
              label={pitchToPracticeLabel(pitch)}
              tone={correctPressedNotes.has(pitch) ? 'correct' : activeSession?.wrongNotes.has(pitch) ? 'wrong' : 'target'}
            />
          ))}
        </div>

        <div style={keyboardLegendStyle}>
          <LegendPill label="Notas a tocar" background="#ffd166" color="#18131a" />
          <LegendPill label="Ya presionada" background="#06d6a0" color="#ffffff" />
          <LegendPill label="Nota extra" background="#ff6b81" color="#ffffff" />
        </div>
      </div>
    )
  }

  return (
    <div style={rootStyle}>
      <div style={titleBarStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', color: 'var(--text)', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>PianoHero</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--slate-400)', fontSize: '15px' }}>
            Practica las escalas y acordes clave de C Jam Blues.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {midiState.status !== 'connected' && (
            <button
              onClick={() => { void refreshMidiConnection('manual') }}
              style={buttonStyle('#223a5e', '#8be9fd')}
            >
              Reconectar MIDI
            </button>
          )}
          <span style={{ color: '#ffd166', fontSize: '12px', fontWeight: 700 }}>
            Audio interno: OFF · Usa GarageBand
          </span>
          <span style={{ color: '#4cc9f0', fontSize: '12px', fontWeight: 700 }}>
            {RANGE_STATUS_LABEL}
          </span>
          <span style={{ color: midiStatusColor, fontSize: '12px', fontWeight: 700 }}>
            {midiStatusLabel}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto' }}>
        {view === 'practice_home'
          ? renderHome()
          : (
            <>
              <FeedbackBanner feedback={feedback} />
              {view === 'scale_session'
                ? renderScaleSession(activeScaleExercise, scaleSession)
                : renderChordSession(activeChordExercise, chordSession)
              }
            </>
          )}

        {renderKeyboardGuide()}
      </div>

      <div style={{ padding: '0 24px 0 24px', flexShrink: 0 }}>
        <Piano
          activeNotes={pianoActiveNotes}
          hintNotes={view === 'practice_home' ? new Set() : targetNotes}
          correctNotes={view === 'practice_home' ? undefined : correctPressedNotes}
          wrongNotes={view === 'practice_home' ? undefined : activeSession?.wrongNotes ?? new Set()}
          keyboardWindow={PRACTICE_KEYBOARD_WINDOW}
          compactView={true}
          onNoteOn={handlePianoNoteOn}
          onNoteOff={handlePianoNoteOff}
        />
      </div>
    </div>
  )
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  const color = feedback.kind === 'wrong'
    ? '#ff6b81'
    : feedback.kind === 'correct'
      ? '#06d6a0'
      : feedback.kind === 'complete'
        ? '#ffd166'
        : '#8be9fd'

  const background = feedback.kind === 'wrong'
    ? 'rgba(255,107,129,0.12)'
    : feedback.kind === 'correct'
      ? 'rgba(6,214,160,0.12)'
      : feedback.kind === 'complete'
        ? 'rgba(255,209,102,0.12)'
        : 'rgba(76,201,240,0.12)'

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '14px',
      border: `1px solid ${color}`,
      background,
      color,
      fontWeight: 700
    }}>
      {feedback.message}
    </div>
  )
}

function NoteGuideChip({
  label,
  tone
}: {
  label: string
  tone: 'target' | 'correct' | 'wrong' | 'muted'
}) {
  const palette = tone === 'correct'
    ? { background: 'rgba(6,214,160,0.18)', border: '#06d6a0', color: '#eafff8' }
    : tone === 'wrong'
      ? { background: 'rgba(255,107,129,0.18)', border: '#ff6b81', color: '#fff1f4' }
      : tone === 'muted'
        ? { background: 'rgba(255,255,255,0.04)', border: '#32415f', color: '#a8b4ca' }
        : { background: 'rgba(255,209,102,0.18)', border: '#ffd166', color: '#fff5da' }

  return (
    <span style={{
      padding: '10px 14px',
      borderRadius: '12px',
      border: `1px solid ${palette.border}`,
      background: palette.background,
      color: palette.color,
      fontWeight: 800,
      fontSize: '16px',
      letterSpacing: '0.01em'
    }}>
      {label}
    </span>
  )
}

function LegendPill({
  label,
  background,
  color
}: {
  label: string
  background: string
  color: string
}) {
  return (
    <span style={{
      padding: '8px 12px',
      borderRadius: '999px',
      background,
      color,
      fontSize: '12px',
      fontWeight: 800
    }}>
      {label}
    </span>
  )
}

function PracticeCard({
  title,
  subtitle,
  description,
  actionLabel,
  accent,
  onClick
}: {
  title: string
  subtitle: string
  description: string
  actionLabel: string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="glass-panel hover-lift"
      style={{
        padding: '28px',
        textAlign: 'left',
        display: 'grid',
        gap: '12px'
      }}
    >
      <div style={{ color: accent, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
        {subtitle}
      </div>
      <div style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 800 }}>
        {title}
      </div>
      <div style={{ color: 'var(--slate-300)', fontSize: '15px', lineHeight: 1.5 }}>
        {description}
      </div>
      <span style={{ color: accent, fontWeight: 700 }}>
        {actionLabel} →
      </span>
    </button>
  )
}

function SessionControls({
  mode,
  onBack,
  onPrevious,
  onNext,
  onReset,
  previousDisabled,
  nextDisabled,
  onSwitchToScales,
  onSwitchToChords
}: {
  mode: 'scales' | 'chords'
  onBack: () => void
  onPrevious: () => void
  onNext: () => void
  onReset: () => void
  previousDisabled: boolean
  nextDisabled: boolean
  onSwitchToScales: () => void
  onSwitchToChords: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={buttonStyle('#334')}>← Volver</button>
        <div style={{ display: 'flex', gap: '6px', padding: '4px', borderRadius: '999px', background: '#101a2d', border: '1px solid #223' }}>
          <button onClick={onSwitchToScales} style={modeTabStyle(mode === 'scales')}>Escalas</button>
          <button onClick={onSwitchToChords} style={modeTabStyle(mode === 'chords')}>Acordes</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={onPrevious} disabled={previousDisabled} style={buttonStyle('#334', '#fff', previousDisabled)}>← Ejercicio</button>
        <button onClick={onReset} style={buttonStyle('#4cc9f0', '#001219')}>Reiniciar</button>
        <button onClick={onNext} disabled={nextDisabled} style={buttonStyle('#334', '#fff', nextDisabled)}>Ejercicio →</button>
      </div>
    </div>
  )
}

const rootStyle: CSSProperties = {
  minHeight: '100vh',
  maxHeight: '100vh',
  background: 'transparent',
  color: 'var(--text)',
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr) auto'
}

const titleBarStyle: CSSProperties = {
  padding: '10px 24px 8px',
  borderBottom: '1px solid var(--border-glass)',
  background: 'rgba(11, 17, 32, 0.4)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap'
}

const homeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',
  alignContent: 'start'
}

const panelStyle: CSSProperties = {
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid var(--border-glass)',
  background: 'var(--bg-panel)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  display: 'grid',
  gap: '12px'
}

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap'
}

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '24px',
  fontWeight: 800,
  letterSpacing: '-0.02em'
}

const panelBodyStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'var(--slate-300)',
  fontSize: '15px',
  lineHeight: 1.5
}

const practiceSummaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  fontSize: '14px',
  fontWeight: 500
}

const keyboardGuideStyle: CSSProperties = {
  padding: '12px 24px',
  borderRadius: '16px',
  border: '1px solid var(--border-glass)',
  background: 'rgba(15, 23, 42, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap'
}

const keyboardGuideNotesRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap'
}

const keyboardLegendStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap'
}

function metaBadgeStyle(color: string): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: '999px',
    background: `${color}1a`,
    color,
    fontWeight: 700,
    fontSize: '13px'
  }
}

function buttonStyle(background: string, color = '#fff', disabled = false): CSSProperties {
  return {
    background,
    color,
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1
  }
}

function modeTabStyle(active: boolean): CSSProperties {
  return {
    background: active ? '#4cc9f0' : 'transparent',
    color: active ? '#001219' : '#c8d1e8',
    border: 'none',
    borderRadius: '999px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer'
  }
}
