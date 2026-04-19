import { useState } from 'react'
import Practice from './screens/Practice'
import SongPractice from './screens/SongPractice'
import DiagnosticsPanel from './components/DiagnosticsPanel'

export default function App() {
  const [route, setRoute] = useState<'practice' | 'song'>('practice')

  return (
    <>
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        right: 24, 
        zIndex: 1000, 
        display: 'flex', 
        gap: 4,
        background: 'rgba(20, 25, 40, 0.6)',
        padding: '6px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <button 
          onClick={() => setRoute('practice')}
          style={{ 
            background: route === 'practice' ? '#4cc9f0' : 'transparent', 
            color: route === 'practice' ? '#000' : '#8892a4', 
            padding: '8px 18px', 
            borderRadius: '14px', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 800,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: route === 'practice' ? '0 2px 10px rgba(76, 201, 240, 0.4)' : 'none'
          }}
          onMouseOver={(e) => { if (route !== 'practice') e.currentTarget.style.color = '#fff' }}
          onMouseOut={(e) => { if (route !== 'practice') e.currentTarget.style.color = '#8892a4' }}
        >
          Ejercicios
        </button>
        <button 
          onClick={() => setRoute('song')}
          style={{ 
            background: route === 'song' ? '#f72585' : 'transparent', 
            color: route === 'song' ? '#fff' : '#8892a4', 
            padding: '8px 18px', 
            borderRadius: '14px', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 800,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: route === 'song' ? '0 2px 10px rgba(247, 37, 133, 0.4)' : 'none'
          }}
          onMouseOver={(e) => { if (route !== 'song') e.currentTarget.style.color = '#fff' }}
          onMouseOut={(e) => { if (route !== 'song') e.currentTarget.style.color = '#8892a4' }}
        >
          Canciones
        </button>
      </div>

      {route === 'practice' ? <Practice /> : <SongPractice />}
      <DiagnosticsPanel />
    </>
  )
}
