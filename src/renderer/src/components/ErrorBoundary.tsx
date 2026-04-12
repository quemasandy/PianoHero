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
    error: null
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logRendererEvent('error', 'react.error-boundary', 'React render error captured', {
      error,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        color: '#fff',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '28px' }}>La interfaz falló al renderizar</h1>
        <p style={{ color: '#8892a4', maxWidth: '720px', lineHeight: 1.5 }}>
          Se capturó el error en el renderer para que no quede una pantalla vacía. Abre el panel
          de logs y revisa los últimos eventos antes del fallo.
        </p>
        <pre style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid #334',
          borderRadius: '12px',
          padding: '16px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {this.state.error.stack || this.state.error.message}
        </pre>
      </div>
    )
  }
}
