import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DiagnosticsPanel from './DiagnosticsPanel'

const snapshot = {
  logPath: '/tmp/pianohero.log',
  entries: [
    {
      timestamp: '2026-05-02T10:00:00.000Z',
      level: 'error' as const,
      source: 'renderer',
      event: 'ui.test.failure',
      message: 'Selector test event',
      context: { component: 'DiagnosticsPanel' },
    },
  ],
}

describe('DiagnosticsPanel selectors', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getDiagnosticsSnapshot: vi.fn().mockResolvedValue(snapshot),
        onDiagnosticsUpdated: vi.fn(() => vi.fn()),
        showDiagnosticsLog: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('exposes stable selectors for the toggle and log entries', async () => {
    const { container } = render(<DiagnosticsPanel />)

    await waitFor(() => {
      expect(window.electronAPI.getDiagnosticsSnapshot).toHaveBeenCalled()
    })

    const panel = container.querySelector('[data-ui="diagnostics-panel"]')
    const toggle = screen.getByRole('button', { name: 'Logs del sistema' })

    expect(panel).toHaveAttribute('data-ui', 'diagnostics-panel')
    expect(toggle).toHaveAttribute('data-ui', 'diagnostics-toggle')

    fireEvent.click(toggle)

    const entry = await screen.findByText('Selector test event')
    const entryContainer = entry.closest('[data-ui="diagnostics-entry"]')

    expect(entryContainer).toHaveAttribute('data-level', 'error')
    expect(entryContainer).toHaveAttribute('data-source', 'renderer')
    expect(entryContainer).toHaveAttribute('data-event', 'ui.test.failure')
    expect(screen.getByText('/tmp/pianohero.log')).toHaveAttribute(
      'data-ui',
      'diagnostics-log-path'
    )
  })
})
