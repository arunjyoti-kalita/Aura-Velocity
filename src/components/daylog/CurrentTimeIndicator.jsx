import { useState, useEffect, memo } from 'react';
import { timeToTop, GRID_END_HOUR } from '../../utils/dateHelpers';
import { format } from 'date-fns';

export const CurrentTimeIndicator = memo(function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();

  // Hide if outside grid range
  let adjustedH = h < 8 ? h + 24 : h;
  if (adjustedH < 8 || adjustedH >= GRID_END_HOUR) return null;

  const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const top = timeToTop(timeStr);

  return (
    <div
      className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
      style={{ top: `${top}px` }}
    >
      <div className="w-14 flex flex-shrink-0 justify-end pr-1">
        <div className="bg-accent text-white px-1.5 py-1 rounded text-[10px] font-bold shadow-[0_0_10px_rgba(var(--color-accent),0.4)] whitespace-nowrap leading-none">
          {format(now, 'h:mm a')}
        </div>
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] -ml-[3px] z-10" />
      <div className="flex-1 h-px bg-accent relative opacity-80">
        <div className="absolute inset-0 bg-accent blur-sm opacity-30 h-1 -translate-y-[1.5px]" />
      </div>
    </div>
  );
});
