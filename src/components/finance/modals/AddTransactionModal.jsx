import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../../contexts/useApp';
import { X, Wallet, ArrowUpRight, ArrowDownRight, Tag, User, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', emoji: '🍜' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'housing', label: 'Housing', emoji: '🏠' },
  { id: 'utilities', label: 'Utilities', emoji: '⚡' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'income', label: 'Income', emoji: '💰' },
  { id: 'general', label: 'General', emoji: '📦' }
];

export function AddTransactionModal({ onClose }) {
  const { addFinanceLog, updateFinanceLog, activeModal, triggerMechanicalFeedback } = useApp();
  const initialData = activeModal?.data || {};
  const isEdit = !!initialData.id;

  const [type, setType] = useState(initialData.type || 'expense');
  const [amount, setAmount] = useState(initialData.amount || '');
  const [payee, setPayee] = useState(initialData.payee || '');
  const [category, setCategory] = useState(initialData.category || 'general');
  const [account, setAccount] = useState(initialData.account || 'Main Bank');
  const [date, setDate] = useState(format(new Date(initialData.timestamp || new Date()), 'yyyy-MM-dd'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;

    const logData = {
      type,
      amount: parseFloat(amount),
      payee: payee || (type === 'income' ? 'Direct Deposit' : (CATEGORIES.find(c => c.id === category)?.label || 'General Purchase')),
      category,
      account,
      timestamp: `${date}T${new Date(initialData.timestamp || new Date()).toISOString().split('T')[1]}`
    };

    if (isEdit) {
      updateFinanceLog(initialData.id, logData);
    } else {
      addFinanceLog(logData);
    }
    
    triggerMechanicalFeedback(type); // Uses the 'income' or 'expense' type
    onClose();
  };

  const handleTypeToggle = (newType) => {
    setType(newType);
    triggerMechanicalFeedback('click');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-[#0a0a0c] border border-white/10 rounded-[1.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header - Terminal Style */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Protocol: {isEdit ? 'Modification' : 'Ingest'}</p>
            <h2 className="text-xl font-black text-white tracking-tight mt-1">{isEdit ? 'Transaction Amendment' : 'Transaction Initialization'}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/20 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* Amount Slot - The "Mechanical" Centerpiece */}
          <div className="relative group">
            <div className="absolute -top-3 left-4 px-2 bg-[#0a0a0c] z-10">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Coin Slot / Amount</span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-6 text-4xl font-black text-white/20 tracking-tighter">₹</span>
              <input 
                autoFocus
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/[0.01] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-4xl font-black text-white outline-none focus:border-accent/40 focus:bg-accent/[0.02] transition-all placeholder:text-white/5 tabular-nums tracking-tighter"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="w-1 h-8 bg-accent/20 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Type Toggle - Tactile Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleTypeToggle('expense')}
              className={clsx(
                "flex items-center justify-center gap-3 py-2.5 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest",
                type === 'expense' 
                  ? "bg-white/5 border-white/20 text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]" 
                  : "bg-transparent border-white/5 text-white/20 hover:text-white/40"
              )}
            >
              <ArrowDownRight size={16} />
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeToggle('income')}
              className={clsx(
                "flex items-center justify-center gap-3 py-2.5 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest",
                type === 'income' 
                  ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[inset_0_2px_10px_rgba(74,222,128,0.1)]" 
                  : "bg-transparent border-white/5 text-white/20 hover:text-white/40"
              )}
            >
              <ArrowUpRight size={16} />
              Income
            </button>
          </div>

          {/* Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                <User size={10} /> Payee / Source
              </label>
              <input 
                type="text"
                placeholder="e.g. Starbucks, Salary"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-white/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                <Tag size={10} /> Category
              </label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-[#121216]">
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                <CreditCard size={10} /> Funding Source
              </label>
              <input 
                type="text"
                placeholder="e.g. HDFC Credit Card, Cash"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-white/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                <Calendar size={10} /> Operation Date
              </label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-white/20 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-accent text-bg-base rounded-xl font-black text-[12px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(var(--color-accent),0.3)] mt-2"
          >
            {isEdit ? 'Commit Changes' : 'Finalize Entry'}
          </button>
        </form>

        {/* Scanline Effect overlay for the modal */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </motion.div>
    </div>
  );
}
