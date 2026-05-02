import type { CSSProperties } from 'react'
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
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

const TRACK_COLORS = ['#4cc9f0', '#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#06d6a0']

export default function Controls({
  state,
  duration,
  trackCount,
  midiStatusLabel,
  midiStatusColor,
  rangeStatusLabel,
  rangeStatusColor,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onToggleLearning,
  onToggleTrack,
  onBack,
}: ControlsProps) {
  const isPlaying = state.status === 'playing' || state.status === 'waiting'

  return (
    <div className="ph-controls" data-ui="controls">
      {/* Back */}
      <button
        type="button"
        className="ph-control-button"
        data-ui="back-button"
        onClick={onBack}
        style={btnStyle('#334')}
      >
        ← Biblioteca
      </button>

      {/* Transport */}
      <button
        type="button"
        aria-label="Detener"
        className="ph-control-button"
        data-ui="stop-button"
        onClick={onStop}
        style={btnStyle('#334')}
      >
        ⏹
      </button>
      {isPlaying ? (
        <button
          type="button"
          aria-label="Pausar"
          className="ph-control-button"
          data-state="playing"
          data-ui="pause-button"
          onClick={onPause}
          style={btnStyle('#e94560')}
        >
          ⏸
        </button>
      ) : (
        <button
          type="button"
          aria-label="Reproducir"
          className="ph-control-button"
          data-state="idle"
          data-ui="play-button"
          onClick={onPlay}
          style={btnStyle('#06d6a0', '#000')}
        >
          ▶
        </button>
      )}

      {/* Progress bar */}
      <span className="ph-controls__time" data-ui="current-time">
        {formatTime(state.currentTime)}
      </span>
      <input
        aria-label="Progreso de la canción"
        className="ph-controls__progress"
        data-ui="progress-slider"
        type="range"
        min={0}
        max={duration}
        step={0.5}
        value={state.currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
      />
      <span className="ph-controls__time" data-ui="duration-time">
        {formatTime(duration)}
      </span>

      {/* Speed */}
      <select
        aria-label="Velocidad de reproducción"
        className="ph-select ph-controls__speed-select"
        data-ui="speed-select"
        value={state.speed}
        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>

      {/* Learning mode */}
      <button
        type="button"
        aria-pressed={state.learningMode}
        className="ph-control-button"
        data-state={state.learningMode ? 'on' : 'off'}
        data-ui="learning-mode-toggle"
        onClick={onToggleLearning}
        style={btnStyle(state.learningMode ? '#f72585' : '#334')}
        title="Modo aprendizaje: espera a que pulses la tecla correcta"
      >
        {state.learningMode ? '🎓 ON' : '🎓 OFF'}
      </button>

      <span
        className="ph-status-text"
        data-ui="midi-status"
        role="status"
        style={{ '--ph-status-color': midiStatusColor } as CSSProperties}
        title={midiStatusLabel}
      >
        {midiStatusLabel}
      </span>

      {rangeStatusLabel && (
        <span
          className="ph-status-text"
          data-ui="range-status"
          role="status"
          style={{ '--ph-status-color': rangeStatusColor ?? '#4cc9f0' } as CSSProperties}
          title={rangeStatusLabel}
        >
          {rangeStatusLabel}
        </span>
      )}

      {/* Track toggles */}
      <div className="ph-track-toggle-list" data-ui="track-toggle-list">
        {Array.from({ length: trackCount }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={Boolean(state.activeTrackMask[i])}
            className="ph-track-toggle"
            data-state={state.activeTrackMask[i] ? 'on' : 'off'}
            data-track-index={i}
            data-ui="track-toggle"
            onClick={() => onToggleTrack(i)}
            style={{
              ...btnStyle(TRACK_COLORS[i % TRACK_COLORS.length], '#000'),
              opacity: state.activeTrackMask[i] ? 1 : 0.3,
              fontSize: '11px',
              padding: '4px 8px',
            }}
            title={`Pista ${i + 1}`}
          >
            T{i + 1}
          </button>
        ))}
      </div>

      {/* Wait indicator */}
      {state.status === 'waiting' && (
        <span className="ph-waiting-indicator" data-ui="waiting-indicator" role="status">
          ⏳ Toca la nota...
        </span>
      )}
    </div>
  )
}

function btnStyle(bg: string, color = '#fff'): CSSProperties {
  return {
    background: bg,
    color,
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
