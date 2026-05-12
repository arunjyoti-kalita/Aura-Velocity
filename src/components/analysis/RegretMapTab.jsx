import React, { useMemo } from 'react';
import { Activity, Brain, Heart, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';

export function RegretMapTab({ logs, activities }) {
  const { regretModel } = useApp();

  const activityData = useMemo(() => {
    return activities.map(act => {
      const pattern = regretModel?.activityPatterns?.[act.name];
      if (!pattern || pattern.totalRated === 0) return null;
      
      // Calculate average energy for this activity from logs
      const actLogs = logs.filter(l => l.activityName === act.name && l.energyLevel !== undefined);
      const avgEnergy = actLogs.length > 0 
        ? actLogs.reduce((sum, l) => sum + (l.energyLevel || 50), 0) / actLogs.length 
        : 50;

      return {
        name: act.name,
        color: act.baseColor,
        rating: pattern.averageRating,
        energy: avgEnergy,
        count: pattern.totalRated,
        worthItRatio: (pattern.neverRegretCount || 0) / pattern.totalRated,
        regretRatio: (pattern.alwaysRegretCount || 0) / pattern.totalRated
      };
    }).filter(Boolean);
  }, [activities, regretModel, logs]);

  const todData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    // Filter to logical hours (8am - 2am)
    const logicalHours = [];
    for (let h = 8; h <= 23; h++) logicalHours.push(h);
    for (let h = 0; h <= 2; h++) logicalHours.push(h);

    return logicalHours.map(h => {
      const hourLogs = logs.filter(l => {
        const startH = parseInt(l.startTime.split(':')[0], 10);
        return startH === h && l.regretRating !== undefined && l.regretRating !== null;
      });
      
      if (hourLogs.length === 0) return { hour: h, rating: null };
      const avg = hourLogs.reduce((sum, l) => sum + l.regretRating, 0) / hourLogs.length;
      return { hour: h, rating: avg };
    });
  }, [logs]);

  const topValue = useMemo(() => {
    return [...activityData]
      .sort((a, b) => (b.rating * b.worthItRatio) - (a.rating * a.worthItRatio))
      .slice(0, 3);
  }, [activityData]);

  const highRegret = useMemo(() => {
    return [...activityData]
      .filter(a => a.rating < 3 || a.regretRatio > 0.3)
      .sort((a, b) => b.regretRatio - a.regretRatio)
      .slice(0, 3);
  }, [activityData]);

  if (activityData.length < 1) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-gray-500 animate-pulse">
          <Brain size={40} />
        </div>
        <div className="space-y-3 max-w-md">
          <h3 className="text-2xl font-heading font-black text-white uppercase tracking-wider">Neural Map Calibrating</h3>
          <p className="text-gray-400 text-sm italic leading-relaxed">
            "Your ideal life is a series of choices. We need more data to map them. Rate your completed activities to see your first patterns."
          </p>
          <div className="pt-6 flex flex-col items-center gap-3">
            <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-accent transition-all duration-1000 shadow-[0_0_15px_rgba(0,242,234,0.6)]" 
                style={{ width: `${Math.min(100, (activityData.length / 3) * 100)}%` }} 
              />
            </div>
            <span className="text-[10px] text-accent font-black uppercase tracking-[0.2em]">
              {activityData.length} / 3 Activities Rated
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── THE REGRET MAP (SCATTER PLOT) ── */}
      <div className="col-span-12 lg:col-span-8 bg-[#14141c]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-accent/10 transition-all duration-1000" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent border border-accent/20">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.1em]">The Regret Map</h3>
              <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">ROI of Life Energy vs. Fulfillment</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[8px] uppercase tracking-[0.15em] font-black">
            <div className="flex items-center gap-1.5 text-emerald-400/80"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> High ROI</div>
            <div className="flex items-center gap-1.5 text-red-400/80"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> High Regret</div>
          </div>
        </div>

        {/* Scatter Plot Grid */}
        <div className="relative h-[350px] w-full border-l-2 border-b-2 border-white/10 mt-6 mb-8">
          {/* Axis Labels */}
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Fulfillment Score</div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Energy Investment</div>
          
          {/* Quadrant Shadows */}
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-emerald-500/[0.02] border-l border-b border-white/5" />
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-red-500/[0.02] border-r border-t border-white/5" />

          {/* Quadrant Labels */}
          <div className="absolute top-6 right-6 text-[10px] font-black text-emerald-500/30 uppercase tracking-[0.2em] italic">The Sweet Spot</div>
          <div className="absolute bottom-6 right-6 text-[10px] font-black text-orange-500/30 uppercase tracking-[0.2em] italic">Energy Drain</div>
          <div className="absolute bottom-6 left-6 text-[10px] font-black text-red-500/30 uppercase tracking-[0.2em] italic">Pure Regret</div>
          <div className="absolute top-6 left-6 text-[10px] font-black text-blue-500/30 uppercase tracking-[0.2em] italic">Passive Value</div>

          {/* Center Lines */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/5 border-dashed" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/5 border-dashed" />

          {/* Data Points */}
          {activityData.map((data, i) => (
            <div 
              key={data.name}
              className="absolute group/point"
              style={{
                left: `${data.energy}%`,
                bottom: `${((data.rating - 1) / 4) * 100}%`,
                transform: 'translate(-50%, 50%)'
              }}
            >
              <div 
                className="w-5 h-5 rounded-full border-2 border-white/40 transition-all duration-500 group-hover/point:scale-[2.5] cursor-pointer relative shadow-xl"
                style={{ 
                  backgroundColor: data.color,
                  boxShadow: `0 0 30px ${data.color}66`
                }}
              >
                {/* Tooltip */}
                <div className="absolute top-[-45px] left-1/2 -translate-x-1/2 bg-[#0a0a0f] backdrop-blur-xl px-3 py-1.5 rounded-lg text-[10px] font-black text-white whitespace-nowrap opacity-0 group-hover/point:opacity-100 transition-all duration-300 z-50 pointer-events-none border border-white/10 shadow-2xl scale-50 group-hover/point:scale-40">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 text-[8px] tracking-widest uppercase">Activity</span>
                    <span className="text-white uppercase tracking-wider">{data.name}</span>
                    <div className="h-[1px] bg-white/10 my-0.5" />
                    <div className="flex justify-between gap-4">
                      <span className="text-emerald-400">Rating: {data.rating.toFixed(1)}</span>
                      <span className="text-blue-400">Energy: {Math.round(data.energy)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SIDEBAR CARDS ── */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        {/* CHRONOTYPE HEATMAP */}
        <div className="bg-[#14141c]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 group">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.1em]">Chronotype</h3>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">When are you most fulfilled?</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {todData.map((d) => {
              const rating = d.rating;
              const intensity = rating ? ((rating - 1) / 4) : 0;
              const hourLabel = d.hour === 0 ? '12 AM' : d.hour < 12 ? `${d.hour} AM` : d.hour === 12 ? '12 PM' : `${d.hour-12} PM`;

              return (
                <div key={d.hour} className="flex items-center gap-4 group/row">
                  <span className="text-[9px] font-black text-gray-500 w-10 text-right group-hover/row:text-white transition-colors">{hourLabel}</span>
                  <div className="flex-1 h-3.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                    {rating && (
                      <div 
                        className="h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                        style={{ 
                          width: `${(rating / 5) * 100}%`,
                          backgroundColor: rating >= 4 ? '#10b981' : rating >= 3 ? '#f59e0b' : '#ef4444',
                          opacity: 0.4 + (intensity * 0.6)
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[9px] font-black text-gray-600 w-6 uppercase transition-colors group-hover/row:text-gray-300">
                    {rating ? rating.toFixed(1) : '–'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI LEADERBOARD */}
        <div className="bg-[#14141c]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-6 text-emerald-400">
                <Heart size={18} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Highest ROI</span>
              </div>
              <div className="space-y-3">
                {topValue.map(a => (
                  <div key={a.name} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-emerald-500/[0.05] hover:border-emerald-500/20 transition-all duration-300">
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-black text-gray-100 uppercase tracking-wide">{a.name}</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{a.count} sessions rated</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-black text-emerald-400">{(a.worthItRatio * 100).toFixed(0)}%</div>
                      <div className="text-[8px] font-black text-emerald-500/40 uppercase tracking-tighter">Worth It</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6 text-red-400">
                <AlertTriangle size={18} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">High Regret</span>
              </div>
              <div className="space-y-3">
                {highRegret.map(a => (
                  <div key={a.name} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-red-500/[0.05] hover:border-red-500/20 transition-all duration-300">
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-black text-gray-100 uppercase tracking-wide">{a.name}</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{a.count} sessions rated</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-black text-red-400">{(a.regretRatio * 100).toFixed(0)}%</div>
                      <div className="text-[8px] font-black text-red-500/40 uppercase tracking-tighter">Regret</div>
                    </div>
                  </div>
                ))}
                {highRegret.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">Zero high-regret activities</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
