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
  chatDuration?: number;
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

    socket.on('startGame', ({ roomId, chatDuration }) => {
      const room = rooms[roomId];
      if (!room || room.players.find(p => p.id === socket.id)?.isHost !== true) return;
      
      room.chatDuration = chatDuration || 120;

      startChatPhase(room);
    });

    socket.on('restartGame', (roomId) => {
      const room = rooms[roomId];
      if (!room || room.players.find(p => p.id === socket.id)?.isHost !== true) return;
      
      room.state = 'LOBBY';
      room.chatHistory = [];
      room.timer = 0;
      room.votes = {};
      room.detectiveId = null;
      room.targetId = null;
      room.winnerIds = [];
      room.players.forEach(p => {
        p.isEliminated = false;
      });
      
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
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
      const votesCount = Object.keys(room.votes).filter(voterId => room.players.find(p => p.id === voterId && !p.isEliminated)).length;
      
      if (votesCount >= alivePlayers.length) {
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

      // Check guess (case insensitive and trimmed)
      const safeGuess = (guess || '').trim().toLowerCase();
      const actualName = (target.realName || '').trim().toLowerCase();
      const isCorrect = actualName === safeGuess;
      
      let systemMsg = '';
      if (isCorrect) {
        target.isEliminated = true;
        systemMsg = `🎯 ${detective.fakeNickname} correctly guessed that ${target.fakeNickname} is ${target.realName}! ${target.fakeNickname} is eliminated.`;
      } else {
        detective.isEliminated = true;
        systemMsg = `❌ ${detective.fakeNickname} incorrectly guessed ${target.fakeNickname}'s identity! ${detective.fakeNickname} is eliminated.`;
      }

      addSystemMessage(room, systemMsg);
      
      // Clear interval if any
      if (room.timerInterval) clearInterval(room.timerInterval);

      if (!checkWinCondition(room)) {
        startChatPhase(room);
      }
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
            const player = room.players[playerIndex];
            player.isDisconnected = true;
            if (!player.isEliminated) {
              player.isEliminated = true;
              addSystemMessage(room, `🔌 ${player.fakeNickname} disconnected and was eliminated.`);
              
              if (!checkWinCondition(room)) {
                if (room.state === 'ELIMINATION' && room.detectiveId === player.id) {
                  if (room.timerInterval) clearInterval(room.timerInterval);
                  startChatPhase(room);
                } else if (room.state === 'VOTING') {
                  const alivePlayers = room.players.filter(p => !p.isEliminated);
                  const votesCount = Object.keys(room.votes).filter(voterId => room.players.find(p => p.id === voterId && !p.isEliminated)).length;
                  if (votesCount >= alivePlayers.length) {
                    endVotingPhase(room);
                  } else {
                    io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
                  }
                } else {
                  io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
                }
              }
            }
          }
        }
      }
    });
  });

  // --- Game Logic Helpers ---

  function startChatPhase(room: Room) {
    room.state = 'CHATTING';
    room.timer = room.chatDuration || CHAT_TIME_SECONDS;
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
    
    // Tally votes ONLY for alive players
    const voteCounts: Record<string, number> = {};
    const alivePlayers = room.players.filter(p => !p.isEliminated);
    const aliveIds = new Set(alivePlayers.map(p => p.id));

    for (const voterId in room.votes) {
      if (!aliveIds.has(voterId)) continue;
      const votedId = room.votes[voterId];
      if (!aliveIds.has(votedId)) continue;
      
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    }

    let maxVotes = 0;
    let tiedIds: string[] = [];

    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        tiedIds = [id];
      } else if (count === maxVotes) {
        tiedIds.push(id);
      }
    }

    let detectiveId: string | null = null;

    if (maxVotes > 0) {
      detectiveId = tiedIds[Math.floor(Math.random() * tiedIds.length)];
    }

    if (detectiveId) {
      const detective = room.players.find(p => p.id === detectiveId);
      if (detective) {
        addSystemMessage(room, `📊 Voting ended! ${detective.fakeNickname} received the most votes and is the Detective!`);
        startEliminationPhase(room, detectiveId);
      }
    } else {
      addSystemMessage(room, '🤷 No valid votes were cast! Skipping elimination phase.');
      startChatPhase(room);
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
          addSystemMessage(room, `⏰ ${detective.fakeNickname} ran out of time and was eliminated!`);
        }
        if (!checkWinCondition(room)) {
          startChatPhase(room);
        }
      }
    }, 1000);
  }

  function checkWinCondition(room: Room): boolean {
    const alivePlayers = room.players.filter(p => !p.isEliminated);
    
    if (alivePlayers.length <= 2) {
      room.state = 'GAME_OVER';
      room.winnerIds = alivePlayers.map(p => p.id);
      if (room.timerInterval) clearInterval(room.timerInterval);
      
      const winnerNames = alivePlayers.map(p => `${p.fakeNickname} (${p.realName})`).join(' and ');
      addSystemMessage(room, `🏆 Game Over! The survivors are: ${winnerNames || 'No one'}.`);
      
      io.to(room.id).emit('roomUpdated', getSanitizedRoom(room));
      return true;
    }
    return false;
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
