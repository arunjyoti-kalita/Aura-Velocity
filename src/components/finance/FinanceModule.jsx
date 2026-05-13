import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../contexts/useApp';
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Plus, Activity } from 'lucide-react';
import { LiquidityPulse } from './LiquidityPulse';
import { TerminalFeed } from './TerminalFeed';
import { startOfMonth, isWithinInterval, endOfMonth } from 'date-fns';
import clsx from 'clsx';

export function FinanceModule() {
  const { liquidityPulse, financeLogs, setFinanceLogs, setActiveModal, financeSelectedDate, triggerMechanicalFeedback } = useApp();

  const stats = useMemo(() => {
    const start = startOfMonth(financeSelectedDate);
    const end = endOfMonth(financeSelectedDate);

    const logs = Array.isArray(financeLogs) ? financeLogs : [];
    const monthLogs = logs.filter(log => 
      log && log.timestamp && isWithinInterval(new Date(log.timestamp), { start, end })
    );

    const income = monthLogs.reduce((acc, log) => (log && log.type === 'income') ? acc + log.amount : acc, 0);
    const expense = monthLogs.reduce((acc, log) => (log && log.type === 'expense') ? acc + log.amount : acc, 0);
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    // Calculate Burn Rate (daily average of this month's expenses)
    const daysInMonth = monthLogs.length > 0 ? new Date(endOfMonth(financeSelectedDate)).getDate() : 30;
    const burnRate = Math.round(expense / daysInMonth);
    const runway = burnRate > 0 ? Math.round(liquidityPulse / burnRate) : 0;

    return { income, expense, savingsRate, burnRate, runway };
  }, [financeLogs, financeSelectedDate, liquidityPulse]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto p-6 scrollbar-hide">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="font-heading text-xs font-black uppercase tracking-[0.3em] text-white/40">System Domain</h1>
            <button 
              onClick={() => {
                if (confirm("CRITICAL: This will permanently wipe ALL financial records across all months. This action cannot be undone. Proceed?")) {
                  setFinanceLogs([]);
                  triggerMechanicalFeedback('clunk');
                }
              }}
              className="text-[8px] font-black text-red-500/30 hover:text-red-500 transition-colors uppercase tracking-widest border border-red-500/20 hover:border-red-500/50 px-2 py-0.5 rounded"
            >
              [ Purge Data Stream ]
            </button>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter">Resource Flow</h2>
        </div>
        <button 
          onClick={() => setActiveModal({ type: 'add_transaction' })}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-bg-base rounded-lg font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(var(--color-accent),0.3)]"
        >
          <Plus size={14} strokeWidth={3} />
          <span>New Entry</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Liquidity Pulse */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 aspect-[21/4.5] bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <LiquidityPulse 
            amount={liquidityPulse} 
            percentChange={12.4} 
            burnRate={stats.burnRate}
            runway={stats.runway}
          />
        </motion.div>

        {/* Quick Stats */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col justify-between group hover:border-white/10 transition-colors">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/40">Monthly Velocity</span>
            <div>
              <div className="flex items-center gap-2 text-green-400 mb-0.5">
                <ArrowUpRight size={14} />
                <span className="text-lg font-black tracking-tight">₹{stats.income.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400/60">
                <ArrowDownRight size={14} />
                <span className="text-lg font-black tracking-tight">₹{stats.expense.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col justify-between group hover:border-white/10 transition-colors">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/40">Savings Rate</span>
            <div>
              <span className="text-2xl font-black text-white tracking-tighter">{stats.savingsRate}%</span>
              <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, stats.savingsRate))}%` }}
                  className="h-full bg-accent" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Feed */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Terminal Feed</h3>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Protocol: V1_SECURE</span>
             <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
          </div>
        </div>
        
        <TerminalFeed logs={financeLogs} />
      </div>
    </div>
  );
}
