import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Practice from './Practice'

vi.mock('../hooks/useMidiDevice', () => ({
  useMidiDevice: vi.fn(),
}))

vi.mock('../hooks/useBackingTrack', () => ({
  useBackingTrack: () => ({
    bpm: 120,
    isPlaying: false,
    togglePlay: vi.fn(),
    updateBpm: vi.fn(),
  }),
}))

vi.mock('../lib/diagnostics', () => ({
  logRendererEvent: vi.fn(),
}))

describe('Practice selectors', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        disconnectMidiDevice: vi.fn().mockResolvedValue(undefined),
        getMidiDevices: vi.fn().mockResolvedValue([]),
        connectMidiDevice: vi.fn().mockResolvedValue(false),
        onMidiNote: vi.fn(() => vi.fn()),
      },
    })
  })

  it('exposes stable selectors for the home screen and practice cards', () => {
    const onViewChange = vi.fn()
    const onNavigateMode = vi.fn()

    const { container, unmount } = render(
      <Practice
        currentView="practice_home"
        onViewChange={onViewChange}
        onNavigateMode={onNavigateMode}
      />
    )

    const practiceScreen = container.querySelector('[data-ui="practice-screen"]')
    const cards = container.querySelectorAll('[data-ui="practice-card"]')

    expect(practiceScreen).toHaveAttribute('data-view', 'practice_home')
    expect(container.querySelector('[data-ui="global-controls"]')).toBeInTheDocument()
    expect(cards).toHaveLength(3)
    expect([...cards].map((card) => card.getAttribute('data-mode'))).toEqual([
      'scales',
      'chords',
      'songs',
    ])

    fireEvent.click(screen.getByRole('button', { name: /Practicar escalas/ }))

    expect(onViewChange).toHaveBeenCalledWith('scale_session')
    unmount()
  })
})
