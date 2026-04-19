export const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export const CHORD_DICTIONARY: Record<string, string> = {
  // Triads
  '4,7': '',         // Major (e.g. C)
  '3,7': 'm',        // Minor
  '3,6': 'dim',      // Diminished
  '4,8': 'aug',      // Augmented
  '2,7': 'sus2',     // Sus2
  '5,7': 'sus4',     // Sus4
  '7': '5',          // Power Chord

  // Sevenths
  '4,7,11': 'maj7',
  '3,7,10': 'm7',
  '4,7,10': '7',
  '3,6,10': 'm7b5',
  '3,6,9': 'dim7',
  '4,8,10': 'aug7',
  '4,7,9': '6',
  '3,7,9': 'm6',

  // Ninths (sin 5ta a veces)
  '4,10,14': '9(no5)',
  '3,10,14': 'm9(no5)',
  '4,7,10,14': '9',
  '3,7,10,14': 'm9',
  '4,7,11,14': 'maj9',

  // Shell Voicings (Root + 3 + 7)
  '4,10': '7 (Shell)',
  '3,10': 'm7 (Shell)',
  '4,11': 'maj7 (Shell)'
}

export function detectChord(pitches: number[]): string | null {
  if (!pitches || pitches.length < 2) return null;

  // Calculamos las notas base únicas (pitch classes)
  const pcSet = Array.from(new Set(pitches.map(p => p % 12))).sort((a, b) => a - b);
  const lowestPitch = Math.min(...pitches);
  const lowestPc = lowestPitch % 12;

  let bestMatch: { root: number; name: string; inversion: boolean; isShell: boolean } | null = null;

  // Intentamos asumir que cada nota presionada podría ser la fundamental (root) del acorde
  for (let i = 0; i < pcSet.length; i++) {
    const root = pcSet[i];
    
    const intervals = [];
    for (const pc of pcSet) {
      if (pc === root) continue;
      let interval = pc - root;
      if (interval < 0) interval += 12; // Cliclo de octava
      intervals.push(interval);
    }
    
    intervals.sort((a, b) => a - b);
    const intervalKey = intervals.join(',');
    
    const chordQuality = CHORD_DICTIONARY[intervalKey];
    if (chordQuality !== undefined) {
      const isShell = chordQuality.includes('(Shell)');
      const inversion = lowestPc !== root;

      // Elegimos el mejor match (preferimos fundamental sobre inversión)
      if (!bestMatch || (!inversion && bestMatch.inversion)) {
         bestMatch = { 
           root, 
           name: `${NOTE_NAMES[root]}${chordQuality}`, 
           inversion, 
           isShell 
         };
         
         if (!inversion) {
           break; // Encontramos la posición fundamental
         }
      }
    }
  }

  if (bestMatch) {
    const rootName = bestMatch.name;
    // Si la nota más grave no es la fundamental, marcamos la inversión (ej: C/E)
    if (bestMatch.inversion && lowestPc !== bestMatch.root) {
      return `${rootName}/${NOTE_NAMES[lowestPc]}`;
    }
    return rootName;
  }

  // Si son 2 notas pero no es un intervalo mapeado arriba
  if (pcSet.length === 2 && pitches.length === 2) {
    const root = Math.min(...pitches);
    const top = Math.max(...pitches);
    return `${NOTE_NAMES[root % 12]}+${NOTE_NAMES[top % 12]}`;
  }

  return 'Acorde (?)';
}
