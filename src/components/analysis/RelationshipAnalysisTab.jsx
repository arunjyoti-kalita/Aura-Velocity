import { useMemo } from 'react';
import { useApp } from "../../contexts/useApp";
import { differenceInDays, parseISO, subMonths, format, isAfter } from 'date-fns';
import { Users, AlertCircle, Heart, CheckCircle2, TrendingUp, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

export function RelationshipAnalysisTab() {
  const { relationships } = useApp();
  const { people, interactions } = relationships;

  const stats = useMemo(() => {
    const now = new Date();
    
    const health = people.reduce((acc, p) => {
      if (!p.lastContactDate) { acc.grey++; return acc; }
      const daysSince = differenceInDays(now, parseISO(p.lastContactDate));
      if (daysSince > p.cadenceDays) acc.red++;
      else if (daysSince > p.cadenceDays - 3) acc.amber++;
      else acc.green++;
      return acc;
    }, { green: 0, amber: 0, red: 0, grey: 0 });

    const total = people.length || 1;
    const healthScore = Math.round((health.green / total) * 100);

    const threeMonthsAgo = subMonths(now, 3);
    const recentInteractions = interactions.filter(i => isAfter(parseISO(i.date), threeMonthsAgo));
    
    const overdueList = people
      .filter(p => p.isActive !== false && p.lastContactDate)
      .map(p => {
        const daysSince = differenceInDays(now, parseISO(p.lastContactDate));
        return { ...p, daysOverdue: daysSince - p.cadenceDays };
      })
      .filter(p => p.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const mostConnected = people
      .map(p => {
        const count = interactions.filter(i => i.personId === p.id).length;
        return { ...p, interactionCount: count };
      })
      .sort((a, b) => b.interactionCount - a.interactionCount);

    return { health, healthScore, recentInteractions, overdueList, mostConnected };
  }, [people, interactions]);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard 
          label="Health Score" 
          value={`${stats.healthScore}%`} 
          sub="Cadence Adherence"
          icon={Heart}
          color="text-pink-500"
        />
        <StatCard 
          label="Healthy Links" 
          value={stats.health.green} 
          sub="Within Cadence"
          icon={CheckCircle2}
          color="text-emerald-500"
        />
        <StatCard 
          label="At Risk" 
          value={stats.health.amber} 
          sub="Due Within 3 Days"
          icon={AlertCircle}
          color="text-amber-500"
        />
        <StatCard 
          label="Overdue" 
          value={stats.health.red} 
          sub="Action Required"
          icon={AlertCircle}
          color="text-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Overdue */}
        <div className="glass-card p-4 border border-white/5 bg-white/[0.01] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-500" size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Most Neglected Links</h3>
          </div>
          <div className="space-y-4">
            {stats.overdueList.slice(0, 5).map(person => (
              <div key={person.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl group hover:bg-red-500/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: person.avatarColor || '#3b82f6' }}>
                    {person.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-200 uppercase">{person.name}</span>
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{person.role}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{person.daysOverdue}D OVERDUE</span>
              </div>
            ))}
            {stats.overdueList.length === 0 && (
              <div className="h-40 flex items-center justify-center text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">All links synchronized</div>
            )}
          </div>
        </div>

        {/* Most Connected */}
        <div className="glass-card p-4 border border-white/5 bg-white/[0.01] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-emerald-500" size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Peak Engagement</h3>
          </div>
          <div className="space-y-4">
            {stats.mostConnected.slice(0, 5).map(person => (
              <div key={person.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl group hover:bg-white/[0.05] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: person.avatarColor || '#3b82f6' }}>
                    {person.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-200 uppercase">{person.name}</span>
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{person.role}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{person.interactionCount} INTERACTIONS</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="glass-card p-4 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-black text-white tracking-tight">{value}</span>
        <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest mt-1">{sub}</span>
      </div>
    </div>
  );
}
