import { Midi } from '@tonejs/midi'
import type { ParsedNote, ParsedSong } from '../types'

export async function parseMidiFile(buffer: ArrayBuffer): Promise<ParsedSong> {
  const midi = new Midi(buffer)

  const notes: ParsedNote[] = []

  midi.tracks.forEach((track, trackIndex) => {
    track.notes.forEach(note => {
      notes.push({
        pitch: note.midi,
        startTime: note.time,
        duration: note.duration,
        velocity: Math.round(note.velocity * 127),
        track: trackIndex
      })
    })
  })

  // Sort by start time
  notes.sort((a, b) => a.startTime - b.startTime)

  const duration = notes.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration),
    0
  )

  const title =
    midi.name ||
    midi.tracks.find(t => t.name)?.name ||
    'Sin título'

  return {
    notes,
    duration,
    title,
    trackCount: midi.tracks.length,
    ticksPerBeat: midi.header.ppq,
    trackNames: midi.tracks.map((track, trackIndex) => track.name || `Track ${trackIndex + 1}`)
  }
}
