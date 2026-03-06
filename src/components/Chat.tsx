import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, Player } from '../App';
import { Send, Clock, User, X } from 'lucide-react';

interface ChatProps {
  room: Room;
  myPlayer?: Player;
  timer: number;
  onSendMessage: (text: string) => void;
}

export default function Chat({ room, myPlayer, timer, onSendMessage }: ChatProps) {
  const [message, setMessage] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedPlayer = room.players.find(p => p.id === selectedPlayerId);

  return (
    <>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[80vh] w-full max-w-4xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg overflow-hidden shrink-0">
            {myPlayer?.photoUrl ? (
              <img src={myPlayer.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              myPlayer?.fakeNickname.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-semibold text-zinc-100">{myPlayer?.fakeNickname}</h2>
            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{myPlayer?.bio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
          <Clock size={16} className={timer < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-500'} />
          <span className={`font-mono font-bold ${timer < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatTime(timer)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-900/50">
        {room.chatHistory.map((msg, idx) => {
          const isMe = msg.senderId === myPlayer?.id;
          const sender = room.players.find(p => p.id === msg.senderId);
          
          if (msg.isSystem) {
            return (
              <div key={idx} className="flex justify-center my-4">
                <span className="bg-zinc-800/50 text-zinc-400 text-xs px-4 py-2 rounded-full border border-zinc-700/50">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <div 
                  className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all mt-auto"
                  onClick={() => setSelectedPlayerId(msg.senderId)}
                >
                  {sender?.photoUrl ? (
                    <img src={sender.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-zinc-400">{msg.senderName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              )}
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span 
                    className="text-xs text-zinc-500 mb-1 ml-2 cursor-pointer hover:text-emerald-400 transition-colors"
                    onClick={() => setSelectedPlayerId(msg.senderId)}
                  >
                    {msg.senderName}
                  </span>
                )}
                <div 
                  className={`max-w-[280px] sm:max-w-[400px] px-5 py-3 rounded-2xl ${
                    isMe 
                      ? 'bg-emerald-600 text-white rounded-tr-sm' 
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700/50'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            disabled={myPlayer?.isEliminated}
          />
          <button
            type="submit"
            disabled={!message.trim() || myPlayer?.isEliminated}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 p-3 rounded-xl transition-colors flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </motion.div>

    <AnimatePresence>
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedPlayerId(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm relative"
          >
            <button 
              onClick={() => setSelectedPlayerId(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden mb-4 border-4 border-zinc-950 shadow-lg">
                {selectedPlayer.photoUrl ? (
                  <img src={selectedPlayer.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-zinc-500" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-1">{selectedPlayer.fakeNickname}</h3>
              <div className="w-full bg-zinc-950 rounded-xl p-4 border border-zinc-800 mt-4 text-left">
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1 block">Bio / Hint</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{selectedPlayer.bio}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
