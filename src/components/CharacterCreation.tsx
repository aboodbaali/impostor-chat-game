import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, User, CheckCircle2, Clock, UserMinus } from 'lucide-react';
import { Room, Player } from '../App';

interface CharacterCreationProps {
  room: Room;
  myPlayer: Player;
  onSubmit: (fakeNickname: string, bio: string, photoUrl: string) => void;
  onEject?: (playerId: string) => void;
}

export default function CharacterCreation({ room, myPlayer, onSubmit, onEject }: CharacterCreationProps) {
  const [fakeNickname, setFakeNickname] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setPhotoUrl(compressedDataUrl);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(fakeNickname, bio, photoUrl);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl w-full"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 font-arabic" dir="rtl">تجهيز شخصية جديدة</h2>
          <p className="text-slate-500 mt-2 font-arabic" dir="rtl">أنت في الغرفة {room.id}. قم بإنشاء شخصية جديدة للجولة القادمة.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div className="flex justify-center mb-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500/50 hover:bg-slate-100/50 transition-all overflow-hidden relative group"
            >
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={20} className="text-white" />
                  </div>
                </>
              ) : (
                <>
                  <User size={24} className="text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">صورة</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">الاسم المستعار الجديد</label>
            <input
              type="text"
              required
              value={fakeNickname}
              onChange={(e) => setFakeNickname(e.target.value)}
              placeholder="مثال: المحقق كونان"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">نبذة قصيرة (للتمويه)</label>
            <textarea
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="أحب القطط والبرمجة..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-xl transition-colors mt-4 shadow-md"
          >
            أنا جاهز
          </button>
        </form>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full"
        dir="rtl"
      >
        <h3 className="text-lg font-medium mb-4 text-slate-700">حالة اللاعبين</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {room.players.map((player) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-3 rounded-xl border ${
                player.isReady 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span className="font-medium">{player.realName}</span>
              <div className="flex items-center gap-2">
                {player.isReady ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 size={16} /> جاهز
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Clock size={16} /> يجهز شخصيته...
                  </div>
                )}
                {myPlayer?.isHost && player.id !== myPlayer.id && onEject && (
                  <button 
                    onClick={() => onEject(player.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-2"
                    title="طرد اللاعب"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
