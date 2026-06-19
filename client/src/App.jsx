import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import GameBoard from './components/GameBoard'

// Page d'accueil pour créer une salle
function Home() {
  const navigate = useNavigate()

  const createGame = () => {
    // Génère un ID de 6 caractères majuscules aléatoires (ex: A4F9XZ)
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    navigate(`/game/${roomId}`)
  }

  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#fff', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🏴‍☠️ Spy-Piece 🏴‍☠️</h1>
      <p style={{ fontSize: '1.2rem', margin: '2rem 0' }}>
        Bienvenue dans la bataille pour le One Piece. Créez une salle privée et invitez vos amis à jouer !
      </p>
      <button 
        onClick={createGame} 
        style={{ padding: '1rem 2rem', fontSize: '1.2rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}
      >
        Créer une partie privée
      </button>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:roomId" element={<GameBoard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App