import { useState } from 'react'
import Practice from './screens/Practice'
import SongPractice from './screens/SongPractice'
import DiagnosticsPanel from './components/DiagnosticsPanel'

export default function App() {
  const [route, setRoute] = useState<'practice' | 'song'>('practice')
  const [practiceView, setPracticeView] = useState<
    'practice_home' | 'scale_session' | 'chord_session'
  >('practice_home')

  function handleNavigateMode(mode: 'scales' | 'chords' | 'songs') {
    if (mode === 'songs') {
      setRoute('song')
    } else if (mode === 'scales') {
      setRoute('practice')
      setPracticeView('scale_session')
    } else if (mode === 'chords') {
      setRoute('practice')
      setPracticeView('chord_session')
    }
  }

  function handleNavigateHome() {
    setRoute('practice')
    setPracticeView('practice_home')
  }

  return (
    <div className="ph-app-shell" data-route={route} data-ui="app-shell">
      {/* Title Bar nativo global de la app para controles de macOS */}
      <div className="ph-app-drag-region" data-ui="app-drag-region" />

      <main className="ph-app-main" data-ui="app-main">
        {route === 'practice' ? (
          <Practice
            currentView={practiceView}
            onViewChange={setPracticeView}
            onNavigateMode={handleNavigateMode}
          />
        ) : (
          <SongPractice onNavigateHome={handleNavigateHome} onNavigateMode={handleNavigateMode} />
        )}
      </main>
      <DiagnosticsPanel />
    </div>
  )
}
