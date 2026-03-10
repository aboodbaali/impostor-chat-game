import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Upload, User } from 'lucide-react';

interface JoinCreateProps {
  onCreate: (realName: string, fakeNickname: string, bio: string, photoUrl: string) => void;
  onJoin: (roomId: string, realName: string, fakeNickname: string, bio: string, photoUrl: string) => void;
}

export default function JoinCreate({ onCreate, onJoin }: JoinCreateProps) {
  const [mode, setMode] = useState<'JOIN' | 'CREATE'>('JOIN');
  const [roomId, setRoomId] = useState(() => sessionStorage.getItem('flan_rejoin_room_id') || '');
  const [realName, setRealName] = useState('');
  const [fakeNickname, setFakeNickname] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem('flan_rejoin_room_id')) {
      setMode('JOIN');
      sessionStorage.removeItem('flan_rejoin_room_id');
    }
  }, []);

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
    if (mode === 'CREATE') {
      onCreate(realName, fakeNickname, bio, photoUrl);
    } else {
      onJoin(roomId, realName, fakeNickname, bio, photoUrl);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl max-w-md mx-auto w-full"
    >
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setMode('JOIN')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'JOIN' ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Users size={18} /> الانضمام لغرفة
        </button>
        <button
          onClick={() => setMode('CREATE')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'CREATE' ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <UserPlus size={18} /> إنشاء غرفة
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {mode === 'JOIN' && (
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">رمز الغرفة</label>
            <input
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="مثال: 123456"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 uppercase text-left"
              dir="ltr"
            />
          </div>
        )}

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
          <label className="block text-sm font-medium text-slate-500 mb-1">اسمك الحقيقي</label>
          <input
            type="text"
            required
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="مثال: أحمد"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">الاسم المستعار</label>
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
          {mode === 'JOIN' ? 'انضمام للعبة' : 'إنشاء لعبة'}
        </button>
      </form>
    </motion.div>
  );
}
