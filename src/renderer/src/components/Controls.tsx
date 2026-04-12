import type { PlayerState } from '../types'

interface ControlsProps {
  state: PlayerState
  duration: number
  trackCount: number
  midiStatusLabel: string
  midiStatusColor: string
  rangeStatusLabel?: string
  rangeStatusColor?: string
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  onToggleLearning: () => void
  onToggleTrack: (index: number) => void
  onBack: () => void
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const TRACK_COLORS = ['#4cc9f0', '#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#06d6a0']

export default function Controls({
  state, duration, trackCount, midiStatusLabel, midiStatusColor, rangeStatusLabel, rangeStatusColor,
  onPlay, onPause, onStop, onSeek,
  onSpeedChange, onToggleLearning, onToggleTrack, onBack
}: ControlsProps) {
  const isPlaying = state.status === 'playing' || state.status === 'waiting'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      background: '#0f1b2d',
      borderTop: '1px solid #223',
      flexWrap: 'wrap',
      flexShrink: 0,
      minHeight: '52px'
    }}>
      {/* Back */}
      <button onClick={onBack} style={btnStyle('#334')}>← Biblioteca</button>

      {/* Transport */}
      <button onClick={onStop} style={btnStyle('#334')}>⏹</button>
      {isPlaying
        ? <button onClick={onPause} style={btnStyle('#e94560')}>⏸</button>
        : <button onClick={onPlay} style={btnStyle('#06d6a0', '#000')}>▶</button>
      }

      {/* Progress bar */}
      <span style={{ fontSize: '12px', color: '#8892a4', minWidth: '40px' }}>
        {formatTime(state.currentTime)}
      </span>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.5}
        value={state.currentTime}
        onChange={e => onSeek(parseFloat(e.target.value))}
        style={{ flex: 1, minWidth: '80px', accentColor: '#4cc9f0' }}
      />
      <span style={{ fontSize: '12px', color: '#8892a4', minWidth: '40px' }}>
        {formatTime(duration)}
      </span>

      {/* Speed */}
      <select
        value={state.speed}
        onChange={e => onSpeedChange(parseFloat(e.target.value))}
        style={{
          background: '#334', color: '#fff', border: 'none',
          borderRadius: '6px', padding: '4px 8px', fontSize: '13px', cursor: 'pointer'
        }}
      >
        {SPEEDS.map(s => (
          <option key={s} value={s}>{s}×</option>
        ))}
      </select>

      {/* Learning mode */}
      <button
        onClick={onToggleLearning}
        style={btnStyle(state.learningMode ? '#f72585' : '#334')}
        title="Modo aprendizaje: espera a que pulses la tecla correcta"
      >
        {state.learningMode ? '🎓 ON' : '🎓 OFF'}
      </button>

      <span
        style={{
          color: midiStatusColor,
          fontSize: '12px',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
        title={midiStatusLabel}
      >
        {midiStatusLabel}
      </span>

      {rangeStatusLabel && (
        <span
          style={{
            color: rangeStatusColor ?? '#4cc9f0',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
          title={rangeStatusLabel}
        >
          {rangeStatusLabel}
        </span>
      )}

      {/* Track toggles */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: trackCount }, (_, i) => (
          <button
            key={i}
            onClick={() => onToggleTrack(i)}
            style={{
              ...btnStyle(TRACK_COLORS[i % TRACK_COLORS.length], '#000'),
              opacity: state.activeTrackMask[i] ? 1 : 0.3,
              fontSize: '11px',
              padding: '4px 8px'
            }}
            title={`Pista ${i + 1}`}
          >
            T{i + 1}
          </button>
        ))}
      </div>

      {/* Wait indicator */}
      {state.status === 'waiting' && (
        <span style={{
          color: '#f72585', fontWeight: 'bold', fontSize: '13px',
          animation: 'pulse 1s infinite'
        }}>
          ⏳ Toca la nota...
        </span>
      )}
    </div>
  )
}

function btnStyle(bg: string, color = '#fff'): React.CSSProperties {
  return {
    background: bg,
    color,
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
}
