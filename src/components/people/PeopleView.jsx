import { useState, useMemo } from 'react';
import { Search, Plus, Filter, ArrowUpDown, UserPlus, MessageSquare, Phone, MapPin, Users, MoreHorizontal, Calendar, Clock } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { formatDistanceToNow, parseISO, differenceInDays, format } from 'date-fns';
import { AddPersonModal } from './AddPersonModal';
import { LogInteractionModal } from './LogInteractionModal';

export function PeopleView() {
  const { relationships, deletePerson } = useApp();
  const { people, interactions } = relationships;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, overdue, due_soon, healthy
  const [sortBy, setSortBy] = useState('overdue'); // overdue, alpha, recent
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [loggingInteractionPerson, setLoggingInteractionPerson] = useState(null);

  const getStatus = (person) => {
    if (!person.lastContactDate) return { type: 'grey', label: 'Never', color: 'bg-gray-500' };
    
    const lastDate = parseISO(person.lastContactDate);
    const daysSince = differenceInDays(new Date(), lastDate);
    
    if (daysSince > person.cadenceDays) {
      return { 
        type: 'red', 
        label: `${daysSince - person.cadenceDays}d overdue`, 
        color: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]',
        daysSince
      };
    }
    if (daysSince > person.cadenceDays - 3) {
      return { 
        type: 'amber', 
        label: 'Due soon', 
        color: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
        daysSince
      };
    }
    return { 
      type: 'green', 
      label: 'Healthy', 
      color: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
      daysSince
    };
  };

  const filteredPeople = useMemo(() => {
    let result = people.filter(p => p.isActive !== false);

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.role.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Status Filter
    if (filterStatus !== 'all') {
      result = result.filter(p => {
        const status = getStatus(p);
        if (filterStatus === 'overdue') return status.type === 'red';
        if (filterStatus === 'due_soon') return status.type === 'amber';
        if (filterStatus === 'healthy') return status.type === 'green';
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);

      if (sortBy === 'overdue') {
        const valA = statusA.type === 'red' ? (statusA.daysSince - a.cadenceDays) : (statusA.type === 'amber' ? 0 : -1);
        const valB = statusB.type === 'red' ? (statusB.daysSince - b.cadenceDays) : (statusB.type === 'amber' ? 0 : -1);
        return valB - valA;
      }
      if (sortBy === 'alpha') return a.name.localeCompare(b.name);
      if (sortBy === 'recent') {
        const dateA = a.lastContactDate ? parseISO(a.lastContactDate).getTime() : 0;
        const dateB = b.lastContactDate ? parseISO(b.lastContactDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [people, searchQuery, filterStatus, sortBy]);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = ['#3b82f6', '#ec4899', '#a855f7', '#eab308', '#f97316', '#06b6d4', '#10b981'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="h-10 px-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Social Capital</h1>
          <div className="h-3 w-[1px] bg-white/10" />
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Neural Cadence</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="FILTER..."
              className="bg-white/[0.02] border border-white/5 rounded-lg h-8 pl-8 pr-3 text-[9px] font-black uppercase tracking-widest text-white outline-none w-40 focus:border-accent/30 transition-all placeholder:text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            onClick={() => {
              setEditingPerson(null);
              setIsAddModalOpen(true);
            }}
            className="h-8 px-3 bg-accent text-bg-base font-black text-[9px] uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
          >
            <UserPlus size={12} />
            Connect
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="h-10 px-8 flex items-center justify-between border-b border-white/5 bg-[#0a0a0c]/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1">
          {['all', 'overdue', 'due_soon', 'healthy'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={clsx(
                "px-3 h-6 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all",
                filterStatus === status 
                  ? "bg-white/10 border-white/20 text-white shadow-lg" 
                  : "bg-transparent border-transparent text-gray-600 hover:text-gray-400"
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[8px] font-black text-gray-700 uppercase tracking-widest">
            <ArrowUpDown size={10} />
            Sort:
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-gray-400 outline-none cursor-pointer hover:text-white transition-colors"
            >
              <option value="overdue">Overdue</option>
              <option value="alpha">Alpha</option>
              <option value="recent">Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {filteredPeople.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <Users size={32} className="text-gray-600" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">No connections identified</h3>
            <p className="text-[10px] text-gray-600 mt-2 max-w-[200px]">Expand your network or adjust filters to reveal dormant links.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPeople.map(person => {
              const status = getStatus(person);
              const avatarColor = person.avatarColor || getAvatarColor(person.name);
              
              return (
                <div 
                  key={person.id}
                  className="group relative bg-[#121216]/60 border border-white/5 rounded-2xl p-6 hover:bg-[#16161c]/80 hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/40 overflow-hidden"
                >
                  {/* Status Indicator Bar */}
                  <div className={clsx("absolute top-0 left-0 bottom-0 w-1", status.color)} />
                  
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-xl shrink-0 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {getInitials(person.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[15px] font-black text-gray-100 uppercase tracking-wider truncate">
                          {person.name}
                        </h3>
                        <button 
                          onClick={() => {
                            setEditingPerson(person);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-gray-700 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{person.role}</span>
                        <span className="w-1 h-1 bg-gray-800 rounded-full" />
                        <div className="flex items-center gap-1.5">
                          <div className={clsx("w-1.5 h-1.5 rounded-full", status.color)} />
                          <span className={clsx("text-[9px] font-black uppercase tracking-widest", 
                            status.type === 'red' ? 'text-red-400' : status.type === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                          )}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                          <Calendar size={12} className="opacity-50" />
                          Every {person.cadenceDays} Days
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                          <Clock size={12} className="opacity-50" />
                          Last: {person.lastContactDate ? formatDistanceToNow(parseISO(person.lastContactDate), { addSuffix: true }) : 'Never logged'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#16161c] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 translate-y-2 group-hover:translate-y-0 duration-300">
                    <button 
                      onClick={() => setLoggingInteractionPerson(person)}
                      className="flex-1 h-9 bg-accent/10 border border-accent/20 text-accent font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-accent hover:text-bg-base transition-all shadow-lg shadow-accent/5"
                    >
                      Log Contact
                    </button>
                    <button 
                      className="flex-1 h-9 bg-white/5 border border-white/5 text-gray-400 font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/10 hover:text-white transition-all"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddPersonModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        person={editingPerson}
      />

      <LogInteractionModal
        isOpen={!!loggingInteractionPerson}
        onClose={() => setLoggingInteractionPerson(null)}
        person={loggingInteractionPerson}
      />
    </div>
  );
}
