import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Accidental, Formatter, Voice } from 'vexflow'

interface SheetMusicProps {
  notes: number[] // MIDI pitches
  active?: boolean // If the chord is the active one in the carousel
}

const NOTE_NAMES_VEX = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

export default function SheetMusic({ notes, active = false }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    
    // 1. Limpiar canvas previo si la tarjeta se re-renderiza
    containerRef.current.innerHTML = ''

    // 2. Crear Renderer en el Div
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
    
    // Achicamos dimensiones para encajar verticalmente
    renderer.resize(200, 140)
    const context = renderer.getContext()
    
    // Escalar un poco para mayor legibilidad
    context.scale(1.2, 1.2)

    // 3. Crear el Pentagrama Clásico (Stave)
    const stave = new Stave(0, 10, 160)
    
    // Validar si las notas exigen Clave de Fa o Clave de Sol
    // Como simplificación de Shell Voicings, si la más grave es menor < 60 usamos Treble normalmente pero lo mejor es Treble
    // O mejor, una gran staff si son muchas notas, pero para este UI Treble basta (con líneas adicionales).
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

    const keys = notes.map(pitch => {
      const octave = Math.floor(pitch / 12) - 1
      const noteName = NOTE_NAMES_VEX[pitch % 12]
      return `${noteName}/${octave}`
    })

    // 5. Crear la StaveNote
    const staveNote = new StaveNote({ 
      clef: clef, 
      keys: keys, 
      duration: 'w' 
    })

    // Modificadores de VexFlow (Alteraciones)
    // Hay que escanear los keys para ver si tienen 'b' (bemol) o '#' y aplicar modificador
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
        fillStyle: "var(--neon-pink)", // El bulto de la nota será rosa
        strokeStyle: "#ffffff"         // LAS LÍNEAS (y el borde) se trazan blancas para resaltar
      })
    } else {
      staveNote.setStyle({
        fillStyle: "#4a5568", 
        strokeStyle: "#8892a4" // Las líneas grises un poco más claras para visibilidad
      })
    }

    // 6. Imprimir el Acorde
    const voice = new Voice({ num_beats: 4, beat_value: 4 })
    voice.addTickables([staveNote])

    const formatter = new Formatter().joinVoices([voice]).format([voice], 120)
    voice.draw(context, stave)

  }, [notes, active])

  return <div ref={containerRef} style={{ width: '100%', height: '140px', display: 'flex', justifyContent: 'center' }} />
}
