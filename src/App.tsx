import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import JoinCreate from './components/JoinCreate';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import Voting from './components/Voting';
import Elimination from './components/Elimination';
import GameOver from './components/GameOver';
import CharacterCreation from './components/CharacterCreation';
import { playSound } from './utils/sounds';

import { Skull, RefreshCw } from 'lucide-react';

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
  isReady?: boolean;
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
  allRealNames: string[];
}

let socket: Socket;

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [savedSession, setSavedSession] = useState<{roomId: string, playerId: string} | null>(null);

  useEffect(() => {
    // Generate or retrieve persistent player ID
    let pid = sessionStorage.getItem('flan_player_id');
    if (!pid) {
      pid = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('flan_player_id', pid);
    }
    setPlayerId(pid);

    // Check for saved session
    const savedRoomId = sessionStorage.getItem('flan_room_id');
    if (savedRoomId && pid) {
      setSavedSession({ roomId: savedRoomId, playerId: pid });
    }

    socket = io();

    socket.on('roomUpdated', (updatedRoom: Room) => {
      setRoom(prev => {
        if (prev && prev.state !== updatedRoom.state) {
          if (updatedRoom.state === 'CHATTING') playSound('start');
          if (updatedRoom.state === 'GAME_OVER') {
            const isWinner = updatedRoom.winnerIds.includes(pid!);
            playSound(isWinner ? 'win' : 'lose');
          }
        }
        return updatedRoom;
      });
      setTimer(updatedRoom.timer);
    });

    socket.on('timerUpdate', (newTimer: number) => {
      setTimer(newTimer);
      if (newTimer === 20) {
        playSound('tick');
      }
    });

    socket.on('newMessage', (message: Message) => {
      setRoom((prev) => {
        if (!prev) return prev;
        if (!message.isSystem && message.senderId !== pid) {
          playSound('message');
        }
        return {
          ...prev,
          chatHistory: [...prev.chatHistory, message],
        };
      });
    });

    socket.on('ejected', () => {
      setRoom(null);
      setError('لقد تم طردك من الغرفة بواسطة المضيف.');
      sessionStorage.removeItem('flan_room_id');
      setSavedSession(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = (realName: string, fakeNickname: string, bio: string, photoUrl: string) => {
    socket.emit('createRoom', { playerId, realName, fakeNickname, bio, photoUrl }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
        setError('');
        sessionStorage.setItem('flan_room_id', res.roomId);
      } else {
        setError(res.message || 'فشل في إنشاء الغرفة');
      }
    });
  };

  const handleJoinRoom = (roomId: string, realName: string, fakeNickname: string, bio: string, photoUrl: string) => {
    socket.emit('joinRoom', { roomId, playerId, realName, fakeNickname, bio, photoUrl }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
        setError('');
        sessionStorage.setItem('flan_room_id', res.roomId);
      } else {
        setError(res.message || 'فشل في الانضمام للغرفة');
      }
    });
  };

  const handleReconnect = () => {
    if (savedSession) {
      socket.emit('reconnectRoom', { roomId: savedSession.roomId, playerId: savedSession.playerId }, (res: any) => {
        if (res.success) {
          setRoom(res.room);
          setError('');
        } else {
          setError(res.message || 'فشل في إعادة الاتصال');
          setSavedSession(null);
          sessionStorage.removeItem('flan_room_id');
        }
      });
    }
  };

  const handleClearSession = () => {
    setSavedSession(null);
    sessionStorage.removeItem('flan_room_id');
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

  const handleEjectPlayer = (targetPlayerId: string) => {
    if (room && myPlayer?.isHost) {
      socket.emit('ejectPlayer', { roomId: room.id, targetPlayerId });
    }
  };

  const handleUpdateCharacter = (fakeNickname: string, bio: string, photoUrl: string) => {
    if (room) {
      socket.emit('updateCharacter', { roomId: room.id, fakeNickname, bio, photoUrl });
    }
  };

  const handleSendMessage = (text: string) => {
    if (room) {
      socket.emit('sendMessage', { roomId: room.id, text });
    }
  };

  const handleVote = (votedId: string) => {
    if (room) {
      playSound('vote');
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

  const myPlayer = room?.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-3xl flex-1 flex flex-col">
        <header className="mb-8 text-center">
          <img 
            src="https://i.ibb.co/kgm6Rjvs/logo.png" 
            alt="فلان" 
            className="w-40 h-40 mx-auto mb-4 rounded-full shadow-md object-cover bg-white border-4 border-white" 
          />
          {(!room || room.state === 'LOBBY') && (
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
          )}
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

        {!room && savedSession && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md mx-auto w-full text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 font-arabic" dir="rtl">لديك جلسة سابقة في الغرفة {savedSession.roomId}</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReconnect}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> إعادة الاتصال بالغرفة
              </button>
              <button
                onClick={handleClearSession}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
              >
                الدخول لغرفة جديدة
              </button>
            </div>
          </div>
        )}

        {!room && !savedSession && (
          <JoinCreate onCreate={handleCreateRoom} onJoin={handleJoinRoom} />
        )}

        {room && room.state === 'LOBBY' && !myPlayer?.isReady && (
          <CharacterCreation room={room} myPlayer={myPlayer!} onSubmit={handleUpdateCharacter} onEject={handleEjectPlayer} />
        )}

        {room && room.state === 'LOBBY' && myPlayer?.isReady && (
          <Lobby room={room} myPlayer={myPlayer} onStart={handleStartGame} onEject={handleEjectPlayer} />
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
