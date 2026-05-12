import { useApp } from "../../contexts/useApp";
import { CHRONOTYPES } from "../../utils/circadian";
import { Bird, Moon, Sun, Ghost } from 'lucide-react';
import clsx from 'clsx';

export function ChronotypeSelector() {
  const { chronotype, setChronotype } = useApp();

  const options = [
    { id: CHRONOTYPES.LARK, label: 'Lark', icon: Sun, color: 'text-orange-400' },
    { id: CHRONOTYPES.BALANCED, label: 'Balanced', icon: Bird, color: 'text-blue-400' },
    { id: CHRONOTYPES.OWL, label: 'Owl', icon: Moon, color: 'text-indigo-400' },
    { id: CHRONOTYPES.VAMPIRE, label: 'Vampire', icon: Ghost, color: 'text-purple-400' },
  ];

  return (
    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 backdrop-blur-md">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = chronotype === opt.id;
        
        return (
          <button
            key={opt.id}
            onClick={() => setChronotype(opt.id)}
            className={clsx(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-300 group relative",
              isActive 
                ? "bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10" 
                : "hover:bg-white/5 border border-transparent"
            )}
            title={`Set Chronotype to ${opt.label}`}
          >
            <Icon size={12} className={clsx(
              "transition-transform group-hover:scale-110",
              isActive ? opt.color : "text-gray-600"
            )} />
            <span className={clsx(
              "text-[8px] font-black uppercase tracking-widest transition-colors",
              isActive ? "text-white" : "text-gray-600 group-hover:text-gray-400"
            )}>
              {opt.label}
            </span>
            {isActive && (
              <div className={clsx("absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full", opt.color.replace('text', 'bg'))} />
            )}
          </button>
        );
      })}
    </div>
  );
}
