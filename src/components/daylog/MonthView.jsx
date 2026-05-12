import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';

export function MonthView() {
  const { logs, activities, currentDate, setCurrentDate, setViewMode, relationships } = useApp();
  
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Simple padding for Monday-start calendar
    const firstDay = start.getDay(); // 0 = Sun, 1 = Mon
    // JS getDay(): 0 is Sun. We want 0 for Mon.
    const paddingCount = firstDay === 0 ? 6 : firstDay - 1;
    const paddedDays = Array(paddingCount).fill(null).concat(days);
    
    return paddedDays;
  }, [currentDate]);

  const getActivityColor = (activityName) => {
    const activity = activities.find(a => a.name === activityName);
    return activity ? activity.baseColor : '#3b82f6';
  };

  const getDayInteractions = (dateStr) => {
    return relationships.interactions.filter(i => i.date === dateStr).map(i => {
      const person = relationships.people.find(p => p.id === i.personId);
      return { ...i, person };
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-transparent custom-scrollbar overflow-y-auto overflow-x-hidden">
      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-[#131317] py-3 text-center border-b border-white/5">
            <span className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">
              {d}
            </span>
          </div>
        ))}
        {monthDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="bg-[#0c0c10]/40 min-h-[110px]" />;
          
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayLogs = logs.filter(l => l.date === dateStr);
          
          // Unique activities for the day
          const uniqueActs = [...new Set(dayLogs.map(l => l.activityName))];
          
          return (
            <div 
              key={dateStr}
              onClick={() => {
                setCurrentDate(day);
                setViewMode('day');
              }}
              className={clsx(
                "min-h-[110px] bg-[#131317]/80 p-3 flex flex-col group transition-all duration-300 cursor-pointer",
                isToday(day) ? "bg-accent/[0.03] ring-inset ring-1 ring-accent/30" : "hover:bg-white/[0.02]"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={clsx(
                  "text-[11px] font-black font-mono leading-none transition-colors",
                  isToday(day) ? "text-accent" : "text-accent/60 group-hover:text-accent"
                )}>
                  {format(day, 'd')}
                </span>
                {dayLogs.length > 0 && (
                  <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">{dayLogs.length} LOGS</span>
                )}
              </div>

              {/* Interactions Dots */}
              <div className="flex flex-wrap gap-1 mb-2">
                {getDayInteractions(dateStr).map(i => (
                  <div 
                    key={i.id}
                    className="w-1.5 h-1.5 rounded-full shadow-lg group/dot relative"
                    style={{ backgroundColor: i.person?.avatarColor || '#3b82f6' }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a20] border border-white/10 rounded text-[8px] font-black uppercase text-white whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity z-50 pointer-events-none">
                      Contact: {i.person?.name}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 overflow-hidden">
                {uniqueActs.slice(0, 4).map(act => (
                  <div 
                    key={act}
                    className="flex items-center gap-2 group/act"
                  >
                    <div 
                      className="w-1 h-3 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                      style={{ backgroundColor: getActivityColor(act) }}
                    />
                    <span className="text-[9px] font-bold text-gray-500 truncate uppercase tracking-wider group-hover/act:text-gray-300 transition-colors">
                      {act}
                    </span>
                  </div>
                ))}
                {uniqueActs.length > 4 && (
                  <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest mt-1">
                    + {uniqueActs.length - 4} MORE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
