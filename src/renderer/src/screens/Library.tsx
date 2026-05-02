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

  async function loadFile(filePath: string) {
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
  }

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#1a1a2e',
        padding: '32px',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #4cc9f0, #f72585)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
          }}
        >
          PianoHero
        </h1>
        <p style={{ color: '#8892a4', marginTop: '8px' }}>Aprende piano con archivos MIDI</p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onClick={handleOpenDialog}
        style={{
          width: '100%',
          maxWidth: '500px',
          border: `2px dashed ${dragging ? '#4cc9f0' : '#334'}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(76,201,240,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎹</div>
        {loading ? (
          <p style={{ color: '#4cc9f0' }}>Cargando...</p>
        ) : (
          <>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Arrastra un archivo MIDI aquí
            </p>
            <p style={{ color: '#8892a4', fontSize: '14px' }}>
              o haz clic para abrir un archivo .mid
            </p>
          </>
        )}
      </div>

      {error && <p style={{ color: '#e94560', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

      {/* Recent files */}
      {recent.length > 0 && (
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <h3
            style={{
              color: '#8892a4',
              fontSize: '13px',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Archivos recientes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent.map((file) => (
              <button
                key={file.path}
                onClick={() => loadFile(file.path)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #334',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(76,201,240,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <span style={{ fontWeight: 600, fontSize: '14px' }}>🎵 {file.title}</span>
                <span style={{ color: '#8892a4', fontSize: '12px' }}>
                  {formatDuration(file.duration)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bundled demo MIDI files note */}
      <p style={{ color: '#444', fontSize: '12px', marginTop: '32px', textAlign: 'center' }}>
        PianoHero • Open Source • Sin limitaciones
      </p>
    </div>
  )
}
