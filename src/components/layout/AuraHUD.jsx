import React, { useMemo } from 'react';
import { useApp } from '../../contexts/useApp';
import { getRankInfo } from '../../utils/gamificationUtils';
import { Shield, Zap, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export const AuraHUD = () => {
  const { auraScore } = useApp();
  
  const rank = useMemo(() => getRankInfo(auraScore), [auraScore]);

  return (
    <div className="flex items-center gap-3 px-3 py-1 overflow-hidden group h-8">
      {/* Level Hex */}
      <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
        <div 
          className="absolute inset-0 opacity-20 blur-sm animate-pulse"
          style={{ backgroundColor: rank.color }}
        />
        <div 
          className="relative z-10 font-black text-xs italic tracking-tighter"
          style={{ color: rank.color }}
        >
          {rank.level}
        </div>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/5"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${rank.progress}, 100`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ color: rank.color }}
          />
        </svg>
      </div>

      {/* Rank Info */}
      <div className="flex flex-col gap-0 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white/30 leading-none">
            Rank
          </span>
          <div className="flex items-center gap-0.5 px-1 py-0 rounded-full bg-white/5 border border-white/10">
            <TrendingUp size={6} className="text-emerald-400" />
            <span className="text-[7px] font-bold text-emerald-400 tabular-nums leading-none">
              +{Math.round(auraScore / 100)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <h2 className="text-[9px] font-black text-white tracking-tight leading-none uppercase">
            {rank.title}
          </h2>
          <div className="h-0.5 w-12 bg-white/5 rounded-full overflow-hidden shrink-0">
            <div 
              className="h-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${rank.progress}%`,
                backgroundColor: rank.color,
                boxShadow: `0 0 8px ${rank.color}`
              }}
            />
          </div>
        </div>
      </div>

      {/* Total Aura Badge */}
      <div className="ml-1 pl-3 border-l border-white/10 flex flex-col items-start justify-center">
        <span className="text-[6px] font-black uppercase tracking-widest text-white/20 leading-none">Aura</span>
        <div className="flex items-center gap-1">
          <Zap size={8} style={{ color: rank.color }} className="fill-current" />
          <span className="text-[10px] font-black text-white tabular-nums tracking-tighter leading-none">
            {auraScore.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
