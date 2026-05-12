import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { motion } from 'framer-motion';

export function MedicationPulse() {
  const { meds, toggleMed } = useApp();

  return (
    <div className="flex items-center gap-1 h-6">
      <div className="flex items-center gap-1">
        {meds.map((med) => (
          <motion.button
            key={med.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleMed(med.id)}
            className={clsx(
              "w-5 h-5 rounded flex items-center justify-center transition-all border",
              med.taken 
                ? "bg-accent/20 border-accent/40 text-accent shadow-[0_0_8px_rgba(var(--color-accent),0.2)]" 
                : "bg-white/5 border-white/5 text-gray-700 hover:border-white/10"
            )}
            title={med.taken ? "Protocol Initialized" : "Pending Protocol"}
          >
            <span className={clsx(
              "text-[7px] font-black uppercase tracking-tighter",
              med.taken ? "text-accent" : "text-gray-700"
            )}>
              {med.id === 1 ? 'M1' : med.id === 2 ? 'M2' : med.id === 3 ? 'F' : 'B'}
            </span>
          </motion.button>
        ))}
      </div>
      
      {meds.every(m => m.taken) && (
        <div className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
      )}
    </div>
  );
}
