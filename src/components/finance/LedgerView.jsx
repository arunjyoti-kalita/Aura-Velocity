import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../contexts/useApp';
import { 
  Plus, Trash2, Edit3, ChevronLeft, ChevronRight, 
  Calendar, Search, Filter, ArrowUpRight, ArrowDownRight, 
  Wallet, ShoppingCart, Coffee, Car, Home, Zap, Heart
} from 'lucide-react';
import { format, isSameDay, startOfDay, endOfDay, isToday } from 'date-fns';
import clsx from 'clsx';

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

export function LedgerView() {
  const { 
    financeLogs, deleteFinanceLog, setActiveModal, 
    triggerMechanicalFeedback, financeSelectedDate, setFinanceSelectedDate 
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter logs for the selected date and search query
  const dailyLogs = useMemo(() => {
    const logs = Array.isArray(financeLogs) ? financeLogs : [];
    return logs.filter(log => {
      if (!log || !log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      const matchesDate = isSameDay(logDate, financeSelectedDate);
      const matchesSearch = (log.payee?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (log.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [financeLogs, financeSelectedDate, searchQuery]);

  // Calculate daily totals
  const dailyStats = useMemo(() => {
    return dailyLogs.reduce((acc, log) => {
      if (log.type === 'income') acc.income += log.amount;
      else acc.expense += log.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [dailyLogs]);

  // Calculate category-wise breakdown for the day
  const categoryStats = useMemo(() => {
    const stats = {};
    dailyLogs.forEach(log => {
      if (log.type === 'expense') {
        const cat = log.category || 'general';
        stats[cat] = (stats[cat] || 0) + (log.amount || 0);
      }
    });
    
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const maxBurn = sorted.length > 0 ? { id: sorted[0][0], amount: sorted[0][1] } : null;
    const totalExpense = dailyLogs.filter(l => l.type === 'expense').reduce((sum, l) => sum + l.amount, 0);
    
    return { breakdown: sorted, maxBurn, totalExpense };
  }, [dailyLogs]);

  const handleDelete = (id) => {
    if (confirm('Permanently purge this transaction from the ledger?')) {
      deleteFinanceLog(id);
    }
  };

  const handleEdit = (log) => {
    triggerMechanicalFeedback('click');
    setActiveModal({ type: 'add_transaction', data: log });
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto scrollbar-hide">
      {/* Ledger Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">System Module</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Transaction Ledger</h1>
          <p className="text-white/40 text-[10px] font-medium uppercase tracking-[0.2em] mt-1">Manual Input & Verification Protocol</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-2xl p-1">
            <button 
              onClick={() => setFinanceSelectedDate(prev => {
                const next = new Date(prev);
                next.setDate(next.getDate() - 1);
                return next;
              })}
              className="p-2 text-white/20 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center min-w-[220px] px-4">
              <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-1">Active Ledger</span>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-white tracking-tighter">
                  {format(financeSelectedDate, 'dd MMMM yyyy').toUpperCase()}
                </h3>
                {isToday(financeSelectedDate) && (
                  <span className="px-2 py-0.5 bg-accent/20 border border-accent/40 rounded-md text-[8px] font-black text-accent uppercase tracking-widest">Today</span>
                )}
              </div>
            </div>
            <button 
              onClick={() => setFinanceSelectedDate(prev => {
                const next = new Date(prev);
                next.setDate(next.getDate() + 1);
                return next;
              })}
              className="p-3 text-white/40 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <button 
            onClick={() => {
              const now = new Date();
              const entryDate = new Date(financeSelectedDate);
              entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
              setActiveModal({ 
                type: 'add_transaction', 
                data: { timestamp: entryDate.toISOString() } 
              });
            }}
            className="flex items-center gap-2 px-6 py-4 bg-accent text-bg-base rounded-2xl font-black text-[12px] uppercase tracking-widest hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_30px_rgba(var(--color-accent),0.2)]"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Initialize Entry</span>
          </button>
        </div>
      </div>

      {/* Daily Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Daily Intake</span>
            <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-xl font-black tabular-nums tracking-tighter">₹{dailyStats.income.toLocaleString()}</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Daily Output</span>
            <div className="p-2 bg-white/5 rounded-xl text-white/40">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <p className="text-xl font-black text-white tabular-nums tracking-tighter">₹{dailyStats.expense.toLocaleString()}</p>
        </div>

        <div className="bg-accent/[0.03] border border-accent/20 rounded-[1.5rem] p-4 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-all duration-700" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-accent/60 uppercase tracking-[0.2em]">Daily Delta</span>
            <Calendar size={16} className="text-accent/40" />
          </div>
          <p className={clsx(
            "text-3xl font-black tabular-nums tracking-tighter",
            dailyStats.income - dailyStats.expense >= 0 ? "text-accent" : "text-red-400"
          )}>
            {dailyStats.income - dailyStats.expense >= 0 ? '+' : ''}₹{(dailyStats.income - dailyStats.expense).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Analytics Insight Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Burn Box */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-4 flex items-center gap-6 group hover:bg-white/[0.04] transition-all">
          <div className="shrink-0 w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            {categoryStats.maxBurn ? (() => {
              const Icon = CATEGORY_ICONS[categoryStats.maxBurn.id?.toLowerCase()] || CATEGORY_ICONS.default;
              return <Icon size={32} className="text-white/40" />;
            })() : '🛡️'}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2">Dominant Outflow</p>
            {categoryStats.maxBurn ? (
              <div className="flex items-end gap-3">
                <h3 className="text-xl font-black text-white tracking-tighter uppercase">{categoryStats.maxBurn.id}</h3>
                <span className="text-sm font-black text-white/40 mb-1 tabular-nums">₹{categoryStats.maxBurn.amount.toLocaleString()}</span>
              </div>
            ) : (
              <h3 className="text-xl font-black text-white/10 tracking-tighter uppercase">No Outflow Recorded</h3>
            )}
          </div>
        </div>

        {/* Category Bar Graph Box */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6 text-center">Burn Distribution</p>
          <div className="space-y-4">
            {categoryStats.breakdown.length > 0 ? categoryStats.breakdown.slice(0, 3).map(([cat, amount], idx) => {
              const percentage = (amount / categoryStats.totalExpense) * 100;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black text-white/40 uppercase tracking-widest">
                    <span>{cat}</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className="h-full bg-accent/60 rounded-full"
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="h-12 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                <p className="text-[8px] font-black text-white/5 uppercase tracking-widest italic">Insufficient data for distribution map</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <Search size={18} className="text-white/20 ml-2" />
        <input 
          type="text"
          placeholder="SEARCH LEDGER..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[10px] font-black text-white placeholder:text-white/10 uppercase tracking-widest"
        />
        <div className="h-6 w-px bg-white/10 mx-2" />
        <button className="p-2 text-white/40 hover:text-white transition-colors">
          <Filter size={18} />
        </button>
      </div>

      {/* Ledger Table */}
      <div className="flex flex-col gap-2 relative">
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 rounded-3xl" />

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em]">
                <th className="px-6 py-4 text-left">Timestamp</th>
                <th className="px-6 py-4 text-left">Payee / Description</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-left">Account</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {dailyLogs.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan="6" className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl border-dashed">
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10">No records found for this cycle</p>
                    </td>
                  </motion.tr>
                ) : (
                  dailyLogs.map((log) => {
                    const Icon = CATEGORY_ICONS[log.category?.toLowerCase()] || CATEGORY_ICONS.default;
                    return (
                      <motion.tr 
                        key={log.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/0 hover:border-white/5 transition-all"
                      >
                        <td className="px-6 py-2 rounded-l-2xl">
                          <span className="text-[10px] font-black text-white/40 group-hover:text-white/60 tabular-nums">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                              <Icon size={14} />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-tight">{log.payee}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{log.category}</span>
                        </td>
                        <td className="px-6 py-2">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{log.account}</span>
                        </td>
                        <td className="px-6 py-2 text-right">
                          <span className={clsx(
                            "text-sm font-black tabular-nums tracking-tighter",
                            log.type === 'income' ? "text-green-400" : "text-white"
                          )}>
                            {log.type === 'income' ? '+' : '-'}₹{log.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-2 rounded-r-2xl text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(log)}
                              className="p-2 text-white/20 hover:text-accent transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(log.id)}
                              className="p-2 text-white/20 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
