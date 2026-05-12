import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import clsx from 'clsx';
import { Ghost, Zap, Book, Plus, Minus, Save } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import { getWeekDays } from '../../utils/dateHelpers';
import { ChronotypeSelector } from '../layout/ChronotypeSelector';

import { getEnergyLevel, calculateAlignmentScore } from '../../utils/circadian';

export function GridHeader({ viewMode }) {
  const { 
    currentDate, intents, setIntent, logs, chronotype, 
    isGhostMode, toggleGhostMode, setActivePopover, journal,
    setViewMode, setCurrentDate, waterIntake, gulpWater, degulpWater, activities,
    setIsGhostSetupOpen
  } = useApp();
  const days = viewMode === 'week' ? getWeekDays(currentDate) : [currentDate];

  // Calculate daily alignment score
  const dailyBioScore = useMemo(() => {
    try {
      const dayStr = format(currentDate, 'yyyy-MM-dd');
      const todayLogs = logs.filter(l => l.date === dayStr);
      if (todayLogs.length === 0) return null;

      const totalScore = todayLogs.reduce((acc, log) => {
        if (!log || !log.startTime || typeof log.startTime !== 'string') return acc;
        const hour = parseInt(log.startTime.split(':')[0], 10);
        const energy = getEnergyLevel(hour, chronotype);
        return acc + calculateAlignmentScore(log.activityName, energy, activities);
      }, 0);

      return Math.round(totalScore / todayLogs.length);
    } catch (e) {
      console.error("Error calculating daily alignment score:", e);
      return null;
    }
  }, [logs, currentDate, chronotype]);

  return (
    <div className="flex flex-col flex-shrink-0 bg-transparent border-b border-white/5">
      {/* Full-width Intent Row - Structured Frame */}
      {viewMode !== 'month' && (
        <div className="flex items-center pl-[3px] pr-2 h-10 border-b border-white/5 bg-[#0a0a0c]/40 backdrop-blur-md">
          <div className="flex items-center flex-1 px-3 h-8 bg-white/[0.03] border border-white/10 rounded-lg group transition-all hover:bg-white/[0.05] hover:border-white/20">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-heading text-[8px] font-black tracking-[0.2em] text-accent uppercase shrink-0">
                Objective:
              </span>
              <input
                type="text"
                placeholder="DEFINE HIGHEST LEVERAGE ACTION..."
                value={intents[format(currentDate, 'yyyy-MM-dd')]?.text || ''}
                onChange={(e) => setIntent(format(currentDate, 'yyyy-MM-dd'), e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold tracking-widest text-gray-400 placeholder-gray-700 uppercase w-full transition-colors focus:text-white"
              />
            </div>
          </div>
          <div className="ml-4 flex items-center gap-4">
            {dailyBioScore !== null && (
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em]">
                  Bio-Efficiency
                </span>
                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-accent shadow-[0_0_8px_rgba(var(--color-accent),0.5)] transition-all duration-1000"
                    style={{ width: `${dailyBioScore}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-white tracking-tighter">
                  {dailyBioScore}%
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsGhostSetupOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-white/5 text-gray-500 hover:text-white transition-all shadow-sm"
                title="Ghost Setup / Define Ideal Day"
              >
                <Ghost size={14} />
              </button>
              <div className="scale-90 origin-right ml-1">
                <ChronotypeSelector />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode !== 'month' && (
        <div className="flex h-10 bg-[#0a0a0c]/20">
          <div className="w-[42px] flex-shrink-0 border-r border-white/5 flex flex-col items-center justify-center py-1">
            <div className="text-[11px] font-bold text-cyan-400 leading-none mb-1 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
              {waterIntake || 0}
            </div>
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => gulpWater?.()}
                className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-all group"
                title="Gulp (+)"
              >
                <Plus size={10} />
              </button>
              <button 
                onClick={() => degulpWater?.()}
                className="w-4 h-4 rounded-full bg-white/5 border border-white/10 text-white/40 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all group"
                title="Degulp (-)"
              >
                <Minus size={10} />
              </button>
            </div>
          </div>
          <div className="flex flex-1">
            {days.map(day => {
              const active = isToday(day);
              return (
                <div 
                  key={day.toISOString()} 
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                  className={clsx(
                    "flex-1 flex items-center justify-center border-r border-white/5 relative overflow-hidden group cursor-pointer transition-all hover:bg-white/[0.05]",
                    active && "bg-accent/[0.03]"
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <span className={clsx(
                      "font-heading text-[10px] uppercase tracking-[0.1em] font-semibold transition-colors",
                      active ? "text-accent opacity-100" : "text-white/40 opacity-60 group-hover:opacity-100"
                    )}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={clsx(
                      "font-heading text-[12px] font-medium transition-all flex items-center justify-center",
                      active 
                        ? "text-accent opacity-100 w-7 h-7 rounded-full border-2 border-accent shadow-[0_0_10px_rgba(var(--color-accent),0.2)] bg-accent/5" 
                        : "text-white/60 opacity-60 group-hover:opacity-100"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Journal Quick-Write Button */}
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActivePopover({
                        type: 'journal_quick',
                        data: {
                          date: format(day, 'yyyy-MM-dd'),
                          anchorRect: rect
                        }
                      });
                    }}
                    className={clsx(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all group/jbtn",
                      active ? "text-accent hover:bg-accent/10" : "text-gray-700 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="relative">
                      <Book size={12} className="group-hover/jbtn:scale-110 transition-transform" />
                      {journal?.entries?.some(e => e.linkedDate === format(day, 'yyyy-MM-dd')) && (
                        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-accent rounded-full border border-[#0a0a0c]" />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
