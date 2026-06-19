import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

function GameBoard() {
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

  // ACTIONS DU LOBBY
  const handleJoinLobby = (e) => {
    e.preventDefault()
    if (!pseudo.trim() || !socket) return
    socket.emit('player:join', { pseudo, role: selectedRole.role, team: selectedRole.team })
    setHasJoined(true)
  }

  const handleStartGame = () => { if (socket) socket.emit('game:start') }
  const handleResetGame = () => { 
    if (socket) {
      socket.emit('game:reset')
      setHasJoined(false)
    }
  }

  // ACTIONS DE JEU
  const handleSendClue = (e) => {
    e.preventDefault()
    if (!inputWord.trim() || !socket) return
    socket.emit('clue:submit', { word: inputWord, count: parseInt(inputCount, 10), team: selectedRole.team })
    setInputWord('')
  }

  const handleCardClick = (cardId, isRevealed) => {
    // CONDITIONS DE CLIC STRICTES
    if (
      selectedRole.role === 'chef' || // Un chef ne clique jamais
      isRevealed ||                   // Carte déjà cliquée
      game.winner ||                  // Partie terminée
      game.currentTurn !== selectedRole.team || // Pas dans la bonne équipe
      game.turnPhase !== 'guessing'   // Pas dans la phase de clic
    ) return 
    
    socket.emit('card:reveal', cardId)
  }

  const handlePassTurn = () => {
    if (socket && game.currentTurn === selectedRole.team && game.turnPhase === 'guessing') {
      socket.emit('turn:pass')
    }
  }

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#fff' }}>
        <h2>Connexion au serveur en cours... 🏴‍☠️</h2>
      </div>
    )
  }

  // --- VUE LOBBY --- (inchangée, raccourcie pour lisibilité)
  if (game.phase === 'lobby') {
    return (
      <section className="board-wrapper" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1>Spy-Piece - Salle d'attente</h1>
        {!hasJoined ? (
          <form onSubmit={handleJoinLobby} style={{ background: '#1f2548', padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Votre pseudo..." value={pseudo} onChange={(e) => setPseudo(e.target.value)} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #374178', background: '#0f1223', color: '#fff' }} required />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>Choisissez votre rôle :</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button type="button" onClick={() => setSelectedRole({ role: 'chef', team: 'red' })} style={{ padding: '1rem', background: selectedRole.role === 'chef' && selectedRole.team === 'red' ? '#ef4444' : '#374178', color: '#fff', border: 'none', borderRadius: '6px' }}>🏴‍☠️ Capitaine</button>
              <button type="button" onClick={() => setSelectedRole({ role: 'joueur', team: 'red' })} style={{ padding: '1rem', background: selectedRole.role === 'joueur' && selectedRole.team === 'red' ? '#ef4444' : '#374178', color: '#fff', border: 'none', borderRadius: '6px' }}>⚔️ Matelot</button>
              <button type="button" onClick={() => setSelectedRole({ role: 'chef', team: 'blue' })} style={{ padding: '1rem', background: selectedRole.role === 'chef' && selectedRole.team === 'blue' ? '#3b82f6' : '#374178', color: '#fff', border: 'none', borderRadius: '6px' }}>👁️ Amiral</button>
              <button type="button" onClick={() => setSelectedRole({ role: 'joueur', team: 'blue' })} style={{ padding: '1rem', background: selectedRole.role === 'joueur' && selectedRole.team === 'blue' ? '#3b82f6' : '#374178', color: '#fff', border: 'none', borderRadius: '6px' }}>🛡️ Officier</button>
            </div>
            <button type="submit" style={{ marginTop: '1.5rem', padding: '1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px' }}>Rejoindre</button>
          </form>
        ) : (
          <div style={{ background: '#1f2548', padding: '2rem', borderRadius: '12px' }}>
            <h3>Joueurs connectés</h3>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', background: '#0f1223', borderRadius: '6px' }}>
              {game.players.map((p, i) => <li key={i} style={{ padding: '0.8rem', borderBottom: '1px solid #374178', color: p.team === 'red' ? '#ef4444' : '#3b82f6' }}>{p.pseudo} - {p.team} {p.role}</li>)}
            </ul>
            <button onClick={handleStartGame} style={{ padding: '1rem 2rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px', width: '100%' }}>Lancer la partie</button>
          </div>
        )}
      </section>
    )
  }

  // --- VUE JEU EN COURS ---
  const totalRed = game.board.filter(c => c.team === 'red' && !c.revealed).length
  const totalBlue = game.board.filter(c => c.team === 'blue' && !c.revealed).length

  // Variables pour simplifier l'affichage
  const isMyTurn = game.currentTurn === selectedRole.team
  const isGuessingPhase = game.turnPhase === 'guessing'
  const isCluePhase = game.turnPhase === 'clue'

  return (
    <section className="board-wrapper">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>Spy-Piece</h1>
          <p>La bataille pour le One Piece est lancée !</p>
        </div>
        <button onClick={handleResetGame} style={{ padding: '0.5rem 1rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '6px' }}>
          Retour au Lobby
        </button>
      </header>

      {/* BANNIÈRE DE VICTOIRE */}
      {game.winner && (
        <div style={{ background: game.winner === 'red' ? '#ef4444' : '#3b82f6', color: '#fff', padding: '2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>🎉 L'équipe {game.winner === 'red' ? 'PIRATE' : 'MARINE'} remporte la partie ! 🎉</h2>
        </div>
      )}

      {/* BANDEAU DU JOUEUR */}
      <div style={{ background: selectedRole.team === 'red' ? '#7f1d1d' : '#1e3a8a', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>
          <strong>{pseudo}</strong> | {selectedRole.role === 'chef' ? 'Chef' : 'Joueur'}
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontWeight: 'bold' }}>
          <span style={{ color: '#fca5a5' }}>Rouge : {totalRed}</span>
          <span style={{ color: '#93c5fd' }}>Bleu : {totalBlue}</span>
        </div>
      </div>

      {/* INDICATEUR DE TOUR ET ACTIONS */}
      <div style={{ background: '#131730', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: `2px solid ${game.currentTurn === 'red' ? '#ef4444' : '#3b82f6'}` }}>
        <h3 style={{ margin: '0 0 1rem 0', color: game.currentTurn === 'red' ? '#ef4444' : '#3b82f6' }}>
          Tour actuel : {game.currentTurn === 'red' ? 'PIRATES (Rouge)' : 'MARINE (Bleu)'}
        </h3>

        {!game.winner && isCluePhase && (
          <div>
            <p>Le Chef doit donner un indice...</p>
            {isMyTurn && selectedRole.role === 'chef' && (
              <form onSubmit={handleSendClue} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Entrez votre indice (1 mot)..." value={inputWord} onChange={(e) => setInputWord(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', background: '#0f1223', color: '#fff', flex: 1 }} required />
                <input type="number" min="0" max="9" value={inputCount} onChange={(e) => setInputCount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', background: '#0f1223', color: '#fff', width: '60px' }} required />
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px' }}>Transmettre</button>
              </form>
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
          </div>
        )}
      </div>

      {/* LA GRILLE DE CARTES */}
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

          // Déterminer si le joueur a le droit de cliquer visuellement
          const canClick = !game.winner && isMyTurn && isGuessingPhase && selectedRole.role === 'joueur' && !card.revealed

          return (
            <article 
              key={card.cardId} 
              className="board-card" 
              role="gridcell"
              onClick={() => handleCardClick(card.cardId, card.revealed)}
              style={{ 
                border: `3px solid ${borderColor}`, 
                opacity: opacity,
                cursor: canClick ? 'pointer' : 'default',
                background: (card.revealed) ? '#11152c' : '#1f2548'
              }}
            >
              <strong>{card.name}</strong>
              <span>{card.image}</span>
              {card.revealed && <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block' }}>✓ Découvert</span>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default GameBoard