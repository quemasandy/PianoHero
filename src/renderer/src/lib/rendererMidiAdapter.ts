import type { DiagnosticsSnapshot } from '../types'

type MidiNoteEvent = { type: number; note: number; velocity: number }
type MidiNoteCallback = (event: MidiNoteEvent) => void

type ElectronApi = Window['electronAPI']

interface MidiDeviceRef {
  source: 'web' | 'native'
  name: string
  index: number
}

interface BrowserMidiMessageEvent {
  data: ArrayLike<number>
}

interface BrowserMidiInput {
  name?: string | null
  manufacturer?: string | null
  onmidimessage: ((event: BrowserMidiMessageEvent) => void) | null
}

interface BrowserMidiAccess {
  inputs: Map<string, BrowserMidiInput>
}

interface NavigatorWithMidi extends Navigator {
  requestMIDIAccess?: () => Promise<BrowserMidiAccess>
}

function normalizeDeviceName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getBaseApi(): ElectronApi {
  return window.electronAPI ?? createFallbackApi()
}

function createWebMidiController(logDiagnostic: ElectronApi['logDiagnostic']) {
  let accessPromise: Promise<BrowserMidiAccess> | null = null
  let connectedInput: BrowserMidiInput | null = null
  const callbacks = new Set<MidiNoteCallback>()

  async function requestAccess() {
    const requestMIDIAccess = (navigator as NavigatorWithMidi).requestMIDIAccess
    if (!requestMIDIAccess) return null

    accessPromise ??= requestMIDIAccess.call(navigator).catch((error) => {
      accessPromise = null
      logDiagnostic?.({
        level: 'warn',
        event: 'renderer.webmidi.access.failed',
        message: 'Failed to request Web MIDI access',
        context: { error },
      })
      throw error
    })

    return accessPromise
  }

  async function listInputs() {
    const access = await requestAccess().catch(() => null)
    if (!access) return []
    return Array.from(access.inputs.values())
  }

  function handleMessage(event: BrowserMidiMessageEvent) {
    const status = event.data[0] ?? 0
    const note = event.data[1] ?? 0
    const velocity = event.data[2] ?? 0
    const type = status & 0xf0

    if (type !== 0x80 && type !== 0x90) return
    callbacks.forEach((callback) => callback({ type, note, velocity }))
  }

  return {
    async getDevices() {
      const inputs = await listInputs()
      return inputs.map((input, index) => ({
        source: 'web' as const,
        name: input.name || input.manufacturer || `Web MIDI ${index + 1}`,
        index,
      }))
    },

    async connect(index: number) {
      const inputs = await listInputs()
      const input = inputs[index]
      if (!input) return false

      if (connectedInput) connectedInput.onmidimessage = null
      connectedInput = input
      connectedInput.onmidimessage = handleMessage
      logDiagnostic?.({
        level: 'info',
        event: 'renderer.webmidi.connected',
        message: 'Connected Web MIDI input device',
        context: { index, name: input.name },
      })
      return true
    },

    disconnect() {
      if (connectedInput) connectedInput.onmidimessage = null
      connectedInput = null
    },

    onNote(callback: MidiNoteCallback) {
      callbacks.add(callback)
      return () => callbacks.delete(callback)
    },
  }
}

function createFallbackApi(): ElectronApi {
  return {
    openMidiFile: async () => null,
    readMidiFile: async () => new ArrayBuffer(0),
    getMidiDevices: async () => [],
    connectMidiDevice: async () => false,
    disconnectMidiDevice: async () => undefined,
    logDiagnostic: () => {},
    getDiagnosticsSnapshot: async (): Promise<DiagnosticsSnapshot> => ({
      entries: [],
      logPath: '',
    }),
    showDiagnosticsLog: async () => '',
    onDiagnosticsUpdated: () => () => {},
    onMidiNote: () => () => {},
  }
}

export function installRendererMidiAdapter() {
  if (typeof window === 'undefined') return

  if (!window.electronAPI) {
    window.electronAPI = createFallbackApi()
  }
}

const webMidi = createWebMidiController((payload) => getBaseApi().logDiagnostic(payload))
let lastDevices: MidiDeviceRef[] = []

async function getMidiDevices() {
  const nativeApi = window.electronAPI
  const [webDevices, nativeDeviceNames] = await Promise.all([
    webMidi.getDevices(),
    nativeApi?.getMidiDevices().catch((error) => {
      getBaseApi().logDiagnostic({
        level: 'warn',
        event: 'renderer.native-midi.devices.failed',
        message: 'Failed to list native MIDI devices',
        context: { error },
      })
      return []
    }) ?? Promise.resolve([]),
  ])

  const seenNames = new Set(webDevices.map((device) => normalizeDeviceName(device.name)))
  const nativeDevices = nativeDeviceNames
    .map((name, index) => ({ source: 'native' as const, name, index }))
    .filter((device) => !seenNames.has(normalizeDeviceName(device.name)))

  lastDevices = [...webDevices, ...nativeDevices]
  return lastDevices.map((device) => device.name)
}

async function connectMidiDevice(portIndex: number) {
  if (lastDevices.length === 0) {
    await getMidiDevices()
  }

  const device = lastDevices[portIndex]
  if (!device) return false

  await getBaseApi()
    .disconnectMidiDevice()
    .catch(() => {})
  webMidi.disconnect()

  if (device.source === 'web') {
    return webMidi.connect(device.index)
  }

  return window.electronAPI?.connectMidiDevice(device.index) ?? false
}

async function disconnectMidiDevice() {
  webMidi.disconnect()
  await getBaseApi()
    .disconnectMidiDevice()
    .catch(() => {})
}

function onMidiNote(callback: MidiNoteCallback) {
  const unsubscribeNative = window.electronAPI?.onMidiNote(callback) ?? (() => {})
  const unsubscribeWeb = webMidi.onNote(callback)

  return () => {
    unsubscribeNative()
    unsubscribeWeb()
  }
}

export const rendererMidiApi = {
  getMidiDevices,
  connectMidiDevice,
  disconnectMidiDevice,
  onMidiNote,
}
