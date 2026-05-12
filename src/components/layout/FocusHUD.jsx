import { useState, useEffect, useMemo } from 'react';
import { useApp } from "../../contexts/useApp";
import { format, differenceInSeconds, parseISO } from 'date-fns';
import { Play, Pause, X, ChevronUp, ChevronDown, Zap, Target } from 'lucide-react';
import clsx from 'clsx';

export function FocusHUD() {
  const { logs, activities } = useApp();
  const [isMinimized, setIsMinimized] = useState(false);

  const currentLog = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return null;
    const now = new Date();
    const timeStr = format(now, 'HH:mm');
    const dateStr = format(now, 'yyyy-MM-dd');
    
    return logs.find(l => {
      if (!l || l.date !== dateStr || !l.startTime) return false;
      try {
        const [sh, sm] = l.startTime.split(':').map(Number);
        const [eh, em] = (l.endTime || l.startTime).split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return false;
        
        const startTotal = sh * 60 + sm;
        const endTotal = eh * 60 + em;
        const nowTotal = now.getHours() * 60 + now.getMinutes();
        return nowTotal >= startTotal && nowTotal < endTotal;
      } catch (e) {
        return false;
      }
    });
  }, [logs]);

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!currentLog) return;

    const timer = setInterval(() => {
      try {
        const now = new Date();
        const endTimeStr = currentLog.endTime || currentLog.startTime;
        if (!endTimeStr || typeof endTimeStr !== 'string' || !endTimeStr.includes(':')) {
          setTimeLeft('--');
          return;
        }
        const [eh, em] = endTimeStr.split(':').map(Number);
        const end = new Date();
        end.setHours(eh, em, 0, 0);

        const diff = differenceInSeconds(end, now);
        if (diff <= 0) {
          setTimeLeft('Cycle Complete');
          return;
        }

        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setTimeLeft(`${mins}m ${secs.toString().padStart(2, '0')}s`);
      } catch (e) {
        setTimeLeft('--');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentLog]);

  if (!currentLog) return null;

  const activity = (activities || []).find(a => a.name === currentLog.activityName) || activities?.[0] || { baseColor: '#3b82f6' };

  return (
    <div className={clsx(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-500 ease-out",
      isMinimized ? "translate-y-16" : "translate-y-0"
    )}>
      <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(var(--color-accent),0.1)] group">
        
        {/* Activity Identity */}
        <div className="flex items-center gap-3 pr-6 border-r border-white/5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ 
              backgroundColor: `${activity?.baseColor || '#3b82f6'}33`, 
              border: `1px solid ${activity?.baseColor || '#3b82f6'}4D` 
            }}
          >
            <Target size={20} style={{ color: activity?.baseColor || '#3b82f6' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 leading-none mb-1">Current Stream</span>
            <span className="text-sm font-black text-white leading-none truncate max-w-[120px]">
              {currentLog.activityName}
            </span>
          </div>
        </div>

        {/* Timer HUD */}
        <div className="flex flex-col items-center min-w-[100px]">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-accent mb-1">Remaining</span>
          <span className="text-xl font-black text-white font-mono tracking-tighter leading-none">
            {timeLeft}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 pl-4">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-colors"
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Floating Indicator when Minimized */}
        {isMinimized && (
          <button 
            onClick={() => setIsMinimized(false)}
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-accent text-bg-base px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-bounce shadow-xl"
          >
            Show Stream
          </button>
        )}
      </div>
    </div>
  );
}
