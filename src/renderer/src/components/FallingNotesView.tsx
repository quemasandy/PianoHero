import { useMemo } from 'react'
import type { KeyboardWindow } from '../types'
import { getPitchRangeBounds, getKeyBounds, TOTAL_WHITE_KEYS } from '../lib/keyboardLayout'
import { Song } from '../lib/songCatalog'

interface FallingNotesViewProps {
  song: Song
  currentMeasureIndex: number
  currentEventIndex: number
  keyboardWindow?: KeyboardWindow | null
}

export interface FlattenedEvent {
  measureIndex: number
  eventIndex: number
  startTick: number
  durationTicks: number
  pitches: number[]
}

export default function FallingNotesView({
  song,
  currentMeasureIndex,
  currentEventIndex,
  keyboardWindow
}: FallingNotesViewProps) {
  
  // 1. Flatten the song to compute absolute tick bounds
  const { events, currentTick } = useMemo(() => {
    let tickCursor = 0
    let currentT = 0
    const flat: FlattenedEvent[] = []

    song.measures.forEach((m, mIdx) => {
      m.events.forEach((ev, eIdx) => {
        flat.push({
          measureIndex: mIdx,
          eventIndex: eIdx,
          startTick: tickCursor,
          durationTicks: ev.durationTicks,
          pitches: ev.pitches
        })
        
        if (mIdx === currentMeasureIndex && eIdx === currentEventIndex) {
          currentT = tickCursor
        }
        
        tickCursor += ev.durationTicks
      })
    })

    return { events: flat, currentTick: currentT }
  }, [song, currentMeasureIndex, currentEventIndex])

  // 2. SVG Horizontal ViewBounds (matches Piano.tsx precisely)
  const viewBounds = useMemo(() => {
    if (keyboardWindow) {
      return getPitchRangeBounds(keyboardWindow.startPitch, keyboardWindow.endPitch)
    }
    return { x: 0, width: TOTAL_WHITE_KEYS }
  }, [keyboardWindow])

  if (!viewBounds) return null

  // 3. Settings for Y mapping
  const TICK_HEIGHT = 0.8 // How tall 1 tick is in SVG units
  const VISIBLE_TICKS = 400 // How many ticks fit vertically on screen
  const VIEW_HEIGHT = VISIBLE_TICKS * TICK_HEIGHT

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#050810',
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <svg
        viewBox={`${viewBounds.x - 0.4} 0 ${viewBounds.width + 0.8} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <g
          style={{
            transform: `translateY(${currentTick * TICK_HEIGHT}px)`,
            transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        >
          {events.map((ev) => {
            // Relative distance from the current player position (for culling only)
            const ticksFromCurrent = ev.startTick - currentTick

            // If it's already played and scrolled off, ignore
            if (ticksFromCurrent + ev.durationTicks < -20) return null

            // If it's too far in the future, ignore
            if (ticksFromCurrent > VISIBLE_TICKS + 20) return null

            // Absolute Y position (pre-transform). The `<g>` transform slides the group up by currentTick.
            const noteHeight = Math.max(ev.durationTicks * TICK_HEIGHT - 6, 2)
            const yTopAbsolute = VIEW_HEIGHT - ((ev.startTick + ev.durationTicks) * TICK_HEIGHT) + 3

            // Determine if it is the active one waiting for input
            const isActive = ev.measureIndex === currentMeasureIndex && ev.eventIndex === currentEventIndex
            const isPlayed = ev.startTick < currentTick

            return ev.pitches.map(pitch => {
              const bounds = getKeyBounds(pitch)
              if (!bounds) return null

              return (
                <rect
                  key={`${ev.measureIndex}-${ev.eventIndex}-${pitch}`}
                  x={bounds.x + 0.1}
                  y={yTopAbsolute}
                  width={bounds.width - 0.2}
                  height={noteHeight}
                  rx={0.2}
                  fill={isActive ? 'var(--neon-pink, #f72585)' : isPlayed ? 'rgba(255,255,255,0.1)' : '#4cc9f0'}
                  opacity={isActive ? 1 : isPlayed ? 0.4 : 0.8}
                />
              )
            })
          })}
        </g>

        {/* Target line inside the SVG, aligned with the top edge of the piano keys (does NOT transform with the group) */}
        <line
          x1={viewBounds.x - 0.4}
          y1={VIEW_HEIGHT}
          x2={viewBounds.x + viewBounds.width + 0.4}
          y2={VIEW_HEIGHT}
          stroke="rgba(76, 201, 240, 0.85)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          style={{ filter: 'drop-shadow(0 0 4px rgba(76, 201, 240, 0.6))' }}
        />
      </svg>
    </div>
  )
}
