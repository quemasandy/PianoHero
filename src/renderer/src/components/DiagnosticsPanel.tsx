import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { DiagnosticsSnapshot, DiagnosticEntry } from '../types'

const emptySnapshot: DiagnosticsSnapshot = {
  logPath: '',
  entries: [],
}

function entryColor(level: DiagnosticEntry['level']) {
  if (level === 'error') return 'var(--neon-pink)'
  if (level === 'warn') return 'var(--neon-yellow)'
  if (level === 'info') return 'var(--neon-cyan)'
  return 'var(--slate-400)'
}

export default function DiagnosticsPanel() {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot>(emptySnapshot)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.electronAPI
      .getDiagnosticsSnapshot()
      .then(setSnapshot)
      .catch(() => {})
    return window.electronAPI.onDiagnosticsUpdated(setSnapshot)
  }, [])

  const recentEntries = useMemo(() => snapshot.entries.slice(-30).reverse(), [snapshot.entries])
  const errorCount = useMemo(
    () => snapshot.entries.filter((entry) => entry.level === 'error').length,
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
    <aside
      className="ph-diagnostics"
      data-error-count={errorCount}
      data-open={open ? 'true' : 'false'}
      data-ui="diagnostics-panel"
    >
      <div className="ph-diagnostics__toggle-row" data-ui="diagnostics-toggle-row">
        <button
          type="button"
          aria-expanded={open}
          aria-label="Logs del sistema"
          className="ph-diagnostics__toggle"
          data-has-errors={errorCount > 0 ? 'true' : 'false'}
          data-state={open ? 'open' : 'closed'}
          data-ui="diagnostics-toggle"
          onClick={() => setOpen((prev) => !prev)}
          title="Logs del Sistema"
        >
          {errorCount > 0 ? '!' : '⚙'}
        </button>
      </div>

      {open && (
        <div className="ph-diagnostics__panel" data-ui="diagnostics-log-panel">
          <header className="ph-diagnostics__header" data-ui="diagnostics-header">
            <div>
              <div className="ph-diagnostics__title" data-ui="diagnostics-title">
                Diagnóstico
              </div>
              <div className="ph-diagnostics__path" data-ui="diagnostics-log-path">
                {snapshot.logPath || 'Ruta del log no disponible'}
              </div>
            </div>
            <div className="ph-diagnostics__actions" data-ui="diagnostics-actions">
              <button
                type="button"
                className="ph-diagnostics__action"
                data-state={copied ? 'copied' : 'idle'}
                data-ui="copy-log-path-button"
                onClick={handleCopyPath}
              >
                {copied ? 'Copiado' : 'Copiar ruta'}
              </button>
              <button
                type="button"
                className="ph-diagnostics__action"
                data-ui="show-log-file-button"
                onClick={() => window.electronAPI.showDiagnosticsLog().catch(() => {})}
              >
                Mostrar archivo
              </button>
            </div>
          </header>

          <div className="ph-diagnostics__entries" data-ui="diagnostics-entry-list">
            {recentEntries.length === 0 ? (
              <p className="ph-diagnostics__empty" data-ui="diagnostics-empty">
                Todavía no hay eventos registrados.
              </p>
            ) : (
              recentEntries.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${entry.event}-${index}`}
                  className="ph-diagnostics__entry"
                  data-event={entry.event}
                  data-level={entry.level}
                  data-source={entry.source}
                  data-ui="diagnostics-entry"
                  style={{ '--ph-entry-color': entryColor(entry.level) } as CSSProperties}
                >
                  <div className="ph-diagnostics__entry-meta" data-ui="diagnostics-entry-meta">
                    <span className="ph-diagnostics__entry-level" data-ui="diagnostics-entry-level">
                      {entry.level}
                    </span>
                    <span data-ui="diagnostics-entry-time">{entry.timestamp}</span>
                    <span data-ui="diagnostics-entry-source">{entry.source}</span>
                    <span data-ui="diagnostics-entry-event">{entry.event}</span>
                  </div>
                  <div
                    className="ph-diagnostics__entry-message"
                    data-ui="diagnostics-entry-message"
                  >
                    {entry.message}
                  </div>
                  {entry.context !== undefined && (
                    <pre
                      className="ph-diagnostics__entry-context"
                      data-ui="diagnostics-entry-context"
                    >
                      {JSON.stringify(entry.context, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
