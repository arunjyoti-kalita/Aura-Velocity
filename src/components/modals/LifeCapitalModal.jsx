import React from 'react';
import { X, AlertCircle, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useApp } from '../../contexts/useApp';
import clsx from 'clsx';

export function LifeCapitalModal({ onClose }) {
  const { neuralEfficiency, alignmentScore, isGhostMode } = useApp();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div 
        className="absolute inset-0 z-[-1]" 
        onClick={onClose}
      />
      
      <div className="w-full max-w-[420px] bg-[#14141c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col relative z-10">
            <h2 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">
              LIFE<span className="text-orange-500 ml-1">CAPITAL</span>
            </h2>
            <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Efficiency Audit Protocol</p>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all relative z-10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Efficiency Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10 text-center">
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-5xl font-black text-white tracking-tighter italic">
                    {Math.round(neuralEfficiency) || 0}
                  </span>
                  <span className="text-lg font-black text-white/20">%</span>
                </div>
                <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.3em] mt-2">Neural Efficiency</p>
              </div>
            </div>

            {isGhostMode ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="relative z-10 text-center">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-3xl font-black text-orange-400 tracking-tighter">
                      {Math.round(alignmentScore) || 0}
                    </span>
                    <span className="text-[12px] font-black text-orange-400/20">%</span>
                  </div>
                  <p className="text-[8px] font-black text-orange-400/60 uppercase tracking-[0.2em] mt-2">Ghost Alignment</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center opacity-40">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.1em] text-center">
                  Enable Ghost Mode to see Alignment
                </p>
              </div>
            )}
          </div>

          {/* Analysis */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <TrendingUp size={12} className="text-orange-500/40" />
              Cognitive ROI Analysis
            </h3>
            
            <div className="space-y-3">
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tight">Entropy Detected</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Unstructured blocks identified in your core workflow. Overall performance reduced by <span className="text-red-400 font-bold">12%</span> today.
                </p>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Sparkles size={24} className="text-orange-500" />
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-medium italic">
                  "Cognitive intensity is currently trailing intentionality. Re-align with Neural Protocols to optimize neural bandwidth."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={onClose}
            className="w-full py-3.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg hover:shadow-orange-500/5"
          >
            Acknowledge Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
