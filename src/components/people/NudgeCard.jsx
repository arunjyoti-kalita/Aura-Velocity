import { useState } from 'react';
import { X, Calendar, MessageSquare, Phone, ArrowRight } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { differenceInDays, parseISO } from 'date-fns';
import { LogInteractionModal } from './LogInteractionModal';

const MESSAGES = [
  "It's been {X} days since you connected with {Name}.",
  "{Name} — your last catch-up was {X} days ago.",
  "You haven't spoken with {Name} in {X} days.",
  "Neural drift detected: {Name} is awaiting contact."
];

export function NudgeCard({ person, index, onDismiss, onRemindTomorrow }) {
  const { setActiveModule, setFocusedDate } = useApp();
  const [isLogOpen, setIsLogOpen] = useState(false);
  
  const daysSince = person.lastContactDate 
    ? differenceInDays(new Date(), parseISO(person.lastContactDate))
    : 'many';
    
  const isOverdue = daysSince > person.cadenceDays;
  const message = MESSAGES[index % MESSAGES.length]
    .replace('{X}', daysSince)
    .replace('{Name}', person.name);

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const avatarColor = person.avatarColor || '#3b82f6';

  return (
    <div 
      className={clsx(
        "w-[280px] glass-modal p-4 pointer-events-auto animate-in slide-in-from-right-10 duration-500",
        "border-l-4",
        isOverdue ? "border-l-red-500" : "border-l-amber-500 shadow-[0_8px_32px_rgba(245,158,11,0.1)]"
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(person.name)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">{person.name}</span>
            <button onClick={onDismiss} className="text-gray-600 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
            {message}
          </p>
          <p className="text-[8px] text-gray-600 font-bold italic mt-2 uppercase tracking-widest">
            Target: Every {person.cadenceDays} days
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button 
          onClick={() => {
            // Pre-fill copilot or just navigate to daylog with a specific intent
            setActiveModule('daylog');
            // Suggestion logic would ideally pre-fill the copilot input
          }}
          className="w-full py-2 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-between px-3 group hover:bg-accent hover:text-bg-base transition-all"
        >
          <span className="text-[9px] font-black uppercase tracking-widest">Schedule Connection</span>
          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </button>
        
        <button 
          onClick={() => setIsLogOpen(true)}
          className="w-full py-2 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-[9px] font-black text-gray-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
        >
          Log Past Contact
        </button>
      </div>

      <div className="mt-3 flex justify-center">
        <button 
          onClick={onRemindTomorrow}
          className="text-[8px] font-black text-gray-700 hover:text-gray-400 uppercase tracking-[0.2em] transition-colors"
        >
          Remind me tomorrow
        </button>
      </div>

      <LogInteractionModal 
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        person={person}
      />
    </div>
  );
}
