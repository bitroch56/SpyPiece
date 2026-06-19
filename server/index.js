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
    proposals: []
  }))
}

// L'objet qui contiendra toutes les parties en cours
const games = {}

const createEmptyGame = () => ({
  phase: 'lobby',
  players: {},
  board: [],
  currentTurn: 'red',
  turnPhase: 'clue', 
  guessesLeft: 0, 
  currentClue: { word: '', count: 0, team: '' },
  winner: null 
})

const switchTurn = (roomId) => {
  const game = games[roomId]
  if (!game) return
  game.currentTurn = game.currentTurn === 'red' ? 'blue' : 'red'
  game.turnPhase = 'clue'
  game.guessesLeft = 0
  game.currentClue = { word: '', count: 0, team: '' }
  game.board.forEach(c => c.proposals = [])
}

const checkWinCondition = (roomId) => {
  const game = games[roomId]
  if (!game) return
  const remainingRed = game.board.filter(c => c.team === 'red' && !c.revealed).length
  const remainingBlue = game.board.filter(c => c.team === 'blue' && !c.revealed).length
  
  if (remainingRed === 0) game.winner = 'red'
  if (remainingBlue === 0) game.winner = 'blue'
}

io.on('connection', (socket) => {

  // Un joueur rejoint un lien (une room spécifique)
  socket.on('player:joinRoom', ({ roomId, player }) => {
    socket.join(roomId)
    
    // Si la room n'existe pas, on la crée
    if (!games[roomId]) {
      games[roomId] = createEmptyGame()
    }
    
    games[roomId].players[socket.id] = player
    io.to(roomId).emit('game:state', { ...games[roomId], players: Object.values(games[roomId].players) })
  })

  socket.on('game:start', ({ roomId }) => {
    const game = games[roomId]
    if (!game) return

    game.board = createMockBoard()
    const redCount = game.board.filter(c => c.team === 'red').length
    
    game.phase = 'playing'
    game.winner = null
    game.currentTurn = redCount === 9 ? 'red' : 'blue'
    game.turnPhase = 'clue'
    game.guessesLeft = 0
    game.currentClue = { word: '', count: 0, team: '' }
    
    io.to(roomId).emit('game:state', { ...game, players: Object.values(game.players) })
  })

  socket.on('clue:submit', ({ roomId, word, count, player }) => {
    const game = games[roomId]
    if (!game || !player || player.team !== game.currentTurn || player.role !== 'chef' || game.turnPhase !== 'clue') return

    game.currentClue = { word, count, team: player.team }
    game.turnPhase = 'guessing'
    game.guessesLeft = count + 1 
    
    io.to(roomId).emit('game:state', { ...game, players: Object.values(game.players) })
  })

  socket.on('card:propose', ({ roomId, cardId, player }) => {
    const game = games[roomId]
    if (!game || !player || player.team !== game.currentTurn || player.role !== 'joueur' || game.turnPhase !== 'guessing' || game.winner) return

    const card = game.board.find(c => c.cardId === cardId)
    if (!card || card.revealed) return

    const pseudo = player.pseudo
    const propIndex = card.proposals.indexOf(pseudo)
    
    if (propIndex > -1) {
      card.proposals.splice(propIndex, 1)
    } else {
      card.proposals.push(pseudo)
    }

    io.to(roomId).emit('game:state', { ...game, players: Object.values(game.players) })
  })

  socket.on('card:reveal', ({ roomId, cardId, player }) => {
    const game = games[roomId]
    if (!game || !player || player.team !== game.currentTurn || player.role !== 'joueur' || game.turnPhase !== 'guessing' || game.winner) return

    const cardIndex = game.board.findIndex(c => c.cardId === cardId)
    if (cardIndex === -1 || game.board[cardIndex].revealed) return

    const card = game.board[cardIndex]
    card.revealed = true

    const currentTeam = game.currentTurn
    const oppositeTeam = currentTeam === 'red' ? 'blue' : 'red'

    if (card.team === 'assassin') {
      game.winner = oppositeTeam
    } else if (card.team === oppositeTeam || card.team === 'neutral') {
      checkWinCondition(roomId) 
      if (!game.winner) switchTurn(roomId)
    } else if (card.team === currentTeam) {
      checkWinCondition(roomId)
      if (!game.winner) {
        game.guessesLeft -= 1
        if (game.guessesLeft <= 0) {
          switchTurn(roomId)
        }
      }
    }

    io.to(roomId).emit('game:state', { ...game, players: Object.values(game.players) })
  })

  socket.on('turn:pass', ({ roomId, player }) => {
    const game = games[roomId]
    if (!game || !player || player.team !== game.currentTurn || player.role !== 'joueur' || game.turnPhase !== 'guessing' || game.winner) return

    switchTurn(roomId)
    io.to(roomId).emit('game:state', { ...game, players: Object.values(game.players) })
  })

  socket.on('game:reset', ({ roomId }) => {
    const game = games[roomId]
    if (!game) return
    game.phase = 'lobby'
    game.board = []
    game.winner = null
    io.to(roomId).emit('game:state', { ...game, players: Object.values(game.players) })
  })

  socket.on('disconnect', () => {
    // Parcourir toutes les rooms pour voir où était le joueur
    for (const roomId in games) {
      if (games[roomId].players[socket.id]) {
        delete games[roomId].players[socket.id]
        io.to(roomId).emit('game:state', { ...games[roomId], players: Object.values(games[roomId].players) })
        
        // Optionnel: supprimer la partie si elle est vide pour libérer la mémoire
        if (Object.keys(games[roomId].players).length === 0) {
          delete games[roomId]
        }
      }
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Spy-Piece server listening on port ${PORT}`))