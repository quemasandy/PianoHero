import { useState } from 'react'
import Practice from './screens/Practice'
import SongPractice from './screens/SongPractice'
import DiagnosticsPanel from './components/DiagnosticsPanel'

export default function App() {
  const [route, setRoute] = useState<'practice' | 'song'>('practice')
  const [practiceView, setPracticeView] = useState<'practice_home' | 'scale_session' | 'chord_session'>('practice_home')

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Title Bar nativo global de la app para controles de macOS */}
      <div 
        style={{ 
          height: '38px', 
          width: '100%', 
          backgroundColor: 'transparent',
          WebkitAppRegion: 'drag', 
          flexShrink: 0,
          zIndex: 9999
        } as React.CSSProperties} 
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {route === 'practice' ? (
        <Practice 
          currentView={practiceView} 
          onViewChange={setPracticeView}
          onNavigateMode={handleNavigateMode} 
        />
      ) : (
        <SongPractice 
          onNavigateHome={handleNavigateHome} 
          onNavigateMode={handleNavigateMode}
        />
      )}
      </div>
      <DiagnosticsPanel />
    </div>
  )
}
