const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
const characters = require('./data/characters.json')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

app.use(cors())

const CARD_COUNT = 25

const shuffle = (list) =>
  [...list].sort(() => Math.random() - 0.5)

const createMockBoard = () =>
  shuffle(characters)
    .slice(0, CARD_COUNT)
    .map((character, index) => ({
      ...character,
      cardId: index + 1,
      revealed: false,
    }))

app.get('/health', (_, res) => {
  res.json({ status: 'ok' })
})

io.on('connection', (socket) => {
  socket.emit('board:state', createMockBoard())
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Spy-Piece server listening on port ${PORT}`)
})
