export interface ParsedNote {
  pitch: number // MIDI note number 0-127
  startTime: number // seconds from song start
  duration: number // seconds
  velocity: number // 0-127
  track: number // track index
}

export interface TempoEvent {
  tick: number
  bpm: number
}

export interface ParsedSong {
  notes: ParsedNote[]
  duration: number // total duration in seconds
  title: string
  trackCount: number
  ticksPerBeat: number
  trackNames?: string[]
}

export interface PlayerState {
  status: 'idle' | 'playing' | 'paused' | 'waiting'
  currentTime: number
  speed: number
  activeNotes: Set<number> // pitches currently sounding
  hintNotes: Set<number> // pitches to press next (learning mode)
  learningMode: boolean
  activeTrackMask: boolean[] // which tracks are visible/active
}

export type Screen = 'library' | 'play'

export type PracticeMode = 'scales' | 'chords'
export type PracticeView = 'practice_home' | 'scale_session' | 'chord_session'
export type PracticeStatus = 'ready' | 'in_progress' | 'complete'

export interface ScaleExerciseDefinition {
  id: string
  name: string
  description: string
  patternName: string
  rootPitch: number
  nameStyle?: 'rootPrefix' | 'parentheticalKey'
  noteSequence: number[]
  startLabel: string
  endLabel: string
}

export interface ScaleRootOption {
  pitchClass: number
  label: string
  localizedLabel: string
}

export interface ChordPrompt {
  barIndex: number
  chordName: string
  targetNotes: number[]
}

export interface ChordExerciseDefinition {
  id: string
  name: string
  description: string
  progression: ChordPrompt[]
}

export interface PracticeSessionState {
  mode: PracticeMode
  exerciseId: string
  stepIndex: number
  expectedNotes: number[]
  pressedNotes: Set<number>
  wrongNotes: Set<number>
  status: PracticeStatus
}

export interface MidiControllerProfile {
  deviceName: string
  keyCount: number
  isWorlddeProfile: boolean
  matchedByName: boolean
}

export interface KeyboardWindow {
  startPitch: number
  endPitch: number
  targetPitches: number[]
  outOfRange: boolean
}

export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error'

export interface DiagnosticEntry {
  timestamp: string
  level: DiagnosticLevel
  source: string
  event: string
  message: string
  context?: unknown
}

export interface DiagnosticsSnapshot {
  logPath: string
  entries: DiagnosticEntry[]
}

// Extended Window type for Electron preload bridge
declare global {
  interface Window {
    electronAPI: {
      openMidiFile: () => Promise<string[] | null>
      readMidiFile: (filePath: string) => Promise<ArrayBuffer>
      getMidiDevices: () => Promise<string[]>
      connectMidiDevice: (portIndex: number) => Promise<boolean>
      disconnectMidiDevice: () => Promise<void>
      logDiagnostic: (payload: {
        level?: DiagnosticLevel
        event: string
        message: string
        context?: unknown
      }) => void
      getDiagnosticsSnapshot: () => Promise<DiagnosticsSnapshot>
      showDiagnosticsLog: () => Promise<string>
      onDiagnosticsUpdated: (cb: (snapshot: DiagnosticsSnapshot) => void) => () => void
      onMidiNote: (
        cb: (event: { type: number; note: number; velocity: number }) => void
      ) => () => void
    }
  }
}
