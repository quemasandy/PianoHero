import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ErrorBoundary from './ErrorBoundary'

// Mock the diagnostics module so we don't need the electron API
vi.mock('../lib/diagnostics', () => ({
  logRendererEvent: vi.fn(),
}))

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test explosion 💥')
  }
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console output during tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello PianoHero</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Hello PianoHero')).toBeInTheDocument()
  })

  it('should render fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('La interfaz falló al renderizar')).toBeInTheDocument()
    expect(screen.getByText(/Test explosion/)).toBeInTheDocument()
  })

  it('should display the error stack in a pre element', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    const preElement = document.querySelector('pre')
    expect(preElement).not.toBeNull()
    expect(preElement?.textContent).toContain('Test explosion')
  })
})
