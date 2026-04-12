import type { DiagnosticLevel } from '../types'

let installed = false

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serialize(nested)])
    )
  }
  return value
}

export function logRendererEvent(
  level: DiagnosticLevel,
  event: string,
  message: string,
  context?: unknown
) {
  try {
    window.electronAPI?.logDiagnostic({
      level,
      event,
      message,
      context: {
        href: window.location.href,
        visibility: document.visibilityState,
        ...serialize(context)
      }
    })
  } catch {
    // Logging should never take down the renderer.
  }
}

export function installRendererDiagnostics() {
  if (installed) return
  installed = true

  window.addEventListener('error', (event) => {
    logRendererEvent('error', 'window.error', event.message || 'Unhandled window error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logRendererEvent('error', 'window.unhandledrejection', 'Unhandled promise rejection', {
      reason: event.reason
    })
  })

  logRendererEvent('info', 'renderer.diagnostics.ready', 'Renderer diagnostics installed', {
    userAgent: navigator.userAgent
  })
}
