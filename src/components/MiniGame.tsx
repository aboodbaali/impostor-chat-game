import { motion } from 'motion/react';
import { Room, Player } from '../App';
import { BrainCircuit, Check, X, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MiniGameProps {
  room: Room;
  myPlayer: Player;
  onAnswer: (optionIndex: number) => void;
}

export default function MiniGame({ room, myPlayer, onAnswer }: MiniGameProps) {
  if (!myPlayer.isEliminated || !room.miniGame || room.miniGame.type !== 'TRIVIA') return null;

  const { currentQuestion, scores, answered, phase, questionEndTime } = room.miniGame;
  const question = currentQuestion;
  const hasAnswered = answered[myPlayer.id] !== undefined;
  const myAnswer = answered[myPlayer.id];

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (phase === 'QUESTION' && questionEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((questionEndTime - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, questionEndTime]);

  // Sort players by score
  const scoreboard = Object.entries(scores)
    .map(([id, score]) => {
      const p = room.players.find(p => p.id === id);
      return { id, name: p?.realName || p?.fakeNickname || 'لاعب', score };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl w-full max-w-md mx-auto mt-6"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BrainCircuit className="text-sky-500" />
          تحدي المعلومات (للمقصيين)
        </h3>
        <div className="flex items-center gap-3">
          {phase === 'QUESTION' && (
            <div className={`flex items-center gap-1 text-sm font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
              <Clock size={16} />
              <span>{timeLeft}</span>
            </div>
          )}
          <div className="text-sm font-bold text-sky-500 bg-sky-50 dark:bg-sky-900/30 px-3 py-1 rounded-full">
            نقاطك: {scores[myPlayer.id] || 0}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4 text-center leading-relaxed">
          {question.question}
        </h4>
        
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option, index) => {
            const isSelected = myAnswer === index;
            const isCorrect = question.correctIndex === index;
            
            let buttonClass = "p-4 rounded-xl border-2 text-right font-medium transition-all ";
            
            if (phase === 'REVEAL') {
              if (isCorrect) {
                buttonClass += "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400";
              } else if (isSelected) {
                buttonClass += "bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-700 dark:text-rose-400";
              } else {
                buttonClass += "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-50";
              }
            } else {
              if (isSelected) {
                buttonClass += "bg-sky-50 dark:bg-sky-900/30 border-sky-500 text-sky-700 dark:text-sky-400";
              } else {
                buttonClass += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-600 cursor-pointer";
              }
            }

            return (
              <button
                key={index}
                onClick={() => !hasAnswered && phase === 'QUESTION' && onAnswer(index)}
                disabled={hasAnswered || phase === 'REVEAL'}
                className={buttonClass}
              >
                <div className="flex justify-between items-center">
                  <span>{option}</span>
                  {phase === 'REVEAL' && isCorrect && <Check size={20} className="text-emerald-500" />}
                  {phase === 'REVEAL' && isSelected && !isCorrect && <X size={20} className="text-rose-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {phase === 'REVEAL' && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400 animate-pulse mb-4">
          السؤال التالي سيبدأ قريباً...
        </div>
      )}

      {scoreboard.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          <h5 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">لوحة الشرف:</h5>
          <div className="flex flex-wrap gap-2">
            {scoreboard.map((p, i) => (
              <div key={p.id} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                <span className="font-bold">{i === 0 ? '👑' : ''} {p.name}</span>
                <span className="text-sky-500 font-bold">({p.score})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
