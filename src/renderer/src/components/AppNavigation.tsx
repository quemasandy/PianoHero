import { CSSProperties, ReactNode } from 'react'

export type AppMode = 'scales' | 'chords' | 'songs'

interface AppNavigationProps {
  currentMode: AppMode
  onNavigateHome: () => void
  onNavigateMode: (mode: AppMode) => void
  children?: ReactNode
}

function modeTabStyle(active: boolean): CSSProperties {
  return {
    background: active ? 'var(--neon-cyan)' : 'transparent',
    color: active ? '#0F0F23' : 'var(--slate-300)',
    border: 'none',
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
}

export default function AppNavigation({
  currentMode,
  onNavigateHome,
  onNavigateMode,
  children,
}: AppNavigationProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="ph-app-nav ph-glass-panel"
      data-mode={currentMode}
      data-ui="app-nav"
    >
      {/* Lado Izquierdo: Navegación Principal */}
      <div className="ph-app-nav__primary" data-ui="app-nav-primary">
        <button
          type="button"
          onClick={onNavigateHome}
          aria-label="Volver a inicio"
          title="Volver a Inicio"
          className="ph-icon-button ph-hover-lift"
          data-ui="home-button"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        <div
          aria-label="Modo de práctica"
          className="ph-mode-tabs"
          data-ui="mode-tabs"
          role="group"
        >
          <button
            type="button"
            onClick={() => onNavigateMode('scales')}
            aria-current={currentMode === 'scales' ? 'page' : undefined}
            className="ph-mode-tab"
            data-mode="scales"
            data-state={currentMode === 'scales' ? 'active' : 'idle'}
            data-ui="mode-tab"
            style={modeTabStyle(currentMode === 'scales')}
          >
            Escalas
          </button>
          <button
            type="button"
            onClick={() => onNavigateMode('chords')}
            aria-current={currentMode === 'chords' ? 'page' : undefined}
            className="ph-mode-tab"
            data-mode="chords"
            data-state={currentMode === 'chords' ? 'active' : 'idle'}
            data-ui="mode-tab"
            style={modeTabStyle(currentMode === 'chords')}
          >
            Acordes
          </button>
          <button
            type="button"
            onClick={() => onNavigateMode('songs')}
            aria-current={currentMode === 'songs' ? 'page' : undefined}
            className="ph-mode-tab"
            data-mode="songs"
            data-state={currentMode === 'songs' ? 'active' : 'idle'}
            data-ui="mode-tab"
            style={modeTabStyle(currentMode === 'songs')}
          >
            Lectura musical
          </button>
        </div>
      </div>

      {/* Lado Derecho: Controles Contextuales Inyectados */}
      <div className="ph-app-nav__actions" data-ui="app-nav-actions">
        {children}
      </div>
    </nav>
  )
}
