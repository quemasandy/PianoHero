import { describe, it, expect } from 'vitest'
import {
  PIANO_MIN_PITCH,
  PIANO_MAX_PITCH,
  ALL_KEYS,
  TOTAL_WHITE_KEYS,
  isWhiteKey,
  getKeyBounds,
  getPitchRangeBounds,
} from './keyboardLayout'

describe('constants', () => {
  it('PIANO_MIN_PITCH should be A0 (21)', () => {
    expect(PIANO_MIN_PITCH).toBe(21)
  })

  it('PIANO_MAX_PITCH should be C8 (108)', () => {
    expect(PIANO_MAX_PITCH).toBe(108)
  })
})

describe('isWhiteKey', () => {
  it('should identify C (pitch class 0) as white', () => {
    expect(isWhiteKey(60)).toBe(true) // C4
  })

  it('should identify D (pitch class 2) as white', () => {
    expect(isWhiteKey(62)).toBe(true) // D4
  })

  it('should identify E (pitch class 4) as white', () => {
    expect(isWhiteKey(64)).toBe(true) // E4
  })

  it('should identify F (pitch class 5) as white', () => {
    expect(isWhiteKey(65)).toBe(true) // F4
  })

  it('should identify Db/C# (pitch class 1) as black', () => {
    expect(isWhiteKey(61)).toBe(false) // C#4/Db4
  })

  it('should identify Eb (pitch class 3) as black', () => {
    expect(isWhiteKey(63)).toBe(false) // Eb4
  })

  it('should identify Gb (pitch class 6) as black', () => {
    expect(isWhiteKey(66)).toBe(false) // F#4/Gb4
  })

  it('should identify Ab (pitch class 8) as black', () => {
    expect(isWhiteKey(68)).toBe(false) // Ab4
  })

  it('should identify Bb (pitch class 10) as black', () => {
    expect(isWhiteKey(70)).toBe(false) // Bb4
  })

  it('should work across octaves', () => {
    // A0 (21) = pitch class 9 → white
    expect(isWhiteKey(21)).toBe(true)
    // C8 (108) = pitch class 0 → white
    expect(isWhiteKey(108)).toBe(true)
  })
})

describe('ALL_KEYS', () => {
  it('should cover the full 88-key piano range', () => {
    expect(ALL_KEYS).toHaveLength(PIANO_MAX_PITCH - PIANO_MIN_PITCH + 1)
  })

  it('should start at PIANO_MIN_PITCH', () => {
    expect(ALL_KEYS[0].pitch).toBe(PIANO_MIN_PITCH)
  })

  it('should end at PIANO_MAX_PITCH', () => {
    expect(ALL_KEYS[ALL_KEYS.length - 1].pitch).toBe(PIANO_MAX_PITCH)
  })

  it('should have 52 white keys on a standard piano', () => {
    expect(TOTAL_WHITE_KEYS).toBe(52)
  })

  it('should have monotonically increasing pitch values', () => {
    for (let i = 1; i < ALL_KEYS.length; i++) {
      expect(ALL_KEYS[i].pitch).toBe(ALL_KEYS[i - 1].pitch + 1)
    }
  })

  it('white key indices should be non-decreasing', () => {
    for (let i = 1; i < ALL_KEYS.length; i++) {
      expect(ALL_KEYS[i].whiteIndex).toBeGreaterThanOrEqual(ALL_KEYS[i - 1].whiteIndex)
    }
  })
})

describe('getKeyBounds', () => {
  it('should return bounds for a valid white key', () => {
    const bounds = getKeyBounds(60) // C4
    expect(bounds).not.toBeNull()
    expect(bounds?.width).toBeCloseTo(0.94)
  })

  it('should return bounds for a valid black key', () => {
    const bounds = getKeyBounds(61) // C#4
    expect(bounds).not.toBeNull()
    expect(bounds?.width).toBeCloseTo(0.7)
  })

  it('should return null for a pitch outside the piano range', () => {
    expect(getKeyBounds(20)).toBeNull() // below A0
    expect(getKeyBounds(109)).toBeNull() // above C8
  })

  it('black key x should be offset from its white key index', () => {
    const blackBounds = getKeyBounds(61) // C#4
    expect(blackBounds).not.toBeNull()
    // Black keys sit at whiteIndex + 0.65
    const cKey = ALL_KEYS.find((k) => k.pitch === 61)
    expect(blackBounds?.x).toBeCloseTo((cKey?.whiteIndex ?? 0) + 0.65)
  })
})

describe('getPitchRangeBounds', () => {
  it('should return bounds for a valid pitch range', () => {
    const bounds = getPitchRangeBounds(60, 72) // C4 to C5
    expect(bounds).not.toBeNull()
    expect(bounds?.width).toBeGreaterThan(0)
  })

  it('should return null for a completely invalid range', () => {
    expect(getPitchRangeBounds(0, 10)).toBeNull()
  })

  it('should return bounds spanning wider than a single key', () => {
    const singleKey = getKeyBounds(60)
    expect(singleKey).not.toBeNull()
    const range = getPitchRangeBounds(60, 64) // C4 to E4
    expect(range).not.toBeNull()
    expect(range?.width).toBeGreaterThan(singleKey?.width ?? 0)
  })

  it('should handle a single-key range', () => {
    const bounds = getPitchRangeBounds(60, 60)
    expect(bounds).not.toBeNull()
    const keyBounds = getKeyBounds(60)
    expect(keyBounds).not.toBeNull()
    expect(bounds?.x).toBeCloseTo(keyBounds?.x ?? 0)
    expect(bounds?.width).toBeCloseTo(keyBounds?.width ?? 0)
  })
})
