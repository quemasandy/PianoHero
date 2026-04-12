import type {
  ChordExerciseDefinition,
  ChordPrompt,
  KeyboardWindow,
  ScaleExerciseDefinition
} from '../types'

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function createScaleSequence(ascending: number[]) {
  return [...ascending, ...ascending.slice(0, -1).reverse()]
}

function createPrompt(barIndex: number, chordName: string, targetNotes: number[]): ChordPrompt {
  return { barIndex, chordName, targetNotes }
}

export function pitchToPracticeLabel(pitch: number) {
  const octave = Math.floor(pitch / 12) - 1
  return `${NOTE_NAMES[pitch % 12]}${octave}`
}

export function formatPracticeNotes(notes: number[]) {
  return notes.map(pitchToPracticeLabel).join(' · ')
}

export const PRACTICE_KEYBOARD_WINDOW: KeyboardWindow = {
  startPitch: 60,
  endPitch: 84,
  targetPitches: [60, 64, 65, 67, 69, 70, 71, 75, 77],
  outOfRange: false
}

export const SCALE_EXERCISES: ScaleExerciseDefinition[] = [
  {
    id: 'c-blues',
    name: 'C Blues',
    description: 'Escala blues de C en una octava, subida y bajada.',
    noteSequence: createScaleSequence([60, 63, 65, 66, 67, 70, 72]),
    startLabel: 'C4',
    endLabel: 'C5'
  },
  {
    id: 'c-minor-pentatonic',
    name: 'C Pentatónica Menor',
    description: 'Pentatónica menor de C en una octava, subida y bajada.',
    noteSequence: createScaleSequence([60, 63, 65, 67, 70, 72]),
    startLabel: 'C4',
    endLabel: 'C5'
  },
  {
    id: 'c-major-pentatonic',
    name: 'C Pentatónica Mayor',
    description: 'Pentatónica mayor de C en una octava, subida y bajada.',
    noteSequence: createScaleSequence([60, 62, 64, 67, 69, 72]),
    startLabel: 'C4',
    endLabel: 'C5'
  },
  {
    id: 'lick-bebop-c-1',
    name: 'Lick de Bebop sobre II-V-I (En Do)',
    description: 'Fraseo idiomático estilo Charlie Parker sobre Dm7 -> G7 -> Cmaj7',
    noteSequence: [62, 65, 67, 68, 69, 72, 71, 67, 65, 62, 64, 60],
    startLabel: 'D4',
    endLabel: 'C4'
  },
  {
    id: 'lick-bebop-f-1',
    name: 'Lick de Bebop clásico (En Fa)',
    description: 'Línea de corcheas ininterrumpida que descansa en la tercera mayor de la tónica.',
    noteSequence: [67, 69, 68, 67, 65, 64, 63, 62, 60, 65, 61, 62],
    startLabel: 'G4',
    endLabel: 'D4'
  },
  {
    id: 'd-dorian',
    name: 'D Dórico',
    description: 'Modo Dórico en Re (Escala fundamental para acordes m7). Una octava.',
    noteSequence: createScaleSequence([62, 64, 65, 67, 69, 71, 72, 74]),
    startLabel: 'D4',
    endLabel: 'D5'
  },
  {
    id: 'g-mixolydian',
    name: 'G Mixolidio',
    description: 'Modo Mixolidio en Sol (Escala fundamental para acordes dominantes). Una octava.',
    noteSequence: createScaleSequence([67, 69, 71, 72, 74, 76, 77, 79]),
    startLabel: 'G4',
    endLabel: 'G5'
  },
  {
    id: 'c-lydian',
    name: 'C Lidio',
    description: 'Modo Lidio en Do (El modo preferido en el jazz para acordes maj7, contiene #4).',
    noteSequence: createScaleSequence([60, 62, 64, 66, 67, 69, 71, 72]),
    startLabel: 'C4',
    endLabel: 'C5'
  },
  {
    id: 'g-altered',
    name: 'G Alterada (Super Locria)',
    description: 'Escala Alterada en Sol (Genera máxima tensión sobre el acorde V para resolver al I).',
    noteSequence: createScaleSequence([67, 68, 70, 71, 73, 75, 77, 79]),
    startLabel: 'G4',
    endLabel: 'G5'
  },
  {
    id: 'c-diminished-hw',
    name: 'C Escala Disminuida (Medio Tono / Tono)',
    description: 'Escala simétrica para crear tensión y resolución cromática sobre dominantes alterados.',
    noteSequence: createScaleSequence([60, 61, 63, 64, 66, 67, 69, 70, 72]),
    startLabel: 'C4',
    endLabel: 'C5'
  },
  {
    id: 'c-major-bebop',
    name: 'C Bebop Mayor',
    description: 'Escala mayor tradicional con un paso cromático (b6) clave del Fraseo Bebop.',
    noteSequence: createScaleSequence([60, 62, 64, 65, 67, 68, 69, 71, 72]),
    startLabel: 'C4',
    endLabel: 'C5'
  }
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
      createPrompt(11, 'G7', [67, 71, 77])
    ]
  },
  {
    id: 'ii-v-i-c-maj',
    name: 'Cadencia II-V-I (Do Mayor)',
    description: 'La progresión fundamental del Jazz en la tonalidad de Do Mayor usando Shell Voicings con conducción de voces perfecta.',
    progression: [
      createPrompt(0, 'Dm7', [62, 65, 72]),
      createPrompt(1, 'G7', [67, 71, 77]),
      createPrompt(2, 'Cmaj7', [60, 64, 71]),
      createPrompt(3, 'Cmaj7', [60, 64, 71])
    ]
  },
  {
    id: 'ii-v-i-f-maj',
    name: 'Cadencia II-V-I (Fa Mayor)',
    description: 'La progresión fundamental del Jazz en la tonalidad de Fa Mayor usando Shell Voicings.',
    progression: [
      createPrompt(0, 'Gm7', [67, 70, 77]),
      createPrompt(1, 'C7', [60, 64, 70]),
      createPrompt(2, 'Fmaj7', [65, 69, 76]),
      createPrompt(3, 'Fmaj7', [65, 69, 76])
    ]
  },
  {
    id: 'ii-v-i-bb-maj',
    name: 'Cadencia II-V-I (Si bemol Mayor)',
    description: 'La progresión fundamental del Jazz en la tonalidad de Bb Mayor.',
    progression: [
      createPrompt(0, 'Cm7', [60, 63, 70]),
      createPrompt(1, 'F7', [65, 69, 75]),
      createPrompt(2, 'Bbmaj7', [58, 62, 69]),
      createPrompt(3, 'Bbmaj7', [58, 62, 69])
    ]
  },
  {
    id: 'ii-v-i-c-minor',
    name: 'Cadencia II-V-I (Do Menor)',
    description: 'La cadencia menor más común. Incluye el acorde semidisminuido y el dominante alterado.',
    progression: [
      createPrompt(0, 'Dm7b5', [62, 65, 68, 72]),
      createPrompt(1, 'G7alt', [67, 71, 75, 80]),
      createPrompt(2, 'Cm6', [60, 63, 67, 69]),
      createPrompt(3, 'Cm6', [60, 63, 67, 69])
    ]
  },
  {
    id: 'turnaround-c-maj',
    name: 'Turnaround Clásico (Do Mayor)',
    description: 'Progresión I - VI - II - V. Utilizada para repetir la métrica.',
    progression: [
      createPrompt(0, 'Cmaj7', [60, 64, 71]),
      createPrompt(1, 'Am7', [69, 72, 79]),
      createPrompt(2, 'Dm7', [62, 65, 72]),
      createPrompt(3, 'G7', [67, 71, 77])
    ]
  },
  {
    id: 'rhythm-changes-bb',
    name: 'Rhythm Changes 4. Compases (Bb)',
    description: 'Los primeros 4 compases de ritmo del mítico “I Got Rhythm”.',
    progression: [
      createPrompt(0, 'Bbmaj7', [70, 74, 81]),
      createPrompt(1, 'G7', [67, 71, 77]),
      createPrompt(2, 'Cm7', [60, 63, 70]),
      createPrompt(3, 'F7', [65, 69, 75])
    ]
  },
  {
    id: 'rootless-ii-v-i-c-maj',
    name: 'Voicings Rootless II-V-I (Do Mayor)',
    description: 'Acordes modernos (Tipo A) usando las tensiones avanzadas 9, y 13 en la mano derecha.',
    progression: [
      createPrompt(0, 'Dm9', [65, 69, 72, 76]),
      createPrompt(1, 'G13', [65, 69, 71, 76]),
      createPrompt(2, 'Cmaj9', [64, 67, 71, 74]),
      createPrompt(3, 'Cmaj9', [64, 67, 71, 74])
    ]
  }
]
