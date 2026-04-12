import type { ParsedNote, ParsedSong } from '../types'

export type SchedulerEvent =
  | { type: 'noteOn'; note: ParsedNote }
  | { type: 'noteOff'; note: ParsedNote }
  | { type: 'waitForNotes'; notes: ParsedNote[] }
  | { type: 'timeUpdate'; currentTime: number }
  | { type: 'ended' }

type EventCallback = (event: SchedulerEvent) => void

const NOTE_ON_LOOKAHEAD = 0.05
const LEARNING_GROUP_EPSILON = 0.02

export class Scheduler {
  private song: ParsedSong
  private currentTime = 0
  private speed = 1
  private playing = false
  private waiting = false
  private waitingNotes: Set<number> = new Set()
  private pressedNotes: Set<number> = new Set()
  private learningMode = false
  private activeTrackMask: boolean[]
  private rafId: number | null = null
  private lastTimestamp: number | null = null
  private listeners: EventCallback[] = []
  private noteOnFired: Set<string> = new Set()
  private noteOffFired: Set<string> = new Set()

  constructor(song: ParsedSong) {
    this.song = song
    this.activeTrackMask = Array(song.trackCount).fill(true)
  }

  on(cb: EventCallback): () => void {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb)
    }
  }

  private emit(event: SchedulerEvent) {
    this.listeners.forEach(l => l(event))
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0.25, Math.min(2, speed))
  }

  setLearningMode(enabled: boolean) {
    this.learningMode = enabled
    if (!enabled) {
      this.waiting = false
      this.waitingNotes.clear()
    }
  }

  setActiveTrackMask(mask: boolean[]) {
    this.activeTrackMask = mask
  }

  seekTo(time: number) {
    this.currentTime = Math.max(0, Math.min(this.song.duration, time))
    this.noteOnFired.clear()
    this.noteOffFired.clear()
    this.waiting = false
    this.waitingNotes.clear()
    // Pre-fire notes that should already be on at seek position
    for (const note of this.song.notes) {
      if (note.startTime < this.currentTime && note.startTime + note.duration > this.currentTime) {
        const key = noteKey(note)
        this.noteOnFired.add(key)
      }
    }
    this.emit({ type: 'timeUpdate', currentTime: this.currentTime })
  }

  play() {
    if (this.playing) return
    this.playing = true
    if (!this.learningMode) {
      this.waiting = false
    }
    this.lastTimestamp = null
    this.loop()
  }

  pause() {
    this.playing = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  stop() {
    this.pause()
    this.seekTo(0)
    this.noteOnFired.clear()
    this.noteOffFired.clear()
  }

  pressMidiNote(pitch: number) {
    this.pressedNotes.add(pitch)
    if (this.waiting && this.waitingNotes.has(pitch)) {
      this.waitingNotes.delete(pitch)
      if (this.waitingNotes.size === 0) {
        this.waiting = false
        if (this.playing) this.loop()
      }
    }
  }

  releaseMidiNote(pitch: number) {
    this.pressedNotes.delete(pitch)
  }

  private loop() {
    this.rafId = requestAnimationFrame(timestamp => {
      if (!this.playing || this.waiting) return

      if (this.lastTimestamp !== null) {
        const delta = (timestamp - this.lastTimestamp) / 1000
        this.currentTime += delta * this.speed
      }
      this.lastTimestamp = timestamp

      if (this.currentTime >= this.song.duration) {
        this.playing = false
        this.emit({ type: 'ended' })
        return
      }

      this.processNotes()
      this.emit({ type: 'timeUpdate', currentTime: this.currentTime })

      if (this.playing && !this.waiting) {
        this.loop()
      }
    })
  }

  private processNotes() {
    const activeMask = this.activeTrackMask
    const learningGroup = this.getCurrentLearningGroup(activeMask)

    if (this.learningMode && learningGroup.length > 0) {
      const requiredPitches = new Set(learningGroup.map(note => note.pitch))
      for (const pitch of this.pressedNotes) {
        requiredPitches.delete(pitch)
      }

      if (requiredPitches.size > 0) {
        const shouldEmit =
          !this.waiting ||
          requiredPitches.size !== this.waitingNotes.size ||
          [...requiredPitches].some(pitch => !this.waitingNotes.has(pitch))

        this.waiting = true
        this.waitingNotes = requiredPitches

        if (shouldEmit) {
          this.emit({
            type: 'waitForNotes',
            notes: learningGroup.filter(note => requiredPitches.has(note.pitch))
          })
        }
        return
      }

      this.waiting = false
      this.waitingNotes.clear()
    }

    for (const note of this.song.notes) {
      if (!activeMask[note.track]) continue
      const key = noteKey(note)

      // noteOn
      if (
        note.startTime <= this.currentTime + NOTE_ON_LOOKAHEAD &&
        !this.noteOnFired.has(key)
      ) {
        this.noteOnFired.add(key)
        this.emit({ type: 'noteOn', note })
      }

      // noteOff
      if (
        note.startTime + note.duration <= this.currentTime &&
        this.noteOnFired.has(key) &&
        !this.noteOffFired.has(key)
      ) {
        this.noteOffFired.add(key)
        this.emit({ type: 'noteOff', note })
      }
    }

  }

  private getCurrentLearningGroup(activeMask: boolean[]): ParsedNote[] {
    const earliestTime = this.getEarliestPendingStartTime(activeMask)
    if (earliestTime === null) return []
    if (earliestTime > this.currentTime + NOTE_ON_LOOKAHEAD) return []

    return this.getPendingGroupAtTime(activeMask, earliestTime)
  }

  private getEarliestPendingStartTime(activeMask: boolean[]): number | null {
    for (const note of this.song.notes) {
      if (!activeMask[note.track]) continue
      if (this.noteOnFired.has(noteKey(note))) continue
      return note.startTime
    }
    return null
  }

  private getPendingGroupAtTime(activeMask: boolean[], startTime: number): ParsedNote[] {
    return this.song.notes.filter(note => (
      activeMask[note.track] &&
      !this.noteOnFired.has(noteKey(note)) &&
      Math.abs(note.startTime - startTime) <= LEARNING_GROUP_EPSILON
    ))
  }

  getCurrentTime() {
    return this.currentTime
  }

  isPlaying() {
    return this.playing
  }

  isWaiting() {
    return this.waiting
  }

  getNextPendingNoteGroup(): ParsedNote[] {
    const earliestTime = this.getEarliestPendingStartTime(this.activeTrackMask)
    if (earliestTime === null) return []
    return this.getPendingGroupAtTime(this.activeTrackMask, earliestTime)
  }
}

function noteKey(note: ParsedNote): string {
  return `${note.track}-${note.pitch}-${note.startTime}`
}
