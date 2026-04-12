import * as Tone from 'tone'

// Note names for sampler mapping
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const name = NOTE_NAMES[midi % 12]
  return `${name}${octave}`
}

export class AudioPlayer {
  private loaded = false
  private synth: Tone.PolySynth | null = null

  async load(onProgress?: (pct: number) => void): Promise<void> {
    if (this.loaded) {
      onProgress?.(100)
      return
    }

    onProgress?.(0)
    this.fallbackToSynth()
    onProgress?.(100)
  }

  private fallbackToSynth() {
    if (this.synth) {
      this.loaded = true
      return
    }
    this.loaded = true
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination()
  }

  playNote(pitch: number, duration: number, velocity: number) {
    if (!this.loaded) return
    const note = midiToNoteName(pitch)
    const vol = velocity / 127

    if (this.synth) {
      this.synth.triggerAttackRelease(note, Math.max(duration, 0.05), Tone.now(), vol)
    }
  }

  stopNote(pitch: number) {
    const note = midiToNoteName(pitch)
    if (this.synth) {
      this.synth.triggerRelease([note], Tone.now())
    }
  }

  setVolume(vol: number) {
    // vol 0-1
    const db = vol === 0 ? -Infinity : 20 * Math.log10(vol)
    if (this.synth) this.synth.volume.value = db
  }

  isLoaded() {
    return this.loaded
  }

  dispose() {
    this.synth?.dispose()
    this.synth = null
    this.loaded = false
  }
}
