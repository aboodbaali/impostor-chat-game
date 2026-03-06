import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';

const PORT = 3000;

// --- Types ---
type GameState = 'LOBBY' | 'CHATTING' | 'VOTING' | 'ELIMINATION' | 'GAME_OVER';

interface Player {
  id: string; // socket.id
  realName: string;
  fakeNickname: string;
  bio: string;
  photoUrl?: string;
  isHost: boolean;
  isEliminated: boolean;
  isDisconnected?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

interface Room {
  id: string;
  state: GameState;
  players: Player[];
  chatHistory: Message[];
  timer: number;
  timerInterval?: NodeJS.Timeout;
  votes: Record<string, string>; // voterId -> votedId
  detectiveId: string | null;
  targetId: string | null;
  winnerIds: string[];
}

// --- State ---
const rooms: Record<string, Room> = {};

// --- Constants ---
const CHAT_TIME_SECONDS = 120; // 2 minutes for testing
const VOTING_TIME_SECONDS = 30;
const ELIMINATION_TIME_SECONDS = 45;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
    maxHttpBufferSize: 1e7, // 10MB
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', ({ realName, fakeNickname, bio, photoUrl }, callback) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const player: Player = {
        id: socket.id,
        realName,
        fakeNickname,
        bio,
        photoUrl,
        isHost: true,
        isEliminated: false,
      };

      rooms[roomId] = {
        id: roomId,
        state: 'LOBBY',
        players: [player],
        chatHistory: [],
        timer: 0,
        votes: {},
        detectiveId: null,
        targetId: null,
        winnerIds: [],
      };

      socket.join(roomId);
      callback({ success: true, roomId, room: getSanitizedRoom(rooms[roomId], socket.id) });
    });

    socket.on('joinRoom', ({ roomId, realName, fakeNickname, bio, photoUrl }, callback) => {
      const room = rooms[roomId];
      if (!room) {
        return callback({ success: false, message: 'Room not found' });
      }
      if (room.state !== 'LOBBY') {
        return callback({ success: false, message: 'Game already in progress' });
      }
      if (room.players.some(p => p.fakeNickname === fakeNickname)) {
        return callback({ success: false, message: 'Nickname already taken in this room' });
      }

      const player: Player = {
        id: socket.id,
        realName,
        fakeNickname,
        bio,
        photoUrl,
        isHost: room.players.length === 0,
        isEliminated: false,
      };

      room.players.push(player);
      socket.join(roomId);
      
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
      callback({ success: true, roomId, room: getSanitizedRoom(room, socket.id) });
    });

    socket.on('startGame', (roomId) => {
      const room = rooms[roomId];
      if (!room || room.players.find(p => p.id === socket.id)?.isHost !== true) return;
      
      if (room.players.length < 3) {
        // For testing, we can allow 2, but let's enforce 3 for real game, or just allow 2 for easier testing.
        // Let's allow 2 for testing purposes.
      }

      startChatPhase(room);
    });

    socket.on('sendMessage', ({ roomId, text }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'CHATTING') return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.isEliminated) return;

      const message: Message = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: player.fakeNickname,
        text,
        timestamp: Date.now(),
        isSystem: false,
      };

      room.chatHistory.push(message);
      io.to(roomId).emit('newMessage', message);
    });

    socket.on('vote', ({ roomId, votedId }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'VOTING') return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.isEliminated) return;

      room.votes[socket.id] = votedId;
      
      // Check if everyone alive has voted
      const alivePlayers = room.players.filter(p => !p.isEliminated);
      if (Object.keys(room.votes).length === alivePlayers.length) {
        endVotingPhase(room);
      } else {
        io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
      }
    });

    socket.on('detectiveSelectTarget', ({ roomId, targetId }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'ELIMINATION' || room.detectiveId !== socket.id) return;
      
      room.targetId = targetId;
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
    });

    socket.on('detectiveGuess', ({ roomId, guess }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'ELIMINATION' || room.detectiveId !== socket.id || !room.targetId) return;
      
      const target = room.players.find(p => p.id === room.targetId);
      const detective = room.players.find(p => p.id === room.detectiveId);
      
      if (!target || !detective) return;

      // Check guess (case insensitive)
      const isCorrect = target.realName.toLowerCase() === guess.toLowerCase();
      
      let systemMsg = '';
      if (isCorrect) {
        target.isEliminated = true;
        systemMsg = `${detective.fakeNickname} correctly guessed that ${target.fakeNickname} is ${target.realName}! ${target.fakeNickname} is eliminated.`;
      } else {
        detective.isEliminated = true;
        systemMsg = `${detective.fakeNickname} incorrectly guessed ${target.fakeNickname}'s identity! ${detective.fakeNickname} is eliminated.`;
      }

      addSystemMessage(room, systemMsg);
      
      // Clear interval if any
      if (room.timerInterval) clearInterval(room.timerInterval);

      checkWinCondition(room);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Handle player disconnect
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
          if (room.state === 'LOBBY') {
            room.players.splice(playerIndex, 1);
            if (room.players.length === 0) {
              delete rooms[roomId];
            } else {
              // Reassign host if needed
              if (!room.players.some(p => p.isHost)) {
                room.players[0].isHost = true;
              }
              io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
            }
          } else {
            // Mark as disconnected but keep in game
            room.players[playerIndex].isDisconnected = true;
            room.players[playerIndex].isEliminated = true; // Effectively eliminated
            addSystemMessage(room, `${room.players[playerIndex].fakeNickname} disconnected and was eliminated.`);
            checkWinCondition(room);
          }
        }
      }
    });
  });

  // --- Game Logic Helpers ---

  function startChatPhase(room: Room) {
    room.state = 'CHATTING';
    room.timer = CHAT_TIME_SECONDS;
    room.votes = {};
    room.detectiveId = null;
    room.targetId = null;
    
    addSystemMessage(room, 'The chat phase has started. Try to figure out who is who!');
    
    io.to(room.id).emit('roomUpdated', getSanitizedRoom(room));

    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
      room.timer--;
      io.to(room.id).emit('timerUpdate', room.timer);
      
      if (room.timer <= 0) {
        clearInterval(room.timerInterval);
        startVotingPhase(room);
      }
    }, 1000);
  }

  function startVotingPhase(room: Room) {
    room.state = 'VOTING';
    room.timer = VOTING_TIME_SECONDS;
    room.votes = {};
    
    addSystemMessage(room, 'Time is up! Vote for who you think is the most suspicious.');
    io.to(room.id).emit('roomUpdated', getSanitizedRoom(room));

    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
      room.timer--;
      io.to(room.id).emit('timerUpdate', room.timer);
      
      if (room.timer <= 0) {
        clearInterval(room.timerInterval);
        endVotingPhase(room);
      }
    }, 1000);
  }

  function endVotingPhase(room: Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    
    // Tally votes
    const voteCounts: Record<string, number> = {};
    for (const voterId in room.votes) {
      const votedId = room.votes[voterId];
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    }

    let maxVotes = 0;
    let detectiveId: string | null = null;
    let tie = false;

    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        detectiveId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }

    // If tie or no votes, pick random alive player
    if (tie || !detectiveId) {
      const alivePlayers = room.players.filter(p => !p.isEliminated);
      if (alivePlayers.length > 0) {
        detectiveId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
        addSystemMessage(room, 'The vote was a tie (or no votes). A detective was chosen at random.');
      }
    }

    if (detectiveId) {
      const detective = room.players.find(p => p.id === detectiveId);
      if (detective) {
        addSystemMessage(room, `${detective.fakeNickname} has been chosen as the Detective!`);
        startEliminationPhase(room, detectiveId);
      }
    } else {
      // Should not happen unless everyone is dead
      checkWinCondition(room);
    }
  }

  function startEliminationPhase(room: Room, detectiveId: string) {
    room.state = 'ELIMINATION';
    room.detectiveId = detectiveId;
    room.targetId = null;
    room.timer = ELIMINATION_TIME_SECONDS;

    io.to(room.id).emit('roomUpdated', getSanitizedRoom(room));

    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
      room.timer--;
      io.to(room.id).emit('timerUpdate', room.timer);
      
      if (room.timer <= 0) {
        clearInterval(room.timerInterval);
        // Detective ran out of time, they are eliminated
        const detective = room.players.find(p => p.id === detectiveId);
        if (detective) {
          detective.isEliminated = true;
          addSystemMessage(room, `${detective.fakeNickname} ran out of time and was eliminated!`);
        }
        checkWinCondition(room);
      }
    }, 1000);
  }

  function checkWinCondition(room: Room) {
    const alivePlayers = room.players.filter(p => !p.isEliminated);
    
    if (alivePlayers.length <= 2) {
      room.state = 'GAME_OVER';
      room.winnerIds = alivePlayers.map(p => p.id);
      
      const winnerNames = alivePlayers.map(p => `${p.fakeNickname} (${p.realName})`).join(' and ');
      addSystemMessage(room, `Game Over! The survivors are: ${winnerNames || 'No one'}.`);
      
      io.to(room.id).emit('roomUpdated', getSanitizedRoom(room));
    } else {
      // Start next round
      setTimeout(() => {
        startChatPhase(room);
      }, 5000); // 5 second pause before next round
      
      io.to(room.id).emit('roomUpdated', getSanitizedRoom(room));
    }
  }

  function addSystemMessage(room: Room, text: string) {
    const message: Message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: 'system',
      senderName: 'System',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    room.chatHistory.push(message);
    io.to(room.id).emit('newMessage', message);
  }

  // Sanitize room data to hide real names from clients
  function getSanitizedRoom(room: Room, requestingPlayerId?: string) {
    return {
      ...room,
      timerInterval: undefined, // Don't send the interval object
      players: room.players.map(p => ({
        id: p.id,
        fakeNickname: p.fakeNickname,
        bio: p.bio,
        photoUrl: p.photoUrl,
        isHost: p.isHost,
        isEliminated: p.isEliminated,
        isDisconnected: p.isDisconnected,
        // Only send realName if game is over, or if it's the requesting player's own data
        realName: (room.state === 'GAME_OVER' || p.id === requestingPlayerId) ? p.realName : undefined,
      })),
    };
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
