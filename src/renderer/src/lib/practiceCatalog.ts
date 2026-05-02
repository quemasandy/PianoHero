import type {
  ChordExerciseDefinition,
  ChordPrompt,
  KeyboardWindow,
  ScaleExerciseDefinition,
  ScaleRootOption,
} from '../types'

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const PREFERRED_SCALE_ROOT_MIN = 60
const PREFERRED_SCALE_ROOT_MAX = 71
const PRACTICE_RANGE_MIN = 60
const PRACTICE_RANGE_MAX = 84

export const SCALE_ROOT_OPTIONS: ScaleRootOption[] = [
  { pitchClass: 0, label: 'C', localizedLabel: 'Do' },
  { pitchClass: 1, label: 'Db', localizedLabel: 'Reb' },
  { pitchClass: 2, label: 'D', localizedLabel: 'Re' },
  { pitchClass: 3, label: 'Eb', localizedLabel: 'Mib' },
  { pitchClass: 4, label: 'E', localizedLabel: 'Mi' },
  { pitchClass: 5, label: 'F', localizedLabel: 'Fa' },
  { pitchClass: 6, label: 'Gb', localizedLabel: 'Solb' },
  { pitchClass: 7, label: 'G', localizedLabel: 'Sol' },
  { pitchClass: 8, label: 'Ab', localizedLabel: 'Lab' },
  { pitchClass: 9, label: 'A', localizedLabel: 'La' },
  { pitchClass: 10, label: 'Bb', localizedLabel: 'Sib' },
  { pitchClass: 11, label: 'B', localizedLabel: 'Si' },
]

const SCALE_ROOT_BY_PITCH_CLASS = new Map(SCALE_ROOT_OPTIONS.map((root) => [root.pitchClass, root]))

function createScaleSequence(ascending: number[]) {
  return [...ascending, ...ascending.slice(0, -1).reverse()]
}

function createPrompt(barIndex: number, chordName: string, targetNotes: number[]): ChordPrompt {
  return { barIndex, chordName, targetNotes }
}

function normalizePitchClass(pitch: number) {
  return ((pitch % 12) + 12) % 12
}

export function pitchToPracticeLabel(pitch: number) {
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[normalizePitchClass(pitch)]}${octave}`
}

function practiceLabelToPitch(label: string) {
  const match = /^([A-G]b?)(-?\d+)$/.exec(label)
  if (!match) return null

  const pitchClass = NOTE_NAMES.indexOf(match[1])
  if (pitchClass < 0) return null

  return (Number(match[2]) + 1) * 12 + pitchClass
}

export function formatPracticeNotes(notes: number[]) {
  return notes.map(pitchToPracticeLabel).join(' · ')
}

export function getScaleRootOption(pitchClass: number) {
  return SCALE_ROOT_BY_PITCH_CLASS.get(normalizePitchClass(pitchClass)) ?? SCALE_ROOT_OPTIONS[0]
}

export function getDefaultScaleRootPitchClass(exercise: ScaleExerciseDefinition) {
  return normalizePitchClass(exercise.rootPitch)
}

function getScaleExerciseName(exercise: ScaleExerciseDefinition, root: ScaleRootOption) {
  if (exercise.nameStyle === 'parentheticalKey') {
    return `${exercise.patternName} (En ${root.localizedLabel})`
  }

  return `${root.label} ${exercise.patternName}`
}

function getScaleExerciseDescription(exercise: ScaleExerciseDefinition, root: ScaleRootOption) {
  if (root.pitchClass === getDefaultScaleRootPitchClass(exercise)) {
    return exercise.description
  }

  return `${exercise.description} Transpuesta a ${root.localizedLabel} (${root.label}).`
}

function getTransposedRange(notes: number[], shift: number) {
  const transposed = notes.map((note) => note + shift)
  return {
    min: Math.min(...transposed),
    max: Math.max(...transposed),
  }
}

function getRangeOverflow(min: number, max: number) {
  return Math.max(0, PRACTICE_RANGE_MIN - min) + Math.max(0, max - PRACTICE_RANGE_MAX)
}

function compareScores(a: number[], b: number[]) {
  for (let index = 0; index < a.length; index++) {
    const difference = a[index] - b[index]
    if (difference !== 0) return difference
  }

  return 0
}

function chooseRootPitchForScale(exercise: ScaleExerciseDefinition, targetRootPitchClass: number) {
  if (exercise.noteSequence.length === 0) {
    return exercise.rootPitch
  }

  const targetPitchClass = normalizePitchClass(targetRootPitchClass)
  const originalRange = getTransposedRange(exercise.noteSequence, 0)
  const originalCenter = (originalRange.min + originalRange.max) / 2
  let bestRootPitch = exercise.rootPitch
  let bestScore: number[] | null = null

  for (let rootPitch = targetPitchClass; rootPitch <= 127; rootPitch += 12) {
    const shift = rootPitch - exercise.rootPitch
    const { min, max } = getTransposedRange(exercise.noteSequence, shift)
    const overflow = getRangeOverflow(min, max)
    const transposedCenter = (min + max) / 2
    const preferredRoot =
      rootPitch >= PREFERRED_SCALE_ROOT_MIN && rootPitch <= PREFERRED_SCALE_ROOT_MAX ? 0 : 1
    const score = [
      overflow > 0 ? 1 : 0,
      overflow,
      preferredRoot,
      Math.abs(transposedCenter - originalCenter),
      Math.abs(rootPitch - exercise.rootPitch),
    ]

    if (!bestScore || compareScores(score, bestScore) < 0) {
      bestScore = score
      bestRootPitch = rootPitch
    }
  }

  return bestRootPitch
}

export function transposeScaleExercise(
  exercise: ScaleExerciseDefinition,
  targetRootPitchClass: number
): ScaleExerciseDefinition {
  const root = getScaleRootOption(targetRootPitchClass)
  const rootPitch = chooseRootPitchForScale(exercise, root.pitchClass)
  const shift = rootPitch - exercise.rootPitch
  const noteSequence = exercise.noteSequence.map((note) => note + shift)
  const baseEndPitch =
    practiceLabelToPitch(exercise.endLabel) ??
    exercise.noteSequence[exercise.noteSequence.length - 1]
  const transposedEndPitch = baseEndPitch === undefined ? rootPitch : baseEndPitch + shift

  return {
    ...exercise,
    id: `${exercise.id}-key-${root.pitchClass}`,
    name: getScaleExerciseName(exercise, root),
    description: getScaleExerciseDescription(exercise, root),
    rootPitch,
    noteSequence,
    startLabel: pitchToPracticeLabel(noteSequence[0] ?? rootPitch),
    endLabel: pitchToPracticeLabel(transposedEndPitch),
  }
}

export const PRACTICE_KEYBOARD_WINDOW: KeyboardWindow = {
  startPitch: 60,
  endPitch: 84,
  targetPitches: [60, 64, 65, 67, 69, 70, 71, 75, 77],
  outOfRange: false,
}

export const SCALE_EXERCISES: ScaleExerciseDefinition[] = [
  {
    id: 'c-blues',
    name: 'C Blues',
    description: 'Escala blues de C en una octava, subida y bajada.',
    patternName: 'Blues',
    rootPitch: 60,
    noteSequence: createScaleSequence([60, 63, 65, 66, 67, 70, 72]),
    startLabel: 'C4',
    endLabel: 'C5',
  },
  {
    id: 'c-minor-pentatonic',
    name: 'C Pentatónica Menor',
    description: 'Pentatónica menor de C en una octava, subida y bajada.',
    patternName: 'Pentatónica Menor',
    rootPitch: 60,
    noteSequence: createScaleSequence([60, 63, 65, 67, 70, 72]),
    startLabel: 'C4',
    endLabel: 'C5',
  },
  {
    id: 'c-major-pentatonic',
    name: 'C Pentatónica Mayor',
    description: 'Pentatónica mayor de C en una octava, subida y bajada.',
    patternName: 'Pentatónica Mayor',
    rootPitch: 60,
    noteSequence: createScaleSequence([60, 62, 64, 67, 69, 72]),
    startLabel: 'C4',
    endLabel: 'C5',
  },
  {
    id: 'lick-bebop-c-1',
    name: 'Lick de Bebop sobre II-V-I (En Do)',
    description: 'Fraseo idiomático estilo Charlie Parker sobre Dm7 -> G7 -> Cmaj7',
    patternName: 'Lick de Bebop sobre II-V-I',
    rootPitch: 60,
    nameStyle: 'parentheticalKey',
    noteSequence: [62, 65, 67, 68, 69, 72, 71, 67, 65, 62, 64, 60],
    startLabel: 'D4',
    endLabel: 'C4',
  },
  {
    id: 'lick-bebop-f-1',
    name: 'Lick de Bebop clásico (En Fa)',
    description: 'Línea de corcheas ininterrumpida que descansa en la tercera mayor de la tónica.',
    patternName: 'Lick de Bebop clásico',
    rootPitch: 65,
    nameStyle: 'parentheticalKey',
    noteSequence: [67, 69, 68, 67, 65, 64, 63, 62, 60, 65, 61, 62],
    startLabel: 'G4',
    endLabel: 'D4',
  },
  {
    id: 'd-dorian',
    name: 'D Dórico',
    description: 'Modo Dórico en Re (Escala fundamental para acordes m7). Una octava.',
    patternName: 'Dórico',
    rootPitch: 62,
    noteSequence: createScaleSequence([62, 64, 65, 67, 69, 71, 72, 74]),
    startLabel: 'D4',
    endLabel: 'D5',
  },
  {
    id: 'g-mixolydian',
    name: 'G Mixolidio',
    description: 'Modo Mixolidio en Sol (Escala fundamental para acordes dominantes). Una octava.',
    patternName: 'Mixolidio',
    rootPitch: 67,
    noteSequence: createScaleSequence([67, 69, 71, 72, 74, 76, 77, 79]),
    startLabel: 'G4',
    endLabel: 'G5',
  },
  {
    id: 'c-lydian',
    name: 'C Lidio',
    description: 'Modo Lidio en Do (El modo preferido en el jazz para acordes maj7, contiene #4).',
    patternName: 'Lidio',
    rootPitch: 60,
    noteSequence: createScaleSequence([60, 62, 64, 66, 67, 69, 71, 72]),
    startLabel: 'C4',
    endLabel: 'C5',
  },
  {
    id: 'g-altered',
    name: 'G Alterada (Super Locria)',
    description:
      'Escala Alterada en Sol (Genera máxima tensión sobre el acorde V para resolver al I).',
    patternName: 'Alterada (Super Locria)',
    rootPitch: 67,
    noteSequence: createScaleSequence([67, 68, 70, 71, 73, 75, 77, 79]),
    startLabel: 'G4',
    endLabel: 'G5',
  },
  {
    id: 'c-diminished-hw',
    name: 'C Escala Disminuida (Medio Tono / Tono)',
    description:
      'Escala simétrica para crear tensión y resolución cromática sobre dominantes alterados.',
    patternName: 'Escala Disminuida (Medio Tono / Tono)',
    rootPitch: 60,
    noteSequence: createScaleSequence([60, 61, 63, 64, 66, 67, 69, 70, 72]),
    startLabel: 'C4',
    endLabel: 'C5',
  },
  {
    id: 'c-major-bebop',
    name: 'C Bebop Mayor',
    description: 'Escala mayor tradicional con un paso cromático (b6) clave del Fraseo Bebop.',
    patternName: 'Bebop Mayor',
    rootPitch: 60,
    noteSequence: createScaleSequence([60, 62, 64, 65, 67, 68, 69, 71, 72]),
    startLabel: 'C4',
    endLabel: 'C5',
  },
]

export const CHORD_EXERCISES: ChordExerciseDefinition[] = [
  {
    id: 'c-jam-blues-shells',
    name: 'C Jam Blues — Shells 1-3-b7',
    description: 'Blues estándar de 12 compases con shell voicings compactos para una mano.',
    progression: [
      createPrompt(0, 'C7', [60, 64, 70]),
      createPrompt(1, 'F7', [65, 69, 75]),
      createPrompt(2, 'C7', [60, 64, 70]),
      createPrompt(3, 'C7', [60, 64, 70]),
      createPrompt(4, 'F7', [65, 69, 75]),
      createPrompt(5, 'F7', [65, 69, 75]),
      createPrompt(6, 'C7', [60, 64, 70]),
      createPrompt(7, 'C7', [60, 64, 70]),
      createPrompt(8, 'G7', [67, 71, 77]),
      createPrompt(9, 'F7', [65, 69, 75]),
      createPrompt(10, 'C7', [60, 64, 70]),
      createPrompt(11, 'G7', [67, 71, 77]),
    ],
  },
  {
    id: 'ii-v-i-c-maj',
    name: 'Cadencia II-V-I (Do Mayor)',
    description:
      'La progresión fundamental del Jazz en la tonalidad de Do Mayor usando Shell Voicings con conducción de voces perfecta.',
    progression: [
      createPrompt(0, 'Dm7', [62, 65, 72]),
      createPrompt(1, 'G7', [67, 71, 77]),
      createPrompt(2, 'Cmaj7', [60, 64, 71]),
      createPrompt(3, 'Cmaj7', [60, 64, 71]),
    ],
  },
  {
    id: 'ii-v-i-f-maj',
    name: 'Cadencia II-V-I (Fa Mayor)',
    description:
      'La progresión fundamental del Jazz en la tonalidad de Fa Mayor usando Shell Voicings.',
    progression: [
      createPrompt(0, 'Gm7', [67, 70, 77]),
      createPrompt(1, 'C7', [60, 64, 70]),
      createPrompt(2, 'Fmaj7', [65, 69, 76]),
      createPrompt(3, 'Fmaj7', [65, 69, 76]),
    ],
  },
  {
    id: 'ii-v-i-bb-maj',
    name: 'Cadencia II-V-I (Si bemol Mayor)',
    description: 'La progresión fundamental del Jazz en la tonalidad de Bb Mayor.',
    progression: [
      createPrompt(0, 'Cm7', [60, 63, 70]),
      createPrompt(1, 'F7', [65, 69, 75]),
      createPrompt(2, 'Bbmaj7', [58, 62, 69]),
      createPrompt(3, 'Bbmaj7', [58, 62, 69]),
    ],
  },
  {
    id: 'ii-v-i-c-minor',
    name: 'Cadencia II-V-I (Do Menor)',
    description:
      'La cadencia menor más común. Incluye el acorde semidisminuido y el dominante alterado.',
    progression: [
      createPrompt(0, 'Dm7b5', [62, 65, 68, 72]),
      createPrompt(1, 'G7alt', [67, 71, 75, 80]),
      createPrompt(2, 'Cm6', [60, 63, 67, 69]),
      createPrompt(3, 'Cm6', [60, 63, 67, 69]),
    ],
  },
  {
    id: 'turnaround-c-maj',
    name: 'Turnaround Clásico (Do Mayor)',
    description: 'Progresión I - VI - II - V. Utilizada para repetir la métrica.',
    progression: [
      createPrompt(0, 'Cmaj7', [60, 64, 71]),
      createPrompt(1, 'Am7', [69, 72, 79]),
      createPrompt(2, 'Dm7', [62, 65, 72]),
      createPrompt(3, 'G7', [67, 71, 77]),
    ],
  },
  {
    id: 'rhythm-changes-bb',
    name: 'Rhythm Changes 4. Compases (Bb)',
    description: 'Los primeros 4 compases de ritmo del mítico “I Got Rhythm”.',
    progression: [
      createPrompt(0, 'Bbmaj7', [70, 74, 81]),
      createPrompt(1, 'G7', [67, 71, 77]),
      createPrompt(2, 'Cm7', [60, 63, 70]),
      createPrompt(3, 'F7', [65, 69, 75]),
    ],
  },
  {
    id: 'rootless-ii-v-i-c-maj',
    name: 'Voicings Rootless II-V-I (Do Mayor)',
    description:
      'Acordes modernos (Tipo A) usando las tensiones avanzadas 9, y 13 en la mano derecha.',
    progression: [
      createPrompt(0, 'Dm9', [65, 69, 72, 76]),
      createPrompt(1, 'G13', [65, 69, 71, 76]),
      createPrompt(2, 'Cmaj9', [64, 67, 71, 74]),
      createPrompt(3, 'Cmaj9', [64, 67, 71, 74]),
    ],
  },
]
