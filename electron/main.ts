import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'

type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error'

interface DiagnosticEntry {
  timestamp: string
  level: DiagnosticLevel
  source: string
  event: string
  message: string
  context?: unknown
}

const recentDiagnostics: DiagnosticEntry[] = []
let diagnosticsLogPath = join(tmpdir(), 'pianohero-diagnostics.log')

function serializeDetails(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }
  if (Array.isArray(value)) {
    return value.map(serializeDetails)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serializeDetails(nested)])
    )
  }
  return value
}

function ensureDiagnosticsLogPath() {
  try {
    if (app.isReady()) {
      app.setAppLogsPath()
      const logDir = app.getPath('logs')
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
      diagnosticsLogPath = join(logDir, 'pianohero-diagnostics.log')
      return
    }
  } catch {
    // Fall back to temp dir until Electron finishes booting.
  }

  const fallbackDir = join(tmpdir(), 'pianohero-diagnostics')
  if (!existsSync(fallbackDir)) mkdirSync(fallbackDir, { recursive: true })
  diagnosticsLogPath = join(fallbackDir, 'pianohero-diagnostics.log')
}

function diagnosticsSnapshot() {
  ensureDiagnosticsLogPath()
  return {
    logPath: diagnosticsLogPath,
    entries: recentDiagnostics.slice(-200)
  }
}

function broadcastDiagnostics() {
  const snapshot = diagnosticsSnapshot()
  BrowserWindow.getAllWindows().forEach(win => {
    if (win.isDestroyed()) return
    try {
      win.webContents.send('diag:updated', snapshot)
    } catch (error) {
      console.warn('Failed to broadcast diagnostics to renderer:', error)
    }
  })
}

function writeDiagnostic(
  level: DiagnosticLevel,
  source: string,
  event: string,
  message: string,
  context?: unknown
) {
  ensureDiagnosticsLogPath()
  const entry: DiagnosticEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    event,
    message,
    context: context === undefined ? undefined : serializeDetails(context)
  }

  recentDiagnostics.push(entry)
  if (recentDiagnostics.length > 500) recentDiagnostics.shift()

  appendFileSync(diagnosticsLogPath, `${JSON.stringify(entry)}\n`)
  broadcastDiagnostics()
}

function attachWindowDiagnostics(win: BrowserWindow) {
  const { webContents } = win

  writeDiagnostic('info', 'main', 'window.created', 'BrowserWindow created', {
    id: webContents.id
  })

  win.on('ready-to-show', () => {
    writeDiagnostic('info', 'main', 'window.ready-to-show', 'Window ready to show', {
      id: webContents.id
    })
  })

  win.on('unresponsive', () => {
    writeDiagnostic('warn', 'main', 'window.unresponsive', 'Window became unresponsive', {
      id: webContents.id,
      url: webContents.getURL()
    })
  })

  win.on('responsive', () => {
    writeDiagnostic('info', 'main', 'window.responsive', 'Window became responsive again', {
      id: webContents.id,
      url: webContents.getURL()
    })
  })

  webContents.on('dom-ready', () => {
    writeDiagnostic('info', 'renderer', 'dom-ready', 'Renderer DOM ready', {
      id: webContents.id,
      url: webContents.getURL()
    })
  })

  webContents.on('did-start-loading', () => {
    writeDiagnostic('info', 'renderer', 'did-start-loading', 'Renderer started loading', {
      id: webContents.id,
      url: webContents.getURL()
    })
  })

  webContents.on('did-stop-loading', () => {
    writeDiagnostic('info', 'renderer', 'did-stop-loading', 'Renderer stopped loading', {
      id: webContents.id,
      url: webContents.getURL()
    })
  })

  webContents.on('did-finish-load', () => {
    writeDiagnostic('info', 'renderer', 'did-finish-load', 'Renderer finished load', {
      id: webContents.id,
      url: webContents.getURL()
    })
  })

  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    writeDiagnostic('error', 'renderer', 'did-fail-load', 'Renderer failed to load', {
      id: webContents.id,
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame
    })
  })

  webContents.on('did-start-navigation', (_event, navigationUrl, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
    writeDiagnostic('info', 'renderer', 'did-start-navigation', 'Renderer started navigation', {
      id: webContents.id,
      navigationUrl,
      isInPlace,
      isMainFrame,
      frameProcessId,
      frameRoutingId
    })
  })

  webContents.on('did-navigate', (_event, navigationUrl, httpResponseCode, httpStatusText) => {
    writeDiagnostic('warn', 'renderer', 'did-navigate', 'Renderer navigated', {
      id: webContents.id,
      navigationUrl,
      httpResponseCode,
      httpStatusText
    })
  })

  webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const mappedLevel: DiagnosticLevel =
      level >= 3 ? 'error' :
      level === 2 ? 'warn' :
      'info'

    writeDiagnostic(mappedLevel, 'renderer.console', 'console-message', message, {
      id: webContents.id,
      line,
      sourceId,
      url: webContents.getURL()
    })
  })

  webContents.on('render-process-gone', (_event, details) => {
    writeDiagnostic('error', 'electron', 'render-process-gone', 'Renderer process terminated', {
      id: webContents.id,
      url: webContents.getURL(),
      ...details
    })
  })

  webContents.on('destroyed', () => {
    writeDiagnostic('warn', 'renderer', 'destroyed', 'Renderer webContents destroyed', {
      id: webContents.id
    })
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  attachWindowDiagnostics(win)

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

process.on('uncaughtException', (error) => {
  writeDiagnostic('error', 'main', 'uncaughtException', error.message, error)
})

process.on('unhandledRejection', (reason) => {
  writeDiagnostic('error', 'main', 'unhandledRejection', 'Unhandled promise rejection', reason)
})

app.on('child-process-gone', (_event, details) => {
  writeDiagnostic('error', 'electron', 'child-process-gone', 'Child process terminated', details)
})

app.whenReady().then(() => {
  writeDiagnostic('info', 'main', 'app.ready', 'Electron app ready', {
    pid: process.pid
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  writeDiagnostic('info', 'main', 'window-all-closed', 'All windows closed')
  if (process.platform !== 'darwin') app.quit()
})

// IPC: Open MIDI file dialog
ipcMain.handle('midi:open-file', async () => {
  writeDiagnostic('info', 'main', 'midi.open-file', 'Opening MIDI file dialog')
  const result = await dialog.showOpenDialog({
    title: 'Abrir archivo MIDI',
    filters: [{ name: 'MIDI', extensions: ['mid', 'midi'] }],
    properties: ['openFile', 'multiSelections']
  })
  writeDiagnostic('info', 'main', 'midi.open-file.result', 'MIDI file dialog resolved', {
    canceled: result.canceled,
    fileCount: result.filePaths.length
  })
  if (result.canceled) return null
  return result.filePaths
})

// IPC: Read MIDI file as buffer
ipcMain.handle('midi:read-file', async (_event, filePath: string) => {
  writeDiagnostic('info', 'main', 'midi.read-file', 'Reading MIDI file', { filePath })
  const buffer = readFileSync(filePath)
  writeDiagnostic('info', 'main', 'midi.read-file.done', 'MIDI file read', {
    filePath,
    byteLength: buffer.byteLength
  })
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
})

// IPC: Get MIDI input devices
ipcMain.handle('midi:get-devices', () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const midi = require('@julusian/midi')
    const input = new midi.Input()
    const count = input.getPortCount()
    const devices: string[] = []
    for (let i = 0; i < count; i++) {
      devices.push(input.getPortName(i))
    }
    writeDiagnostic('info', 'main', 'midi.get-devices', 'Fetched MIDI devices', {
      count: devices.length
    })
    input.closePort?.()
    return devices
  } catch {
    writeDiagnostic('warn', 'main', 'midi.get-devices.failed', 'Failed to fetch MIDI devices')
    return []
  }
})

// MIDI physical device listener
let midiInput: { closePort: () => void } | null = null

ipcMain.handle('midi:connect-device', (_event, portIndex: number) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const midi = require('@julusian/midi')
    if (midiInput) midiInput.closePort()
    const input = new midi.Input()
    input.openPort(portIndex)
    input.on('message', (_deltaTime: number, message: number[]) => {
      const [status, note, velocity] = message
      const type = status & 0xf0
      BrowserWindow.getAllWindows().forEach(w =>
        w.webContents.send('midi:note', { type, note, velocity })
      )
    })
    midiInput = input
    writeDiagnostic('info', 'main', 'midi.connect-device', 'Connected MIDI device', {
      portIndex
    })
    return true
  } catch {
    writeDiagnostic('error', 'main', 'midi.connect-device.failed', 'Failed to connect MIDI device', {
      portIndex
    })
    return false
  }
})

ipcMain.handle('midi:disconnect-device', () => {
  if (midiInput) {
    (midiInput as any).closePort?.()
    midiInput = null
    writeDiagnostic('info', 'main', 'midi.disconnect-device', 'Disconnected MIDI device')
  }
})

ipcMain.on('diag:log', (event, payload: {
  level?: DiagnosticLevel
  event: string
  message: string
  context?: unknown
}) => {
  writeDiagnostic(
    payload.level ?? 'info',
    'renderer.event',
    payload.event,
    payload.message,
    {
      senderId: event.sender.id,
      url: event.sender.getURL(),
      ...serializeDetails(payload.context)
    }
  )
})

ipcMain.handle('diag:get-snapshot', () => diagnosticsSnapshot())

ipcMain.handle('diag:show-log', async () => {
  ensureDiagnosticsLogPath()
  shell.showItemInFolder(diagnosticsLogPath)
  return diagnosticsLogPath
})
