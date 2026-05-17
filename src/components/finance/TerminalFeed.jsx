import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, ShoppingCart, Coffee, Car, Home, Zap, Heart,
  MoreHorizontal, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { format, isToday, isYesterday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const CATEGORY_ICONS = {
  food: Coffee, shopping: ShoppingCart, transport: Car,
  housing: Home, utilities: Zap, health: Heart,
  income: ArrowUpRight, default: Wallet,
};

function ActivityIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function TerminalFeed({ logs = [] }) {
  const logsArray = Array.isArray(logs) ? logs : [];

  // Monthly average daily expense — used for anomaly detection
  const monthlyDailyAvg = useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    const daily = {};
    logsArray.forEach(log => {
      if (!log?.timestamp || log.type !== 'expense') return;
      try {
        if (isWithinInterval(new Date(log.timestamp), { start: mStart, end: mEnd })) {
          const dk = format(new Date(log.timestamp), 'yyyy-MM-dd');
          daily[dk] = (daily[dk] || 0) + (log.amount || 0);
        }
      } catch (_) {}
    });
    const vals = Object.values(daily);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [logsArray]);

  // Group logs by date, newest date first, entries newest-first within group
  const groups = useMemo(() => {
    const map = {};
    logsArray.forEach(log => {
      if (!log?.timestamp) return;
      try {
        const dk = format(new Date(log.timestamp), 'yyyy-MM-dd');
        if (!map[dk]) map[dk] = { logs: [], expense: 0 };
        map[dk].logs.push(log);
        if (log.type === 'expense') map[dk].expense += (log.amount || 0);
      } catch (_) {}
    });
    Object.values(map).forEach(g => {
      g.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [logsArray]);

  const dateLabel = (dk) => {
    const d = new Date(dk + 'T12:00:00');
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEE · dd MMM yyyy').toUpperCase();
  };

  if (logsArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 rounded-xl border-dashed">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4">
          <ActivityIcon size={24} className="text-white/20" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">No data streams detected</p>
        <p className="text-[8px] font-medium uppercase tracking-widest text-white/40 mt-2">Add a transaction to begin monitoring</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_2px] z-50" />

      {groups.map(([date, { logs: dateLogs, expense: dayExpense }]) => {
        const isAnomaly = monthlyDailyAvg > 0 && dayExpense > monthlyDailyAvg * 2;

        return (
          <div key={date} className="flex flex-col gap-1">
            {/* ── STICKY DATE HEADER ── */}
            <div className="sticky top-0 z-20 flex items-center gap-3 px-1 py-1.5 bg-[#0a0a0c]/90 backdrop-blur-sm">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 whitespace-nowrap">
                {dateLabel(date)}
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />

              {/* Anomaly badge */}
              {isAnomaly && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded-lg shrink-0">
                  <AlertTriangle size={9} className="text-orange-400" />
                  <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">
                    2× avg
                  </span>
                </div>
              )}

              {dayExpense > 0 && (
                <span className="text-[9px] font-black text-white/30 tabular-nums shrink-0">
                  −₹{dayExpense.toLocaleString()}
                </span>
              )}
            </div>

            {/* ── TRANSACTION ROWS ── */}
            <div className="flex flex-col gap-1">
              {dateLogs.map((log, idx) => {
                const Icon = CATEGORY_ICONS[log.category?.toLowerCase()] || CATEGORY_ICONS.default;
                const isExpense = log.type === 'expense';
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group flex items-center justify-between px-4 py-3 bg-white/[0.01] border border-white/0 hover:border-white/5 hover:bg-white/[0.03] rounded-xl transition-all relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 group-hover:h-7 bg-accent rounded-r-full transition-all duration-300" />

                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300",
                        isExpense
                          ? "bg-white/[0.02] border-white/5 text-white/30 group-hover:text-white/60"
                          : "bg-green-500/5 border-green-500/10 text-green-400/60 group-hover:bg-green-500/10 group-hover:text-green-400"
                      )}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white/80 group-hover:text-white tracking-tight">
                          {log.payee || 'UNIDENTIFIED_PAYEE'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/50 group-hover:text-white/70">
                            {log.category || 'GENERAL'}
                          </span>
                          <div className="w-1 h-1 bg-white/20 rounded-full" />
                          <span className="text-[8px] text-white/40 tabular-nums">
                            {format(new Date(log.timestamp), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={clsx(
                          "text-[13px] font-black tracking-tight tabular-nums",
                          isExpense ? "text-white" : "text-green-400"
                        )}>
                          {isExpense ? '−' : '+'}₹{log.amount.toLocaleString()}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/40 mt-0.5">
                          {log.account || 'CASH'}
                        </p>
                      </div>
                      <button className="p-1.5 text-white/10 hover:text-white/40 transition-colors">
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
