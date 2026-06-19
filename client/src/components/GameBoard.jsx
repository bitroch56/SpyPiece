import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useParams, useNavigate } from 'react-router-dom'

function GameBoard() {
  const { roomId } = useParams() // <-- Récupère l'ID depuis l'URL
  const navigate = useNavigate()
  
  const [socket, setSocket] = useState(null)
  const [game, setGame] = useState({ 
    phase: 'lobby', players: [], board: [], 
    currentTurn: 'red', turnPhase: 'clue', guessesLeft: 0, 
    currentClue: { word: '', count: 0, team: '' }, winner: null 
  })
  const [isConnected, setIsConnected] = useState(false)
  const [pseudo, setPseudo] = useState('')
  const [selectedRole, setSelectedRole] = useState({ role: 'joueur', team: 'red' })
  const [hasJoined, setHasJoined] = useState(false)
  const [inputWord, setInputWord] = useState('')
  const [inputCount, setInputCount] = useState(1)

  useEffect(() => {
    const s = io('http://localhost:3001')
    setSocket(s)
    s.on('connect', () => setIsConnected(true))
    s.on('game:state', (state) => setGame(state))
    s.on('disconnect', () => setIsConnected(false))
    return () => s.disconnect()
  }, [])

  const currentPlayer = { pseudo, role: selectedRole.role, team: selectedRole.team }

  const handleJoinLobby = (e) => {
    e.preventDefault()
    if (!pseudo.trim() || !socket) return
    socket.emit('player:joinRoom', { roomId, player: currentPlayer })
    setHasJoined(true)
  }

  const handleStartGame = () => { if (socket) socket.emit('game:start', { roomId }) }
  const handleResetGame = () => { 
    if (socket) {
      socket.emit('game:reset', { roomId })
      setHasJoined(false)
    }
  }

  const handleLeaveRoom = () => {
    navigate('/')
  }

  const handleSendClue = (e) => {
    e.preventDefault()
    if (!inputWord.trim() || !socket) return
    socket.emit('clue:submit', { 
      roomId,
      word: inputWord, 
      count: parseInt(inputCount, 10) || 1, 
      player: currentPlayer 
    })
    setInputWord('')
  }

  const handlePassTurn = () => {
    if (socket && game.currentTurn === selectedRole.team && game.turnPhase === 'guessing') {
      socket.emit('turn:pass', { roomId, player: currentPlayer })
    }
  }

  // Permet de copier l'URL dans le presse-papier en 1 clic
  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert("Lien copié dans le presse-papier !")
  }

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#fff' }}>
        <h2>Connexion au serveur en cours... 🏴‍☠️</h2>
      </div>
    )
  }

  if (game.phase === 'lobby') {
    return (
      <section className="board-wrapper" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Salle : {roomId}</h1>
          <button onClick={handleLeaveRoom} style={{ padding: '0.5rem 1rem', background: '#374178', color: '#fff', border: 'none', borderRadius: '6px' }}>Quitter</button>
        </header>

        {/* Zone de partage de lien */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1f2548', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#9ca3af' }}>Invitez vos amis avec ce lien :</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input readOnly value={window.location.href} style={{ flex: 1, padding: '0.8rem', background: '#0f1223', color: '#fff', border: '1px solid #374178', borderRadius: '6px', textAlign: 'center' }} onClick={(e) => e.target.select()} />
            <button onClick={copyInviteLink} style={{ padding: '0 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Copier</button>
          </div>
        </div>

        {!hasJoined ? (
          <form onSubmit={handleJoinLobby} style={{ background: '#1f2548', padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Votre pseudo..." value={pseudo} onChange={(e) => setPseudo(e.target.value)} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #374178', background: '#0f1223', color: '#fff' }} required />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Choisissez votre rôle :</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button type="button" onClick={() => setSelectedRole({ role: 'chef', team: 'red' })} style={{ padding: '1rem', background: selectedRole.role === 'chef' && selectedRole.team === 'red' ? '#ef4444' : '#374178', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🏴‍☠️ Capitaine</button>
              <button type="button" onClick={() => setSelectedRole({ role: 'joueur', team: 'red' })} style={{ padding: '1rem', background: selectedRole.role === 'joueur' && selectedRole.team === 'red' ? '#ef4444' : '#374178', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>⚔️ Matelot</button>
              <button type="button" onClick={() => setSelectedRole({ role: 'chef', team: 'blue' })} style={{ padding: '1rem', background: selectedRole.role === 'chef' && selectedRole.team === 'blue' ? '#3b82f6' : '#374178', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>👁️ Amiral</button>
              <button type="button" onClick={() => setSelectedRole({ role: 'joueur', team: 'blue' })} style={{ padding: '1rem', background: selectedRole.role === 'joueur' && selectedRole.team === 'blue' ? '#3b82f6' : '#374178', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🛡️ Officier</button>
            </div>
            <button type="submit" style={{ marginTop: '1.5rem', padding: '1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Rejoindre la salle</button>
          </form>
        ) : (
          <div style={{ background: '#1f2548', padding: '2rem', borderRadius: '12px' }}>
            <h3>Joueurs dans la salle</h3>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', background: '#0f1223', borderRadius: '6px' }}>
              {game.players.map((p, i) => <li key={i} style={{ padding: '0.8rem', borderBottom: '1px solid #374178', color: p.team === 'red' ? '#ef4444' : '#3b82f6' }}>{p.pseudo} - {p.team} {p.role}</li>)}
            </ul>
            <button onClick={handleStartGame} style={{ padding: '1rem 2rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', width: '100%', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>Lancer la partie</button>
          </div>
        )}
      </section>
    )
  }

  const totalRed = game.board.filter(c => c.team === 'red' && !c.revealed).length
  const totalBlue = game.board.filter(c => c.team === 'blue' && !c.revealed).length

  const isMyTurn = game.currentTurn === selectedRole.team
  const isGuessingPhase = game.turnPhase === 'guessing'
  const isCluePhase = game.turnPhase === 'clue'

  return (
    <section className="board-wrapper">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>Spy-Piece</h1>
          <p style={{ margin: 0, color: '#9ca3af' }}>Salle : {roomId}</p>
        </div>
        <button onClick={handleResetGame} style={{ padding: '0.5rem 1rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Annuler la partie
        </button>
      </header>

      {game.winner && (
        <div style={{ background: game.winner === 'red' ? '#ef4444' : '#3b82f6', color: '#fff', padding: '2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>🎉 L'équipe {game.winner === 'red' ? 'PIRATE' : 'MARINE'} remporte la partie ! 🎉</h2>
        </div>
      )}

      <div style={{ background: selectedRole.team === 'red' ? '#7f1d1d' : '#1e3a8a', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>
          <strong>{pseudo}</strong> | {selectedRole.role === 'chef' ? 'Chef' : 'Joueur'}
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontWeight: 'bold' }}>
          <span style={{ color: '#fca5a5' }}>Rouge : {totalRed}</span>
          <span style={{ color: '#93c5fd' }}>Bleu : {totalBlue}</span>
        </div>
      </div>

      <div style={{ background: '#131730', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: `2px solid ${game.currentTurn === 'red' ? '#ef4444' : '#3b82f6'}` }}>
        <h3 style={{ margin: '0 0 1rem 0', color: game.currentTurn === 'red' ? '#ef4444' : '#3b82f6' }}>
          Tour actuel : {game.currentTurn === 'red' ? 'PIRATES (Rouge)' : 'MARINE (Bleu)'}
        </h3>

        {!game.winner && isCluePhase && (
          <div>
            {isMyTurn && selectedRole.role === 'chef' ? (
              <>
                <p style={{ fontWeight: 'bold' }}>C'est à vous ! Donnez un indice à votre équipe :</p>
                <form onSubmit={handleSendClue} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Entrez votre indice (1 mot)..." value={inputWord} onChange={(e) => setInputWord(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', background: '#0f1223', color: '#fff', flex: 1 }} required />
                  <input type="number" min="0" max="9" value={inputCount} onChange={(e) => setInputCount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', background: '#0f1223', color: '#fff', width: '60px' }} required />
                  <button type="submit" style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Transmettre</button>
                </form>
              </>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#9ca3af' }}>
                Attente de l'indice du Chef {game.currentTurn === 'red' ? 'Pirate' : 'Marine'}...
              </p>
            )}
          </div>
        )}

        {!game.winner && isGuessingPhase && (
          <div>
            <p style={{ fontSize: '1.2rem' }}>
              Indice : <span style={{ background: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{game.currentClue.word}</span> pour <strong>{game.currentClue.count}</strong> mots.
            </p>
            <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>Essais restants (bonus inclus) : {game.guessesLeft}</p>
            
            {isMyTurn && selectedRole.role === 'joueur' && (
              <button onClick={handlePassTurn} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', marginTop: '1rem', cursor: 'pointer' }}>
                Finir mon tour (Passer)
              </button>
            )}
            
            {!isMyTurn && (
              <p style={{ fontStyle: 'italic', color: '#9ca3af', marginTop: '1rem' }}>L'équipe adverse réfléchit...</p>
            )}
          </div>
        )}
      </div>

      <div className="board-grid" role="grid">
        {game.board.map((card) => {
          let borderColor = '#374178'
          let opacity = 1
          
          const isRed = card.team === 'red'
          const isBlue = card.team === 'blue'
          const isNeutral = card.team === 'neutral'
          const isAssassin = card.team === 'assassin'

          if (selectedRole.role === 'chef' || game.winner) {
            if (isRed) borderColor = '#ef4444'
            if (isBlue) borderColor = '#3b82f6'
            if (isNeutral) borderColor = '#9ca3af'
            if (isAssassin) borderColor = '#000000'
            if (card.revealed) opacity = 0.4 
          } else if (selectedRole.role === 'joueur' && card.revealed) {
            if (isRed) borderColor = '#ef4444'
            if (isBlue) borderColor = '#3b82f6'
            if (isNeutral) borderColor = '#4b5563'
            if (isAssassin) borderColor = '#000000'
          }

          const canClick = !game.winner && isMyTurn && isGuessingPhase && selectedRole.role === 'joueur' && !card.revealed

          return (
            <article 
              key={card.cardId} 
              className="board-card" 
              role="gridcell"
              style={{ 
                border: `3px solid ${borderColor}`, 
                opacity: opacity,
                background: (card.revealed) ? '#11152c' : '#1f2548',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0.8rem',
                minHeight: '120px'
              }}
            >
              <div>
                <strong>{card.name}</strong>
                <span style={{display: 'block', fontSize: '0.8rem', color: '#b7bdd8'}}>{card.image}</span>
              </div>
              
              {card.revealed ? (
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>✓ Découvert</span>
              ) : (
                <div style={{ marginTop: '0.5rem' }}>
                  {card.proposals?.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginBottom: '0.5rem' }}>
                      🖐️ {card.proposals.join(', ')}
                    </div>
                  )}
                  {canClick && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); socket.emit('card:propose', { roomId, cardId: card.cardId, player: currentPlayer }); }}
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: '#374178', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Proposer
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); socket.emit('card:reveal', { roomId, cardId: card.cardId, player: currentPlayer }); }}
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Révéler
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default GameBoard