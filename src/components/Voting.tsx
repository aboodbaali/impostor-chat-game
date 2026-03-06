import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Vote, Clock, AlertTriangle, User } from 'lucide-react';

interface VotingProps {
  room: Room;
  myPlayer?: Player;
  timer: number;
  onVote: (votedId: string) => void;
}

export default function Voting({ room, myPlayer, timer, onVote }: VotingProps) {
  const alivePlayers = room.players.filter(p => !p.isEliminated);
  const myVote = room.votes[myPlayer?.id || ''];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto flex flex-col items-center"
    >
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={40} className="text-red-500" />
      </div>
      
      <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Voting Phase</h2>
      <p className="text-slate-500 text-center mb-8 max-w-md">
        Time is up! Who do you think is acting suspicious? Vote for the player you want to become the Detective.
      </p>

      <div className="flex items-center gap-3 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200 mb-10 shadow-sm">
        <Clock size={20} className={timer < 10 ? 'text-red-500 animate-pulse' : 'text-sky-500'} />
        <span className={`text-2xl font-mono font-bold ${timer < 10 ? 'text-red-500' : 'text-sky-500'}`}>
          {formatTime(timer)}
        </span>
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {alivePlayers.map((player) => {
          const isMe = player.id === myPlayer?.id;
          const isVoted = myVote === player.id;
          
          return (
            <button
              key={player.id}
              onClick={() => !isMe && !myPlayer?.isEliminated && onVote(player.id)}
              disabled={isMe || myPlayer?.isEliminated}
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                isVoted 
                  ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-[0_0_15px_rgba(14,165,233,0.2)]' 
                  : isMe 
                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{player.fakeNickname}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[150px]">{player.bio}</span>
                </div>
              </div>
              {isVoted && <Vote size={24} className="text-sky-500" />}
            </button>
          );
        })}
      </div>

      {myPlayer?.isEliminated && (
        <div className="mt-8 text-slate-500 bg-slate-50 px-6 py-3 rounded-xl border border-slate-200">
          You are eliminated and cannot vote.
        </div>
      )}
    </motion.div>
  );
}
