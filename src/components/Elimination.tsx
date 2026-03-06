import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Search, Target, Clock, User } from 'lucide-react';

interface EliminationProps {
  room: Room;
  myPlayer?: Player;
  timer: number;
  onSelectTarget: (targetId: string) => void;
  onGuess: (guess: string) => void;
}

export default function Elimination({ room, myPlayer, timer, onSelectTarget, onGuess }: EliminationProps) {
  const [guess, setGuess] = useState('');
  
  const isDetective = room.detectiveId === myPlayer?.id;
  const alivePlayers = room.players.filter(p => !p.isEliminated);
  const targetPlayer = room.players.find(p => p.id === room.targetId);
  const detectivePlayer = room.players.find(p => p.id === room.detectiveId);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && room.targetId) {
      onGuess(guess);
      setGuess('');
    }
  };

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
      <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
        <Search size={40} className="text-amber-500" />
      </div>
      
      <h2 className="text-3xl font-bold text-zinc-100 mb-2 text-center">Elimination Phase</h2>
      <p className="text-zinc-400 text-center mb-8 max-w-md">
        {isDetective 
          ? "You are the Detective! Select a target and guess their real identity." 
          : `${detectivePlayer?.fakeNickname} is the Detective and is making a guess...`}
      </p>

      <div className="flex items-center gap-3 bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 mb-10">
        <Clock size={20} className={timer < 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'} />
        <span className={`text-2xl font-mono font-bold ${timer < 10 ? 'text-red-400' : 'text-amber-400'}`}>
          {formatTime(timer)}
        </span>
      </div>

      {isDetective ? (
        <div className="w-full">
          <h3 className="text-lg font-medium text-zinc-300 mb-4">Select Target:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {alivePlayers.map((player) => {
              if (player.id === myPlayer?.id) return null;
              
              const isSelected = room.targetId === player.id;
              
              return (
                <button
                  key={player.id}
                  onClick={() => onSelectTarget(player.id)}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
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
                  {isSelected && <Target size={24} className="text-amber-500" />}
                </button>
              );
            })}
          </div>

          {room.targetId && (
            <form onSubmit={handleGuessSubmit} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Guess {targetPlayer?.fakeNickname}'s Real Name:
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={!guess.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Guess
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="w-full text-center">
          {room.targetId ? (
            <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
              <p className="text-xl text-zinc-300 mb-2">
                <span className="font-bold text-amber-400">{detectivePlayer?.fakeNickname}</span> is targeting <span className="font-bold text-red-400">{targetPlayer?.fakeNickname}</span>!
              </p>
              <p className="text-zinc-500 animate-pulse">Waiting for guess...</p>
            </div>
          ) : (
            <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500 animate-pulse">Waiting for {detectivePlayer?.fakeNickname} to select a target...</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
