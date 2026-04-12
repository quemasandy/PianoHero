import { useMemo } from 'react'
import type { KeyboardWindow } from '../types'
import { ALL_KEYS, TOTAL_WHITE_KEYS, getPitchRangeBounds } from '../lib/keyboardLayout'
import type { KeyInfo } from '../lib/keyboardLayout'
import { pitchToPracticeLabel } from '../lib/practiceCatalog'

const TRACK_COLORS = ['#4cc9f0', '#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#06d6a0']
const SVG_HEIGHT = 12.4
const KEY_TOP = 1.9
const WHITE_KEY_HEIGHT = 9.7
const BLACK_KEY_HEIGHT = 6.35

interface PianoProps {
  activeNotes: Set<number>
  hintNotes: Set<number>
  correctNotes?: Set<number>
  wrongNotes?: Set<number>
  keyboardWindow?: KeyboardWindow | null
  compactView?: boolean
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
  if (wrongNotes?.has(pitch)) return '#ff6b81'
  if (correctNotes?.has(pitch)) return '#06d6a0'
  if (hintNotes.has(pitch)) return '#ffd166'
  if (activeNotes.has(pitch)) return '#4cc9f0'
  return '#8be9fd'
}

export default function Piano({
  activeNotes,
  hintNotes,
  correctNotes,
  wrongNotes,
  keyboardWindow,
  compactView = false,
  onNoteOn,
  onNoteOff,
  noteTrackMap
}: PianoProps) {
  const whiteKeys = useMemo(() => ALL_KEYS.filter(k => k.isWhite), [])
  const blackKeys = useMemo(() => ALL_KEYS.filter(k => !k.isWhite), [])
  const windowBounds = useMemo(() => (
    keyboardWindow ? getPitchRangeBounds(keyboardWindow.startPitch, keyboardWindow.endPitch) : null
  ), [keyboardWindow])

  const viewBounds = useMemo(() => {
    if (compactView && windowBounds) return windowBounds
    return { x: 0, width: TOTAL_WHITE_KEYS }
  }, [compactView, windowBounds])
  const targetPitches = useMemo(
    () => [...hintNotes].sort((a, b) => a - b),
    [hintNotes]
  )
  const visibleRangeLabel = keyboardWindow
    ? `${pitchToPracticeLabel(keyboardWindow.startPitch)}-${pitchToPracticeLabel(keyboardWindow.endPitch)}`
    : 'A0-C8'
  const visibleWhiteKeys = useMemo(() => {
    if (!keyboardWindow) return whiteKeys
    return whiteKeys.filter(key => (
      key.pitch >= keyboardWindow.startPitch && key.pitch <= keyboardWindow.endPitch
    ))
  }, [keyboardWindow, whiteKeys])

  function keyColor(key: KeyInfo): string {
    const { pitch, isWhite } = key
    const inWindow = pitchInWindow(pitch, keyboardWindow)
    if (wrongNotes?.has(pitch)) return '#ff5d73'
    if (correctNotes?.has(pitch)) return '#0fd99a'
    if (activeNotes.has(pitch)) {
      const track = noteTrackMap?.get(pitch) ?? 0
      return inWindow
        ? '#56ccf2'
        : TRACK_COLORS[track % TRACK_COLORS.length]
    }
    if (hintNotes.has(pitch)) return inWindow ? '#ffd166' : '#f4a261'
    return isWhite ? '#f6f2e8' : '#0d1324'
  }

  function strokeColor(key: KeyInfo): string {
    const inWindow = pitchInWindow(key.pitch, keyboardWindow)
    if (wrongNotes?.has(key.pitch)) return '#ffd6dc'
    if (activeNotes.has(key.pitch) && inWindow) return '#ffffff'
    if (correctNotes?.has(key.pitch) && inWindow) return '#ffffff'
    if (hintNotes.has(key.pitch) && inWindow) return '#8be9fd'
    if (key.isWhite) return '#555'
    return activeNotes.has(key.pitch) || hintNotes.has(key.pitch) ? 'none' : '#000'
  }

  function strokeWidth(key: KeyInfo): number {
    if (wrongNotes?.has(key.pitch)) {
      return key.isWhite ? 0.08 : 0.1
    }
    if (pitchInWindow(key.pitch, keyboardWindow) && (activeNotes.has(key.pitch) || hintNotes.has(key.pitch))) {
      return key.isWhite ? 0.06 : 0.08
    }
    return key.isWhite ? 0.03 : 0.05
  }

  return (
    <div style={{
      position: 'relative',
      height: compactView ? '236px' : '220px',
      background: 'linear-gradient(180deg, #0f1728 0%, #090d18 100%)',
      borderTop: '1px solid #2d3a56',
      borderRadius: '18px',
      border: '1px solid #24324f',
      overflow: 'hidden',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 30px rgba(0,0,0,0.25)',
      flexShrink: 0
    }}>
      <svg
        viewBox={`${viewBounds.x} 0 ${viewBounds.width} ${SVG_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <rect
          x={viewBounds.x}
          y={0}
          width={viewBounds.width}
          height={SVG_HEIGHT}
          fill="#0b1020"
        />
        <rect
          x={viewBounds.x}
          y={0}
          width={viewBounds.width}
          height={1.55}
          fill="rgba(76, 201, 240, 0.08)"
        />

        {!compactView && windowBounds && (
          <rect
            x={windowBounds.x - 0.08}
            y={0.16}
            width={windowBounds.width + 0.16}
            height={SVG_HEIGHT - 0.32}
            rx={0.22}
            fill={keyboardWindow?.outOfRange ? 'rgba(255, 209, 102, 0.16)' : 'rgba(76, 201, 240, 0.14)'}
            stroke={keyboardWindow?.outOfRange ? '#ffd166' : '#4cc9f0'}
            strokeWidth={0.08}
            pointerEvents="none"
          />
        )}

        {compactView && (
          <rect
            x={viewBounds.x + 0.1}
            y={1.45}
            width={viewBounds.width - 0.2}
            height={SVG_HEIGHT - 1.8}
            rx={0.24}
            fill={keyboardWindow?.outOfRange ? 'rgba(255, 209, 102, 0.05)' : 'rgba(76, 201, 240, 0.05)'}
            stroke={keyboardWindow?.outOfRange ? '#ffd166' : 'rgba(76, 201, 240, 0.35)'}
            strokeWidth={0.06}
            pointerEvents="none"
          />
        )}

        <text
          x={viewBounds.x + 0.25}
          y={0.95}
          fontSize={0.6}
          fontWeight={700}
          fill="#8be9fd"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {compactView ? 'Teclado 25 teclas' : 'Piano'}
        </text>
        <text
          x={viewBounds.x + viewBounds.width - 0.25}
          y={0.95}
          textAnchor="end"
          fontSize={0.54}
          fontWeight={700}
          fill={keyboardWindow?.outOfRange ? '#ffd166' : '#c8d1e8'}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {visibleRangeLabel}
        </text>

        {targetPitches.map((pitch, index) => {
          const key = ALL_KEYS.find(candidate => candidate.pitch === pitch)
          if (!key) return null

          const bounds = keyBounds(key)
          const centerX = bounds.x + bounds.width / 2
          const y = 0.25 + (index % 2) * 0.5
          const label = pitchToPracticeLabel(pitch)
          const width = Math.max(1.15, 0.42 * label.length + 0.4)
          const color = markerColor(pitch, activeNotes, hintNotes, correctNotes, wrongNotes)

          return (
            <g key={`marker-${pitch}`}>
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
        {whiteKeys.map(key => (
          <rect
            key={key.pitch}
            x={key.whiteIndex + 0.03}
            y={KEY_TOP}
            width={0.94}
            height={WHITE_KEY_HEIGHT}
            rx={0.1}
            fill={keyColor(key)}
            stroke={strokeColor(key)}
            strokeWidth={strokeWidth(key)}
            style={{ cursor: 'pointer' }}
            onMouseDown={() => onNoteOn(key.pitch)}
            onMouseUp={() => onNoteOff(key.pitch)}
            onMouseLeave={() => onNoteOff(key.pitch)}
          />
        ))}

        {/* Black keys (rendered on top) */}
        {blackKeys.map(key => {
          // Black key sits between whiteIndex and whiteIndex+1
          const x = key.whiteIndex + 0.65
          const w = 0.7
          const h = BLACK_KEY_HEIGHT
          return (
            <rect
              key={key.pitch}
              x={x}
              y={KEY_TOP}
              width={w}
              height={h}
              rx={0.1}
              fill={keyColor(key)}
              stroke={strokeColor(key)}
              strokeWidth={strokeWidth(key)}
              style={{ cursor: 'pointer' }}
              onMouseDown={e => { e.stopPropagation(); onNoteOn(key.pitch) }}
              onMouseUp={e => { e.stopPropagation(); onNoteOff(key.pitch) }}
              onMouseLeave={() => onNoteOff(key.pitch)}
            />
          )
        })}

        {compactView
          ? visibleWhiteKeys.map(key => (
            <text
              key={`label-${key.pitch}`}
              x={key.whiteIndex + 0.5}
              y={KEY_TOP + WHITE_KEY_HEIGHT - 0.55}
              textAnchor="middle"
              fontSize={0.38}
              fontWeight={hintNotes.has(key.pitch) ? 800 : 600}
              fill={hintNotes.has(key.pitch) ? '#0b1020' : '#66738f'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {pitchToPracticeLabel(key.pitch)}
            </text>
          ))
          : whiteKeys
          .filter(k => k.pitch % 12 === 0)
          .map(k => (
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

        {windowBounds && keyboardWindow && !compactView && (
          <text
            x={windowBounds.x + 0.2}
            y={0.88}
            fontSize={0.62}
            fontWeight={700}
            fill={keyboardWindow.outOfRange ? '#ffd166' : '#4cc9f0'}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {keyboardWindow.outOfRange ? 'Fuera de rango 25' : compactView ? 'Teclado 25 teclas' : 'Ventana 25 teclas'}
          </text>
        )}
      </svg>
    </div>
  )
}
