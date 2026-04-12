export const PIANO_MIN_PITCH = 21  // A0
export const PIANO_MAX_PITCH = 108 // C8

const WHITE_IN_OCTAVE = [0, 2, 4, 5, 7, 9, 11]

export interface KeyInfo {
  pitch: number
  isWhite: boolean
  whiteIndex: number
}

export function isWhiteKey(pitch: number) {
  return WHITE_IN_OCTAVE.includes(pitch % 12)
}

function buildKeys(): KeyInfo[] {
  const keys: KeyInfo[] = []
  let whiteIndex = 0

  for (let pitch = PIANO_MIN_PITCH; pitch <= PIANO_MAX_PITCH; pitch++) {
    const white = isWhiteKey(pitch)
    keys.push({ pitch, isWhite: white, whiteIndex: white ? whiteIndex++ : whiteIndex - 1 })
  }

  return keys
}

export const ALL_KEYS = buildKeys()
export const TOTAL_WHITE_KEYS = ALL_KEYS.filter(key => key.isWhite).length

const KEY_BY_PITCH = new Map(ALL_KEYS.map(key => [key.pitch, key]))

export function getKeyBounds(pitch: number) {
  const key = KEY_BY_PITCH.get(pitch)
  if (!key) return null

  if (key.isWhite) {
    return { x: key.whiteIndex + 0.03, width: 0.94 }
  }

  return { x: key.whiteIndex + 0.65, width: 0.7 }
}

export function getPitchRangeBounds(startPitch: number, endPitch: number) {
  let minX = Infinity
  let maxX = -Infinity

  for (let pitch = startPitch; pitch <= endPitch; pitch++) {
    const bounds = getKeyBounds(pitch)
    if (!bounds) continue
    minX = Math.min(minX, bounds.x)
    maxX = Math.max(maxX, bounds.x + bounds.width)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null

  return { x: minX, width: maxX - minX }
}
