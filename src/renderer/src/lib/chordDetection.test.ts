import { describe, it, expect } from 'vitest'
import { detectChord, NOTE_NAMES, CHORD_DICTIONARY } from './chordDetection'

describe('NOTE_NAMES', () => {
  it('should have exactly 12 note names', () => {
    expect(NOTE_NAMES).toHaveLength(12)
  })

  it('should start with C and end with B', () => {
    expect(NOTE_NAMES[0]).toBe('C')
    expect(NOTE_NAMES[11]).toBe('B')
  })
})

describe('CHORD_DICTIONARY', () => {
  it('should contain basic triads', () => {
    expect(CHORD_DICTIONARY['4,7']).toBe('') // Major
    expect(CHORD_DICTIONARY['3,7']).toBe('m') // Minor
    expect(CHORD_DICTIONARY['3,6']).toBe('dim') // Diminished
    expect(CHORD_DICTIONARY['4,8']).toBe('aug') // Augmented
  })

  it('should contain seventh chords', () => {
    expect(CHORD_DICTIONARY['4,7,11']).toBe('maj7')
    expect(CHORD_DICTIONARY['3,7,10']).toBe('m7')
    expect(CHORD_DICTIONARY['4,7,10']).toBe('7')
  })

  it('should contain shell voicings', () => {
    expect(CHORD_DICTIONARY['4,10']).toBe('7 (Shell)')
    expect(CHORD_DICTIONARY['3,10']).toBe('m7 (Shell)')
    expect(CHORD_DICTIONARY['4,11']).toBe('maj7 (Shell)')
  })
})

describe('detectChord', () => {
  // ── Null / edge cases ───────────────────────────────────────
  it('should return null for empty input', () => {
    expect(detectChord([])).toBeNull()
  })

  it('should return null for a single note', () => {
    expect(detectChord([60])).toBeNull()
  })

  it('should return null for undefined-ish input', () => {
    expect(detectChord(null as unknown as number[])).toBeNull()
  })

  // ── Major triads ────────────────────────────────────────────
  it('should detect C Major (C4-E4-G4)', () => {
    expect(detectChord([60, 64, 67])).toBe('C')
  })

  it('should detect G Major (G3-B3-D4)', () => {
    expect(detectChord([55, 59, 62])).toBe('G')
  })

  it('should detect F Major', () => {
    // F4=65, A4=69, C5=72
    expect(detectChord([65, 69, 72])).toBe('F')
  })

  // ── Minor triads ────────────────────────────────────────────
  it('should detect A minor (A3-C4-E4)', () => {
    expect(detectChord([57, 60, 64])).toBe('Am')
  })

  it('should detect D minor', () => {
    // D4=62, F4=65, A4=69
    expect(detectChord([62, 65, 69])).toBe('Dm')
  })

  // ── Seventh chords ─────────────────────────────────────────
  it('should detect Cmaj7 (C4-E4-G4-B4)', () => {
    expect(detectChord([60, 64, 67, 71])).toBe('Cmaj7')
  })

  it('should detect Dm7 (D4-F4-A4-C5)', () => {
    expect(detectChord([62, 65, 69, 72])).toBe('Dm7')
  })

  it('should detect G7 (dominant 7th)', () => {
    // G3=55, B3=59, D4=62, F4=65
    expect(detectChord([55, 59, 62, 65])).toBe('G7')
  })

  // ── Diminished ──────────────────────────────────────────────
  it('should detect B diminished', () => {
    // B3=59, D4=62, F4=65
    expect(detectChord([59, 62, 65])).toBe('Bdim')
  })

  // ── Augmented ───────────────────────────────────────────────
  it('should detect C augmented', () => {
    // C4=60, E4=64, Ab4=68
    expect(detectChord([60, 64, 68])).toBe('Caug')
  })

  // ── Inversions ──────────────────────────────────────────────
  it('should detect C/E (first inversion of C Major)', () => {
    // E3=52, G3=55, C4=60
    expect(detectChord([52, 55, 60])).toBe('C/E')
  })

  it('should detect C/G (second inversion of C Major)', () => {
    // G3=55, C4=60, E4=64
    expect(detectChord([55, 60, 64])).toBe('C/G')
  })

  // ── Duplicate pitches (octave doublings) ────────────────────
  it('should handle octave doublings gracefully', () => {
    // C4=60, E4=64, G4=67, C5=72 → still C Major
    const result = detectChord([60, 64, 67, 72])
    expect(result).toBe('C')
  })

  // ── Shell voicings ─────────────────────────────────────────
  it('should detect C7 shell voicing (C-E-Bb)', () => {
    // C4=60, E4=64, Bb4=70
    expect(detectChord([60, 64, 70])).toBe('C7 (Shell)')
  })

  // ── Two-note intervals (fallback) ──────────────────────────
  it('should return interval notation for unmapped two-note combos', () => {
    // C4=60, D4=62 → major 2nd, not in dictionary
    const result = detectChord([60, 62])
    expect(result).toBe('C+D')
  })

  // ── Power chord ─────────────────────────────────────────────
  it('should detect C5 power chord', () => {
    // C4=60, G4=67
    expect(detectChord([60, 67])).toBe('C5')
  })

  // ── Unknown chord ──────────────────────────────────────────
  it('should return "Acorde (?)" for unrecognized 3+ note combos', () => {
    // Random cluster: C4=60, Db4=61, D4=62
    expect(detectChord([60, 61, 62])).toBe('Acorde (?)')
  })
})
