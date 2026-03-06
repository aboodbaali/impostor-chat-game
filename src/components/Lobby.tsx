import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { Users, Crown, Copy, Check, User } from 'lucide-react';
import { useState } from 'react';

interface LobbyProps {
  room: Room;
  myPlayer?: Player;
  onStart: (chatDuration: number) => void;
}

export default function Lobby({ room, myPlayer, onStart }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [chatDuration, setChatDuration] = useState(120);

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-2xl mx-auto"
    >
      <div className="flex flex-col items-center mb-10">
        <h2 className="text-2xl font-semibold text-slate-500 mb-2">Room Code</h2>
        <div 
          onClick={copyRoomId}
          className="flex items-center gap-4 bg-slate-50 px-8 py-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-sky-500/50 transition-colors group shadow-sm"
        >
          <span className="text-5xl font-mono tracking-widest text-sky-500 font-bold">
            {room.id}
          </span>
          {copied ? <Check className="text-sky-500" /> : <Copy className="text-slate-400 group-hover:text-sky-500 transition-colors" />}
        </div>
        <p className="text-sm text-slate-500 mt-3">Share this code with your friends</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2 text-slate-700">
            <Users size={20} className="text-sky-500" />
            Players ({room.players.length})
          </h3>
          <span className="text-sm text-slate-500">Min 3 players recommended</span>
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
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {isMe && player.photoUrl ? (
                    <img src={player.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{isMe ? player.fakeNickname : `Player ${index + 1}`}</span>
                  {isMe && <span className="text-xs text-slate-500 truncate max-w-[150px]">{player.bio}</span>}
                  {!isMe && <span className="text-xs text-slate-400 italic">Hidden until game starts</span>}
                </div>
              </div>
              {player.isHost && <Crown size={16} className="text-amber-400" />}
            </div>
          )})}
        </div>
      </div>

      {myPlayer?.isHost ? (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-500 mb-2">Chat Phase Duration</label>
            <select 
              value={chatDuration} 
              onChange={(e) => setChatDuration(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value={30}>30 Seconds</option>
              <option value={60}>1 Minute</option>
              <option value={120}>2 Minutes</option>
              <option value={300}>5 Minutes</option>
              <option value={600}>10 Minutes</option>
              <option value={900}>15 Minutes</option>
            </select>
          </div>
          <button
            onClick={() => onStart(chatDuration)}
            disabled={room.players.length < 2} // Allow 2 for testing, ideally 3
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-md"
          >
            {room.players.length < 2 ? 'Waiting for players...' : 'Start Game'}
          </button>
        </div>
      ) : (
        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
          Waiting for host to start the game...
        </div>
      )}
    </motion.div>
  );
}
