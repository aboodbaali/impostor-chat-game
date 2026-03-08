import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Trophy, Skull, User } from 'lucide-react';

interface GameOverProps {
  room: Room;
  myPlayer?: Player;
  onRestart: () => void;
}

export default function GameOver({ room, myPlayer, onRestart }: GameOverProps) {
  const isWinner = room.winnerIds.includes(myPlayer?.id || '');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto flex flex-col items-center"
      dir="rtl"
    >
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
        isWinner ? 'bg-amber-50' : 'bg-red-50'
      }`}>
        {isWinner ? (
          <Trophy size={48} className="text-amber-500" />
        ) : (
          <Skull size={48} className="text-red-500" />
        )}
      </div>
      
      <h2 className="text-4xl font-bold text-slate-900 mb-2 text-center">
        {isWinner ? 'لقد نجوت!' : 'تم إقصاؤك!'}
      </h2>
      {isWinner && (
        <p className="text-amber-500 text-center mb-2 font-bold text-xl font-arabic">
          مبروك للفائزين! 🎉
        </p>
      )}
      <p className="text-slate-500 text-center mb-10 max-w-md">
        انتهت اللعبة. إليك الهويات الحقيقية لجميع اللاعبين في الغرفة.
      </p>

      <div className="w-full space-y-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-4 border-b border-slate-200 pb-2">النتائج النهائية</h3>
        
        {room.players.map((player) => {
          const isPlayerWinner = room.winnerIds.includes(player.id);
          
          return (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-5 rounded-2xl border ${
                isPlayerWinner 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-500 opacity-75'
              }`}
            >
              <div className="flex items-center gap-4 text-right">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{player.fakeNickname}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      {isPlayerWinner ? 'ناجٍ' : 'مُقصى'}
                    </span>
                  </div>
                  <span className="text-sm mt-1">
                    الاسم الحقيقي: <span className="font-semibold text-slate-700">{player.realName}</span>
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[200px] mt-1">النبذة: {player.bio}</span>
                </div>
              </div>
              {isPlayerWinner ? (
                <Trophy size={24} className="text-amber-500" />
              ) : (
                <Skull size={24} className="text-red-500" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200 w-full text-center shadow-sm">
        <p className="text-slate-500 mb-4">هل تريد اللعب مرة أخرى؟</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {myPlayer?.isHost ? (
            <button
              onClick={onRestart}
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm"
            >
              إعادة اللعب (شخصيات جديدة)
            </button>
          ) : (
            <div className="text-slate-500 py-3 px-8 bg-slate-100 rounded-xl border border-slate-200">
              في انتظار المضيف لإعادة اللعب...
            </div>
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem('flan_room_id');
              window.location.reload();
            }}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm"
          >
            مغادرة الغرفة
          </button>
        </div>
      </div>
    </motion.div>
  );
}
