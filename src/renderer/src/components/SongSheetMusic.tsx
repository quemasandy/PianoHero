import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Accidental, Formatter, Voice } from 'vexflow'
import { SongMeasure } from '../lib/songCatalog'

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
    const height = 180
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const context = renderer.getContext()
    context.scale(1.5, 1.5)

    context.setFillStyle('#cbd5e1')
    context.setStrokeStyle('#cbd5e1')
    const stave = new Stave(10, 20, width / 1.5 - 20)
    stave.addClef(measure.clef)
    stave.setContext(context).draw()

    const vexNotes: StaveNote[] = []

    measure.events.forEach((ev, i) => {
      let keys = ['b/4'] // Default for rest
      if (ev.pitches.length > 0) {
        keys = ev.pitches.map(pitch => {
          const octave = Math.floor(pitch / 12) - 1
          const noteName = NOTE_NAMES_VEX[pitch % 12]
          return `${noteName}/${octave}`
        })
      }

      const staveNote = new StaveNote({
        clef: measure.clef,
        keys: keys,
        duration: ev.pitches.length === 0 ? ev.durationNotation + 'r' : ev.durationNotation
      })

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
        staveNote.setStyle({ fillStyle: "var(--neon-pink, #f72585)", strokeStyle: "#ffffff" })
      } else if (isPlayed) {
         staveNote.setStyle({ fillStyle: "#3a465c", strokeStyle: "#3a465c" })
      } else {
        staveNote.setStyle({ fillStyle: "#ffffff", strokeStyle: "#8892a4" })
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
          rect.setAttribute('x', String(bbox.x - 6))
          rect.setAttribute('y', String(bbox.y - 10))
          rect.setAttribute('width', String(bbox.w + 12))
          rect.setAttribute('height', String(bbox.h + 20))
          rect.setAttribute('rx', '6')
          rect.setAttribute('fill', 'rgba(247, 37, 133, 0.18)')
          rect.setAttribute('stroke', 'rgba(247, 37, 133, 0.55)')
          rect.setAttribute('stroke-width', '1')
          rect.setAttribute('filter', 'drop-shadow(0 0 6px rgba(247, 37, 133, 0.55))')
          scaledGroup.insertBefore(rect, scaledGroup.firstChild)
        }
      } catch {
        // getBoundingBox may throw if the note was not fully laid out — safe to skip the halo.
      }
    }

  }, [measure, currentEventIndex])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div ref={containerRef} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '10px' }} />
    </div>
  )
}
