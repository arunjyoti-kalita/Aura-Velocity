import { useMemo } from 'react';
import { useApp } from "../../contexts/useApp";
import { timeToTop, GRID_HEIGHT } from '../../utils/dateHelpers';
import { format } from 'date-fns';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export function TaskTimelineOverlay() {
  const { tasks, currentDate, viewMode, setActiveModule } = useApp();
  
  const todayStr = format(currentDate, 'yyyy-MM-dd');
  
  const scheduledTasks = useMemo(() => {
    return tasks.filter(t => t.date === todayStr && t.scheduledTime && !t.completed)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [tasks, todayStr]);

  if (scheduledTasks.length === 0 || viewMode === 'month') return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      <div className="relative w-full h-full">
        {/* Neural Flow Path */}
        {scheduledTasks.length > 1 && (
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {scheduledTasks.map((task, idx) => {
              if (idx === scheduledTasks.length - 1) return null;
              const nextTask = scheduledTasks[idx + 1];
              const y1 = timeToTop(task.scheduledTime);
              const y2 = timeToTop(nextTask.scheduledTime);
              return (
                <line
                  key={`line-${task.id}`}
                  x1="50%"
                  y1={y1}
                  x2="50%"
                  y2={y2}
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="opacity-20 animate-pulse"
                  filter="url(#glow)"
                />
              );
            })}
          </svg>
        )}

        {scheduledTasks.map((task) => {
          const top = timeToTop(task.scheduledTime);
          const isOverdue = !task.completed && (
            new Date().getHours() * 60 + new Date().getMinutes() > 
            (parseInt(task.scheduledTime.split(':')[0]) * 60 + parseInt(task.scheduledTime.split(':')[1]))
          );

          return (
            <div 
              key={task.id}
              className="absolute left-1/2 -translate-x-1/2 pointer-events-auto group z-50"
              style={{ top: `${top}px` }}
            >
              {/* The Glowing Pip */}
              <div 
                onClick={() => setActiveModule('tasks')}
                className={clsx(
                  "w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 cursor-pointer relative",
                  isOverdue 
                    ? "bg-amber-500/20 border-amber-500/50 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]" 
                    : "bg-accent/20 border-accent/40 animate-glow-pulse shadow-[0_0_8px_var(--color-accent)]"
                )}
              >
                {/* Internal Neural Core */}
                <div className={clsx(
                  "absolute inset-0.5 rounded-full",
                  isOverdue ? "bg-amber-500" : "bg-accent"
                )} />
              </div>
              
              {/* Tooltip on Hover */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap bg-black/90 backdrop-blur-xl px-2 py-1.5 rounded-lg border border-white/10 text-[8px] font-black uppercase tracking-widest text-white z-[60] shadow-2xl scale-95 group-hover:scale-100 transition-transform">
                <span className={clsx(
                  "mr-2 px-1 py-0.5 rounded",
                  isOverdue ? "bg-amber-500/20 text-amber-500" : "bg-accent/20 text-accent"
                )}>
                  {task.scheduledTime}
                </span>
                {task.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
