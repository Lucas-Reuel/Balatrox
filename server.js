// === server.js ===

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

let rooms = {}; // Salva os dados das partidas

app.use(express.static("public")); // Serve arquivos do cliente da pasta 'public'

io.on("connection", (socket) => {
  console.log("Novo jogador conectado", socket.id);

  // Tenta encontrar ou criar sala
  let room = Object.keys(rooms).find((r) => rooms[r].length < 2);
  if (!room) {
    room = `room-${socket.id}`;
    rooms[room] = [];
  }

  rooms[room].push(socket.id);
  socket.join(room);
  socket.room = room;

  console.log(`Jogador ${socket.id} entrou na sala ${room}`);

  if (rooms[room].length === 2) {
    // Começa a partida quando há 2 jogadores
    io.to(room).emit("gameStart", { message: "Partida iniciada!" });
  }

  // Recebe dados da jogada
  socket.on("playedHand", (data) => {
    socket.to(socket.room).emit("opponentPlayed", {
      id: socket.id,
      ...data,
    });
  });

  // Desconexão
  socket.on("disconnect", () => {
    console.log("Jogador saiu:", socket.id);
    if (rooms[socket.room]) {
      rooms[socket.room] = rooms[socket.room].filter((id) => id !== socket.id);
      if (rooms[socket.room].length === 0) delete rooms[socket.room];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
