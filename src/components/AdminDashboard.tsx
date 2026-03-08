import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Users, LayoutGrid, Activity, ShieldAlert, RefreshCw, Clock } from 'lucide-react';

interface AdminStats {
  totalConnections: number;
  totalRooms: number;
  totalPlayers: number;
  rooms: {
    id: string;
    state: string;
    playerCount: number;
    timer: number;
  }[];
}

interface AdminDashboardProps {
  token: string;
}

let socket: Socket;

export default function AdminDashboard({ token }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    socket = io();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('admin:authenticate', token, (res: any) => {
        if (res.success) {
          setStats(res.stats);
          setError('');
        } else {
          setError('رمز الدخول غير صحيح (Unauthorized)');
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('admin:stats', (newStats: AdminStats) => {
      setStats(newStats);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4" dir="rtl">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-400 mb-2">خطأ في المصادقة</h1>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4" dir="rtl">
        <RefreshCw size={48} className="text-sky-500 animate-spin mb-4" />
        <h1 className="text-xl font-bold text-slate-300">جاري الاتصال بالسيرفر...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-sky-500" size={32} />
            <h1 className="text-2xl font-bold">لوحة تحكم المالك</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-400">{isConnected ? 'متصل' : 'غير متصل'}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-sky-500/20 p-4 rounded-xl text-sky-400">
              <Activity size={32} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">الاتصالات النشطة (Sockets)</p>
              <p className="text-3xl font-bold">{stats.totalConnections}</p>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-emerald-500/20 p-4 rounded-xl text-emerald-400">
              <LayoutGrid size={32} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">إجمالي الغرف</p>
              <p className="text-3xl font-bold">{stats.totalRooms}</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-amber-500/20 p-4 rounded-xl text-amber-400">
              <Users size={32} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">إجمالي اللاعبين</p>
              <p className="text-3xl font-bold">{stats.totalPlayers}</p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <LayoutGrid className="text-slate-400" />
          الغرف النشطة
        </h2>
        
        {stats.rooms.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            لا توجد غرف نشطة حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.rooms.map(room => (
              <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-lg font-bold text-sky-400">#{room.id}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    room.state === 'LOBBY' ? 'bg-slate-700 text-slate-300' :
                    room.state === 'GAME_OVER' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {room.state}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{room.playerCount} لاعبين</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{room.timer} ث</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
