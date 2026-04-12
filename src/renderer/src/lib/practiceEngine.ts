import type {
  ChordExerciseDefinition,
  PracticeSessionState,
  ScaleExerciseDefinition
} from '../types'

export type PracticeOutcome = 'correct' | 'partial' | 'wrong' | 'complete' | 'ignored'

export interface PracticeEvaluation {
  session: PracticeSessionState
  outcome: PracticeOutcome
}

export const CHORD_SIMULTANEITY_MS = 250

function cloneSet(values: Set<number>) {
  return new Set(values)
}

export function createScaleSession(exercise: ScaleExerciseDefinition): PracticeSessionState {
  return {
    mode: 'scales',
    exerciseId: exercise.id,
    stepIndex: 0,
    expectedNotes: exercise.noteSequence.length > 0 ? [exercise.noteSequence[0]] : [],
    pressedNotes: new Set(),
    wrongNotes: new Set(),
    status: 'ready'
  }
}

export function createChordSession(exercise: ChordExerciseDefinition): PracticeSessionState {
  return {
    mode: 'chords',
    exerciseId: exercise.id,
    stepIndex: 0,
    expectedNotes: exercise.progression[0]?.targetNotes ?? [],
    pressedNotes: new Set(),
    wrongNotes: new Set(),
    status: 'ready'
  }
}

export function releasePracticeNote(session: PracticeSessionState, pitch: number): PracticeSessionState {
  const pressedNotes = cloneSet(session.pressedNotes)
  const wrongNotes = cloneSet(session.wrongNotes)
  pressedNotes.delete(pitch)
  wrongNotes.delete(pitch)

  return {
    ...session,
    pressedNotes,
    wrongNotes
  }
}

export function evaluateScaleNoteOn(
  session: PracticeSessionState,
  exercise: ScaleExerciseDefinition,
  pitch: number
): PracticeEvaluation {
  const pressedNotes = cloneSet(session.pressedNotes)
  const wrongNotes = cloneSet(session.wrongNotes)
  pressedNotes.add(pitch)

  if (session.status === 'complete') {
    return {
      session: {
        ...session,
        pressedNotes
      },
      outcome: 'ignored'
    }
  }

  const expectedPitch = exercise.noteSequence[session.stepIndex]
  if (pitch !== expectedPitch) {
    wrongNotes.add(pitch)
    return {
      session: {
        ...session,
        pressedNotes,
        wrongNotes,
        status: 'in_progress'
      },
      outcome: 'wrong'
    }
  }

  const nextStepIndex = session.stepIndex + 1
  const completed = nextStepIndex >= exercise.noteSequence.length

  return {
    session: {
      ...session,
      pressedNotes,
      wrongNotes,
      stepIndex: nextStepIndex,
      expectedNotes: completed ? [] : [exercise.noteSequence[nextStepIndex]],
      status: completed ? 'complete' : 'in_progress'
    },
    outcome: completed ? 'complete' : 'correct'
  }
}

export function evaluateChordNoteOn(
  session: PracticeSessionState,
  exercise: ChordExerciseDefinition,
  pitch: number,
  noteOnTimes: Map<number, number>,
  toleranceMs = CHORD_SIMULTANEITY_MS
): PracticeEvaluation {
  const pressedNotes = cloneSet(session.pressedNotes)
  const wrongNotes = cloneSet(session.wrongNotes)
  pressedNotes.add(pitch)

  if (session.status === 'complete') {
    return {
      session: {
        ...session,
        pressedNotes
      },
      outcome: 'ignored'
    }
  }

  const prompt = exercise.progression[session.stepIndex]
  if (!prompt) {
    return {
      session: {
        ...session,
        pressedNotes,
        status: 'complete',
        expectedNotes: []
      },
      outcome: 'complete'
    }
  }

  const expectedSet = new Set(prompt.targetNotes)
  if (!expectedSet.has(pitch)) {
    wrongNotes.add(pitch)
  }

  const hasAllExpectedPressed = prompt.targetNotes.every(note => pressedNotes.has(note))
  const noteTimes = prompt.targetNotes.map(note => noteOnTimes.get(note)).filter((value): value is number => typeof value === 'number')
  const withinTolerance =
    noteTimes.length === prompt.targetNotes.length &&
    Math.max(...noteTimes) - Math.min(...noteTimes) <= toleranceMs

  if (hasAllExpectedPressed && withinTolerance) {
    const nextStepIndex = session.stepIndex + 1
    const completed = nextStepIndex >= exercise.progression.length

    return {
      session: {
        ...session,
        stepIndex: nextStepIndex,
        expectedNotes: completed ? [] : exercise.progression[nextStepIndex].targetNotes,
        pressedNotes: new Set(),
        wrongNotes: new Set(),
        status: completed ? 'complete' : 'in_progress'
      },
      outcome: completed ? 'complete' : 'correct'
    }
  }

  return {
    session: {
      ...session,
      pressedNotes,
      wrongNotes,
      status: 'in_progress'
    },
    outcome: expectedSet.has(pitch) ? 'partial' : 'wrong'
  }
}
