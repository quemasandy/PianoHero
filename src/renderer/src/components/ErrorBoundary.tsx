import React from 'react'
import { logRendererEvent } from '../lib/diagnostics'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logRendererEvent('error', 'react.error-boundary', 'React render error captured', {
      error,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="ph-error-boundary" data-ui="error-boundary" role="alert">
        <h1 className="ph-error-boundary__title" data-ui="error-title">
          La interfaz falló al renderizar
        </h1>
        <p className="ph-error-boundary__message" data-ui="error-message">
          Se capturó el error en el renderer para que no quede una pantalla vacía. Abre el panel de
          logs y revisa los últimos eventos antes del fallo.
        </p>
        <pre className="ph-error-boundary__stack" data-ui="error-stack">
          {this.state.error.stack || this.state.error.message}
        </pre>
      </main>
    )
  }
}
