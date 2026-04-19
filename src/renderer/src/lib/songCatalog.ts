export interface SongEvent {
  pitches: number[]
  durationTicks: number
  durationNotation: string
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
    id: 'ode_to_joy',
    title: 'Himno a la Alegría',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 150, durationNotation: 'q.' },
          { pitches: [62], durationTicks: 50, durationNotation: '8' },
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }
        ]
      }
    ]
  },
  {
    id: 'hot_cross_buns',
    title: 'Hot Cross Buns',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 50, durationNotation: '8' },
          { pitches: [60], durationTicks: 50, durationNotation: '8' },
          { pitches: [60], durationTicks: 50, durationNotation: '8' },
          { pitches: [60], durationTicks: 50, durationNotation: '8' },
          { pitches: [62], durationTicks: 50, durationNotation: '8' },
          { pitches: [62], durationTicks: 50, durationNotation: '8' },
          { pitches: [62], durationTicks: 50, durationNotation: '8' },
          { pitches: [62], durationTicks: 50, durationNotation: '8' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      }
    ]
  },
  {
    id: 'mary_had',
    title: 'Mary Had a Little Lamb',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm5',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm6',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm7',
        clef: 'treble',
        events: [
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm8',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 400, durationNotation: 'w' }
        ]
      }
    ]
  },
  {
    id: 'au_clair_de_la_lune',
    title: 'Au Clair de la Lune',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 200, durationNotation: 'h' },
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 400, durationNotation: 'w' }
        ]
      }
    ]
  },
  {
    id: 'lightly_row',
    title: 'Lightly Row',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm5',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm6',
        clef: 'treble',
        events: [
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm7',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm8',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 400, durationNotation: 'w' }
        ]
      }
    ]
  },
  {
    id: 'frere_jacques',
    title: 'Frère Jacques',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm5',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 50, durationNotation: '8' },
          { pitches: [69], durationTicks: 50, durationNotation: '8' },
          { pitches: [67], durationTicks: 50, durationNotation: '8' },
          { pitches: [65], durationTicks: 50, durationNotation: '8' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm6',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 50, durationNotation: '8' },
          { pitches: [69], durationTicks: 50, durationNotation: '8' },
          { pitches: [67], durationTicks: 50, durationNotation: '8' },
          { pitches: [65], durationTicks: 50, durationNotation: '8' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm7',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [55], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm8',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [55], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      }
    ]
  },
  {
    id: 'twinkle_twinkle',
    title: 'Twinkle Twinkle Little Star',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [69], durationTicks: 100, durationNotation: 'q' },
          { pitches: [69], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      }
    ]
  },
  {
    id: 'jingle_bells',
    title: 'Jingle Bells',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 400, durationNotation: 'w' }
        ]
      },
      {
        id: 'm5',
        clef: 'treble',
        events: [
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm6',
        clef: 'treble',
        events: [
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 50, durationNotation: '8' },
          { pitches: [64], durationTicks: 50, durationNotation: '8' }
        ]
      },
      {
        id: 'm7',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm8',
        clef: 'treble',
        events: [
          { pitches: [62], durationTicks: 200, durationNotation: 'h' },
          { pitches: [67], durationTicks: 200, durationNotation: 'h' }
        ]
      }
    ]
  },
  {
    id: 'when_the_saints',
    title: 'When the Saints Go Marching In',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 400, durationNotation: 'w' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [67], durationTicks: 400, durationNotation: 'w' }
        ]
      },
      {
        id: 'm5',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 100, durationNotation: 'q' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [65], durationTicks: 100, durationNotation: 'q' },
          { pitches: [67], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm6',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 200, durationNotation: 'h' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm7',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 200, durationNotation: 'h' },
          { pitches: [62], durationTicks: 200, durationNotation: 'h' }
        ]
      },
      {
        id: 'm8',
        clef: 'treble',
        events: [
          { pitches: [62], durationTicks: 200, durationNotation: 'h' },
          { pitches: [60], durationTicks: 200, durationNotation: 'h' }
        ]
      }
    ]
  },
  {
    id: 'amazing_grace',
    title: 'Amazing Grace',
    measures: [
      {
        id: 'm1',
        clef: 'treble',
        events: [
          { pitches: [55], durationTicks: 200, durationNotation: 'h' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm2',
        clef: 'treble',
        events: [
          { pitches: [60], durationTicks: 200, durationNotation: 'h' },
          { pitches: [64], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm3',
        clef: 'treble',
        events: [
          { pitches: [64], durationTicks: 100, durationNotation: 'q' },
          { pitches: [62], durationTicks: 100, durationNotation: 'q' },
          { pitches: [60], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm4',
        clef: 'treble',
        events: [
          { pitches: [57], durationTicks: 200, durationNotation: 'h' },
          { pitches: [55], durationTicks: 100, durationNotation: 'q' }
        ]
      },
      {
        id: 'm5',
        clef: 'treble',
        events: [
          { pitches: [55], durationTicks: 200, durationNotation: 'h' },
          { pitches: [55], durationTicks: 100, durationNotation: 'q' }
        ]
      }
    ]
  }
]
