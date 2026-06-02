import React, { useMemo } from 'react';
import { X, AlertCircle, Sparkles, TrendingUp, Zap, Droplet, Pill, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../contexts/useApp';
import { format } from 'date-fns';
import clsx from 'clsx';

// Simple local helper to compute log duration in minutes
const calculateLogDuration = (log) => {
  if (!log.startTime) return 0;
  const [sh, sm] = log.startTime.split(':').map(Number);
  const [eh, em] = (log.endTime || log.startTime).split(':').map(Number);
  let durationMins = (eh * 60 + em) - (sh * 60 + sm);
  if (durationMins <= 0) durationMins += 24 * 60;
  return durationMins;
};

export function LifeCapitalModal({ onClose }) {
  const { 
    neuralEfficiency = 0, 
    alignmentScore = 0, 
    isGhostMode, 
    waterIntake = 0, 
    meds = [],
    logs = [],
    currentDate = new Date(),
    activities = [],
    blueprints = {},
    isDeepWork
  } = useApp();

  // 1. Biometric Score Calculation
  const waterScore = Math.min(100, Math.round((waterIntake / 8) * 100));
  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.taken).length;
  const medsScore = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;
  const biologicalScore = Math.round((waterScore + medsScore) / 2);

  // 2. Overall Life Capital Score
  const overallLifeCapital = useMemo(() => {
    if (isGhostMode) {
      return Math.round((neuralEfficiency * 0.4) + (alignmentScore * 0.3) + (biologicalScore * 0.3));
    }
    return Math.round((neuralEfficiency * 0.6) + (biologicalScore * 0.4));
  }, [neuralEfficiency, alignmentScore, biologicalScore, isGhostMode]);

  // 3. Focus Entropy and Logs Telemetry
  const dayStr = useMemo(() => {
    try {
      return format(currentDate, 'yyyy-MM-dd');
    } catch (e) {
      return format(new Date(), 'yyyy-MM-dd');
    }
  }, [currentDate]);

  const dayLogs = useMemo(() => {
    return logs.filter(l => l.date === dayStr);
  }, [logs, dayStr]);

  const stats = useMemo(() => {
    let deepWorkMins = 0;
    let boondoggleMins = 0;
    let lowRegretMins = 0;
    let totalActiveMins = 0;

    dayLogs.forEach(log => {
      const duration = calculateLogDuration(log);
      
      // Exclude base comatose/sustenance activities
      if (['Comatose', 'Sustenance'].includes(log.activityName)) return;
      
      totalActiveMins += duration;
      
      if (log.activityName === 'Boondoggle') {
        boondoggleMins += duration;
      }
      
      if (log.regretRating && log.regretRating <= 2) {
        lowRegretMins += duration;
      }
      
      const customDWNames = Object.keys(blueprints || {});
      if (isDeepWork && isDeepWork(log, activities, customDWNames)) {
        deepWorkMins += duration;
      }
    });

    const entropyMins = boondoggleMins + lowRegretMins;
    const entropyPercentage = totalActiveMins > 0 ? Math.round((entropyMins / totalActiveMins) * 100) : 0;

    return {
      deepWorkMins,
      boondoggleMins,
      lowRegretMins,
      entropyMins,
      entropyPercentage,
      totalActiveMins
    };
  }, [dayLogs, activities, blueprints, isDeepWork]);

  // 4. Dynamic Recommendation Directives
  const recommendation = useMemo(() => {
    if (dayLogs.length === 0) {
      return "No activity logs recorded today. Start logging focus streams to generate Life Capital telemetry.";
    }
    if (overallLifeCapital >= 85) {
      return "Excellent cognitive alignment today! Your neural ROI is compounding. Maintain this high-performance rhythm.";
    }
    if (stats.entropyPercentage > 15) {
      return `Core focus entropy is elevated at ${stats.entropyPercentage}%. Cut out Boondoggles immediately and protect your next work cycle.`;
    }
    if (isGhostMode && alignmentScore < 50) {
      return `Intentionality gap detected. Your actual logs are trailing your Ghost Template intentions by ${100 - alignmentScore}%. Re-align schedules.`;
    }
    if (biologicalScore < 60) {
      return `Biometric energy reserve is low (${biologicalScore}%). Priority directive: drink 250ml of water and complete your medication checks.`;
    }
    if (neuralEfficiency < 40) {
      return "Deep work ratio is trailing today. Dedicate your next active cycle to high-leverage development or design blocks.";
    }
    return "Neural flow and biometric inputs are stable. Continue shielding your priority windows from biological friction.";
  }, [overallLifeCapital, stats.entropyPercentage, alignmentScore, biologicalScore, neuralEfficiency, dayLogs, isGhostMode]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="absolute inset-0 z-[-1]" 
        onClick={onClose}
      />
      
      <div className="w-full max-w-[440px] bg-[#0c0c12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col relative z-10">
            <h2 className="text-xs font-black text-white tracking-widest uppercase italic leading-none">
              LIFE<span className="text-orange-500 ml-1">CAPITAL</span>
            </h2>
            <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.25em] mt-1">Real-Time Telemetry Audit</p>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all relative z-10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* Main Life Capital Dial */}
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 rounded-2xl relative overflow-hidden group">
            <div className="absolute -inset-10 bg-gradient-to-r from-orange-500/5 to-blue-500/5 blur-2xl opacity-100 group-hover:from-orange-500/10 group-hover:to-blue-500/10 transition-all duration-500" />
            
            {/* Slow Rotating Ring */}
            <div className="relative w-36 h-36 flex flex-col items-center justify-center rounded-full border border-dashed border-white/10 p-2 animate-[spin_120s_linear_infinite]" />
            
            <div className="absolute flex flex-col items-center justify-center">
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-orange-500 tracking-tighter italic leading-none">
                  {overallLifeCapital}
                </span>
                <span className="text-sm font-black text-orange-500/50 leading-none">%</span>
              </div>
              <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">Overall Life Capital</span>
            </div>
          </div>

          {/* Sub-Scores Matrix */}
          <div className="grid grid-cols-3 gap-3">
            
            {/* Neural Efficiency */}
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col items-center text-center justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-orange-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Zap size={14} className="text-orange-500/60 mb-2" />
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-white italic">{neuralEfficiency}</span>
                <span className="text-[10px] font-bold text-white/20">%</span>
              </div>
              <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-1">Neural Eff.</p>
              <div className="w-full h-1 bg-white/5 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${neuralEfficiency}%` }} />
              </div>
            </div>

            {/* Ghost Alignment */}
            <div className={clsx(
              "border rounded-xl p-4 flex flex-col items-center text-center justify-between relative overflow-hidden group transition-all",
              isGhostMode ? "bg-white/[0.01] border-white/5" : "bg-black/20 border-white/[0.02] opacity-30"
            )}>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp size={14} className="text-blue-400/60 mb-2" />
              {isGhostMode ? (
                <>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-black text-white italic">{alignmentScore}</span>
                    <span className="text-[10px] font-bold text-white/20">%</span>
                  </div>
                  <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-1">Alignment</p>
                  <div className="w-full h-1 bg-white/5 rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: `${alignmentScore}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black text-white/30 uppercase leading-none my-1.5">OFF</span>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">Ghost Mode</p>
                  <div className="w-full h-1 bg-white/[0.02] rounded-full mt-2.5" />
                </>
              )}
            </div>

            {/* Biometric Capital */}
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col items-center text-center justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex gap-1 mb-2">
                <Droplet size={11} className={clsx(waterIntake >= 8 ? "text-emerald-400" : "text-emerald-500/60")} />
                {totalMeds > 0 && <Pill size={11} className={clsx(takenMeds === totalMeds ? "text-emerald-400" : "text-emerald-500/60")} />}
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-white italic">{biologicalScore}</span>
                <span className="text-[10px] font-bold text-white/20">%</span>
              </div>
              <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mt-1">Biometrics</p>
              <div className="w-full h-1 bg-white/5 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${biologicalScore}%` }} />
              </div>
            </div>

          </div>

          {/* Detailed Biometric Telemetry */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 space-y-2.5">
            <h4 className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Biometric Subsystems</h4>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <Droplet size={12} className="text-blue-400" />
                Hydration Input
              </div>
              <span className="font-mono text-[10px] font-black text-white/95 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {waterIntake} / 8 Glasses
              </span>
            </div>

            {totalMeds > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.03]">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <Pill size={12} className="text-purple-400" />
                  Neuro Protocols
                </div>
                <span className="font-mono text-[10px] font-black text-white/95 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {takenMeds} / {totalMeds} Completed
                </span>
              </div>
            )}
          </div>

          {/* Analysis & Entropy Detection */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <TrendingUp size={12} className="text-orange-500/40" />
              Cognitive ROI Analysis
            </h3>
            
            <div className="space-y-3">
              {stats.entropyPercentage > 0 ? (
                <div className="bg-red-500/[0.03] border border-red-500/10 rounded-xl p-4 space-y-2 animate-pulse duration-[3000ms]">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Entropy Detected</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Unstructured blocks detected in focus streams today. Core cognitive performance reduced by <span className="text-red-400 font-bold">{stats.entropyPercentage}%</span>.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Optimal Coherence</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    No focus entropy detected in your active schedule. Cognitive resources are perfectly preserved today.
                  </p>
                </div>
              )}

              <div className="bg-orange-500/[0.03] border border-orange-500/10 rounded-xl p-4 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300">
                  <Sparkles size={32} className="text-orange-500" />
                </div>
                <p className="text-[11px] text-orange-400/90 leading-relaxed font-medium italic">
                  "{recommendation}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={onClose}
            className="w-full py-3.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-orange-500 hover:text-orange-400 text-[10px] font-black uppercase tracking-[0.25em] rounded-xl transition-all shadow-lg hover:shadow-orange-500/5 cursor-pointer"
          >
            Acknowledge Telemetry Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
