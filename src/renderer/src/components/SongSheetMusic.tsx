import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Accidental, Formatter, Voice, Dot } from 'vexflow'
import { SongMeasure } from '../lib/songCatalog'
import { logRendererEvent } from '../lib/diagnostics'

interface SongSheetMusicProps {
  measure: SongMeasure
  currentEventIndex: number
}

const NOTE_NAMES_VEX = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

export default function SongSheetMusic({ measure, currentEventIndex }: SongSheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const width = 600
    const height = 220
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const context = renderer.getContext()
    context.scale(1.5, 1.5)

    context.setFillStyle('#cbd5e1')
    context.setStrokeStyle('#cbd5e1')
    // El pentagrama se dibuja más abajo (y=45) para centrarlo y dejar espacio a líneas adicionales
    const stave = new Stave(10, 45, width / 1.5 - 20)
    stave.addClef(measure.clef)
    stave.setContext(context).draw()

    const vexNotes: StaveNote[] = []

    measure.events.forEach((ev, i) => {
      let keys = ['b/4'] // Default for rest
      if (ev.pitches.length > 0) {
        keys = ev.pitches.map((pitch) => {
          const octave = Math.floor(pitch / 12) - 1
          const noteName = NOTE_NAMES_VEX[pitch % 12]
          return `${noteName}/${octave}`
        })
      }

      let durStr = ev.durationNotation
      const hasDot = durStr.includes('.')
      if (hasDot) {
        durStr = durStr.replace('.', '')
      }

      const staveNote = new StaveNote({
        clef: measure.clef,
        keys: keys,
        duration: ev.pitches.length === 0 ? durStr + 'r' : durStr,
      })

      if (hasDot) {
        try {
          keys.forEach((_, idx) => {
            staveNote.addModifier(new Dot(), idx)
          })
        } catch (err) {
          logRendererEvent(
            'warn',
            'ui.songsheetmusic.dot.failed',
            'Failed to apply dot modifier to note',
            {
              measureId: measure.id,
              eventIndex: i,
              durationNotation: ev.durationNotation,
              error: String(err),
            }
          )
        }
      }

      // Add accidentals
      if (ev.pitches.length > 0) {
        keys.forEach((key, index) => {
          const noteName = key.split('/')[0]
          if (noteName.includes('b') && noteName.length > 1) {
            staveNote.addModifier(new Accidental('b'), index)
          } else if (noteName.includes('#')) {
            staveNote.addModifier(new Accidental('#'), index)
          }
        })
      }

      const isCurrent = i === currentEventIndex
      const isPlayed = i < currentEventIndex

      if (isCurrent) {
        // Enfoque anatómico: Brillamos la propia cabeza de la nota intensificando el color
        staveNote.setStyle({
          fillStyle: 'var(--neon-cyan, #06b6d4)',
          strokeStyle: 'var(--neon-cyan, #06b6d4)',
          shadowColor: '#06b6d4',
          shadowBlur: 10,
        })
      } else if (isPlayed) {
        staveNote.setStyle({ fillStyle: '#3a465c', strokeStyle: '#3a465c' })
      } else {
        staveNote.setStyle({ fillStyle: '#ffffff', strokeStyle: '#8892a4' })
      }

      vexNotes.push(staveNote)
    })

    const voice = new Voice({ num_beats: 4, beat_value: 4 })
    voice.setStrict(false) // just in case total ticks differ from a perfect 4/4 bar
    voice.addTickables(vexNotes)

    new Formatter().joinVoices([voice]).format([voice], width / 1.2 - 60)
    voice.draw(context, stave)

    // Halo / background highlight behind the current note. We render after voice.draw()
    // (when bbox is stable) and insert the <rect> as the first child of the scaled group
    // so it paints BEHIND the staff + notes.
    const currentStaveNote = vexNotes[currentEventIndex]
    if (currentStaveNote) {
      try {
        const bbox = currentStaveNote.getBoundingBox()
        const svgEl = containerRef.current.querySelector('svg')
        // VexFlow's SvgContext wraps drawing in a scaled <g> (context.scale(1.5, 1.5)),
        // which sits as the last child of the root svg. Insert the halo into that group
        // so bbox coordinates (pre-scale user space) line up without extra math.
        const scaledGroup = svgEl?.lastElementChild as SVGGElement | null
        if (bbox && scaledGroup && scaledGroup.tagName.toLowerCase() === 'g') {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', String(bbox.x - 12))
          rect.setAttribute('y', String(bbox.y - 8))
          rect.setAttribute('width', String(bbox.w + 24))
          rect.setAttribute('height', String(bbox.h + 16))
          rect.setAttribute('rx', '12') // Curvas pronunciadas tipo píldora
          rect.setAttribute('fill', 'rgba(6, 182, 212, 0.12)')
          // Sin bordes rectos (stroke='none')
          rect.setAttribute('stroke', 'none')
          // Glow intensificado simulando neon
          rect.setAttribute('filter', 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))')
          scaledGroup.insertBefore(rect, scaledGroup.firstChild)
        }
      } catch {
        // getBoundingBox may throw if the note was not fully laid out — safe to skip the halo.
      }
    }
  }, [measure, currentEventIndex])

  return (
    <div
      className="ph-song-sheet-music"
      data-current-event-index={currentEventIndex}
      data-measure-id={measure.id}
      data-ui="song-sheet-music"
    >
      <div
        className="ph-song-sheet-music__surface"
        data-ui="song-sheet-music-surface"
        ref={containerRef}
      />
    </div>
  )
}
