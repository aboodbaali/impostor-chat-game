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
      className="flex flex-col h-[80vh] w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 font-bold text-lg overflow-hidden shrink-0 border border-sky-100">
            {myPlayer?.photoUrl ? (
              <img src={myPlayer.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              myPlayer?.fakeNickname.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{myPlayer?.fakeNickname}</h2>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">{myPlayer?.bio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Clock size={16} className={timer < 30 ? 'text-red-500 animate-pulse' : 'text-sky-500'} />
          <span className={`font-mono font-bold ${timer < 30 ? 'text-red-500' : 'text-sky-500'}`}>
            {formatTime(timer)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {room.chatHistory.map((msg, idx) => {
          const isMe = msg.senderId === myPlayer?.id;
          const sender = room.players.find(p => p.id === msg.senderId);
          
          if (msg.isSystem) {
            return (
              <div key={idx} className="flex justify-center my-4">
                <span className="bg-slate-100 text-slate-500 text-xs px-4 py-2 rounded-full border border-slate-200">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <div 
                  className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-sky-500 transition-all mt-auto"
                  onClick={() => setSelectedPlayerId(msg.senderId)}
                >
                  {sender?.photoUrl ? (
                    <img src={sender.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{msg.senderName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              )}
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span 
                    className="text-xs text-slate-500 mb-1 ml-2 cursor-pointer hover:text-sky-500 transition-colors"
                    onClick={() => setSelectedPlayerId(msg.senderId)}
                  >
                    {msg.senderName}
                  </span>
                )}
                <div 
                  className={`max-w-[280px] sm:max-w-[400px] px-5 py-3 rounded-2xl ${
                    isMe 
                      ? 'bg-sky-500 text-white rounded-tr-sm shadow-sm' 
                      : 'bg-white text-slate-700 rounded-tl-sm border border-slate-200 shadow-sm'
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
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm"
            disabled={myPlayer?.isEliminated}
          />
          <button
            type="submit"
            disabled={!message.trim() || myPlayer?.isEliminated}
            className="bg-sky-500 hover:bg-sky-400 disabled:bg-slate-200 disabled:text-slate-400 text-white p-3 rounded-xl transition-colors flex items-center justify-center shadow-sm"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedPlayerId(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-full max-w-sm relative"
          >
            <button 
              onClick={() => setSelectedPlayerId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden mb-4 border-4 border-white shadow-md">
                {selectedPlayer.photoUrl ? (
                  <img src={selectedPlayer.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-slate-400" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{selectedPlayer.fakeNickname}</h3>
              <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4 text-left">
                <span className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-1 block">Bio / Hint</span>
                <p className="text-slate-600 text-sm leading-relaxed">{selectedPlayer.bio}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
