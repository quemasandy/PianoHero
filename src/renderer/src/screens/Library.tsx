import { useState, useCallback } from 'react'
import type { ParsedSong } from '../types'
import { parseMidiFile } from '../lib/MidiParser'
import { logRendererEvent } from '../lib/diagnostics'
import { prepareSongForPractice } from '../lib/songPreparation'

interface RecentFile {
  path: string
  title: string
  duration: number
}

interface LibraryProps {
  onPlay: (song: ParsedSong, filePath: string) => void
}

export default function Library({ onPlay }: LibraryProps) {
  const [recent, setRecent] = useState<RecentFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const loadFile = useCallback(
    async (filePath: string) => {
      setLoading(true)
      setError(null)
      logRendererEvent('info', 'library.loadFile.start', 'Starting MIDI load', { filePath })
      try {
        const buffer = await window.electronAPI.readMidiFile(filePath)
        logRendererEvent('info', 'library.loadFile.buffer', 'MIDI buffer loaded', {
          filePath,
          byteLength: buffer.byteLength,
        })
        const parsedSong = await parseMidiFile(buffer)
        const prepared = prepareSongForPractice(parsedSong, filePath)
        logRendererEvent('info', 'library.loadFile.parsed', 'MIDI parsed successfully', {
          filePath,
          title: prepared.song.title,
          noteCount: prepared.song.notes.length,
          trackCount: prepared.song.trackCount,
          duration: prepared.song.duration,
          adapted: prepared.adapted,
          preset: prepared.preset,
        })
        setRecent((prev) => {
          const filtered = prev.filter((r) => r.path !== filePath)
          return [
            { path: filePath, title: prepared.song.title, duration: prepared.song.duration },
            ...filtered,
          ].slice(0, 10)
        })
        onPlay(prepared.song, filePath)
      } catch (e) {
        logRendererEvent('error', 'library.loadFile.failed', 'MIDI load failed', {
          filePath,
          error: e,
        })
        setError(`Error al leer el archivo: ${e}`)
      } finally {
        setLoading(false)
      }
    },
    [onPlay]
  )

  async function handleOpenDialog() {
    logRendererEvent('info', 'library.openDialog', 'Requesting MIDI file dialog')
    const paths = await window.electronAPI.openMidiFile()
    logRendererEvent('info', 'library.openDialog.result', 'MIDI file dialog resolved', {
      fileCount: paths?.length ?? 0,
    })
    if (!paths || paths.length === 0) return
    await loadFile(paths[0])
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      const midi = files.find((f) => f.name.match(/\.(mid|midi)$/i))
      if (!midi) return setError('Solo se aceptan archivos .mid o .midi')
      const filePath = (midi as unknown as { path: string }).path
      logRendererEvent('info', 'library.drop', 'MIDI file dropped into library', {
        name: midi.name,
        path: filePath,
      })
      await loadFile(filePath)
    },
    [loadFile]
  )

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <main className="ph-library" data-ui="library-screen">
      {/* Logo */}
      <header className="ph-library__header" data-ui="library-header">
        <h1 className="ph-library__title" data-ui="library-title">
          PianoHero
        </h1>
        <p className="ph-library__subtitle" data-ui="library-subtitle">
          Aprende piano con archivos MIDI
        </p>
      </header>

      {/* Drop zone */}
      <div
        aria-busy={loading}
        className="ph-library__dropzone"
        data-state={dragging ? 'dragging' : loading ? 'loading' : 'idle'}
        data-ui="midi-dropzone"
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onClick={handleOpenDialog}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void handleOpenDialog()
          }
        }}
      >
        <div className="ph-library__dropzone-icon" data-ui="midi-dropzone-icon">
          🎹
        </div>
        {loading ? (
          <p className="ph-library__loading" data-ui="library-loading" role="status">
            Cargando...
          </p>
        ) : (
          <>
            <p className="ph-library__dropzone-title" data-ui="midi-dropzone-title">
              Arrastra un archivo MIDI aquí
            </p>
            <p className="ph-library__dropzone-help" data-ui="midi-dropzone-help">
              o haz clic para abrir un archivo .mid
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="ph-library__error" data-ui="library-error" role="alert">
          {error}
        </p>
      )}

      {/* Recent files */}
      {recent.length > 0 && (
        <section className="ph-library__recent" data-ui="recent-files">
          <h3 className="ph-library__recent-title" data-ui="recent-files-title">
            Archivos recientes
          </h3>
          <div className="ph-library__recent-list" data-ui="recent-file-list">
            {recent.map((file) => (
              <button
                key={file.path}
                type="button"
                className="ph-library__recent-file"
                data-file-path={file.path}
                data-ui="recent-file"
                onClick={() => loadFile(file.path)}
              >
                <span className="ph-library__recent-file-title" data-ui="recent-file-title">
                  🎵 {file.title}
                </span>
                <span className="ph-library__recent-file-duration" data-ui="recent-file-duration">
                  {formatDuration(file.duration)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bundled demo MIDI files note */}
      <p className="ph-library__footer-note" data-ui="library-footer-note">
        PianoHero • Open Source • Sin limitaciones
      </p>
    </main>
  )
}
