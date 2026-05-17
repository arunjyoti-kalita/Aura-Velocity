import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../contexts/useApp';
import { 
  Plus, Trash2, Edit3, ChevronLeft, ChevronRight, 
  Calendar, Search, Filter, ArrowUpRight, ArrowDownRight, 
  Wallet, ShoppingCart, Coffee, Car, Home, Zap, Heart, Check, X
} from 'lucide-react';
import { format, isSameDay, isToday } from 'date-fns';
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

const CATEGORY_COLORS = {
  food:      'bg-orange-500',
  shopping:  'bg-pink-500',
  transport: 'bg-blue-500',
  housing:   'bg-purple-500',
  utilities: 'bg-yellow-500',
  health:    'bg-green-500',
  vice:      'bg-red-500',
  general:   'bg-white',
};

export function LedgerView() {
  const { 
    financeLogs, deleteFinanceLog, updateFinanceLog, setActiveModal, 
    triggerMechanicalFeedback, financeSelectedDate, setFinanceSelectedDate 
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', dir: 'desc' });
  const [filterActive, setFilterActive] = useState(false);
  
  const [editingLogId, setEditingLogId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const handleSort = (key) => setSortConfig(prev => ({
    key,
    dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
  }));

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

  // Sorted version of daily logs
  const sortedLogs = useMemo(() => {
    return [...dailyLogs].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? '';
      let bVal = b[sortConfig.key] ?? '';
      if (sortConfig.key === 'amount') { aVal = Number(aVal); bVal = Number(bVal); }
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dailyLogs, sortConfig]);

  // Sort header helper
  const SortTh = ({ label, sortKey, align = 'left' }) => {
    const active = sortConfig.key === sortKey;
    return (
      <th
        className={`px-4 py-2 text-${align} cursor-pointer select-none group`}
        onClick={() => handleSort(sortKey)}
      >
        <span className={clsx(
          'text-[10px] font-black uppercase tracking-[0.25em] transition-colors inline-flex items-center gap-1',
          active ? 'text-accent' : 'text-white/40 group-hover:text-white/60'
        )}>
          {label}
          <span className="text-[9px] opacity-70">
            {active ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        </span>
      </th>
    );
  };

  const dailyStats = useMemo(() => {
    return dailyLogs.reduce((acc, log) => {
      if (log.type === 'income') acc.income += log.amount;
      else acc.expense += log.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [dailyLogs]);

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
    setEditingLogId(log.id);
    setEditFormData({
      payee: log.payee,
      amount: log.amount,
      category: log.category || 'general',
      account: log.account || 'Axis',
      type: log.type,
      timestamp: log.timestamp
    });
  };

  const handleSaveEdit = () => {
    if (!editFormData.payee || !editFormData.amount) return;
    triggerMechanicalFeedback('clunk');
    updateFinanceLog(editingLogId, {
      ...editFormData,
      amount: parseFloat(editFormData.amount) || 0
    });
    setEditingLogId(null);
    setEditFormData({});
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditFormData({});
  };

  const delta = dailyStats.income - dailyStats.expense;

  return (
    <div className="flex flex-col gap-2 p-3 md:p-4 max-w-7xl mx-auto w-full h-full overflow-y-auto scrollbar-hide">

      {/* ── TOP NAV ── */}
      <div className="flex flex-col gap-4 mb-6 shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
            RESOURCE FLOW · LEDGER MODULE
          </span>
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-accent" />
            <h2 className="text-lg font-black text-white tracking-tighter">Transaction Ledger</h2>
          </div>
          <span className="text-[11px] font-black text-white/40">
            Manual input & verification · {format(financeSelectedDate, 'dd MMM yyyy')}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          {/* Date nav */}
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setFinanceSelectedDate(prev => {
                const next = new Date(prev); next.setDate(next.getDate() - 1); return next;
              })}
              className="p-1.5 text-white/30 hover:text-white transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-[11px] font-black text-white tracking-tight">
                {format(financeSelectedDate, 'dd MMM yyyy').toUpperCase()}
              </span>
              {isToday(financeSelectedDate) && (
                <span className="px-1.5 py-0.5 bg-accent/20 border border-accent/40 rounded text-[7px] font-black text-accent uppercase tracking-widest">Today</span>
              )}
            </div>
            <button
              onClick={() => setFinanceSelectedDate(prev => {
                const next = new Date(prev); next.setDate(next.getDate() + 1); return next;
              })}
              className="p-1.5 text-white/30 hover:text-white transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              const now = new Date();
              const entryDate = new Date(financeSelectedDate);
              entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
              setActiveModal({ type: 'add_transaction', data: { timestamp: entryDate.toISOString() } });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-bg-base rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_6px_20px_rgba(var(--color-accent),0.25)]"
          >
            <Plus size={13} strokeWidth={3} />
            <span>+ New Entry</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: METRIC CARDS (60px, horizontal) ── */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {/* Daily Intake — green */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 border-l-2 border-l-green-500/70">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={14} className="text-green-400 shrink-0" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">Daily intake</span>
          </div>
          <span className="text-[17px] font-black text-green-400 tabular-nums tracking-tight">
            ₹{dailyStats.income.toLocaleString()}
          </span>
        </div>

        {/* Daily Output — red/orange */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 border-l-2 border-l-red-400/60">
          <div className="flex items-center gap-2">
            <ArrowDownRight size={14} className="text-red-400/70 shrink-0" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">Daily output</span>
          </div>
          <span className="text-[17px] font-black text-red-400 tabular-nums tracking-tight">
            ₹{dailyStats.expense.toLocaleString()}
          </span>
        </div>

        {/* Daily Delta — neutral */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 border-l-2 border-l-white/20">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-white/30 shrink-0" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">Daily delta</span>
          </div>
          <span className={clsx(
            "text-[17px] font-black tabular-nums tracking-tight",
            delta >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {delta >= 0 ? '+' : ''}₹{delta.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── ROW 2: ANALYTICS (3-col, 80px) ── */}
      <div className="grid grid-cols-3 gap-2 shrink-0">

        {/* Col 1: Top Expense */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
            {categoryStats.maxBurn ? (() => {
              const Icon = CATEGORY_ICONS[categoryStats.maxBurn.id?.toLowerCase()] || CATEGORY_ICONS.default;
              return <Icon size={16} className="text-white/50" />;
            })() : <Wallet size={16} className="text-white/20" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-black text-accent uppercase tracking-[0.25em] mb-0.5">Top Expense</span>
            {categoryStats.maxBurn ? (
              <>
                <span className="text-[12px] font-black text-white uppercase tracking-tight truncate">
                  {categoryStats.maxBurn.id}
                </span>
                <span className="text-[10px] font-black text-white/50 tabular-nums">
                  ₹{categoryStats.maxBurn.amount.toLocaleString()}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-black text-white/20 uppercase">No Data</span>
            )}
          </div>
        </div>

        {/* Col 2: Burn Distribution */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.25em] block mb-2">Burn Distribution</span>
          {categoryStats.breakdown.length > 0 ? (
            <div className="space-y-1.5">
              {categoryStats.breakdown.slice(0, 2).map(([cat, amount], idx) => {
                const pct = categoryStats.totalExpense > 0
                  ? Math.round((amount / categoryStats.totalExpense) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-white/40 uppercase w-12 truncate shrink-0">{cat}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className="h-full bg-accent/70 rounded-full"
                      />
                    </div>
                    <span className="text-[8px] font-black text-white/50 tabular-nums w-7 text-right shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-8 border border-dashed border-white/10 rounded-lg">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">No data</span>
            </div>
          )}
        </div>

        {/* Col 3: Daily Spend by Category — horizontal mini bar chart */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.25em] block mb-2">Daily by Category</span>
          {categoryStats.breakdown.length > 0 ? (
            <div className="space-y-1.5">
              {categoryStats.breakdown.slice(0, 3).map(([cat, amount], idx) => {
                const barPct = categoryStats.totalExpense > 0
                  ? Math.max(8, (amount / categoryStats.totalExpense) * 100) : 8;
                const colorClass = CATEGORY_COLORS[cat] || 'bg-white';
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', colorClass)} />
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className={clsx('h-full rounded-full opacity-70', colorClass)}
                      />
                    </div>
                    <span className="text-[8px] font-black text-white/50 tabular-nums w-12 text-right shrink-0">
                      ₹{amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-8 border border-dashed border-white/10 rounded-lg">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">No data</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: SEARCH BAR (36px) ── */}
      <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-3 h-9 shrink-0">
        <Search size={13} className="text-white/30 shrink-0" />
        <input
          type="text"
          placeholder="Search ledger..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[12px] font-medium text-white placeholder:text-white/20 tracking-wide"
        />
        <div className="h-4 w-px bg-white/10" />
        <button
          onClick={() => setFilterActive(p => !p)}
          className={clsx(
            'relative p-1 transition-colors',
            filterActive ? 'text-accent' : 'text-white/30 hover:text-white'
          )}
        >
          <Filter size={13} />
          {filterActive && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full" />
          )}
        </button>
      </div>

      {/* ── ROW 4: LEDGER TABLE ── */}
      <div className="flex-1 flex flex-col gap-0 relative min-h-0">
        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_2px] z-50 rounded-2xl" />

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-1">
            <thead>
              <tr>
                <SortTh label="Time"     sortKey="timestamp" />
                <SortTh label="Payee"    sortKey="payee" />
                <SortTh label="Category" sortKey="category" />
                <SortTh label="Account"  sortKey="account" />
                <SortTh label="Amount"   sortKey="amount" align="right" />
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {sortedLogs.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan="6" className="text-center py-8">
                      <div className="flex flex-col items-center gap-4 border border-dashed border-white/10 rounded-2xl py-10 bg-white/[0.01]">
                        <Wallet size={22} className="text-white/10" />
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">No entries for this day</p>
                          <p className="text-[9px] font-black text-white/15 uppercase tracking-widest">Log your first transaction below</p>
                        </div>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const entryDate = new Date(financeSelectedDate);
                            entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                            setActiveModal({ type: 'add_transaction', data: { timestamp: entryDate.toISOString() } });
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-accent/10 border border-accent/30 text-accent rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-accent hover:text-bg-base transition-all"
                        >
                          <Plus size={12} strokeWidth={3} />
                          New Entry
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  sortedLogs.map((log) => {
                    const Icon = CATEGORY_ICONS[log.category?.toLowerCase()] || CATEGORY_ICONS.default;
                    
                    if (editingLogId === log.id) {
                      return (
                        <motion.tr
                          key={log.id}
                          layout
                          className="bg-white/[0.05] border border-white/10"
                        >
                          <td className="px-4 py-2 rounded-l-xl">
                            <span className="text-[10px] font-black text-white/50 tabular-nums">
                              {format(new Date(log.timestamp), 'HH:mm')}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              autoFocus
                              value={editFormData.payee || ''}
                              onChange={e => setEditFormData(prev => ({...prev, payee: e.target.value}))}
                              className="w-full bg-transparent border-b border-white/20 text-[11px] font-black text-white uppercase tracking-tight focus:outline-none focus:border-accent"
                              placeholder="PAYEE"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editFormData.category || 'general'}
                              onChange={e => setEditFormData(prev => ({...prev, category: e.target.value}))}
                              className="w-full bg-bg-base border border-white/10 text-[10px] font-black text-white/80 uppercase tracking-widest rounded px-1 py-0.5 focus:outline-none focus:border-accent"
                            >
                              {Object.keys(CATEGORY_ICONS).filter(k => k !== 'default').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editFormData.account || 'Axis'}
                              onChange={e => setEditFormData(prev => ({...prev, account: e.target.value}))}
                              className="w-full bg-bg-base border border-white/10 text-[10px] font-black text-white/80 uppercase tracking-widest rounded px-1 py-0.5 focus:outline-none focus:border-accent"
                            >
                              <option value="Axis">Axis</option>
                              <option value="ICICI">ICICI</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <select
                                value={editFormData.type || 'expense'}
                                onChange={e => setEditFormData(prev => ({...prev, type: e.target.value}))}
                                className="bg-transparent text-[13px] font-black tracking-tight focus:outline-none"
                              >
                                <option value="income">+</option>
                                <option value="expense">-</option>
                              </select>
                              <input
                                type="number"
                                value={editFormData.amount || ''}
                                onChange={e => setEditFormData(prev => ({...prev, amount: e.target.value}))}
                                className={clsx(
                                  "w-20 bg-transparent border-b border-white/20 text-[13px] font-black tabular-nums tracking-tight text-right focus:outline-none focus:border-accent",
                                  editFormData.type === 'income' ? "text-green-400" : "text-red-400"
                                )}
                                placeholder="0"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 rounded-r-xl text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={handleSaveEdit}
                                className="p-1.5 text-green-400 hover:text-green-300 transition-colors rounded-md hover:bg-green-400/10"
                              >
                                <Check size={14} strokeWidth={3} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-md hover:bg-white/5"
                              >
                                <X size={14} strokeWidth={3} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    }

                    return (
                      <motion.tr
                        key={log.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/0 hover:border-white/5 transition-all"
                      >
                        <td className="px-4 py-2 rounded-l-xl">
                          <span className="text-[10px] font-black text-white/50 group-hover:text-white/70 tabular-nums">
                            {format(new Date(log.timestamp), 'HH:mm')}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                              <Icon size={12} />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[120px]">
                              {log.payee}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                            {log.category || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                            {log.account || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={clsx(
                            "text-[13px] font-black tabular-nums tracking-tight",
                            log.type === 'income' ? "text-green-400" : "text-red-400"
                          )}>
                            {log.type === 'income' ? '+' : '-'}₹{log.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2 rounded-r-xl text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(log)}
                              className="p-1.5 text-white/30 hover:text-accent transition-colors rounded-md hover:bg-white/5"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/5"
                            >
                              <Trash2 size={12} />
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
