import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppNavigation from './AppNavigation'

describe('AppNavigation selectors', () => {
  it('exposes stable selectors for navigation regions and mode tabs', () => {
    const onNavigateHome = vi.fn()
    const onNavigateMode = vi.fn()

    const { container } = render(
      <AppNavigation
        currentMode="chords"
        onNavigateHome={onNavigateHome}
        onNavigateMode={onNavigateMode}
      >
        <span data-ui="test-action">Action</span>
      </AppNavigation>
    )

    const nav = container.querySelector('[data-ui="app-nav"]')
    const tabs = container.querySelectorAll('[data-ui="mode-tab"]')
    const activeTab = container.querySelector('[data-ui="mode-tab"][data-mode="chords"]')

    expect(nav).toHaveAttribute('data-mode', 'chords')
    expect(container.querySelector('[data-ui="home-button"]')).toBeInTheDocument()
    expect(container.querySelector('[data-ui="app-nav-actions"]')).toContainElement(
      screen.getByText('Action')
    )
    expect(tabs).toHaveLength(3)
    expect(activeTab).toHaveAttribute('data-state', 'active')
    expect(activeTab).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: 'Volver a inicio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Escalas' }))

    expect(onNavigateHome).toHaveBeenCalledTimes(1)
    expect(onNavigateMode).toHaveBeenCalledWith('scales')
  })
})
