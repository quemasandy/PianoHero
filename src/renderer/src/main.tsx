import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { installRendererDiagnostics, logRendererEvent } from './lib/diagnostics'

installRendererDiagnostics()
logRendererEvent('info', 'renderer.bootstrap', 'Bootstrapping React root')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
