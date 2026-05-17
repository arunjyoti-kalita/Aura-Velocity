import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../contexts/useApp';
import { 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, 
  Target, Zap, PieChart, Activity, Calendar as CalendarIcon, Wallet
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth,
  isSameMonth, addMonths, subMonths, isSameDay, isWithinInterval
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
  const { financeLogs, financeSelectedDate, setFinanceSelectedDate, setActiveModule } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto scrollbar-hide">
      {/* Month Selector */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent">
            <PieChart size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{format(currentMonth, 'MMMM yyyy')}</h1>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Temporal Financial Audit</p>
          </div>
        </div>

        <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-2xl p-1">
          <button 
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-3 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-3 text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main Bar Chart - Flow Matrix */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shrink-0">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Flow Matrix</h3>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Dual-Bar Daily Ingress/Egress</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Intake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Output</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-1 h-32 overflow-x-auto pb-2 no-scrollbar">
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const { income, expense } = dailyStatsMap[dateKey] || { income: 0, expense: 0 };
            const CHART_HEIGHT_PX = 96; // matches h-32 minus label area
            const incomeHeight = income > 0 ? Math.max(4, (income / chartMax) * CHART_HEIGHT_PX) : 0;
            const expenseHeight = expense > 0 ? Math.max(4, (expense / chartMax) * CHART_HEIGHT_PX) : 0;
            const hasData = income > 0 || expense > 0;
            const isSelected = isSameDay(day, financeSelectedDate);

            return (
              <button 
                key={idx} 
                onClick={() => setFinanceSelectedDate(day)}
                className={clsx(
                  "flex-1 min-w-[20px] flex flex-col items-center gap-2 group transition-all",
                  isSelected ? "opacity-100" : "opacity-40 hover:opacity-80"
                )}
              >
                <div className="flex items-end gap-0.5 h-24 w-full justify-center">
                  {hasData ? (
                    <>
                      <div 
                        className="w-1.5 bg-green-500/70 rounded-t-full transition-all duration-700"
                        style={{ height: `${incomeHeight}px` }}
                      />
                      <div 
                        className="w-1.5 bg-red-500/70 rounded-t-full transition-all duration-700"
                        style={{ height: `${expenseHeight}px` }}
                      />
                    </>
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-white/10 mb-0 self-end" />
                  )}
                </div>
                <span className={clsx(
                  "text-[7px] font-black transition-colors",
                  isSelected ? "text-accent" : "text-white/20"
                )}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Temporal Deep Dive: Daily vs Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 shrink-0">
        {/* Daily Section */}
        <motion.div 
          key={financeSelectedDate.toISOString()}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 flex flex-col justify-between"
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Daily Income</p>
                <p className="text-lg font-black text-green-400">₹{activeDayStats.income.toLocaleString()}</p>
              </div>
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Daily Expense</p>
                <p className="text-lg font-black text-white">₹{activeDayStats.expense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 text-center">Highest Daily Burn</p>
            {topDayCategory ? (
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-2xl">
                  {CATEGORIES.find(c => c.id === topDayCategory.id)?.emoji || '📦'}
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase tracking-tight">{CATEGORIES.find(c => c.id === topDayCategory.id)?.label || topDayCategory.id}</p>
                  <p className="text-sm font-black text-accent tabular-nums">₹{topDayCategory.amount.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[10px] font-black text-white/5 uppercase tracking-widest">No Daily Outflow</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Monthly Section */}
        <motion.div 
          key={currentMonth.toISOString()}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-accent/[0.03] border border-accent/20 rounded-[1.5rem] p-5 flex flex-col justify-between relative overflow-hidden group"
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Monthly Income</p>
                <p className="text-lg font-black text-green-400">₹{monthlyTotals.income.toLocaleString()}</p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Monthly Expense</p>
                <p className="text-lg font-black text-white">₹{monthlyTotals.expense.toLocaleString()}</p>
              </div>
            </div>

            {/* Avg Daily Spend */}
            <div className="mt-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                  Avg Daily Burn &bull; {getDaysInMonth(currentMonth)} days
                </p>
                <p className="text-xl font-black text-accent tabular-nums tracking-tight">
                  ₹{monthlyTotals.expense > 0
                    ? Math.round(monthlyTotals.expense / getDaysInMonth(currentMonth)).toLocaleString()
                    : 0}
                  <span className="text-[10px] font-black text-white/20 ml-1">/day</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">
                  {format(currentMonth, 'MMMM')} &bull; {getDaysInMonth(currentMonth)}d
                </span>
                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/60 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, monthlyTotals.expense > 0 ? 100 : 0)}%` }}
                  />
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
                const percentage = monthlyTotals.expense > 0 ? Math.round((amount / monthlyTotals.expense) * 100) : 0;
                const category = CATEGORIES.find(c => c.id === cat);
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {category?.emoji || '📦'}
                        </span>
                        <span className="text-xs font-black text-white tracking-wide">{category?.label || cat}</span>
                      </div>
                      <span className="text-xs font-black text-white/60 tabular-nums">₹{amount.toLocaleString()}</span>
                    </div>
                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-gradient-to-r from-accent/20 to-accent rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
                      <span>0%</span>
                      <span>{percentage}% Allocation</span>
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
    </div>
  );
}
