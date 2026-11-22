import express from 'express'
import { Server } from 'socket.io'
import http from 'node:http'


const app = express()


app.use(express.static(import.meta.dirname))

const httpServer = http.createServer(app)

const io = new Server(httpServer)

app.get('/socket/socket.js', (_, res) => {
  res.redirect('/socket.io/socket.io.js')
})


io.of('/news').on('connection', (socket) => {
  console.log('[server] receive', socket)
  socket.emit('message', 'hello client')
  socket.on('message', msg => {
    console.log('[server] receive msg', msg)
    socket.send('[server] ', msg)
  })
})


httpServer.listen(3000)
// app.listen(8080)