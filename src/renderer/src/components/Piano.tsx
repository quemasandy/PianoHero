import { useMemo } from 'react'
import type { KeyboardWindow } from '../types'
import { ALL_KEYS, TOTAL_WHITE_KEYS, getPitchRangeBounds } from '../lib/keyboardLayout'
import type { KeyInfo } from '../lib/keyboardLayout'
import { pitchToPracticeLabel } from '../lib/practiceCatalog'

const TRACK_COLORS = [
  'var(--neon-cyan)',
  'var(--neon-pink)',
  'var(--neon-purple)',
  '#3a0ca3',
  '#4361ee',
  'var(--neon-green)',
]
const SVG_HEIGHT = 12.4
const KEY_TOP = 1.9
const WHITE_KEY_HEIGHT = 9.7
const BLACK_KEY_HEIGHT = 6.35
const STANDARD_MARKER_Y = 0.25

interface PianoProps {
  activeNotes: Set<number>
  hintNotes: Set<number>
  correctNotes?: Set<number>
  wrongNotes?: Set<number>
  keyboardWindow?: KeyboardWindow | null
  compactView?: boolean
  /** Keep the full keyboard visually centered while still marking the active window. */
  centerFullKeyboard?: boolean
  /** Synthesia-style: hide top band/markers, stretch to container, add neon glow on hint keys */
  songMode?: boolean
  onNoteOn: (pitch: number) => void
  onNoteOff: (pitch: number) => void
  /** Track index per active note, for coloring */
  noteTrackMap?: Map<number, number>
}

function keyBounds(key: KeyInfo) {
  if (key.isWhite) {
    return { x: key.whiteIndex + 0.03, width: 0.94 }
  }

  return { x: key.whiteIndex + 0.65, width: 0.7 }
}

function pitchInWindow(pitch: number, keyboardWindow?: KeyboardWindow | null) {
  return !!keyboardWindow && pitch >= keyboardWindow.startPitch && pitch <= keyboardWindow.endPitch
}

function markerColor(
  pitch: number,
  activeNotes: Set<number>,
  hintNotes: Set<number>,
  correctNotes?: Set<number>,
  wrongNotes?: Set<number>
) {
  if (wrongNotes?.has(pitch)) return 'var(--neon-pink)'
  if (correctNotes?.has(pitch)) return 'var(--neon-green)'
  if (hintNotes.has(pitch)) return '#ffd166'
  if (activeNotes.has(pitch)) return 'var(--neon-cyan)'
  return 'var(--slate-300)'
}

export default function Piano({
  activeNotes,
  hintNotes,
  correctNotes,
  wrongNotes,
  keyboardWindow,
  compactView = false,
  centerFullKeyboard = false,
  songMode = false,
  onNoteOn,
  onNoteOff,
  noteTrackMap,
}: PianoProps) {
  const whiteKeys = useMemo(() => ALL_KEYS.filter((k) => k.isWhite), [])
  const blackKeys = useMemo(() => ALL_KEYS.filter((k) => !k.isWhite), [])
  const windowBounds = useMemo(
    () =>
      keyboardWindow
        ? getPitchRangeBounds(keyboardWindow.startPitch, keyboardWindow.endPitch)
        : null,
    [keyboardWindow]
  )

  const viewBounds = useMemo(() => {
    if (compactView && windowBounds) return windowBounds
    return { x: 0, width: TOTAL_WHITE_KEYS }
  }, [compactView, windowBounds])
  const viewportBounds = useMemo(() => {
    if (!songMode && compactView && centerFullKeyboard && windowBounds) {
      return { x: 0, width: TOTAL_WHITE_KEYS }
    }
    return viewBounds
  }, [centerFullKeyboard, compactView, songMode, viewBounds, windowBounds])
  const targetPitches = useMemo(() => [...hintNotes].sort((a, b) => a - b), [hintNotes])
  const visibleRangeLabel = keyboardWindow
    ? `${pitchToPracticeLabel(keyboardWindow.startPitch)}-${pitchToPracticeLabel(keyboardWindow.endPitch)}`
    : 'A0-C8'
  const visibleWhiteKeys = useMemo(() => {
    if (!keyboardWindow) return whiteKeys
    return whiteKeys.filter(
      (key) => key.pitch >= keyboardWindow.startPitch && key.pitch <= keyboardWindow.endPitch
    )
  }, [keyboardWindow, whiteKeys])

  function keyColor(key: KeyInfo): string {
    const { pitch, isWhite } = key
    const inWindow = pitchInWindow(pitch, keyboardWindow)
    if (wrongNotes?.has(pitch)) return 'var(--neon-pink)'
    if (correctNotes?.has(pitch)) return 'var(--neon-green)'
    if (activeNotes.has(pitch)) {
      const track = noteTrackMap?.get(pitch) ?? 0
      return inWindow ? 'var(--neon-cyan)' : TRACK_COLORS[track % TRACK_COLORS.length]
    }
    if (songMode && hintNotes.has(pitch)) {
      return isWhite ? 'url(#hintKeyGlowWhite)' : 'url(#hintKeyGlowBlack)'
    }
    if (isWhite) {
      if (activeNotes.has(pitch) && !inWindow)
        return TRACK_COLORS[(noteTrackMap?.get(pitch) ?? 0) % TRACK_COLORS.length]
      if (activeNotes.has(pitch)) return 'url(#whiteKeyDown)'
      return 'url(#whiteKeyGlow)'
    } else {
      if (activeNotes.has(pitch) && !inWindow)
        return TRACK_COLORS[(noteTrackMap?.get(pitch) ?? 0) % TRACK_COLORS.length]
      if (activeNotes.has(pitch)) return 'url(#blackKeyDown)'
      return 'url(#blackKeyGlow)'
    }
  }

  function strokeColor(key: KeyInfo): string {
    const inWindow = pitchInWindow(key.pitch, keyboardWindow)
    if (wrongNotes?.has(key.pitch)) return 'var(--neon-pink)'
    if (activeNotes.has(key.pitch) && inWindow) return '#ffffff'
    if (correctNotes?.has(key.pitch) && inWindow) return '#ffffff'
    if (hintNotes.has(key.pitch) && inWindow) return 'var(--neon-cyan)'
    if (key.isWhite) return '#555'
    return activeNotes.has(key.pitch) || hintNotes.has(key.pitch) ? 'none' : '#000'
  }

  function strokeWidth(key: KeyInfo): number {
    if (wrongNotes?.has(key.pitch)) {
      return key.isWhite ? 0.08 : 0.1
    }
    if (
      pitchInWindow(key.pitch, keyboardWindow) &&
      (activeNotes.has(key.pitch) || hintNotes.has(key.pitch))
    ) {
      return key.isWhite ? 0.06 : 0.08
    }
    return key.isWhite ? 0.03 : 0.05
  }

  function keyState(
    pitch: number,
    activeNotes: Set<number>,
    hintNotes: Set<number>,
    correctNotes?: Set<number>,
    wrongNotes?: Set<number>
  ) {
    if (wrongNotes?.has(pitch)) return 'wrong'
    if (correctNotes?.has(pitch)) return 'correct'
    if (activeNotes.has(pitch)) return 'active'
    if (hintNotes.has(pitch)) return 'target'
    return 'idle'
  }

  return (
    <div
      className={`ph-piano${compactView ? ' ph-piano--compact' : ''}${songMode ? ' ph-piano--song' : ''}`}
      data-compact={compactView ? 'true' : 'false'}
      data-mode={songMode ? 'song' : 'practice'}
      data-ui="piano"
    >
      <div className="ph-piano__stage" data-ui="piano-stage">
        <svg
          className="ph-piano__svg"
          data-range={visibleRangeLabel}
          data-ui="piano-svg"
          viewBox={
            songMode
              ? `${viewportBounds.x - 0.4} ${KEY_TOP} ${viewportBounds.width + 0.8} ${SVG_HEIGHT - KEY_TOP}`
              : `${viewportBounds.x - 0.4} 0 ${viewportBounds.width + 0.8} ${SVG_HEIGHT + 0.4}`
          }
          preserveAspectRatio={songMode ? 'none' : undefined}
          shapeRendering="geometricPrecision"
        >
          <defs>
            <linearGradient id="whiteKeyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="90%" stopColor="#f0f2f5" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
            <linearGradient id="blackKeyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="whiteKeyDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="blackKeyDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.35" result="colouredBlur" />
              <feMerge>
                <feMergeNode in="colouredBlur" />
                <feMergeNode in="colouredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="hintKeyGlowWhite" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="var(--neon-cyan)" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="hintKeyGlowBlack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neon-cyan)" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id="keyShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow
                dx="0"
                dy="0.1"
                stdDeviation="0.1"
                floodColor="#000"
                floodOpacity="0.4"
              />
            </filter>
          </defs>
          {!songMode && (
            <rect
              x={viewBounds.x - 0.4}
              y={0}
              width={viewBounds.width + 0.8}
              height={SVG_HEIGHT + 0.4}
              fill="#0b1020"
            />
          )}

          {!compactView && !songMode && windowBounds && (
            <rect
              x={windowBounds.x - 0.08}
              y={0.16}
              width={windowBounds.width + 0.16}
              height={SVG_HEIGHT - 0.32}
              rx={0.22}
              fill={
                keyboardWindow?.outOfRange ? 'rgba(255, 209, 102, 0.16)' : 'rgba(6, 182, 212, 0.14)'
              }
              stroke={keyboardWindow?.outOfRange ? '#ffd166' : 'var(--neon-cyan)'}
              strokeWidth={0.08}
              pointerEvents="none"
            />
          )}

          {compactView && !songMode && (
            <rect
              x={viewBounds.x + 0.1}
              y={KEY_TOP - 0.3}
              width={viewBounds.width - 0.2}
              height={SVG_HEIGHT - KEY_TOP + 0.1}
              rx={0.24}
              fill={
                keyboardWindow?.outOfRange
                  ? 'rgba(255, 209, 102, 0.05)'
                  : 'rgba(76, 201, 240, 0.05)'
              }
              stroke={keyboardWindow?.outOfRange ? '#ffd166' : 'rgba(76, 201, 240, 0.35)'}
              strokeWidth={0.06}
              pointerEvents="none"
            />
          )}

          {!songMode &&
            targetPitches.map((pitch, index) => {
              const key = ALL_KEYS.find((candidate) => candidate.pitch === pitch)
              if (!key) return null

              const bounds = keyBounds(key)
              const centerX = bounds.x + bounds.width / 2
              const y = STANDARD_MARKER_Y + (index % 2) * 0.5
              const label = pitchToPracticeLabel(pitch)
              const width = Math.max(1.15, 0.42 * label.length + 0.4)
              const color = markerColor(pitch, activeNotes, hintNotes, correctNotes, wrongNotes)

              return (
                <g
                  key={`marker-${pitch}`}
                  data-note={label}
                  data-pitch={pitch}
                  data-state={keyState(pitch, activeNotes, hintNotes, correctNotes, wrongNotes)}
                  data-ui="piano-target-marker"
                >
                  <line
                    x1={centerX}
                    y1={y + 0.48}
                    x2={centerX}
                    y2={key.isWhite ? KEY_TOP - 0.2 : KEY_TOP + 0.1}
                    stroke={color}
                    strokeWidth={0.08}
                    opacity={0.95}
                  />
                  <rect
                    x={centerX - width / 2}
                    y={y}
                    width={width}
                    height={0.56}
                    rx={0.2}
                    fill={color}
                    opacity={0.98}
                  />
                  <text
                    x={centerX}
                    y={y + 0.38}
                    textAnchor="middle"
                    fontSize={0.34}
                    fontWeight={800}
                    fill={color === '#ffd166' ? '#18131a' : '#ffffff'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                </g>
              )
            })}

          {/* White keys */}
          {whiteKeys.map((key) => {
            const isHintGlow = songMode && hintNotes.has(key.pitch)
            return (
              <rect
                key={key.pitch}
                aria-label={`Tecla ${pitchToPracticeLabel(key.pitch)}`}
                className="ph-piano__key ph-piano__key--white"
                data-key-kind="white"
                data-note={pitchToPracticeLabel(key.pitch)}
                data-pitch={key.pitch}
                data-state={keyState(key.pitch, activeNotes, hintNotes, correctNotes, wrongNotes)}
                data-ui="piano-key"
                x={key.whiteIndex + 0.03}
                y={KEY_TOP}
                width={0.94}
                height={WHITE_KEY_HEIGHT}
                rx={0.15}
                fill={keyColor(key)}
                stroke={activeNotes.has(key.pitch) ? 'none' : strokeColor(key)}
                strokeWidth={strokeWidth(key)}
                vectorEffect="non-scaling-stroke"
                filter={isHintGlow ? 'url(#neonGlow)' : undefined}
                onMouseDown={() => onNoteOn(key.pitch)}
                onMouseUp={() => onNoteOff(key.pitch)}
                onMouseLeave={() => onNoteOff(key.pitch)}
              />
            )
          })}

          {/* Black keys (rendered on top) */}
          {blackKeys.map((key) => {
            // Black key sits between whiteIndex and whiteIndex+1
            const x = key.whiteIndex + 0.65
            const w = 0.7
            const h = BLACK_KEY_HEIGHT
            const isHintGlow = songMode && hintNotes.has(key.pitch)
            return (
              <rect
                key={key.pitch}
                aria-label={`Tecla ${pitchToPracticeLabel(key.pitch)}`}
                className="ph-piano__key ph-piano__key--black"
                data-key-kind="black"
                data-note={pitchToPracticeLabel(key.pitch)}
                data-pitch={key.pitch}
                data-state={keyState(key.pitch, activeNotes, hintNotes, correctNotes, wrongNotes)}
                data-ui="piano-key"
                x={x}
                y={KEY_TOP}
                width={w}
                height={h}
                rx={0.12}
                fill={keyColor(key)}
                stroke={activeNotes.has(key.pitch) ? 'none' : strokeColor(key)}
                strokeWidth={strokeWidth(key)}
                vectorEffect="non-scaling-stroke"
                filter={isHintGlow ? 'url(#neonGlow)' : 'url(#keyShadow)'}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onNoteOn(key.pitch)
                }}
                onMouseUp={(e) => {
                  e.stopPropagation()
                  onNoteOff(key.pitch)
                }}
                onMouseLeave={() => onNoteOff(key.pitch)}
              />
            )
          })}

          {compactView
            ? visibleWhiteKeys.map((key) => (
                <text
                  key={`label-${key.pitch}`}
                  x={0}
                  y={0}
                  textAnchor="middle"
                  fontSize={songMode ? 0.75 : 0.65}
                  textRendering="geometricPrecision"
                  fontWeight={hintNotes.has(key.pitch) ? 900 : 700}
                  fill={hintNotes.has(key.pitch) ? '#0b1020' : '#66738f'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                  transform={`translate(${key.whiteIndex + 0.5}, ${KEY_TOP + WHITE_KEY_HEIGHT - 0.55}) scale(${songMode ? 0.3 : 1}, 1)`}
                >
                  {pitchToPracticeLabel(key.pitch)}
                </text>
              ))
            : whiteKeys
                .filter((k) => k.pitch % 12 === 0)
                .map((k) => (
                  <text
                    key={`label-${k.pitch}`}
                    x={k.whiteIndex + 0.5}
                    y={KEY_TOP + WHITE_KEY_HEIGHT - 0.4}
                    textAnchor="middle"
                    fontSize={0.6}
                    fill="#888"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    C{Math.floor(k.pitch / 12) - 1}
                  </text>
                ))}
        </svg>
      </div>
    </div>
  )
}
