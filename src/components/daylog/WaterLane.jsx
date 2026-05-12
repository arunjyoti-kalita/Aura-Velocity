import { useApp } from "../../contexts/useApp";
import { Plus, Minus, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export function WaterLane() {
  const { waterIntake, gulpWater, degulpWater } = useApp();
  
  // Each glass is 1/12th of the height (8.33%)
  const fillPercentage = (waterIntake / 12) * 100;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none group/water">
      {/* The Liquid Container - Shifted up slightly to cover 8 AM */}
      <div className="relative w-full h-[calc(100%+16px)] -top-4 overflow-hidden rounded-t-xl bg-white/[0.02] border-x border-white/5">
        {/* The Liquid Fill - Inverted to flow from top to bottom */}
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${fillPercentage}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 80 }}
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-cyan-600/40 via-cyan-500/20 to-cyan-400/40 backdrop-blur-sm"
        >
          {/* Intense Wavy Leading Edge (Bottom of the fill) */}
          <div className="absolute bottom-0 left-0 right-0 h-6 translate-y-1/2">
            <svg className="w-full h-full text-cyan-400/50 fill-current animate-wave-intense" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0 10 C 20 0, 30 20, 50 10 C 70 0, 80 20, 100 10 V 20 H 0 Z" />
            </svg>
          </div>

          {/* Neural Aquarium Life - High Intensity */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[
              { emoji: '🐠', delay: 0, duration: 6, y: '15%' },
              { emoji: '🐟', delay: 2, duration: 9, y: '45%' },
              { emoji: '🐙', delay: 4, duration: 12, y: '75%' },
              { emoji: '🐢', delay: 1, duration: 18, y: '30%' },
              { emoji: '🐡', delay: 6, duration: 7, y: '60%' },
              { emoji: '🦀', delay: 3, duration: 15, y: '90%' },
              { emoji: '🐚', delay: 5, duration: 20, y: '25%' },
              { emoji: '🦈', delay: 8, duration: 5, y: '55%' }
            ].map((creature, i) => (
              <motion.div
                key={i}
                initial={{ left: '-30%', top: creature.y, opacity: 0 }}
                animate={{ 
                  left: ['-30%', '130%'],
                  opacity: [0, 0.6, 0.6, 0],
                  y: [creature.y, `${parseFloat(creature.y) + (i % 2 === 0 ? 3 : -3)}%`, creature.y]
                }}
                transition={{ 
                  duration: creature.duration, 
                  repeat: Infinity, 
                  delay: creature.delay,
                  ease: "linear"
                }}
                className="absolute text-[9px] filter saturate-200 brightness-150 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              >
                <div className={i % 2 === 0 ? "scale-x-[-1]" : ""}>{creature.emoji}</div>
              </motion.div>
            ))}
          </div>

          {/* High-Intensity Surging Bubbles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(22)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ top: '100%', opacity: 0 }}
                animate={{ 
                  top: ['100%', '0%'],
                  opacity: [0, 0.9, 0],
                  x: [0, (i % 2 === 0 ? 1 : -1) * (Math.random() * 12), 0]
                }}
                transition={{ 
                  duration: 0.8 + Math.random() * 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
                className={clsx(
                  "absolute left-1/2 rounded-full blur-[1px]",
                  i % 5 === 0 ? "w-2 h-2 bg-white/40" : "w-1 h-1 bg-cyan-200/50"
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Goal Markers */}
        <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-10 pointer-events-none">
          {[...Array(13)].map((_, i) => (
            <div key={i} className="w-full h-[0.5px] bg-white/40" />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes wave-intense {
          0% { transform: translateX(-50%) translateY(-30%) scaleY(1); }
          50% { transform: translateX(-25%) translateY(-30%) scaleY(1.3); }
          100% { transform: translateX(0%) translateY(-30%) scaleY(1); }
        }
        .animate-wave-intense {
          width: 200%;
          animation: wave-intense 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
