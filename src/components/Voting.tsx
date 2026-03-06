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
      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto flex flex-col items-center"
    >
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={40} className="text-red-500" />
      </div>
      
      <h2 className="text-3xl font-bold text-zinc-100 mb-2 text-center">Voting Phase</h2>
      <p className="text-zinc-400 text-center mb-8 max-w-md">
        Time is up! Who do you think is acting suspicious? Vote for the player you want to become the Detective.
      </p>

      <div className="flex items-center gap-3 bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 mb-10">
        <Clock size={20} className={timer < 10 ? 'text-red-500 animate-pulse' : 'text-emerald-500'} />
        <span className={`text-2xl font-mono font-bold ${timer < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
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
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : isMe 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{player.fakeNickname}</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[150px]">{player.bio}</span>
                </div>
              </div>
              {isVoted && <Vote size={24} className="text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {myPlayer?.isEliminated && (
        <div className="mt-8 text-zinc-500 bg-zinc-950 px-6 py-3 rounded-xl border border-zinc-800">
          You are eliminated and cannot vote.
        </div>
      )}
    </motion.div>
  );
}
