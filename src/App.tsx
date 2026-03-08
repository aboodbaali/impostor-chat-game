import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import JoinCreate from './components/JoinCreate';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import Voting from './components/Voting';
import Elimination from './components/Elimination';
import GameOver from './components/GameOver';
import CharacterCreation from './components/CharacterCreation';
import MiniGame from './components/MiniGame';
import { playSound } from './utils/sounds';

import { Skull, RefreshCw, Moon, Sun } from 'lucide-react';

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

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
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
  miniGame?: {
    type: 'TRIVIA';
    currentQuestion: TriviaQuestion;
    scores: Record<string, number>;
    answered: Record<string, number>;
    phase: 'QUESTION' | 'REVEAL';
    askedQuestions: number[];
    questionEndTime?: number;
  };
}

let socket: Socket;

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [savedSession, setSavedSession] = useState<{roomId: string, playerId: string} | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('flan_dark_mode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('flan_dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

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

    socket.on('connect', () => {
      setIsConnected(true);
      const savedRoomId = sessionStorage.getItem('flan_room_id');
      const savedPlayerId = sessionStorage.getItem('flan_player_id');
      if (savedRoomId && savedPlayerId) {
        socket.emit('reconnectRoom', { roomId: savedRoomId, playerId: savedPlayerId }, (res: any) => {
          if (res.success) {
            setRoom(res.room);
            setTimer(res.room.timer);
            setError('');
          } else {
            setRoom(null);
            setError('انتهت اللعبة أو تم إغلاق الغرفة.');
            sessionStorage.removeItem('flan_room_id');
            setSavedSession(null);
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

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

  const handleMiniGameAnswer = (optionIndex: number) => {
    if (room) {
      socket.emit('miniGameAnswer', { roomId: room.id, optionIndex });
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center p-4 sm:p-8 transition-colors duration-300">
      <div className="w-full max-w-3xl flex-1 flex flex-col">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <header className="mb-8 text-center">
          <img 
            src="https://i.ibb.co/kgm6Rjvs/logo.png" 
            alt="فلان" 
            className="w-40 h-40 mx-auto mb-4 rounded-full shadow-md object-cover bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-700" 
          />
          {(!room || room.state === 'LOBBY') && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 max-w-2xl mx-auto shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 font-arabic" dir="rtl">💬 طريقة اللعب الأساسية:</h3>
              <ul className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed text-right font-arabic space-y-3" dir="rtl">
                <li className="flex gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span><strong>الدخول للعبة:</strong> كل لاعب يكتب اسمه المستعار ونبذة قصيرة عن شخصيته.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span><strong>بداية الجولة:</strong> تظهر للجميع فقط الأسماء المستعارة والنبذات، ويبدأ الجميع بالدردشة النصية.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span><strong>مرحلة التخمين:</strong> كل لاعب يحاول يكتشف من هو الشخص الحقيقي خلف كل اسم مستعار من طريقة كلامه.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span><strong>التصويت:</strong> كل دقيقتين يبدأ تصويت، وكل لاعب يصوت على الاسم الذي يشك فيه.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-sky-500 font-bold">•</span>
                  <span><strong>اللاعب الأعلى تصويتاً:</strong> هو الوحيد الذي يختار لاعباً ويخمن هويته الحقيقية.</span>
                </li>
              </ul>
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-right font-arabic" dir="rtl">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">النتيجة:</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex gap-2 items-center">
                    <span className="text-emerald-500">✅</span>
                    <span>إذا توقع صح ← يخرج الشخص الذي تم كشفه، ويبقى اللاعب الذي خمّن صح في اللعبة.</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <span className="text-rose-500">❌</span>
                    <span>إذا توقع خطأ ← يخرج هو من الجولة.</span>
                  </li>
                </ul>
                <p className="mt-3 text-sky-600 dark:text-sky-400 font-bold text-center">🎯 تستمر الجولات حتى يبقى لاعبان فقط في النهاية.</p>
              </div>
            </div>
          )}
        </header>

        {!isConnected && room && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse" dir="rtl">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm font-bold">جاري إعادة الاتصال...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-center shadow-sm">
            {error}
          </div>
        )}

        {myPlayer?.isEliminated && room?.state !== 'GAME_OVER' && room?.state !== 'LOBBY' && (
          <>
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-center flex items-center justify-center gap-2 animate-pulse shadow-sm">
              <Skull size={18} />
              <span className="font-arabic" dir="rtl">لقد تم إقصاؤك! أنت الآن في وضع المشاهدة. حظاً أوفر في الجولة القادمة!</span>
            </div>
            <MiniGame room={room} myPlayer={myPlayer} onAnswer={handleMiniGameAnswer} />
          </>
        )}

        {!room && savedSession && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl max-w-md mx-auto w-full text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 font-arabic" dir="rtl">لديك جلسة سابقة في الغرفة {savedSession.roomId}</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReconnect}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> إعادة الاتصال بالغرفة
              </button>
              <button
                onClick={handleClearSession}
                className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors"
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
