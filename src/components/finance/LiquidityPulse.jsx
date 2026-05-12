import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';

export function LiquidityPulse({ amount, percentChange = 0, burnRate = 0, runway = 0 }) {
  const isPositive = percentChange >= 0;

  return (
    <div className="relative w-full h-full flex flex-col justify-center p-8 overflow-hidden">
      {/* Background Pulse Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.5], 
              opacity: [0.2, 0] 
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeOut"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-accent/20 rounded-full blur-[1px]"
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">System Liquidity</span>
        </div>

        <div className="flex flex-col gap-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-baseline gap-4"
          >
            <span className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
              ₹{amount.toLocaleString()}
            </span>
          </motion.div>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-accent text-[9px] font-black uppercase tracking-widest">
              <TrendingUp size={12} />
              {isPositive ? '+' : ''}{percentChange}%
            </div>
            <div className="h-px w-12 bg-white/10" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Operational Pulse Stable</span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 max-w-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Burn Rate</span>
            <span className="text-sm font-bold text-white/60 tracking-tight">₹{burnRate.toLocaleString()} / day</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Runway</span>
            <span className="text-sm font-bold text-white/60 tracking-tight">{runway === Infinity ? 'Infinite' : `${runway} Days`}</span>
          </div>
        </div>
      </div>

      {/* Abstract Wave Visual */}
      <div className="absolute right-[-10%] bottom-[-20%] w-[60%] h-[120%] opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 200" className="w-full h-full text-accent fill-current blur-3xl">
          <motion.path
            animate={{
              d: [
                "M45,-60C58.3,-52.7,69.1,-38.3,74.5,-22.1C79.9,-5.8,79.9,12.3,73.1,27.8C66.3,43.3,52.7,56.1,37.3,64.2C21.8,72.2,4.6,75.4,-12.3,72.8C-29.2,70.2,-45.8,61.8,-57.8,48.7C-69.8,35.7,-77.2,18,-77.9,-0.4C-78.6,-18.8,-72.6,-37.9,-60.1,-45.5C-47.5,-53.1,-28.4,-49.2,-13.4,-56.3C1.6,-63.3,31.7,-67.3,45,-60Z",
                "M48.1,-63.7C61.4,-53.1,70.6,-36.8,74.9,-19.9C79.2,-3,78.6,14.5,71.4,29.1C64.3,43.7,50.7,55.5,35.2,63.4C19.7,71.3,2.4,75.4,-15.5,72.9C-33.3,70.4,-51.7,61.3,-62.7,46.8C-73.7,32.3,-77.3,12.4,-75.6,-7.1C-73.8,-26.6,-66.8,-45.7,-52.8,-56.3C-38.8,-66.8,-17.9,-68.8,0.7,-69.8C19.3,-70.7,34.8,-74.3,48.1,-63.7Z"
              ]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            transform="translate(100 100)"
          />
        </svg>
      </div>
    </div>
  );
}
