import React from 'react';
import { useApp } from "../../contexts/useApp";
import { Trash2, Move, X } from 'lucide-react';

export function FloatingActionBar() {
  const { selectedLogIds, setSelectedLogIds, deleteSelection, moveSelection } = useApp();

  if (selectedLogIds.length < 2) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 px-6 py-3 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
          <div className="flex items-center justify-center w-6 h-6 bg-orange-500 rounded-full">
            <span className="text-[11px] font-black text-white">{selectedLogIds.length}</span>
          </div>
          <span className="text-sm font-bold text-white uppercase tracking-widest whitespace-nowrap">Selected</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => moveSelection(-30)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest"
          >
            <Move size={14} className="-rotate-90" />
            Move Up
          </button>
          <button 
            onClick={() => moveSelection(30)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest"
          >
            <Move size={14} className="rotate-90" />
            Move Down
          </button>
          <button 
            onClick={deleteSelection}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest ml-2"
          >
            <Trash2 size={14} />
            Delete All
          </button>
        </div>

        <button 
          onClick={() => setSelectedLogIds([])}
          className="ml-4 p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-lg transition-all"
          title="Cancel Selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
