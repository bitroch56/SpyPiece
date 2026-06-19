import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001')

function GameBoard() {
  const [cards, setCards] = useState([])

  useEffect(() => {
    const onBoardState = (board) => {
      setCards(board)
    }

    socket.on('board:state', onBoardState)

    return () => {
      socket.off('board:state', onBoardState)
    }
  }, [])

  return (
    <section className="board-wrapper">
      <h1>Spy-Piece</h1>
      <p>Grille multijoueur en temps réel (prototype)</p>
      <div className="board-grid" role="grid" aria-label="Spy Piece board">
        {cards.map((card) => (
          <article key={card.cardId} className="board-card" role="gridcell">
            <strong>{card.name}</strong>
            <span>{card.image}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export default GameBoard
