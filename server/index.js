const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
const characters = require('./data/characters.json')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

app.use(cors())

const CARD_COUNT = 25

const shuffle = (list) => {
  const shuffled = [...list]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
  }
  return shuffled
}

const createMockBoard = () => {
  const selectedCharacters = shuffle(characters).slice(0, CARD_COUNT)
  const startingTeam = Math.random() < 0.5 ? 'red' : 'blue'
  const secondTeam = startingTeam === 'red' ? 'blue' : 'red'

  const roles = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('neutral'),
    'assassin'
  ]
  const shuffledRoles = shuffle(roles)

  return selectedCharacters.map((character, index) => ({
    ...character,
    cardId: index + 1,
    team: shuffledRoles[index],
    revealed: false,
  }))
}

// ÉTAT GLOBAL ÉVOLUÉ
let gameState = {
  phase: 'lobby',
  players: {},
  board: [],
  currentTurn: 'red',
  turnPhase: 'clue', // 'clue' (Chef donne le mot) | 'guessing' (Joueurs devinent)
  guessesLeft: 0, // Nombre de clics restants (mot + 1)
  currentClue: { word: '', count: 0, team: '' },
  winner: null // 'red' ou 'blue'
}

const switchTurn = () => {
  gameState.currentTurn = gameState.currentTurn === 'red' ? 'blue' : 'red'
  gameState.turnPhase = 'clue'
  gameState.guessesLeft = 0
  gameState.currentClue = { word: '', count: 0, team: '' }
}

const checkWinCondition = () => {
  const remainingRed = gameState.board.filter(c => c.team === 'red' && !c.revealed).length
  const remainingBlue = gameState.board.filter(c => c.team === 'blue' && !c.revealed).length
  
  if (remainingRed === 0) gameState.winner = 'red'
  if (remainingBlue === 0) gameState.winner = 'blue'
}

io.on('connection', (socket) => {
  socket.emit('game:state', { ...gameState, players: Object.values(gameState.players) })

  socket.on('player:join', (playerData) => {
    gameState.players[socket.id] = playerData
    io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
  })

  socket.on('game:start', () => {
    gameState.board = createMockBoard()
    const redCount = gameState.board.filter(c => c.team === 'red').length
    
    gameState.phase = 'playing'
    gameState.winner = null
    gameState.currentTurn = redCount === 9 ? 'red' : 'blue'
    gameState.turnPhase = 'clue'
    gameState.guessesLeft = 0
    gameState.currentClue = { word: '', count: 0, team: '' }
    
    io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
  })

  socket.on('clue:submit', (clueData) => {
    if (gameState.turnPhase !== 'clue') return

    gameState.currentClue = clueData
    gameState.turnPhase = 'guessing'
    gameState.guessesLeft = clueData.count + 1 // +1 pour la règle du bonus
    
    io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
  })

  socket.on('card:reveal', (cardId) => {
    // Si ce n'est pas le moment de deviner ou que le jeu est fini, on annule
    if (gameState.turnPhase !== 'guessing' || gameState.winner) return

    const cardIndex = gameState.board.findIndex(c => c.cardId === cardId)
    if (cardIndex === -1 || gameState.board[cardIndex].revealed) return

    const card = gameState.board[cardIndex]
    card.revealed = true

    const currentTeam = gameState.currentTurn
    const oppositeTeam = currentTeam === 'red' ? 'blue' : 'red'

    // RÉSOLUTION DES RÈGLES
    if (card.team === 'assassin') {
      // Carte noire : Défaite immédiate
      gameState.winner = oppositeTeam
    } else if (card.team === oppositeTeam || card.team === 'neutral') {
      // Mauvaise couleur ou neutre : Fin du tour
      checkWinCondition() // Au cas où ils révèlent la dernière carte adverse
      if (!gameState.winner) switchTurn()
    } else if (card.team === currentTeam) {
      // Bonne couleur : On continue
      checkWinCondition()
      if (!gameState.winner) {
        gameState.guessesLeft -= 1
        // S'il n'y a plus d'essais (bonus inclus), fin du tour automatique
        if (gameState.guessesLeft <= 0) {
          switchTurn()
        }
      }
    }

    io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
  })

  // Permet de passer le tour volontairement
  socket.on('turn:pass', () => {
    if (gameState.turnPhase === 'guessing' && !gameState.winner) {
      switchTurn()
      io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
    }
  })

  socket.on('game:reset', () => {
    gameState.phase = 'lobby'
    gameState.board = []
    gameState.winner = null
    io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
  })

  socket.on('disconnect', () => {
    delete gameState.players[socket.id]
    io.emit('game:state', { ...gameState, players: Object.values(gameState.players) })
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Spy-Piece server listening on port ${PORT}`))