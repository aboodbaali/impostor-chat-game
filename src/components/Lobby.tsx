import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Users, Crown, Copy, Check, User } from 'lucide-react';
import { useState } from 'react';

interface LobbyProps {
  room: Room;
  myPlayer?: Player;
  onStart: () => void;
}

export default function Lobby({ room, myPlayer, onStart }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto"
    >
      <div className="flex flex-col items-center mb-10">
        <h2 className="text-2xl font-semibold text-zinc-400 mb-2">Room Code</h2>
        <div 
          onClick={copyRoomId}
          className="flex items-center gap-4 bg-zinc-950 px-8 py-4 rounded-2xl border border-zinc-800 cursor-pointer hover:border-emerald-500/50 transition-colors group"
        >
          <span className="text-5xl font-mono tracking-widest text-emerald-400 font-bold">
            {room.id}
          </span>
          {copied ? <Check className="text-emerald-500" /> : <Copy className="text-zinc-500 group-hover:text-emerald-500 transition-colors" />}
        </div>
        <p className="text-sm text-zinc-500 mt-3">Share this code with your friends</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Users size={20} className="text-emerald-500" />
            Players ({room.players.length})
          </h3>
          <span className="text-sm text-zinc-500">Min 3 players recommended</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {room.players.map((player, index) => {
            const isMe = player.id === myPlayer?.id;
            return (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isMe 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {isMe && player.photoUrl ? (
                    <img src={player.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{isMe ? player.fakeNickname : `Player ${index + 1}`}</span>
                  {isMe && <span className="text-xs text-zinc-500 truncate max-w-[150px]">{player.bio}</span>}
                  {!isMe && <span className="text-xs text-zinc-600 italic">Hidden until game starts</span>}
                </div>
              </div>
              {player.isHost && <Crown size={16} className="text-amber-400" />}
            </div>
          )})}
        </div>
      </div>

      {myPlayer?.isHost ? (
        <button
          onClick={onStart}
          disabled={room.players.length < 2} // Allow 2 for testing, ideally 3
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold py-4 rounded-xl transition-colors text-lg"
        >
          {room.players.length < 2 ? 'Waiting for players...' : 'Start Game'}
        </button>
      ) : (
        <div className="text-center p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400">
          Waiting for host to start the game...
        </div>
      )}
    </motion.div>
  );
}
