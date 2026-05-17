import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../contexts/useApp';
import { 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, 
  Target, Zap, PieChart, Activity, Calendar as CalendarIcon, Wallet, Plus
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth,
  isSameMonth, addMonths, subMonths, isSameDay, isWithinInterval, subDays
} from 'date-fns';
import clsx from 'clsx';

const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', emoji: '🍜' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'housing', label: 'Housing', emoji: '🏠' },
  { id: 'utilities', label: 'Utilities', emoji: '⚡' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'vice', label: 'Vice Log', emoji: '🚬' },
  { id: 'income', label: 'Income', emoji: '💰' },
  { id: 'general', label: 'General', emoji: '📦' }
];

export function MonthlyView() {
  const { 
    financeLogs, financeSelectedDate, setFinanceSelectedDate, 
    setActiveModule, setActiveModal, financeBudgets, 
    setFinanceBudgets, triggerMechanicalFeedback 
  } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetInputValue, setBudgetInputValue] = useState("");

  // Safe logs access
  const allLogs = useMemo(() => Array.isArray(financeLogs) ? financeLogs : [], [financeLogs]);
  
  // Date boundaries for the selected month
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  
  // All days in the current month for the grid
  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    } catch (e) {
      console.error("Date calculation error:", e);
      return [];
    }
  }, [monthStart, monthEnd]);

  // Filter logs for this month only
  const monthlyLogs = useMemo(() => {
    return allLogs.filter(log => 
      log && log.timestamp && isWithinInterval(new Date(log.timestamp), { start: monthStart, end: monthEnd })
    );
  }, [allLogs, monthStart, monthEnd]);

  // Daily statistics map (dateKey -> {income, expense, logs})
  const dailyStatsMap = useMemo(() => {
    const statsAccumulator = {};
    monthlyLogs.forEach(log => {
      try {
        const dateKey = format(new Date(log.timestamp), 'yyyy-MM-dd');
        if (!statsAccumulator[dateKey]) {
          statsAccumulator[dateKey] = { income: 0, expense: 0, logs: [] };
        }
        if (log.type === 'income') {
          statsAccumulator[dateKey].income += (log.amount || 0);
        } else {
          statsAccumulator[dateKey].expense += (log.amount || 0);
        }
        statsAccumulator[dateKey].logs.push(log);
      } catch (e) {
        console.error("Log processing error:", e);
      }
    });
    return statsAccumulator;
  }, [monthlyLogs]);

  // Aggregate monthly totals and categories
  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categories = {};

    monthlyLogs.forEach(log => {
      if (log.type === 'income') {
        income += (log.amount || 0);
      } else {
        expense += (log.amount || 0);
        const cat = log.category || 'general';
        categories[cat] = (categories[cat] || 0) + (log.amount || 0);
      }
    });

    return { income, expense, categories };
  }, [monthlyLogs]);

  // Max value for chart scaling (minimum 1000)
  const chartMax = useMemo(() => {
    const dailyValues = Object.values(dailyStatsMap).flatMap(s => [s.income, s.expense]);
    return Math.max(...dailyValues, 1000);
  }, [dailyStatsMap]);

  // Stats for the currently selected day
  const activeDayStats = useMemo(() => {
    const dateKey = format(financeSelectedDate, 'yyyy-MM-dd');
    return dailyStatsMap[dateKey] || { income: 0, expense: 0, logs: [] };
  }, [financeSelectedDate, dailyStatsMap]);

  // Calculate top category for selected day
  const topDayCategory = useMemo(() => {
    const categories = {};
    activeDayStats.logs.forEach(log => {
      if (log.type === 'expense') {
        const cat = log.category || 'general';
        categories[cat] = (categories[cat] || 0) + (log.amount || 0);
      }
    });
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { id: sorted[0][0], amount: sorted[0][1] } : null;
  }, [activeDayStats]);

  // Calculate top category for current month
  const topMonthCategory = useMemo(() => {
    const sorted = Object.entries(monthlyTotals.categories).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? { id: sorted[0][0], amount: sorted[0][1] } : null;
  }, [monthlyTotals]);

  // 7-day sparkline data per category (last 7 days of spend)
  const categorySparklines = useMemo(() => {
    const today = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) =>
      format(subDays(today, 6 - i), 'yyyy-MM-dd')
    );
    const result = {};
    Object.keys(monthlyTotals.categories).forEach(cat => {
      result[cat] = last7.map(dk => {
        return allLogs
          .filter(l => l.category === cat && l.type === 'expense' &&
            l.timestamp && format(new Date(l.timestamp), 'yyyy-MM-dd') === dk)
          .reduce((sum, l) => sum + (l.amount || 0), 0);
      });
    });
    return result;
  }, [allLogs, monthlyTotals.categories]);

  // Biggest single expense this month
  const biggestExpense = useMemo(() => {
    const expenses = monthlyLogs.filter(l => l.type === 'expense');
    if (!expenses.length) return null;
    return expenses.reduce((max, l) => (l.amount > (max?.amount || 0) ? l : max), null);
  }, [monthlyLogs]);

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto scrollbar-hide">
      {/* ── TOP NAV ── */}
      <div className="flex flex-col gap-4 mb-6 shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
            RESOURCE FLOW · MONTHLY MODULE
          </span>
          <div className="flex items-center gap-2">
            <PieChart size={20} className="text-accent" />
            <h2 className="text-lg font-black text-white tracking-tighter">Monthly Audit</h2>
          </div>
          <span className="text-[11px] font-black text-white/40">
            Temporal financial audit · {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          {/* Date nav */}
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-1.5 text-white/30 hover:text-white transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-[11px] font-black text-white tracking-tight">
                {format(currentMonth, 'MMM yyyy').toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-1.5 text-white/30 hover:text-white transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              const now = new Date();
              const entryDate = new Date();
              entryDate.setFullYear(currentMonth.getFullYear(), currentMonth.getMonth(), now.getDate());
              setActiveModal({ type: 'add_transaction', data: { timestamp: entryDate.toISOString() } });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-bg-base rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_6px_20px_rgba(var(--color-accent),0.25)]"
          >
            <Plus size={13} strokeWidth={3} />
            <span>+ New Entry</span>
          </button>
        </div>
      </div>

      {/* Main Bar Chart - Flow Matrix */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-black text-white tracking-[0.2em]">Flow matrix <span className="text-white/30">—</span> daily intake vs output</h3>
            <p className="text-[8px] font-black text-white/20 tracking-widest mt-0.5">{format(currentMonth, 'MMMM yyyy')}</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Intake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Output</span>
            </div>
          </div>
        </div>

        {/* Baseline rule */}
        <div className="relative">
          <div className="flex items-end justify-between gap-px h-20 overflow-x-auto no-scrollbar">
            {days.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const { income, expense } = dailyStatsMap[dateKey] || { income: 0, expense: 0 };
              const CHART_HEIGHT_PX = 60;
              const incomeHeight = income > 0 ? Math.max(4, (income / chartMax) * CHART_HEIGHT_PX) : 0;
              const expenseHeight = expense > 0 ? Math.max(4, (expense / chartMax) * CHART_HEIGHT_PX) : 0;
              const hasData = income > 0 || expense > 0;
              const isSelected = isSameDay(day, financeSelectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  onClick={() => setFinanceSelectedDate(day)}
                  className={clsx(
                    "flex-1 min-w-[16px] flex flex-col items-center gap-1.5 group transition-all",
                    isSelected ? "opacity-100" : "opacity-50 hover:opacity-90"
                  )}
                >
                  <div className="flex items-end gap-px h-[60px] w-full justify-center">
                    {hasData ? (
                      <>
                        <div
                          className={clsx(
                            "w-1 rounded-t-full transition-all duration-500",
                            isToday ? "bg-green-400" : "bg-green-500/40"
                          )}
                          style={{ height: `${incomeHeight}px` }}
                        />
                        <div
                          className={clsx(
                            "w-1 rounded-t-full transition-all duration-500",
                            isToday ? "bg-accent" : "bg-white/20"
                          )}
                          style={{ height: `${expenseHeight}px` }}
                        />
                      </>
                    ) : (
                      <div className="w-px h-1 bg-white/5 self-end" />
                    )}
                  </div>
                  <span className={clsx(
                    "text-[7px] font-black transition-colors",
                    isToday ? "text-accent" : isSelected ? "text-white/70" : "text-white/20"
                  )}>
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Baseline rule */}
          <div className="absolute bottom-6 left-0 right-0 h-px bg-white/5 pointer-events-none" />
        </div>
        
        {/* Heatmap */}
        <div className="mt-8">
          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Burn Intensity</h4>
          <div className="flex flex-wrap gap-1">
            {days.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const { expense } = dailyStatsMap[dateKey] || { expense: 0 };
              
              let intensityClass = "bg-white/5";
              if (expense > 0) {
                const ratio = expense / chartMax;
                if (ratio > 0.6) intensityClass = "bg-red-500/80";
                else if (ratio > 0.3) intensityClass = "bg-orange-500/60";
                else intensityClass = "bg-accent/40";
              }

              return (
                <button
                  key={idx}
                  onClick={() => setFinanceSelectedDate(day)}
                  title={`${format(day, 'MMM d')}: ₹${expense}`}
                  className={clsx(
                    "w-4 h-4 rounded-[3px] transition-all hover:border hover:border-white/40",
                    intensityClass,
                    isSameDay(day, financeSelectedDate) ? "border border-white ring-1 ring-white/50 z-10" : "border border-white/0"
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Temporal Deep Dive: Daily vs Monthly — 40/60 asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 shrink-0">
        {/* Daily Section */}
        <motion.div
          key={financeSelectedDate.toISOString()}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2">{format(financeSelectedDate, 'EEEE')}</p>
                <h2 className="text-2xl font-black text-white tracking-tighter">{format(financeSelectedDate, 'MMMM do, yyyy')}</h2>
              </div>
              <button 
                onClick={() => setActiveModule('finance-ledger')}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-accent hover:bg-white/10 transition-all group"
                title="View in Ledger"
              >
                <Wallet size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl border-l-2 border-l-green-500/60">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Daily income</p>
                <p className="text-lg font-black text-green-400">₹{activeDayStats.income.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl border-l-2 border-l-accent/60">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Daily expense</p>
                <p className="text-lg font-black text-white">₹{activeDayStats.expense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Only show burn section when there's data — avoids dead space */}
          {topDayCategory && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 text-center">Highest daily burn</p>
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-xl">
                  {CATEGORIES.find(c => c.id === topDayCategory.id)?.emoji || '📦'}
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase tracking-tight">{CATEGORIES.find(c => c.id === topDayCategory.id)?.label || topDayCategory.id}</p>
                  <p className="text-sm font-black text-accent tabular-nums">₹{topDayCategory.amount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Monthly Section */}
        <motion.div
          key={currentMonth.toISOString()}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 bg-accent/[0.03] border border-accent/20 rounded-[1.5rem] p-5 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2">Audit Period</p>
                <h2 className="text-2xl font-black text-white tracking-tighter">{format(currentMonth, 'MMMM yyyy')}</h2>
              </div>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
                <button 
                  onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                  className="p-3 text-white/40 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                  className="p-3 text-white/40 hover:text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl border-l-2 border-l-green-500/60">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Monthly income</p>
                <p className="text-lg font-black text-green-400">₹{monthlyTotals.income.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl border-l-2 border-l-accent/70">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Monthly expense</p>
                <p className="text-lg font-black text-white">₹{monthlyTotals.expense.toLocaleString()}</p>
              </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {/* Avg Daily Spend */}
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col justify-between">
                <div>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                    Avg Daily Burn
                  </p>
                  <p className="text-xl font-black text-accent tabular-nums tracking-tight">
                    ₹{monthlyTotals.expense > 0
                      ? Math.round(monthlyTotals.expense / getDaysInMonth(currentMonth)).toLocaleString()
                      : 0}
                    <span className="text-[10px] font-black text-white/20 ml-1">/day</span>
                  </p>
                </div>
              </div>
              
              {/* Savings Rate */}
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col justify-between">
                <div>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                    Savings Rate
                  </p>
                  <p className="text-xl font-black text-white tabular-nums tracking-tight">
                    {monthlyTotals.income > 0 
                      ? Math.round(((monthlyTotals.income - monthlyTotals.expense) / monthlyTotals.income) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 text-center">Dominant Monthly Burn</p>
            {topMonthCategory ? (
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-[1.5rem] flex items-center justify-center text-2xl">
                  {CATEGORIES.find(c => c.id === topMonthCategory.id)?.emoji || '📦'}
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase tracking-tight">{CATEGORIES.find(c => c.id === topMonthCategory.id)?.label || topMonthCategory.id}</p>
                  <p className="text-sm font-black text-accent tabular-nums">₹{topMonthCategory.amount.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[10px] font-black text-white/5 uppercase tracking-widest">No Monthly Outflow</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Allocation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0 pb-12">
        <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Resource Allocation</h3>
            <PieChart size={14} className="text-accent" />
          </div>
          <div className="space-y-8">
            {Object.entries(monthlyTotals.categories)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => {
                const budget = financeBudgets[cat];
                const percentage = budget > 0 
                  ? Math.round((amount / budget) * 100)
                  : (monthlyTotals.expense > 0 ? Math.round((amount / monthlyTotals.expense) * 100) : 0);
                const category = CATEGORIES.find(c => c.id === cat);
                const sparkData = categorySparklines[cat] || [];
                const sparkMax = Math.max(...sparkData, 1);
                const sparkW = 48, sparkH = 16;
                const pts = sparkData.map((v, i) => {
                  const x = sparkData.length > 1 ? (i / (sparkData.length - 1)) * sparkW : sparkW / 2;
                  const y = sparkH - (v / sparkMax) * sparkH;
                  return `${x},${y}`;
                }).join(' ');
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{category?.emoji || '📦'}</span>
                        <span className="text-xs font-black text-white tracking-wide">{category?.label || cat}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Sparkline — boosted for visibility */}
                        {sparkData.some(v => v > 0) && (() => {
                          const sparkW = 56, sparkH = 22;
                          const sparkMax2 = Math.max(...sparkData, 1);
                          const pts2 = sparkData.map((v, i) => {
                            const x = sparkData.length > 1 ? (i / (sparkData.length - 1)) * sparkW : sparkW / 2;
                            const y = sparkH - (v / sparkMax2) * (sparkH - 2) - 1;
                            return `${x},${y}`;
                          }).join(' ');
                          return (
                            <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} className="opacity-80">
                              <polyline
                                points={pts2}
                                fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="text-accent"
                              />
                            </svg>
                          );
                        })()}
                        <span className="text-xs font-black text-white/60 tabular-nums">₹{amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        className={clsx(
                          "h-full rounded-full",
                          percentage > 100 ? "bg-red-500" : "bg-gradient-to-r from-accent/20 to-accent"
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-black text-white/20 uppercase tracking-widest">
                      {editingBudget === cat ? (
                        <div className="flex items-center gap-1">
                          <span className="text-white">₹</span>
                          <input
                            autoFocus
                            type="number"
                            value={budgetInputValue}
                            onChange={(e) => setBudgetInputValue(e.target.value)}
                            onBlur={() => {
                              setFinanceBudgets(prev => ({ ...prev, [cat]: parseFloat(budgetInputValue) || 0 }));
                              setEditingBudget(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setFinanceBudgets(prev => ({ ...prev, [cat]: parseFloat(budgetInputValue) || 0 }));
                                setEditingBudget(null);
                              }
                            }}
                            className="bg-transparent border-b border-white/20 text-white w-16 focus:outline-none"
                            placeholder="Budget"
                          />
                        </div>
                      ) : (
                        <button onClick={() => { setEditingBudget(cat); setBudgetInputValue(budget || ''); }} className="hover:text-white transition-colors cursor-pointer text-left">
                          {budget ? `BUDGET: ₹${budget.toLocaleString()}` : '+ SET BUDGET'}
                        </button>
                      )}
                      <span>{percentage}% of {budget ? 'budget' : 'spend'}</span>
                    </div>
                  </div>
                );
              })}
            {Object.keys(monthlyTotals.categories).length === 0 && (
              <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] text-center py-12">No categorical data</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* High-Level Pulse Cards */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={120} strokeWidth={1} />
            </div>
            <div>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Savings Velocity</span>
              <p className="text-3xl font-black text-white tracking-tighter mt-2">
                {monthlyTotals.income > 0 ? Math.round(((monthlyTotals.income - monthlyTotals.expense) / monthlyTotals.income) * 100) : 0}%
              </p>
            </div>
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Protocol Efficiency Optimized</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Target size={120} strokeWidth={1} />
            </div>
            <div>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Total Intake</span>
              <p className="text-3xl font-black text-green-400 tracking-tighter mt-2">
                ₹{monthlyTotals.income.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Capital Influx Verified</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MONTHLY INSIGHTS DIGEST — hero section ── */}
      {monthlyTotals.expense > 0 && (
        <div className="shrink-0 relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.08] via-accent/[0.04] to-transparent p-6">
          {/* Warm glow */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">
              Monthly digest — {format(currentMonth, 'MMMM yyyy')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dominant category */}
            {topMonthCategory && (() => {
              const cat = CATEGORIES.find(c => c.id === topMonthCategory.id);
              const pct = Math.round((topMonthCategory.amount / monthlyTotals.expense) * 100);
              return (
                <div className="flex flex-col gap-1">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Dominant category</p>
                  <p className="text-3xl font-black text-white tracking-tighter leading-none mt-1">
                    {cat?.label || topMonthCategory.id}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-accent/20 border border-accent/30 rounded-lg text-[10px] font-black text-accent">
                      {pct}% of spend
                    </span>
                    <span className="text-lg">{cat?.emoji || '📦'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Biggest transaction */}
            {biggestExpense && (
              <div className="flex flex-col gap-1">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Biggest transaction</p>
                <p className="text-3xl font-black text-accent tracking-tighter leading-none mt-1 tabular-nums">
                  ₹{biggestExpense.amount.toLocaleString()}
                </p>
                <p className="text-[11px] font-black text-white/60 mt-2">
                  {biggestExpense.payee || 'Unknown'} · {format(new Date(biggestExpense.timestamp), 'dd MMM')}
                </p>
              </div>
            )}

            {/* Pace projection */}
            {(() => {
              const today = new Date();
              const totalDays = getDaysInMonth(currentMonth);
              const dayOfMonth = today.getMonth() === currentMonth.getMonth() &&
                today.getFullYear() === currentMonth.getFullYear()
                ? today.getDate() : totalDays;
              const remaining = totalDays - dayOfMonth;
              const projectedTotal = dayOfMonth > 0
                ? Math.round((monthlyTotals.expense / dayOfMonth) * totalDays) : 0;
              return (
                <div className="flex flex-col gap-1">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Pace projection</p>
                  <p className="text-3xl font-black text-white tracking-tighter leading-none mt-1 tabular-nums">
                    ₹{projectedTotal.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    {remaining > 0 ? (
                      <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] font-black text-green-400">
                        {remaining}d remaining
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40">
                        Month closed
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
