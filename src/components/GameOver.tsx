import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Trophy, Skull, User } from 'lucide-react';

interface GameOverProps {
  room: Room;
  myPlayer?: Player;
}

export default function GameOver({ room, myPlayer }: GameOverProps) {
  const isWinner = room.winnerIds.includes(myPlayer?.id || '');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto flex flex-col items-center"
    >
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
        isWinner ? 'bg-amber-500/20' : 'bg-red-500/20'
      }`}>
        {isWinner ? (
          <Trophy size={48} className="text-amber-500" />
        ) : (
          <Skull size={48} className="text-red-500" />
        )}
      </div>
      
      <h2 className="text-4xl font-bold text-zinc-100 mb-2 text-center">
        {isWinner ? 'You Survived!' : 'You Were Eliminated!'}
      </h2>
      <p className="text-zinc-400 text-center mb-10 max-w-md">
        The game has ended. Here are the true identities of everyone in the room.
      </p>

      <div className="w-full space-y-4">
        <h3 className="text-xl font-semibold text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Final Standings</h3>
        
        {room.players.map((player) => {
          const isPlayerWinner = room.winnerIds.includes(player.id);
          
          return (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-5 rounded-2xl border ${
                isPlayerWinner 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-100' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-75'
              }`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{player.fakeNickname}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {isPlayerWinner ? 'Survivor' : 'Eliminated'}
                    </span>
                  </div>
                  <span className="text-sm mt-1">
                    Real Name: <span className="font-semibold text-zinc-300">{player.realName}</span>
                  </span>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px] mt-1">Bio: {player.bio}</span>
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

      <div className="mt-10 p-6 bg-zinc-950 rounded-2xl border border-zinc-800 w-full text-center">
        <p className="text-zinc-400 mb-4">Want to play again?</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 px-8 rounded-xl transition-colors"
        >
          Return to Home
        </button>
      </div>
    </motion.div>
  );
}
