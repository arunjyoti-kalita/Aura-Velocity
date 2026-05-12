import { motion } from 'framer-motion';
import { Wallet, ShoppingCart, Coffee, Car, Home, Zap, Heart, MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import { format, isToday, isYesterday } from 'date-fns';

const CATEGORY_ICONS = {
  food: Coffee,
  shopping: ShoppingCart,
  transport: Car,
  housing: Home,
  utilities: Zap,
  health: Heart,
  income: ArrowUpRight,
  default: Wallet
};

export function TerminalFeed({ logs = [] }) {
  // Group logs by date
  const logsArray = Array.isArray(logs) ? logs : [];
  const groupedLogs = logsArray.reduce((acc, log) => {
    if (!log || !log.timestamp) return acc;
    try {
      const date = format(new Date(log.timestamp), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
    } catch (e) {
      console.error("Error formatting log date in TerminalFeed:", e);
    }
    return acc;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Current Cycle / Today';
    if (isYesterday(date)) return 'Previous Cycle / Yesterday';
    return format(date, 'dd MMM yyyy').toUpperCase();
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl border-dashed">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
          <Activity size={24} className="text-white/20" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">No data streams detected</p>
        <p className="text-[8px] font-medium uppercase tracking-widest text-white/10 mt-2">Initialize a transaction to begin monitoring</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 relative">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50" />

      {Object.entries(groupedLogs).map(([date, dateLogs]) => (
        <div key={date} className="flex flex-col gap-3">
          <div className="flex items-center gap-4 px-2">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 whitespace-nowrap">
              {getDateLabel(date)}
            </span>
            <div className="h-px w-full bg-white/5" />
          </div>

          <div className="flex flex-col gap-1">
            {dateLogs.map((log, index) => {
              const Icon = CATEGORY_ICONS[log.category?.toLowerCase()] || CATEGORY_ICONS.default;
              const isExpense = log.type === 'expense';

              return (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={log.id}
                  className="group flex items-center justify-between p-4 bg-white/[0.01] border border-white/0 hover:border-white/5 hover:bg-white/[0.02] rounded-2xl transition-all relative overflow-hidden"
                >
                  {/* Neon Left Border on Hover */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-8 bg-accent rounded-r-full transition-all duration-300" />

                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                      isExpense 
                        ? "bg-white/[0.02] border-white/5 text-white/30 group-hover:border-white/10 group-hover:text-white" 
                        : "bg-green-500/5 border-green-500/10 text-green-400/60 group-hover:bg-green-500/10 group-hover:border-green-500/20 group-hover:text-green-400"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white/80 group-hover:text-white transition-colors tracking-tight">
                        {log.payee || 'UNIDENTIFIED_PAYEE'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">
                          {log.category || 'GENERAL'}
                        </span>
                        <div className="w-1 h-1 bg-white/5 rounded-full" />
                        <span className="text-[8px] font-medium text-white/10 group-hover:text-white/20 transition-colors uppercase tracking-tighter">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Aura Impact Indicator */}
                    <div className="hidden md:flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[7px] font-black text-accent uppercase tracking-widest">Aura Impact</span>
                      <span className="text-[10px] font-black text-white tracking-tighter">+0.2</span>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className={clsx(
                        "text-sm font-black tracking-tighter tabular-nums",
                        isExpense ? "text-white" : "text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]"
                      )}>
                        {isExpense ? '-' : '+'}₹{log.amount.toLocaleString()}
                      </p>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 group-hover:text-white/20 mt-0.5">
                        {log.account || 'LIQUID_CASH'}
                      </p>
                    </div>

                    <button className="p-2 text-white/5 hover:text-white/40 transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Minimal placeholder component for when no logs exist
function Activity({ size, className }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
