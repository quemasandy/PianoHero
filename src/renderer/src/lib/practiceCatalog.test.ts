import { describe, expect, it } from 'vitest'
import {
  SCALE_EXERCISES,
  getDefaultScaleRootPitchClass,
  pitchToPracticeLabel,
  transposeScaleExercise,
} from './practiceCatalog'

describe('transposeScaleExercise', () => {
  it('transposes C Blues to A Blues in the practice keyboard window', () => {
    const cBlues = SCALE_EXERCISES.find((exercise) => exercise.id === 'c-blues')
    expect(cBlues).toBeDefined()
    if (!cBlues) throw new Error('Missing c-blues exercise')

    const aBlues = transposeScaleExercise(cBlues, 9)

    expect(aBlues.name).toBe('A Blues')
    expect(aBlues.startLabel).toBe('A4')
    expect(aBlues.endLabel).toBe('A5')
    expect(aBlues.noteSequence).toEqual([69, 72, 74, 75, 76, 79, 81, 79, 76, 75, 74, 72, 69])
    expect(aBlues.noteSequence.map(pitchToPracticeLabel)).toEqual([
      'A4',
      'C5',
      'D5',
      'Eb5',
      'E5',
      'G5',
      'A5',
      'G5',
      'E5',
      'Eb5',
      'D5',
      'C5',
      'A4',
    ])
  })

  it('keeps each exercise default root available from the catalog', () => {
    const rootsByExercise = Object.fromEntries(
      SCALE_EXERCISES.map((exercise) => [exercise.id, getDefaultScaleRootPitchClass(exercise)])
    )

    expect(rootsByExercise['c-blues']).toBe(0)
    expect(rootsByExercise['d-dorian']).toBe(2)
    expect(rootsByExercise['g-mixolydian']).toBe(7)
  })

  it('chooses a playable octave when a transposed phrase would fall below C4', () => {
    const fLick = SCALE_EXERCISES.find((exercise) => exercise.id === 'lick-bebop-f-1')
    expect(fLick).toBeDefined()
    if (!fLick) throw new Error('Missing lick-bebop-f-1 exercise')

    const cLick = transposeScaleExercise(fLick, 0)
    const minPitch = Math.min(...cLick.noteSequence)
    const maxPitch = Math.max(...cLick.noteSequence)

    expect(cLick.name).toBe('Lick de Bebop clásico (En Do)')
    expect(minPitch).toBeGreaterThanOrEqual(60)
    expect(maxPitch).toBeLessThanOrEqual(84)
  })
})
