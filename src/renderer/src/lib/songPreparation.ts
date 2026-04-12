import type { ParsedNote, ParsedSong } from '../types'

const C_JAM_BLUES_PATTERN = /c[\s_-]*jam blues/i
const EASY_TITLE_SUFFIX = ' (Easy 25-Key)'
const GROUP_EPSILON = 0.02
const PRE_ROLL_SECONDS = 1.5
const EASY_MIN_PITCH = 55
const EASY_MAX_PITCH = 79
const FAST_ORNAMENT_GAP = 0.1
const MERGE_SAME_PITCH_GAP = 0.18
const DEFAULT_TARGET_PITCH = 60

interface PreparedSongResult {
  song: ParsedSong
  adapted: boolean
  preset?: string
}

interface NoteGroup {
  startTime: number
  notes: ParsedNote[]
}

export function prepareSongForPractice(song: ParsedSong, sourcePath?: string): PreparedSongResult {
  if (song.title.includes(EASY_TITLE_SUFFIX)) {
    return { song, adapted: false }
  }

  if (!shouldCreateEasyCJamBlues(song, sourcePath)) {
    return { song, adapted: false }
  }

  const easySong = createEasyCJamBluesArrangement(song)
  if (!easySong) {
    return { song, adapted: false }
  }

  return {
    song: easySong,
    adapted: true,
    preset: 'c-jam-blues-easy-25-key'
  }
}

function shouldCreateEasyCJamBlues(song: ParsedSong, sourcePath?: string) {
  return C_JAM_BLUES_PATTERN.test(song.title) || (!!sourcePath && C_JAM_BLUES_PATTERN.test(sourcePath))
}

function createEasyCJamBluesArrangement(song: ParsedSong): ParsedSong | null {
  const leadTrack = findLeadTrackIndex(song)
  if (leadTrack === null) return null

  const trackNotes = song.notes
    .filter(note => note.track === leadTrack)
    .sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch)

  if (trackNotes.length === 0) return null

  const groups = groupNotesByStart(trackNotes)
  const simplifiedNotes: ParsedNote[] = []
  let previousPitch = DEFAULT_TARGET_PITCH

  for (const group of groups) {
    const selected = selectEasyPlayableNote(group, previousPitch)
    if (!selected) continue

    const previousNote = simplifiedNotes[simplifiedNotes.length - 1]
    if (previousNote) {
      const gap = group.startTime - previousNote.startTime

      if (gap <= FAST_ORNAMENT_GAP) {
        if (selected.pitch > previousNote.pitch) {
          previousNote.pitch = selected.pitch
          previousNote.duration = Math.max(previousNote.duration, selected.duration)
          previousNote.velocity = Math.max(previousNote.velocity, selected.velocity)
        }
        previousPitch = previousNote.pitch
        continue
      }

      if (gap <= MERGE_SAME_PITCH_GAP && selected.pitch === previousNote.pitch) {
        previousNote.duration = Math.max(previousNote.duration, gap + selected.duration)
        previousNote.velocity = Math.max(previousNote.velocity, selected.velocity)
        previousPitch = previousNote.pitch
        continue
      }
    }

    simplifiedNotes.push({
      pitch: selected.pitch,
      startTime: group.startTime,
      duration: selected.duration,
      velocity: selected.velocity,
      track: 0
    })
    previousPitch = selected.pitch
  }

  if (simplifiedNotes.length < 16) return null

  const firstStartTime = simplifiedNotes[0].startTime
  const rebasedNotes = simplifiedNotes.map(note => ({
    ...note,
    startTime: note.startTime - firstStartTime + PRE_ROLL_SECONDS,
    velocity: Math.max(note.velocity, 96)
  }))

  const duration = rebasedNotes.reduce(
    (max, note) => Math.max(max, note.startTime + note.duration),
    0
  )

  return {
    notes: rebasedNotes,
    duration,
    title: `${song.title}${EASY_TITLE_SUFFIX}`,
    trackCount: 1,
    ticksPerBeat: song.ticksPerBeat,
    trackNames: ['Easy Lead']
  }
}

function selectEasyPlayableNote(
  group: NoteGroup,
  previousPitch: number
): Pick<ParsedNote, 'pitch' | 'duration' | 'velocity'> | null {
  const centeredCandidates = buildPitchCandidates(group.notes, false)
    .filter(candidate => candidate.pitch >= EASY_MIN_PITCH && candidate.pitch <= EASY_MAX_PITCH)
    .sort((a, b) => b.pitch - a.pitch || b.duration - a.duration)

  if (centeredCandidates.length > 0) {
    return centeredCandidates[0]
  }

  const foldedCandidates = buildPitchCandidates(group.notes, true).sort((a, b) => (
    Math.abs(a.pitch - previousPitch) - Math.abs(b.pitch - previousPitch) ||
    b.pitch - a.pitch ||
    b.duration - a.duration
  ))

  return foldedCandidates[0] ?? null
}

function buildPitchCandidates(
  notes: ParsedNote[],
  foldIntoEasyRange: boolean
): Array<Pick<ParsedNote, 'pitch' | 'duration' | 'velocity'>> {
  const candidates = new Map<number, Pick<ParsedNote, 'pitch' | 'duration' | 'velocity'>>()

  for (const note of notes) {
    const pitch = foldIntoEasyRange ? foldPitchIntoEasyRange(note.pitch) : note.pitch
    const existing = candidates.get(pitch)

    if (!existing) {
      candidates.set(pitch, {
        pitch,
        duration: note.duration,
        velocity: note.velocity
      })
      continue
    }

    existing.duration = Math.max(existing.duration, note.duration)
    existing.velocity = Math.max(existing.velocity, note.velocity)
  }

  return [...candidates.values()]
}

function foldPitchIntoEasyRange(pitch: number) {
  let foldedPitch = pitch

  while (foldedPitch < EASY_MIN_PITCH) {
    foldedPitch += 12
  }

  while (foldedPitch > EASY_MAX_PITCH) {
    foldedPitch -= 12
  }

  return foldedPitch
}

function findLeadTrackIndex(song: ParsedSong): number | null {
  const trackNames = song.trackNames ?? []

  const preferredClassic = trackNames.findIndex(name => /grand piano \(classic\)/i.test(name))
  if (preferredClassic >= 0) return preferredClassic

  const preferredPiano = trackNames.findIndex(name => /grand piano/i.test(name))
  if (preferredPiano >= 0) return preferredPiano

  const trackStats = Array.from({ length: song.trackCount }, (_, track) => {
    const notes = song.notes.filter(note => note.track === track)
    if (notes.length === 0) return null

    const avgPitch = notes.reduce((sum, note) => sum + note.pitch, 0) / notes.length
    const maxPitch = notes.reduce((max, note) => Math.max(max, note.pitch), 0)

    return { track, noteCount: notes.length, avgPitch, maxPitch }
  }).filter((entry): entry is { track: number; noteCount: number; avgPitch: number; maxPitch: number } => !!entry)

  if (trackStats.length === 0) return null

  trackStats.sort((a, b) => (
    b.maxPitch - a.maxPitch ||
    b.avgPitch - a.avgPitch ||
    b.noteCount - a.noteCount
  ))

  return trackStats[0]?.track ?? null
}

function groupNotesByStart(notes: ParsedNote[]): NoteGroup[] {
  const groups: NoteGroup[] = []

  for (const note of notes) {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && Math.abs(note.startTime - lastGroup.startTime) <= GROUP_EPSILON) {
      lastGroup.notes.push(note)
      continue
    }

    groups.push({
      startTime: note.startTime,
      notes: [note]
    })
  }

  return groups
}
