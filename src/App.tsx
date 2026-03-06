import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import JoinCreate from './components/JoinCreate';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import Voting from './components/Voting';
import Elimination from './components/Elimination';
import GameOver from './components/GameOver';

import { Skull } from 'lucide-react';

export type GameState = 'LOBBY' | 'CHATTING' | 'VOTING' | 'ELIMINATION' | 'GAME_OVER';

export interface Player {
  id: string;
  realName?: string;
  fakeNickname: string;
  bio: string;
  photoUrl?: string;
  isHost: boolean;
  isEliminated: boolean;
  isDisconnected?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

export interface Room {
  id: string;
  state: GameState;
  players: Player[];
  chatHistory: Message[];
  timer: number;
  chatDuration?: number;
  votes: Record<string, string>;
  detectiveId: string | null;
  targetId: string | null;
  winnerIds: string[];
}

let socket: Socket;

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Connect to the same host
    socket = io();

    socket.on('roomUpdated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setTimer(updatedRoom.timer);
    });

    socket.on('timerUpdate', (newTimer: number) => {
      setTimer(newTimer);
    });

    socket.on('newMessage', (message: Message) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chatHistory: [...prev.chatHistory, message],
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = (realName: string, fakeNickname: string, bio: string, photoUrl: string) => {
    socket.emit('createRoom', { realName, fakeNickname, bio, photoUrl }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
        setError('');
      } else {
        setError(res.message || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = (roomId: string, realName: string, fakeNickname: string, bio: string, photoUrl: string) => {
    socket.emit('joinRoom', { roomId, realName, fakeNickname, bio, photoUrl }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
        setError('');
      } else {
        setError(res.message || 'Failed to join room');
      }
    });
  };

  const handleStartGame = (chatDuration: number) => {
    if (room) {
      socket.emit('startGame', { roomId: room.id, chatDuration });
    }
  };

  const handleRestartGame = () => {
    if (room) {
      socket.emit('restartGame', room.id);
    }
  };

  const handleSendMessage = (text: string) => {
    if (room) {
      socket.emit('sendMessage', { roomId: room.id, text });
    }
  };

  const handleVote = (votedId: string) => {
    if (room) {
      socket.emit('vote', { roomId: room.id, votedId });
    }
  };

  const handleSelectTarget = (targetId: string) => {
    if (room) {
      socket.emit('detectiveSelectTarget', { roomId: room.id, targetId });
    }
  };

  const handleGuess = (guess: string) => {
    if (room) {
      socket.emit('detectiveGuess', { roomId: room.id, guess });
    }
  };

  const myPlayer = room?.players.find(p => p.id === socket?.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-3xl flex-1 flex flex-col">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-sky-500 mb-2">فلان</h1>
          <p className="text-slate-500 mb-4 font-medium tracking-widest uppercase">F - L - A - N</p>
          <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-2xl mx-auto shadow-sm">
            <p className="text-slate-700 text-sm leading-relaxed text-right font-arabic" dir="rtl">
             💬 طريقة اللعب الأساسية:

الدخول للعبة: كل لاعب يكتب اسمه المستعار ونبذة قصيرة عن شخصيته.

بداية الجولة: تظهر للجميع فقط الأسماء المستعارة والنبذات، ويبدأ الجميع بالدردشة النصية.

مرحلة التخمين: كل لاعب يحاول يكتشف من هو الشخص الحقيقي خلف كل اسم مستعار من طريقة كلامه.

التصويت: كل دقيقتين يبدأ تصويت، وكل لاعب يصوت على الاسم اللي يشك فيه.

اللاعب الأعلى تصويتًا: هو الوحيد اللي يختار لاعبًا ويخمن هويته الحقيقية.

النتيجة:

إذا توقع صح → يخرج الشخص الذي تم كشفه، ويبقى اللاعب الذي خمّن صح في اللعبة.

إذا توقع خطأ → يخرج هو من الجولة.

🎯 تستمر الجولات حتى يبقى لاعبان فقط في النهاية.
            </p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-center shadow-sm">
            {error}
          </div>
        )}

        {myPlayer?.isEliminated && room?.state !== 'GAME_OVER' && room?.state !== 'LOBBY' && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-center flex items-center justify-center gap-2 animate-pulse shadow-sm">
            <Skull size={18} />
            <span className="font-arabic" dir="rtl">لقد تم إقصاؤك! أنت الآن في وضع المشاهدة. حظاً أوفر في الجولة القادمة!</span>
          </div>
        )}

        {!room && (
          <JoinCreate onCreate={handleCreateRoom} onJoin={handleJoinRoom} />
        )}

        {room && room.state === 'LOBBY' && (
          <Lobby room={room} myPlayer={myPlayer} onStart={handleStartGame} />
        )}

        {room && room.state === 'CHATTING' && (
          <Chat room={room} myPlayer={myPlayer} timer={timer} onSendMessage={handleSendMessage} />
        )}

        {room && room.state === 'VOTING' && (
          <Voting room={room} myPlayer={myPlayer} timer={timer} onVote={handleVote} />
        )}

        {room && room.state === 'ELIMINATION' && (
          <Elimination 
            room={room} 
            myPlayer={myPlayer} 
            timer={timer} 
            onSelectTarget={handleSelectTarget} 
            onGuess={handleGuess} 
          />
        )}

        {room && room.state === 'GAME_OVER' && (
          <GameOver room={room} myPlayer={myPlayer} onRestart={handleRestartGame} />
        )}
      </div>
    </div>
  );
}
