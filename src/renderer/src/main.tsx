import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { installRendererDiagnostics, logRendererEvent } from './lib/diagnostics'

installRendererDiagnostics()
logRendererEvent('info', 'renderer.bootstrap', 'Bootstrapping React root')

// -- EMULADOR BROWSER STANDALONE (Para validaciones visuales del agente Antigravity) --
if (typeof window !== 'undefined' && !window.electronAPI) {
  window.electronAPI = {
    listMidiDevices: async () => ['Simulated Web MIDI Device'],
    connectMidiDevice: async (_index) => true,
    disconnectMidiDevice: async () => true,
    getDiagnosticsSnapshot: async () => ({
      entries: [],
      logPath: '',
      startTimes: { renderer: 0, platform: 0 },
    }),
    clearRendererLogs: async () => {},
    onDiagnosticsUpdated: () => () => {},
    onMidiMessage: () => () => {},
    onMidiNote: () => () => {},
    onMidiDevicesUpdated: () => () => {},
    platform: 'mock-web',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}
// ------------------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
