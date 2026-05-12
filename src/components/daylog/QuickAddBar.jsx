import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useApp } from "../../contexts/useApp";
import { format, addMinutes } from 'date-fns';

export function QuickAddBar() {
  const { activities, addLog } = useApp();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle on 'q' or 'Q' if not typing in an input
      if (e.key.toLowerCase() === 'q' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickAdd = (activity) => {
    const now = new Date();
    // Snap to nearest 30 mins backwards for start time
    const minutes = now.getMinutes();
    const snappedMinutes = minutes >= 30 ? 30 : 0;
    const startTimeDate = new Date(now);
    startTimeDate.setMinutes(snappedMinutes, 0, 0);
    
    const endTimeDate = addMinutes(startTimeDate, 30); // 30 min duration

    const newLog = {
      date: format(now, 'yyyy-MM-dd'),
      startTime: format(startTimeDate, 'HH:mm'),
      endTime: format(endTimeDate, 'HH:mm'),
      activityName: activity.name,
      subcategory: null, // default
      notes: '',
      referenceLink: '',
      isRecurring: false,
      recurringType: 'none'
    };

    addLog(newLog);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel p-2 rounded-full flex gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-x-auto max-w-[90vw] custom-scrollbar border-white/10">
      {activities.filter(a => !a.isCustom).map((activity) => (
        <button
          key={activity.name}
          onClick={() => handleQuickAdd(activity)}
          className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] text-white whitespace-nowrap transition-glass hover:scale-[1.03] active:scale-95 border border-white/30"
          style={{ backgroundColor: `${activity.baseColor}B3`, boxShadow: `inset 0 0 10px ${activity.baseColor}` }}
          title={`Quick add 30m ${activity.name}`}
        >
          {activity.name}
        </button>
      ))}
      {/* Include custom ones too */}
      {activities.filter(a => a.isCustom).length > 0 && <div className="w-px bg-white/10 mx-1" />}
      {activities.filter(a => a.isCustom).map((activity) => (
        <button
          key={activity.name}
          onClick={() => handleQuickAdd(activity)}
          className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] text-white whitespace-nowrap transition-glass hover:scale-[1.03] active:scale-95 border border-white/30"
          style={{ backgroundColor: `${activity.baseColor}B3`, boxShadow: `inset 0 0 10px ${activity.baseColor}` }}
          title={`Quick add 30m ${activity.name}`}
        >
          {activity.name}
        </button>
      ))}
    </div>
  );
}
