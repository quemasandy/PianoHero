import { useEffect, useRef } from 'react'
import { rendererMidiApi } from '../lib/rendererMidiAdapter'

type NoteCallback = (pitch: number, velocity: number, isOn: boolean) => void

export function useMidiDevice(onNote: NoteCallback) {
  const cbRef = useRef(onNote)
  cbRef.current = onNote

  useEffect(() => {
    const unsubscribe = rendererMidiApi.onMidiNote(({ type, note, velocity }) => {
      const isNoteOn = (type & 0xf0) === 0x90 && velocity > 0
      const isNoteOff = (type & 0xf0) === 0x80 || ((type & 0xf0) === 0x90 && velocity === 0)
      if (isNoteOn) cbRef.current(note, velocity, true)
      else if (isNoteOff) cbRef.current(note, 0, false)
    })

    return unsubscribe
  }, [])
}
