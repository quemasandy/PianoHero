import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { installRendererDiagnostics, logRendererEvent } from './lib/diagnostics'
import { installRendererMidiAdapter } from './lib/rendererMidiAdapter'

installRendererMidiAdapter()
installRendererDiagnostics()
logRendererEvent('info', 'renderer.bootstrap', 'Bootstrapping React root')

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
