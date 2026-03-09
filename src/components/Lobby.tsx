import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Users, Crown, Copy, Check, User, CheckCircle2, Clock, UserMinus } from 'lucide-react';
import { useState } from 'react';

interface LobbyProps {
  room: Room;
  myPlayer?: Player;
  onStart: (chatDuration: number) => void;
  onEject?: (playerId: string) => void;
}

export default function Lobby({ room, myPlayer, onStart, onEject }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [chatDuration, setChatDuration] = useState(120);

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allReady = room.players.every(p => p.isReady);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto"
      dir="rtl"
    >
      <div className="flex flex-col items-center mb-10">
        <h2 className="text-2xl font-semibold text-slate-500 mb-2">رمز الغرفة</h2>
        <div 
          onClick={copyRoomId}
          className="flex items-center gap-4 bg-slate-50 px-8 py-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-sky-500/50 transition-colors group shadow-sm"
          dir="ltr"
        >
          <span className="text-5xl font-mono tracking-widest text-sky-500 font-bold">
            {room.id}
          </span>
          {copied ? <Check className="text-sky-500" /> : <Copy className="text-slate-400 group-hover:text-sky-500 transition-colors" />}
        </div>
        <p className="text-sm text-slate-500 mt-3">شارك هذا الرمز مع أصدقائك</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2 text-slate-700">
            <Users size={20} className="text-sky-500" />
            اللاعبون ({room.players.length})
          </h3>
          <span className="text-sm text-slate-500">يفضل 3 لاعبين كحد أدنى</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {room.players.map((player, index) => {
            const isMe = player.id === myPlayer?.id;
            return (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isMe 
                  ? 'bg-sky-50 border-sky-200 text-sky-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-medium text-lg">{player.realName}</span>
                  <div className="flex items-center gap-1 mt-1">
                    {player.isReady ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> جاهز</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Clock size={12} /> يجهز شخصيته...</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {myPlayer?.isHost && !isMe && onEject && (
                  <button 
                    onClick={() => onEject(player.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="طرد اللاعب"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
                {player.isHost && <Crown size={16} className="text-amber-400" />}
              </div>
            </div>
          )})}
        </div>
      </div>

      {myPlayer?.isHost ? (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-slate-700">مدة مرحلة الدردشة</label>
              <span className="text-sky-600 font-bold bg-sky-100 px-3 py-1 rounded-lg">
                {chatDuration >= 60 ? `${Math.floor(chatDuration / 60)} دقيقة` : `${chatDuration} ثانية`}
                {chatDuration % 60 > 0 && chatDuration >= 60 ? ` و ${chatDuration % 60} ثانية` : ''}
              </span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="900" 
              step="30"
              value={chatDuration} 
              onChange={(e) => setChatDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              dir="ltr"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2" dir="ltr">
              <span>30s</span>
              <span>15m</span>
            </div>
          </div>
          <button
            onClick={() => onStart(chatDuration)}
            disabled={room.players.length < 2 || !allReady}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-md"
          >
            {room.players.length < 2 ? 'في انتظار اللاعبين...' : !allReady ? 'في انتظار تجهيز الشخصيات...' : 'بدء اللعبة'}
          </button>
        </div>
      ) : (
        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
          {allReady ? 'في انتظار المضيف لبدء اللعبة...' : 'في انتظار بقية اللاعبين لتجهيز شخصياتهم...'}
        </div>
      )}
    </motion.div>
  );
}
