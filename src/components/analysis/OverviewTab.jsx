import { useMemo } from 'react';
import { calculateDuration, isDeepWork, isBoondoggle, isComatose } from '../../utils/analysisHelpers';
import { Clock, Zap, Target, Flame } from 'lucide-react';
import { differenceInDays, parseISO, isToday, isYesterday, format, subDays } from 'date-fns';

import { useApp } from "../../contexts/useApp";

export function OverviewTab({ logs, activities }) {
  const { opportunityCost } = useApp();
  const stats = useMemo(() => {
    let totalHours = 0;
    let deepWorkHours = 0;
    let boondoggleHours = 0;
    const activityMap = {};
    const productiveDays = new Set();

    logs.forEach(log => {
      const duration = calculateDuration(log);
      totalHours += duration;

      if (isDeepWork(log, activities)) {
        deepWorkHours += duration;
      }
      if (isBoondoggle(log)) {
        boondoggleHours += duration;
      }

      if (!isBoondoggle(log) && !isComatose(log)) {
        productiveDays.add(log.date);
      }

      if (!activityMap[log.activityName]) {
        activityMap[log.activityName] = 0;
      }
      activityMap[log.activityName] += duration;
    });

    let topActivity = { name: '-', hours: 0 };
    for (const [name, hours] of Object.entries(activityMap)) {
      if (hours > topActivity.hours && name !== 'Comatose') {
        topActivity = { name, hours };
      }
    }

    const deepWorkPct = totalHours > 0 ? (deepWorkHours / totalHours) * 100 : 0;
    const boondogglePct = totalHours > 0 ? (boondoggleHours / totalHours) * 100 : 0;

    // Calculate streak
    let streak = 0;
    let currentCheckDate = new Date();
    
    // Check backwards from today
    while (true) {
      const dateStr = format(currentCheckDate, 'yyyy-MM-dd');
      if (productiveDays.has(dateStr)) {
        streak++;
        currentCheckDate = subDays(currentCheckDate, 1);
      } else {
        // If today has no logs yet, don't break streak if yesterday was productive
        if (streak === 0 && isToday(currentCheckDate)) {
          currentCheckDate = subDays(currentCheckDate, 1);
        } else {
          break;
        }
      }
    }

    return {
      totalHours,
      topActivity,
      deepWorkPct,
      boondogglePct,
      streak
    };
  }, [logs, activities]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Total Hours Logged" 
        value={stats.totalHours.toFixed(1)} 
        suffix="hrs" 
        icon={Clock} 
        color="text-blue-400" 
      />
      
      <StatCard 
        title="Top Activity" 
        value={stats.topActivity.name} 
        subtitle={`${stats.topActivity.hours.toFixed(1)} hrs`}
        icon={Zap} 
        color="text-yellow-400" 
      />
      
      <StatCard 
        title="Deep Work vs Boondoggle" 
        value={`${Math.round(stats.deepWorkPct)}%`} 
        subtitle={`vs ${Math.round(stats.boondogglePct)}%`}
        icon={Target} 
        color="text-accent" 
      />
      
      <StatCard 
        title="Current Streak" 
        value={stats.streak} 
        suffix="days" 
        icon={Flame} 
        color="text-orange-500" 
      />

      {/* THE HOOK: Opportunity Cost Traded Counter */}
      {opportunityCost.totalHours > 0 && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
              <Zap size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-red-400/80 uppercase tracking-[0.2em] mb-0.5">The Cost of Distraction</h3>
              <p className="text-sm font-bold text-white/90 leading-tight">
                This week, you've traded <span className="text-red-500">{opportunityCost.totalHours} hours</span> of 
                {opportunityCost.displaced.length > 0 ? (
                  <> your goals like <span className="text-accent">"{opportunityCost.displaced[0].name}"</span></>
                ) : (
                  <> potential focus</>
                )} for <span className="text-red-500">"Boondoggle"</span>.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Displaced Progress</span>
            <div className="flex -space-x-1.5">
              {opportunityCost.displaced.slice(0, 3).map((d, i) => (
                <div 
                  key={i} 
                  className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-bold text-gray-500 backdrop-blur-sm"
                  title={`${d.name}: ${d.hours}h`}
                >
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, suffix, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">{title}</span>
        <div className={`p-1.5 bg-gray-800/50 rounded-lg ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-white tracking-tight">{value}</span>
          {suffix && <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{suffix}</span>}
        </div>
        {subtitle && <div className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-tighter">{subtitle}</div>}
      </div>
    </div>
  );
}
