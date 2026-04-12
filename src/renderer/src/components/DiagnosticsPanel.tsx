import { useEffect, useMemo, useState } from 'react'
import type { DiagnosticsSnapshot, DiagnosticEntry } from '../types'

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: '16px',
  bottom: '16px',
  zIndex: 9999,
  width: 'min(560px, calc(100vw - 32px))',
  maxHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  WebkitAppRegion: 'no-drag' as never
}

const emptySnapshot: DiagnosticsSnapshot = {
  logPath: '',
  entries: []
}

function entryColor(level: DiagnosticEntry['level']) {
  if (level === 'error') return '#ff6b6b'
  if (level === 'warn') return '#ffd166'
  if (level === 'info') return '#4cc9f0'
  return '#8892a4'
}

export default function DiagnosticsPanel() {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot>(emptySnapshot)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.electronAPI.getDiagnosticsSnapshot().then(setSnapshot).catch(() => {})
    return window.electronAPI.onDiagnosticsUpdated(setSnapshot)
  }, [])

  const recentEntries = useMemo(() => snapshot.entries.slice(-30).reverse(), [snapshot.entries])
  const errorCount = useMemo(
    () => snapshot.entries.filter(entry => entry.level === 'error').length,
    [snapshot.entries]
  )

  async function handleCopyPath() {
    if (!snapshot.logPath) return
    try {
      await navigator.clipboard.writeText(snapshot.logPath)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => setOpen(prev => !prev)}
          style={{
            background: errorCount > 0 ? '#f72585' : '#223',
            color: '#fff',
            borderRadius: '999px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          {open ? 'Ocultar logs' : `Logs${errorCount > 0 ? ` (${errorCount})` : ''}`}
        </button>
      </div>

      {open && (
        <div style={{
          background: 'rgba(10, 15, 24, 0.96)',
          color: '#fff',
          border: '1px solid #334',
          borderRadius: '16px',
          boxShadow: '0 18px 48px rgba(0,0,0,0.35)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #223',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <div style={{ fontWeight: 700 }}>Diagnóstico</div>
              <div style={{ fontSize: '12px', color: '#8892a4' }}>
                {snapshot.logPath || 'Ruta del log no disponible'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopyPath}
                style={{
                  background: '#223',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px'
                }}
              >
                {copied ? 'Copiado' : 'Copiar ruta'}
              </button>
              <button
                onClick={() => window.electronAPI.showDiagnosticsLog().catch(() => {})}
                style={{
                  background: '#223',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px'
                }}
              >
                Mostrar archivo
              </button>
            </div>
          </div>

          <div style={{
            maxHeight: 'calc(60vh - 72px)',
            overflow: 'auto',
            padding: '10px 12px 12px'
          }}>
            {recentEntries.length === 0 ? (
              <p style={{ color: '#8892a4', fontSize: '13px' }}>Todavía no hay eventos registrados.</p>
            ) : (
              recentEntries.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${entry.event}-${index}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    marginBottom: '8px',
                    border: `1px solid ${entryColor(entry.level)}33`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      color: entryColor(entry.level),
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {entry.level}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8892a4' }}>{entry.timestamp}</span>
                    <span style={{ fontSize: '11px', color: '#8892a4' }}>{entry.source}</span>
                    <span style={{ fontSize: '11px', color: '#8892a4' }}>{entry.event}</span>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.45 }}>{entry.message}</div>
                  {entry.context !== undefined && (
                    <pre style={{
                      marginTop: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.28)',
                      color: '#aab4c8',
                      fontSize: '11px',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere'
                    }}>
                      {JSON.stringify(entry.context, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
