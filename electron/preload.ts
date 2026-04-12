import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openMidiFile: (): Promise<string[] | null> =>
    ipcRenderer.invoke('midi:open-file'),

  readMidiFile: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('midi:read-file', filePath),

  getMidiDevices: (): Promise<string[]> =>
    ipcRenderer.invoke('midi:get-devices'),

  connectMidiDevice: (portIndex: number): Promise<boolean> =>
    ipcRenderer.invoke('midi:connect-device', portIndex),

  disconnectMidiDevice: (): Promise<void> =>
    ipcRenderer.invoke('midi:disconnect-device'),

  logDiagnostic: (payload: { level?: 'debug' | 'info' | 'warn' | 'error'; event: string; message: string; context?: unknown }) =>
    ipcRenderer.send('diag:log', payload),

  getDiagnosticsSnapshot: (): Promise<{ logPath: string; entries: unknown[] }> =>
    ipcRenderer.invoke('diag:get-snapshot'),

  showDiagnosticsLog: (): Promise<string> =>
    ipcRenderer.invoke('diag:show-log'),

  onDiagnosticsUpdated: (callback: (snapshot: { logPath: string; entries: unknown[] }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, snapshot: { logPath: string; entries: unknown[] }) => {
      callback(snapshot)
    }
    ipcRenderer.on('diag:updated', listener)
    return () => ipcRenderer.removeListener('diag:updated', listener)
  },

  onMidiNote: (callback: (event: { type: number; note: number; velocity: number }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, event: { type: number; note: number; velocity: number }) => {
      callback(event)
    }
    ipcRenderer.on('midi:note', listener)
    return () => ipcRenderer.removeListener('midi:note', listener)
  }
})
