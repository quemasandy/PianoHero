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
    background: active ? '#4cc9f0' : 'transparent',
    color: active ? '#001219' : '#c8d1e8',
    border: 'none',
    borderRadius: '999px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
}

export function buttonStyle(background: string, color = '#fff', disabled = false): CSSProperties {
  return {
    background,
    color,
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.2s',
  }
}

export default function AppNavigation({
  currentMode,
  onNavigateHome,
  onNavigateMode,
  children
}: AppNavigationProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', paddingLeft: '32px', paddingRight: '32px', paddingTop: '16px' }}>
      
      {/* Lado Izquierdo: Navegación Principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={onNavigateHome} 
          title="Volver a Inicio"
          style={{ ...buttonStyle('rgba(255,255,255,0.05)', '#c8d1e8'), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#c8d1e8' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
        
        <div style={{ display: 'flex', gap: '6px', padding: '4px', borderRadius: '999px', background: '#101a2d', border: '1px solid #223' }}>
          <button onClick={() => onNavigateMode('scales')} style={modeTabStyle(currentMode === 'scales')}>Escalas</button>
          <button onClick={() => onNavigateMode('chords')} style={modeTabStyle(currentMode === 'chords')}>Acordes</button>
          <button onClick={() => onNavigateMode('songs')} style={modeTabStyle(currentMode === 'songs')}>Lectura musical</button>
        </div>
      </div>

      {/* Lado Derecho: Controles Contextuales Inyectados */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {children}
      </div>

    </div>
  )
}
