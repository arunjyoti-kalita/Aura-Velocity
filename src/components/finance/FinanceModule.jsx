import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../contexts/useApp';
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Plus, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { LiquidityPulse } from './LiquidityPulse';
import { TerminalFeed } from './TerminalFeed';
import { startOfMonth, isWithinInterval, endOfMonth, format } from 'date-fns';
import clsx from 'clsx';

export function FinanceModule() {
  const { liquidityPulse, financeLogs, setFinanceLogs, setActiveModal, financeSelectedDate, setFinanceSelectedDate, triggerMechanicalFeedback } = useApp();

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
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* ── STICKY TOP SECTION ── */}
      <div className="shrink-0 px-6 pt-6 pb-4 bg-transparent">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-6 shrink-0">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              RESOURCE FLOW · SYSTEM MODULE
            </span>
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-accent" />
              <h2 className="text-lg font-black text-white tracking-tighter">Terminal</h2>
            </div>
            <span className="text-[11px] font-black text-white/40">
              {format(financeSelectedDate, 'MMMM yyyy')} · 1st - {new Date(financeSelectedDate.getFullYear(), financeSelectedDate.getMonth() + 1, 0).getDate()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            {/* Date nav */}
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => setFinanceSelectedDate(prev => {
                  const next = new Date(prev); next.setMonth(next.getMonth() - 1); return next;
                })}
                className="p-1.5 text-white/30 hover:text-white transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-2 px-3">
                <span className="text-[11px] font-black text-white tracking-tight">
                  {format(financeSelectedDate, 'MMM yyyy').toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setFinanceSelectedDate(prev => {
                  const next = new Date(prev); next.setMonth(next.getMonth() + 1); return next;
                })}
                className="p-1.5 text-white/30 hover:text-white transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            
            {/* CTA */}
            <button 
              onClick={() => setActiveModal({ type: 'add_transaction' })}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-bg-base rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_6px_20px_rgba(var(--color-accent),0.25)]"
            >
              <Plus size={13} strokeWidth={3} />
              <span>+ New Entry</span>
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              monthlyIncome={stats.income}
              monthlyExpense={stats.expense}
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
      </div>{/* end sticky */}

      {/* ── SCROLLABLE TERMINAL FEED ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
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
    </div>
  );
}
