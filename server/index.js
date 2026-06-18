import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  if (rooms.has(code)) {
    return generateRoomCode();
  }

  return code;
}

function getPublicRoom(room) {
  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    status: room.status,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      character: player.character,
      isHost: player.isHost
    }))
  };
}

app.get("/", (req, res) => {
  res.json({
    message: "Servidor multiplayer Hero Survivor online",
    rooms: rooms.size
  });
});

io.on("connection", (socket) => {
  console.log("Jogador conectado:", socket.id);

  // Echo de ping: responde imediatamente para o cliente medir a latência (RTT).
  socket.on("pingCheck", (callback) => {
    if (typeof callback === "function") callback();
  });

  socket.on("createRoom", ({ playerName, character, maxPlayers }, callback) => {
    const selectedMaxPlayers = Number(maxPlayers);

    if (!selectedMaxPlayers || selectedMaxPlayers < 1 || selectedMaxPlayers > 5) {
      callback({
        success: false,
        message: "A quantidade de jogadores precisa ser entre 1 e 5."
      });
      return;
    }

    const roomCode = generateRoomCode();

    const room = {
      code: roomCode,
      maxPlayers: selectedMaxPlayers,
      status: "waiting",
      hostId: socket.id,
      players: [
        {
          id: socket.id,
          name: playerName || "Jogador",
          character: character || "default",
          isHost: true
        }
      ]
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    callback({
      success: true,
      room: getPublicRoom(room)
    });

    io.to(roomCode).emit("roomUpdated", getPublicRoom(room));

    if (room.players.length === room.maxPlayers) {
      room.status = "playing";
      io.to(roomCode).emit("gameStarting", getPublicRoom(room));
    }
  });

  socket.on("joinRoom", ({ roomCode, playerName, character }, callback) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      callback({
        success: false,
        message: "Sala não encontrada."
      });
      return;
    }

    if (room.status !== "waiting") {
      callback({
        success: false,
        message: "Essa sala já começou."
      });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      callback({
        success: false,
        message: "Essa sala já está cheia."
      });
      return;
    }

    const alreadyInRoom = room.players.some((player) => player.id === socket.id);

    if (alreadyInRoom) {
      callback({
        success: false,
        message: "Você já está nessa sala."
      });
      return;
    }

    room.players.push({
      id: socket.id,
      name: playerName || "Jogador",
      character: character || "default",
      isHost: false
    });

    socket.join(code);

    callback({
      success: true,
      room: getPublicRoom(room)
    });

    io.to(code).emit("roomUpdated", getPublicRoom(room));

    if (room.players.length === room.maxPlayers) {
      room.status = "playing";
      io.to(code).emit("gameStarting", getPublicRoom(room));
    }
  });

  socket.on("leaveRoom", ({ roomCode }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) return;

    room.players = room.players.filter((player) => player.id !== socket.id);
    socket.leave(code);

    if (room.players.length === 0) {
      rooms.delete(code);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    io.to(code).emit("roomUpdated", getPublicRoom(room));
  });

  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);

    for (const [code, room] of rooms.entries()) {
      const playerWasInRoom = room.players.some((player) => player.id === socket.id);

      if (!playerWasInRoom) continue;

      room.players = room.players.filter((player) => player.id !== socket.id);

      if (room.players.length === 0) {
        rooms.delete(code);
        continue;
      }

      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }

      io.to(code).emit("roomUpdated", getPublicRoom(room));
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Servidor multiplayer rodando na porta ${PORT}`);
});