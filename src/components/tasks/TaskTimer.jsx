import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Flag, Timer, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export function TaskTimer() {
  const [mode, setMode] = useState('stopwatch'); // 'stopwatch' or 'timer'
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // in milliseconds
  const [laps, setLaps] = useState([]);
  const [targetMins, setTargetMins] = useState(25);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const dec = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${dec}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now() - time;
  };

  const handlePause = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    if (mode === 'timer') setTime(targetMins * 60 * 1000);
  };

  const handleLap = () => {
    if (mode === 'stopwatch') {
      setLaps(prev => [time, ...prev].slice(0, 5));
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        
        if (mode === 'timer') {
          const remaining = (targetMins * 60 * 1000) - elapsed;
          if (remaining <= 0) {
            setTime(0);
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play notification sound or something?
          } else {
            setTime(remaining);
          }
        } else {
          setTime(elapsed);
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, targetMins]);

  useEffect(() => {
    if (mode === 'timer' && !isRunning) {
      setTime(targetMins * 60 * 1000);
    } else if (mode === 'flow' && !isRunning) {
      setTime(0);
    }
  }, [mode, targetMins]);

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 h-[62px] shadow-xl animate-in zoom-in-95 duration-300">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5 mb-1 bg-black/20 rounded-md p-0.5">
          <button
            onClick={() => setMode('flow')}
            className={clsx(
              "px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded transition-all",
              mode === 'flow' ? "bg-white/20 text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Flow
          </button>
          <button
            onClick={() => setMode('focus')}
            className={clsx(
              "px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded transition-all",
              mode === 'focus' ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Focus
          </button>
        </div>
        
        <div className={clsx(
          "text-xl font-mono font-black tracking-tight text-white tabular-nums",
          isRunning && "animate-pulse"
        )}>
          {formatTime(time)}
        </div>
      </div>

      <div className="w-[1px] h-8 bg-white/10" />

      <div className="flex flex-col gap-1">
        <button
          onClick={isRunning ? handlePause : handleStart}
          className={clsx(
            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
            isRunning ? "bg-white/10 text-white" : "bg-accent text-bg-base shadow-lg shadow-accent/20"
          )}
        >
          {isRunning ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
        </button>
        <button
          onClick={handleReset}
          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <RotateCcw size={10} />
        </button>
      </div>
    </div>
  );
}
