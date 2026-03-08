import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';

const PORT = 3000;

// --- Types ---
type GameState = 'LOBBY' | 'CHATTING' | 'VOTING' | 'ELIMINATION' | 'GAME_OVER';

interface Player {
  id: string; // Persistent player ID from client
  socketId: string; // Current socket ID
  realName: string;
  fakeNickname: string;
  bio: string;
  photoUrl?: string;
  isHost: boolean;
  isEliminated: boolean;
  isDisconnected?: boolean;
  isReady?: boolean;
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
  allRealNames: string[]; // For the detective dropdown
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

    socket.on('createRoom', ({ playerId, realName, fakeNickname, bio, photoUrl }, callback) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const player: Player = {
        id: playerId || socket.id,
        socketId: socket.id,
        realName,
        fakeNickname,
        bio,
        photoUrl,
        isHost: true,
        isEliminated: false,
        isDisconnected: false,
        isReady: true,
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
        allRealNames: [realName],
      };

      socket.join(roomId);
      callback({ success: true, roomId, room: getSanitizedRoom(rooms[roomId], player.id) });
    });

    socket.on('joinRoom', ({ roomId, playerId, realName, fakeNickname, bio, photoUrl }, callback) => {
      const room = rooms[roomId];
      if (!room) {
        return callback({ success: false, message: 'الغرفة غير موجودة' });
      }
      if (room.state !== 'LOBBY') {
        return callback({ success: false, message: 'اللعبة بدأت بالفعل' });
      }
      if (room.players.some(p => p.fakeNickname === fakeNickname)) {
        return callback({ success: false, message: 'الاسم المستعار مستخدم في هذه الغرفة' });
      }

      const player: Player = {
        id: playerId || socket.id,
        socketId: socket.id,
        realName,
        fakeNickname,
        bio,
        photoUrl,
        isHost: room.players.length === 0,
        isEliminated: false,
        isDisconnected: false,
        isReady: true,
      };

      room.players.push(player);
      room.allRealNames.push(realName);
      socket.join(roomId);
      
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
      callback({ success: true, roomId, room: getSanitizedRoom(room, player.id) });
    });

    socket.on('reconnectRoom', ({ roomId, playerId }, callback) => {
      const room = rooms[roomId];
      if (!room) {
        return callback({ success: false, message: 'الغرفة غير موجودة' });
      }
      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        return callback({ success: false, message: 'اللاعب غير موجود في هذه الغرفة' });
      }

      player.socketId = socket.id;
      player.isDisconnected = false;
      socket.join(roomId);
      
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
      callback({ success: true, roomId, room: getSanitizedRoom(room, player.id) });
    });

    socket.on('startGame', ({ roomId, chatDuration }) => {
      const room = rooms[roomId];
      if (!room || room.players.find(p => p.socketId === socket.id)?.isHost !== true) return;
      
      room.chatDuration = chatDuration || 120;

      startChatPhase(room);
    });

    socket.on('restartGame', (roomId) => {
      const room = rooms[roomId];
      if (!room || room.players.find(p => p.socketId === socket.id)?.isHost !== true) return;
      
      room.state = 'LOBBY';
      room.chatHistory = [];
      room.timer = 0;
      room.votes = {};
      room.detectiveId = null;
      room.targetId = null;
      room.winnerIds = [];
      room.allRealNames = room.players.map(p => p.realName);
      room.players.forEach(p => {
        p.isEliminated = false;
        p.isReady = false;
        p.fakeNickname = '';
        p.bio = '';
      });
      
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
    });

    socket.on('updateCharacter', ({ roomId, fakeNickname, bio, photoUrl }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'LOBBY') return;
      
      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      player.fakeNickname = fakeNickname;
      player.bio = bio;
      player.photoUrl = photoUrl;
      player.isReady = true;
      
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
    });

    socket.on('ejectPlayer', ({ roomId, targetPlayerId }) => {
      const room = rooms[roomId];
      if (!room) return;
      
      const host = room.players.find(p => p.socketId === socket.id);
      if (!host || !host.isHost) return;

      const targetIndex = room.players.findIndex(p => p.id === targetPlayerId);
      if (targetIndex === -1) return;

      const targetPlayer = room.players[targetIndex];
      
      // Notify the ejected player
      io.to(targetPlayer.socketId).emit('ejected');
      
      // Remove player from room
      room.players.splice(targetIndex, 1);
      room.allRealNames = room.players.map(p => p.realName);
      
      if (room.players.length === 0) {
        delete rooms[roomId];
      } else {
        addSystemMessage(room, `🚪 تم طرد ${targetPlayer.fakeNickname || targetPlayer.realName} من الغرفة.`);
        io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
        
        // If in voting phase, check if we need to end it early
        if (room.state === 'VOTING') {
          const alivePlayers = room.players.filter(p => !p.isEliminated && !p.isDisconnected);
          const votesCount = Object.keys(room.votes).filter(voterId => room.players.find(p => p.id === voterId && !p.isEliminated && !p.isDisconnected)).length;
          if (votesCount >= alivePlayers.length && alivePlayers.length > 0) {
            endVotingPhase(room);
          }
        }
        
        // Check win condition if in game
        if (room.state !== 'LOBBY' && room.state !== 'GAME_OVER') {
          checkWinCondition(room);
        }
      }
    });

    socket.on('sendMessage', ({ roomId, text }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'CHATTING') return;
      
      const player = room.players.find(p => p.socketId === socket.id);
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
      
      const player = room.players.find(p => p.socketId === socket.id);
      if (!player || player.isEliminated) return;

      room.votes[player.id] = votedId;
      
      // Check if everyone alive has voted
      const alivePlayers = room.players.filter(p => !p.isEliminated && !p.isDisconnected);
      const votesCount = Object.keys(room.votes).filter(voterId => room.players.find(p => p.id === voterId && !p.isEliminated && !p.isDisconnected)).length;
      
      if (votesCount >= alivePlayers.length) {
        endVotingPhase(room);
      } else {
        io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
      }
    });

    socket.on('detectiveSelectTarget', ({ roomId, targetId }) => {
      const room = rooms[roomId];
      const player = room.players.find(p => p.socketId === socket.id);
      if (!room || room.state !== 'ELIMINATION' || !player || room.detectiveId !== player.id) return;
      
      room.targetId = targetId;
      io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
    });

    socket.on('detectiveGuess', ({ roomId, guess }) => {
      const room = rooms[roomId];
      const player = room.players.find(p => p.socketId === socket.id);
      if (!room || room.state !== 'ELIMINATION' || !player || room.detectiveId !== player.id || !room.targetId) return;
      
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
        systemMsg = `🎯 خمن ${detective.fakeNickname} بشكل صحيح أن ${target.fakeNickname} هو ${target.realName}! تم إقصاء ${target.fakeNickname}.`;
      } else {
        detective.isEliminated = true;
        systemMsg = `❌ أخطأ ${detective.fakeNickname} في تخمين هوية ${target.fakeNickname}! تم إقصاء ${detective.fakeNickname}.`;
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
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        
        if (playerIndex !== -1) {
          if (room.state === 'LOBBY') {
            room.players.splice(playerIndex, 1);
            room.allRealNames = room.players.map(p => p.realName);
            if (room.players.length === 0) {
              delete rooms[roomId];
            } else {
              if (!room.players.some(p => p.isHost)) {
                room.players[0].isHost = true;
              }
              io.to(roomId).emit('roomUpdated', getSanitizedRoom(room));
            }
          } else {
            const player = room.players[playerIndex];
            player.isDisconnected = true;
            addSystemMessage(room, `🔌 ${player.fakeNickname} فقد الاتصال.`);
            
            if (room.state === 'ELIMINATION' && room.detectiveId === player.id) {
              if (room.timerInterval) clearInterval(room.timerInterval);
              addSystemMessage(room, `⏰ فقد المحقق ${player.fakeNickname} الاتصال!`);
              startChatPhase(room);
            } else if (room.state === 'VOTING') {
              const alivePlayers = room.players.filter(p => !p.isEliminated && !p.isDisconnected);
              const votesCount = Object.keys(room.votes).filter(voterId => room.players.find(p => p.id === voterId && !p.isEliminated && !p.isDisconnected)).length;
              if (votesCount >= alivePlayers.length && alivePlayers.length > 0) {
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
    });
  });

  // --- Game Logic Helpers ---

  function startChatPhase(room: Room) {
    room.state = 'CHATTING';
    room.timer = room.chatDuration || CHAT_TIME_SECONDS;
    room.votes = {};
    room.detectiveId = null;
    room.targetId = null;
    
    addSystemMessage(room, 'بدأت مرحلة الدردشة. حاول معرفة هويات الآخرين!');
    
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
    
    addSystemMessage(room, 'انتهى الوقت! صوّت للشخص الذي تشك فيه.');
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
    const alivePlayers = room.players.filter(p => !p.isEliminated && !p.isDisconnected);
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
        addSystemMessage(room, `📊 انتهى التصويت! حصل ${detective.fakeNickname} على أعلى عدد من الأصوات وأصبح المحقق!`);
        startEliminationPhase(room, detectiveId);
      }
    } else {
      addSystemMessage(room, '🤷 لم يتم التصويت لأحد! تم تخطي مرحلة الإقصاء.');
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
          addSystemMessage(room, `⏰ انتهى وقت ${detective.fakeNickname} وتم إقصاؤه!`);
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
      
      const winnerNames = alivePlayers.map(p => `${p.fakeNickname} (${p.realName})`).join(' و ');
      addSystemMessage(room, `🏆 انتهت اللعبة! الناجون هم: ${winnerNames || 'لا أحد'}.`);
      
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
        isReady: p.isReady,
        // Only send realName if game is over, in lobby, or if it's the requesting player's own data
        realName: (room.state === 'GAME_OVER' || room.state === 'LOBBY' || p.id === requestingPlayerId) ? p.realName : undefined,
      })),
      allRealNames: room.allRealNames ? [...room.allRealNames].sort() : [],
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
