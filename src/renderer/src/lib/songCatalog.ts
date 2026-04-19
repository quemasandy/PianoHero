export interface SongEvent {
  pitches: number[] // Empty array means a rest
  durationTicks: number // abstract time units (e.g. 100 = 1 quarter note)
  durationNotation: string // e.g., "q" for quarter, "h" for half, "8" for eighth
}

export interface SongMeasure {
  id: string
  clef: 'treble' | 'bass'
  events: SongEvent[]
}

export interface Song {
  id: string
  title: string
  measures: SongMeasure[]
}

export const SONG_CATALOG: Song[] = [
  {
    id: 'ode_to_joy_simple',
    title: 'Himno a la Alegría (Fragmento)',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }, // E4
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }, // E4
          { pitches: [65], durationTicks: 100, durationNotation: 'q' }, // F4
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }  // G4
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }, // G4
          { pitches: [65], durationTicks: 100, durationNotation: 'q' }, // F4
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }, // E4
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }  // D4
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }, // C4
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }, // C4
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }, // D4
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }  // E4
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 200, durationNotation: 'h' }, // E4 (Half)
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }  // D4 (Half)
        ]
      }
    ]
  }
]
