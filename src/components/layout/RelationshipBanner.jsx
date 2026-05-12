import { useMemo } from 'react';
import { Users, AlertCircle, ChevronRight } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import { differenceInDays, parseISO } from 'date-fns';
import clsx from 'clsx';

export function RelationshipBanner() {
  const { relationships, setActiveModule } = useApp();
  const { people = [] } = relationships || {};

  const overduePeople = useMemo(() => {
    return people
      .filter(p => p.isActive !== false && p.lastContactDate)
      .filter(p => {
        const daysSince = differenceInDays(new Date(), parseISO(p.lastContactDate));
        return daysSince > p.cadenceDays;
      })
      .sort((a, b) => {
        const daysA = differenceInDays(new Date(), parseISO(a.lastContactDate));
        const daysB = differenceInDays(new Date(), parseISO(b.lastContactDate));
        return (daysB - b.cadenceDays) - (daysA - a.cadenceDays);
      });
  }, [people]);

  if (overduePeople.length === 0) return null;

  return (
    <div className="px-8 py-1 bg-red-500/5 border-b border-red-500/10 flex items-center justify-between animate-in slide-in-from-top-1 duration-500 group cursor-pointer hover:bg-red-500/10 transition-all"
         onClick={() => setActiveModule('people')}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex -space-x-2">
          {overduePeople.slice(0, 3).map(p => (
            <div 
              key={p.id}
              className="w-6 h-6 rounded-lg border-2 border-[#0a0a0c] flex items-center justify-center text-[8px] font-black text-white shadow-lg"
              style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
            >
              {p.name.charAt(0)}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <AlertCircle size={12} className="text-red-500 shrink-0" />
          <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest truncate">
            {overduePeople.length} DORMANT LINKS: {overduePeople[0].name} {overduePeople.length > 1 ? `AND ${overduePeople.length - 1} OTHERS ` : ''} REQUIRE CONTACT
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-red-500/40 group-hover:text-red-500 transition-colors shrink-0">
        <span className="text-[8px] font-black uppercase tracking-widest">Re-initialize Link</span>
        <ChevronRight size={12} />
      </div>
    </div>
  );
}
