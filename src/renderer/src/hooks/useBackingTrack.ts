import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { logRendererEvent } from '../lib/diagnostics'

export interface BackingTrackState {
  bpm: number
  isPlaying: boolean
}

export function useBackingTrack(initialBpm = 110) {
  const [bpm, setBpm] = useState(initialBpm)
  const [isPlaying, setIsPlaying] = useState(false)
  const isSetupRef = useRef(false)

  // Instrumentos
  const bassSynthRef = useRef<Tone.FMSynth | null>(null)
  const cymbalSynthRef = useRef<Tone.MetalSynth | null>(null)
  
  // Secuencias / Loops
  const loopRef = useRef<Tone.Sequence | null>(null)

  const setupAudio = useCallback(async () => {
    if (isSetupRef.current) return
    logRendererEvent('debug', 'backingTrack.setup', 'Init starting')
    await Tone.start()
    logRendererEvent('debug', 'backingTrack.setup', 'Tone.start passed')
    
    // Crear el Bajo que acompañará
    bassSynthRef.current = new Tone.FMSynth({
      harmonicity: 1,
      modulationIndex: 1,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 1.2 }
    }).toDestination()
    bassSynthRef.current.volume.value = -8

    // Crear el Platillo Ride (Swing)
    cymbalSynthRef.current = new Tone.MetalSynth({
      frequency: 250,
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination()
    cymbalSynthRef.current.volume.value = -12

    // Ritmo de Swing en corcheas atresilladas (Ride Cymbal)
    // Usaremos un patrón rítmico básico de 8 notas de 1/8. 
    // Como Tone.Transport maneja el swing interno si se configura, lanzaremos semicorcheas o corcheas.
    const steps = [
      { time: '0:0:0', type: 'bass', note: 'C2' },
      { time: '0:0:0', type: 'cymbal', velocity: 1 },
      { time: '0:0:2.6', type: 'cymbal', velocity: 0.5 }, // aproximándose al swing-skip (en lugar de triplets estrictos para simpleza)
      
      { time: '0:1:0', type: 'bass', note: 'E2' },
      { time: '0:1:0', type: 'cymbal', velocity: 0.8 },
      
      { time: '0:2:0', type: 'bass', note: 'G2' },
      { time: '0:2:0', type: 'cymbal', velocity: 1 },
      { time: '0:2:2.6', type: 'cymbal', velocity: 0.5 },
      
      { time: '0:3:0', type: 'bass', note: 'A2' },
      { time: '0:3:0', type: 'cymbal', velocity: 0.8 }
    ]

    const part = new Tone.Part((time, value) => {
      if (value.type === 'bass' && bassSynthRef.current) {
        bassSynthRef.current.triggerAttackRelease(value.note!, '8n', time)
      } else if (value.type === 'cymbal' && cymbalSynthRef.current) {
        cymbalSynthRef.current.triggerAttackRelease('32n', time, value.velocity)
      }
    }, steps)

    part.loop = true
    part.loopEnd = '1m' // 1 Compás
    part.start(0)

    // Configuración rítmica del cerebro de Tone.js
    Tone.Transport.bpm.value = bpm
    // Añadimos ese ligero atraso de corchea típico del jazz
    try {
      Tone.Transport.swing = 0.5
      Tone.Transport.swingSubdivision = '8n'
    } catch (err) {
      logRendererEvent('error', 'backingTrack.swing', 'Failed to configure swing', { error: String(err) })
    }

    isSetupRef.current = true
    logRendererEvent('debug', 'backingTrack.setup', 'Setup complete')
  }, [bpm])

  useEffect(() => {
    Tone.Transport.bpm.rampTo(bpm, 0.5)
  }, [bpm])

  const togglePlay = useCallback(async () => {
    try {
      logRendererEvent('info', 'backingTrack.toggle', 'Evaluating toggle', { isSetup: isSetupRef.current, isPlaying })
      if (!isSetupRef.current) {
        await setupAudio()
      }
      
      if (isPlaying) {
        Tone.Transport.pause()
        setIsPlaying(false)
        logRendererEvent('info', 'backingTrack.paused', 'Paused successfully')
      } else {
        if (Tone.context.state !== 'running') {
          await Tone.context.resume()
        }
        Tone.Transport.start()
        setIsPlaying(true)
        logRendererEvent('info', 'backingTrack.started', 'Started successfully')
      }
    } catch (error) {
      logRendererEvent('error', 'backingTrack.crash', 'Crash matching rhythmic engine', { err: String(error) })
      setIsPlaying(false)
    }
  }, [isPlaying, setupAudio])

  const updateBpm = useCallback((newBpm: number) => {
    setBpm(Math.max(40, Math.min(newBpm, 300)))
  }, [])

  return {
    bpm,
    isPlaying,
    togglePlay,
    updateBpm
  }
}
