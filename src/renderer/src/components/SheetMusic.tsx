import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Accidental, Formatter, Voice } from 'vexflow'
import { logRendererEvent } from '../lib/diagnostics'

interface SheetMusicProps {
  notes: number[] // MIDI pitches
  active?: boolean // If the chord is the active one in the carousel
  color?: string // Make color customizable
  mode?: 'chord' | 'sequence'
  currentIndex?: number
  width?: number
}

const NOTE_NAMES_VEX = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

export default function SheetMusic({
  notes,
  active = false,
  color,
  mode = 'chord',
  currentIndex = 0,
  width,
}: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. Limpiar canvas previo si la tarjeta se re-renderiza
    containerRef.current.innerHTML = ''

    try {
      // 2. Crear Renderer en el Div
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)

      const isSequence = mode === 'sequence'
      const canvasWidth = width || (isSequence ? Math.max(300, notes.length * 45) : 200)

      // Achicamos dimensiones para encajar verticalmente
      renderer.resize(canvasWidth, 140)
      const context = renderer.getContext()

      // Escalar un poco para mayor legibilidad
      const scale = isSequence ? 1.0 : 1.2
      context.scale(scale, scale)

      // 3. Crear el Pentagrama Clásico (Stave)
      const staveWidth = canvasWidth / scale - 20
      const stave = new Stave(10, 10, staveWidth)

      // Validar si las notas exigen Clave de Fa o Clave de Sol
      const isBass = Math.min(...notes) < 48
      const clef = isBass ? 'bass' : 'treble'

      stave.addClef(clef)
      if (!active) {
        // Estilizar oscuro si está inactivo
        context.setFillStyle('#4a5568')
        context.setStrokeStyle('#4a5568')
      } else {
        context.setFillStyle('#ffffff')
        context.setStrokeStyle('#ffffff')
      }

      stave.setContext(context).draw()

      // 4. Mappear notas MIDI a Strings VexFlow ("c/4")
      if (notes.length === 0) return

      const keys = notes.map((pitch) => {
        const octave = Math.floor(pitch / 12) - 1
        const noteName = NOTE_NAMES_VEX[pitch % 12]
        return `${noteName}/${octave}`
      })

      if (isSequence) {
        const tickables = keys.map((key, index) => {
          const staveNote = new StaveNote({
            clef: clef,
            keys: [key],
            duration: 'q',
          })

          const noteName = key.split('/')[0]
          if (noteName.includes('b') && noteName.length > 1) {
            staveNote.addModifier(new Accidental('b'), 0)
          } else if (noteName.includes('#')) {
            staveNote.addModifier(new Accidental('#'), 0)
          }

          let noteColor = '#4a5568' // unplayed
          let strokeColor = '#8892a4'

          if (active) {
            if (index < currentIndex) {
              noteColor = '#06d6a0' // played correct (green)
              strokeColor = '#06d6a0'
            } else if (index === currentIndex) {
              noteColor = color || 'var(--neon-green)' // current
              strokeColor = '#ffffff'
            }
          }

          staveNote.setStyle({ fillStyle: noteColor, strokeStyle: strokeColor })
          return staveNote
        })

        if (tickables.length > 0) {
          const voice = new Voice({ num_beats: tickables.length, beat_value: 4 })
          voice.setStrict(false) // Disable strict mode to avoid 'Too many ticks' with large sequences
          voice.addTickables(tickables)
          new Formatter().joinVoices([voice]).format([voice], staveWidth - 60)
          voice.draw(context, stave)
        }
      } else {
        // 5. Crear la StaveNote para Acorde
        const staveNote = new StaveNote({
          clef: clef,
          keys: keys,
          duration: 'w',
        })

        // Modificadores de VexFlow (Alteraciones)
        keys.forEach((key, index) => {
          const noteName = key.split('/')[0]
          if (noteName.includes('b') && noteName.length > 1) {
            staveNote.addModifier(new Accidental('b'), index)
          } else if (noteName.includes('#')) {
            staveNote.addModifier(new Accidental('#'), index)
          }
        })

        if (active) {
          staveNote.setStyle({
            fillStyle: color || 'var(--neon-green)',
            strokeStyle: '#ffffff',
          })
        } else {
          staveNote.setStyle({
            fillStyle: '#4a5568',
            strokeStyle: '#8892a4',
          })
        }

        // 6. Imprimir el Acorde
        const voice = new Voice({ num_beats: 4, beat_value: 4 })
        voice.addTickables([staveNote])

        const _formatter = new Formatter().joinVoices([voice]).format([voice], 120)
        voice.draw(context, stave)
      }
    } catch (err) {
      logRendererEvent('error', 'ui.sheetmusic.render.failed', 'VexFlow rendering error', {
        mode,
        notesCount: notes.length,
        currentIndex,
        error: String(err),
      })
    }
  }, [notes, active, color, mode, currentIndex, width])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '140px', display: 'flex', justifyContent: 'center' }}
    />
  )
}
