import { useState } from 'react'
import Practice from './screens/Practice'
import SongPractice from './screens/SongPractice'
import DiagnosticsPanel from './components/DiagnosticsPanel'

export default function App() {
  const [route, setRoute] = useState<'practice' | 'song'>('practice')

  return (
    <>
      {route === 'practice' ? (
        <Practice onNavigateSong={() => setRoute('song')} />
      ) : (
        <SongPractice onNavigateBack={() => setRoute('practice')} />
      )}
      <DiagnosticsPanel />
    </>
  )
}
