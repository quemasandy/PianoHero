import { useCallback, useEffect, useRef } from 'react'
import type { KeyboardWindow, ParsedSong, PlayerState } from '../types'
import {
  PIANO_MAX_PITCH,
  PIANO_MIN_PITCH,
  TOTAL_WHITE_KEYS,
  getKeyBounds,
  getPitchRangeBounds,
} from '../lib/keyboardLayout'

const TRACK_COLORS = ['#4cc9f0', '#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#06d6a0']
const PIXELS_PER_SECOND = 220
const LOOKAHEAD = 6

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  if (r === 0) {
    ctx.fillRect(x, y, width, height)
    return
  }

  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, r)
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

interface WaterfallProps {
  song: ParsedSong
  playerState: PlayerState
  keyboardWindow?: KeyboardWindow | null
  compactView?: boolean
}

export default function Waterfall({
  song,
  playerState,
  keyboardWindow,
  compactView = false,
}: WaterfallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(playerState)
  stateRef.current = playerState

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    try {
      const W = container.clientWidth
      const H = container.clientHeight
      if (W === 0 || H === 0) return
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const state = stateRef.current
      const t = state.currentTime
      const rangeBounds =
        compactView && keyboardWindow
          ? getPitchRangeBounds(keyboardWindow.startPitch, keyboardWindow.endPitch)
          : null
      const visibleStartPitch =
        compactView && keyboardWindow ? keyboardWindow.startPitch : PIANO_MIN_PITCH
      const visibleEndPitch =
        compactView && keyboardWindow ? keyboardWindow.endPitch : PIANO_MAX_PITCH
      const visibleRangeX = rangeBounds?.x ?? 0
      const visibleRangeWidth = rangeBounds?.width ?? TOTAL_WHITE_KEYS

      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)

      for (const note of song.notes) {
        if (!state.activeTrackMask[note.track]) continue
        if (note.pitch < visibleStartPitch || note.pitch > visibleEndPitch) continue
        const end = note.startTime + note.duration
        if (end < t - 0.3 || note.startTime > t + LOOKAHEAD) continue
        const pitchBounds = getKeyBounds(note.pitch)
        if (!pitchBounds) continue
        const x = ((pitchBounds.x - visibleRangeX) / visibleRangeWidth) * W
        const w = Math.max((pitchBounds.width / visibleRangeWidth) * W - 2, 4)
        const topY = H - (note.startTime - t) * PIXELS_PER_SECOND
        const botY = H - (end - t) * PIXELS_PER_SECOND
        const ry = Math.min(topY, botY)
        const rh = Math.max(Math.abs(topY - botY), 4)
        if (ry > H || ry + rh < 0) continue
        const isActive = state.activeNotes.has(note.pitch)
        const isHint = state.hintNotes.has(note.pitch)
        ctx.globalAlpha = isActive ? 1 : 0.85
        ctx.fillStyle = isActive
          ? '#06d6a0'
          : isHint
            ? '#ffffff'
            : TRACK_COLORS[note.track % TRACK_COLORS.length]
        fillRoundedRect(ctx, x, ry, w, rh, 3)
        ctx.globalAlpha = 0.4
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + 3, ry + 1)
        ctx.lineTo(x + w - 3, ry + 1)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, H - 1)
      ctx.lineTo(W, H - 1)
      ctx.stroke()
    } catch (error) {
      console.error('Waterfall draw failed', error)
    }
  }, [compactView, keyboardWindow, song])

  useEffect(() => {
    draw()
  }, [
    draw,
    compactView,
    keyboardWindow,
    playerState.currentTime,
    playerState.activeNotes,
    playerState.hintNotes,
    playerState.activeTrackMask,
  ])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    draw()
    return () => ro.disconnect()
  }, [draw])

  return (
    <div
      className="ph-waterfall"
      data-compact={compactView ? 'true' : 'false'}
      data-ui="waterfall"
      ref={containerRef}
    >
      <canvas className="ph-waterfall__canvas" data-ui="waterfall-canvas" ref={canvasRef} />
    </div>
  )
}
