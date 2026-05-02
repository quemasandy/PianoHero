import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import Piano from './Piano'
import { TOTAL_WHITE_KEYS, getPitchRangeBounds } from '../lib/keyboardLayout'
import { PRACTICE_KEYBOARD_WINDOW } from '../lib/practiceCatalog'

function renderPiano(props: Partial<Parameters<typeof Piano>[0]> = {}) {
  return render(
    <Piano
      activeNotes={new Set()}
      hintNotes={new Set()}
      keyboardWindow={PRACTICE_KEYBOARD_WINDOW}
      compactView={true}
      onNoteOn={vi.fn()}
      onNoteOff={vi.fn()}
      {...props}
    />
  )
}

function getSvgViewBox(container: HTMLElement) {
  const viewBox = container.querySelector('svg')?.getAttribute('viewBox')
  expect(viewBox).toBeTruthy()
  if (!viewBox) throw new Error('Missing Piano SVG viewBox')
  return viewBox.split(' ').map(Number)
}

describe('Piano viewport alignment', () => {
  it('uses the practice window as the compact viewport by default', () => {
    const bounds = getPitchRangeBounds(
      PRACTICE_KEYBOARD_WINDOW.startPitch,
      PRACTICE_KEYBOARD_WINDOW.endPitch
    )
    expect(bounds).not.toBeNull()

    const { container } = renderPiano()
    const [x, _y, width] = getSvgViewBox(container)

    expect(x).toBeCloseTo((bounds?.x ?? 0) - 0.4)
    expect(width).toBeCloseTo((bounds?.width ?? 0) + 0.8)
  })

  it('can center the full keyboard while keeping compact practice markers', () => {
    const { container } = renderPiano({ centerFullKeyboard: true })
    const [x, _y, width] = getSvgViewBox(container)

    expect(x).toBeCloseTo(-0.4)
    expect(width).toBeCloseTo(TOTAL_WHITE_KEYS + 0.8)
  })

  it('raises the compact range header above target note markers', () => {
    const { container } = renderPiano({
      centerFullKeyboard: true,
      hintNotes: new Set([60, 64, 70]),
    })
    const [_x, y] = getSvgViewBox(container)
    const rangeTitle = container.querySelector('[data-ui="piano-range-title"]')
    const firstTargetMarker = container.querySelector('[data-ui="piano-target-marker"] rect')

    expect(y).toBeLessThan(-0.2)
    expect(rangeTitle).toHaveAttribute('y', '-0.38')
    expect(Number(rangeTitle?.getAttribute('y'))).toBeLessThan(
      Number(firstTargetMarker?.getAttribute('y'))
    )
  })

  it('keeps the compact range header in its home position when there are no target markers', () => {
    const { container } = renderPiano({ centerFullKeyboard: true })
    const rangeTitle = container.querySelector('[data-ui="piano-range-title"]')

    expect(rangeTitle).toHaveAttribute('y', '0.95')
  })

  it('keeps song mode scoped to the active keyboard window', () => {
    const bounds = getPitchRangeBounds(
      PRACTICE_KEYBOARD_WINDOW.startPitch,
      PRACTICE_KEYBOARD_WINDOW.endPitch
    )
    expect(bounds).not.toBeNull()

    const { container } = renderPiano({ songMode: true, centerFullKeyboard: true })
    const svg = container.querySelector('svg')
    const [x, y, width] = getSvgViewBox(container)

    expect(svg?.getAttribute('preserveAspectRatio')).toBe('none')
    expect(x).toBeCloseTo((bounds?.x ?? 0) - 0.4)
    expect(y).toBeCloseTo(1.9)
    expect(width).toBeCloseTo((bounds?.width ?? 0) + 0.8)
  })

  it('exposes stable key selectors and interaction states', () => {
    const { container } = renderPiano({
      activeNotes: new Set([60]),
      hintNotes: new Set([62]),
      correctNotes: new Set([64]),
      wrongNotes: new Set([65]),
    })

    const activeKey = container.querySelector('[data-ui="piano-key"][data-pitch="60"]')
    const targetKey = container.querySelector('[data-ui="piano-key"][data-pitch="62"]')
    const correctKey = container.querySelector('[data-ui="piano-key"][data-pitch="64"]')
    const wrongKey = container.querySelector('[data-ui="piano-key"][data-pitch="65"]')

    expect(activeKey).toHaveAttribute('data-key-kind', 'white')
    expect(activeKey).toHaveAttribute('data-note', 'C4')
    expect(activeKey).toHaveAttribute('data-state', 'active')
    expect(targetKey).toHaveAttribute('data-state', 'target')
    expect(correctKey).toHaveAttribute('data-state', 'correct')
    expect(wrongKey).toHaveAttribute('data-state', 'wrong')
  })
})
