import { useState, useMemo } from 'react';
import { 
  Scissors, ArrowRight, CheckCircle2, XCircle, 
  AlertCircle, TrendingDown, Clock, Zap, Info, Share2, RefreshCcw 
} from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { format, addDays, differenceInDays } from 'date-fns';

export function SubtractionEngine() {
  const { 
    lastSubtractionAudit, 
    subtractionAuditResults, 
    runSubtractionAudit, 
    subtractionInterval,
    setSubtractionInterval,
    logs,
    purgeActivity,
    showToast
  } = useApp();

  const [isAuditing, setIsAuditing] = useState(false);
  const [acceptedProposals, setAcceptedProposals] = useState([]);
  const [dismissedProposals, setDismissedProposals] = useState({}); // { id: reason }

  const daysUntilAudit = useMemo(() => {
    if (!lastSubtractionAudit) return 0;
    const lastDate = new Date(lastSubtractionAudit);
    const diff = differenceInDays(new Date(), lastDate);
    return Math.max(0, subtractionInterval - diff);
  }, [lastSubtractionAudit, subtractionInterval]);

  const ratedCount = useMemo(() => {
    return logs.filter(l => l.regretRating !== undefined && l.regretRating !== null).length;
  }, [logs]);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      await runSubtractionAudit(true, subtractionInterval);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAccept = async (proposal) => {
    if (proposal.type === 'eliminate') {
      await purgeActivity(proposal.activityName, proposal.subcategory);
    }
    setAcceptedProposals(prev => [...prev, proposal]);
    showToast(`Accepted: ${proposal.activityName} reduced`, "success");
  };

  const handleDismiss = (proposal, reason) => {
    setDismissedProposals(prev => ({ ...prev, [proposal.activityName + (proposal.subcategory || '')]: reason }));
  };

  const totalReclaimedWeekly = useMemo(() => {
    return acceptedProposals.reduce((sum, p) => sum + p.hoursReclaimed, 0);
  }, [acceptedProposals]);

  const handleShare = () => {
    const text = `I've committed to reclaiming ${totalReclaimedWeekly.toFixed(1)} hours per week using The Subtraction Engine. That's ${(totalReclaimedWeekly * 52 / 24).toFixed(1)} full days of my life returned to me each year.`;
    navigator.clipboard.writeText(text);
    showToast("Summary copied to clipboard", "success");
  };

  const intervalOptions = [7, 15, 30, 90];

  // State 1: Not enough data / audit not due
  if (!subtractionAuditResults && !isAuditing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <Scissors size={32} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">The Subtraction Engine</h2>
        <p className="text-gray-500 max-w-md mb-8">
          A ruthless but compassionate time auditor that identifies low-value patterns across your logs.
        </p>

        {/* Interval Selector */}
        <div className="flex items-center gap-2 mb-8 bg-white/5 p-1 rounded-xl border border-white/5">
          {intervalOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setSubtractionInterval(opt)}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                subtractionInterval === opt 
                  ? "bg-accent text-bg-base shadow-lg shadow-accent/20" 
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
            >
              {opt} Days
            </button>
          ))}
        </div>
        
        <div className="w-full max-w-md bg-black/20 border border-white/5 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Next Audit Cycle</span>
            <span className="text-xs font-bold text-accent">{daysUntilAudit} Days Remaining</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent shadow-[0_0_8px_rgba(0,242,234,0.5)] transition-all duration-1000"
              style={{ width: `${Math.min(100, (subtractionInterval - daysUntilAudit) / subtractionInterval * 100)}%` }}
            />
          </div>
          <div className="mt-4 flex items-center gap-4 text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className={ratedCount >= 10 ? "text-emerald-500" : "text-gray-800"} />
              10+ Rated Entries ({ratedCount}/10)
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Dynamic {subtractionInterval}-Day Scope
            </div>
          </div>
        </div>

        <button 
          onClick={handleRunAudit}
          disabled={ratedCount < 3}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-gray-400 uppercase tracking-widest hover:text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Zap size={14} />
          Run {subtractionInterval}-Day Audit
        </button>
      </div>
    );
  }

  // Loading State
  if (isAuditing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <Scissors size={24} className="absolute inset-0 m-auto text-accent animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Analyzing Patterns...</h3>
        <p className="text-gray-500 text-sm max-w-xs">Gemini is auditing your logs for low-leverage time investments.</p>
      </div>
    );
  }

  const { headline, quarterlyHoursAtStake, weeklyHoursReclaimed, proposals, subtractionManifesto } = subtractionAuditResults;

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-8 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-accent mb-1">
            <Scissors size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">The Subtraction Engine</span>
            <button 
              onClick={handleRunAudit}
              disabled={isAuditing}
              className={clsx(
                "ml-1 p-1 hover:bg-white/5 rounded-md transition-all active:scale-95",
                isAuditing && "animate-spin opacity-50"
              )}
              title="Refresh Audit"
            >
              <RefreshCcw size={12} />
            </button>
          </div>
          <h1 className="text-xl font-bold text-white max-w-xl mx-auto leading-tight">
            {headline}
          </h1>
          <p className="text-gray-600 text-[10px] font-medium">Audit Date: {format(new Date(lastSubtractionAudit), 'MMMM d, yyyy')}</p>
        </div>

        {/* Interval Selector for Active Results */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
          {intervalOptions.map(opt => (
            <button
              key={opt}
              onClick={() => {
                setSubtractionInterval(opt);
                handleRunAudit();
              }}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                subtractionInterval === opt 
                  ? "bg-accent text-bg-base shadow-lg shadow-accent/20" 
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
            >
              {opt} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ... existing summary cards ... */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={48} className="text-accent" />
          </div>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Hours Reclaimed Per Week</p>
          <p className="text-2xl font-bold text-white">{weeklyHoursReclaimed}h</p>
          <div className="mt-2 flex items-center gap-1.5 text-emerald-500/80 text-[9px] font-bold">
            <TrendingDown size={10} />
            Target Reduction
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={48} className="text-amber-500" />
          </div>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Quarterly Hours At Stake</p>
          <p className="text-2xl font-bold text-white">{quarterlyHoursAtStake}h</p>
          <div className="mt-2 flex items-center gap-1.5 text-amber-500/80 text-[9px] font-bold">
            <AlertCircle size={10} />
            High Leverage Reclaim
          </div>
        </div>
      </div>

      {/* Proposals Section ... (omitted for brevity in replacement, but kept in file) */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.25em] px-2">Proposed Actions</h3>
        {proposals.map((proposal, idx) => {
          const isAccepted = acceptedProposals.some(p => p.activityName === proposal.activityName && p.subcategory === proposal.subcategory);
          const proposalKey = proposal.activityName + (proposal.subcategory || '');
          const isDismissed = !!dismissedProposals[proposalKey];

          if (isAccepted) {
            return (
              <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-4">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-emerald-100">{proposal.activityName}</p>
                    <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">Commitment: -{proposal.hoursReclaimed}h/week</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAcceptedProposals(prev => prev.filter(p => p.activityName !== proposal.activityName))}
                  className="text-[10px] font-bold text-emerald-500/50 hover:text-emerald-500 uppercase tracking-widest"
                >
                  Undo
                </button>
              </div>
            );
          }

          if (isDismissed) return null;

          return (
            <div key={idx} className={clsx(
              "bg-[#121216] border border-white/5 rounded-xl overflow-hidden shadow-xl flex flex-col md:flex-row",
              proposal.type === 'eliminate' && "border-l-4 border-l-red-500",
              proposal.type === 'reduce' && "border-l-4 border-l-amber-500",
              proposal.type === 'merge' && "border-l-4 border-l-blue-500",
              proposal.type === 'question' && "border-l-4 border-l-purple-500"
            )}>
              <div className="flex-1 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                      proposal.type === 'eliminate' && "bg-red-500/20 text-red-400",
                      proposal.type === 'reduce' && "bg-amber-500/20 text-amber-400",
                      proposal.type === 'merge' && "bg-blue-500/20 text-blue-400",
                      proposal.type === 'question' && "bg-purple-500/20 text-purple-400"
                    )}>
                      {proposal.type}
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {proposal.activityName} 
                      {proposal.subcategory && <span className="text-gray-500 text-xs font-medium ml-2">/ {proposal.subcategory}</span>}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                      <span>{proposal.currentHoursPerWeek}h</span>
                      <ArrowRight size={10} />
                      <span className="text-white">{proposal.proposedHoursPerWeek}h</span>
                    </div>
                    <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-tighter mt-0.5">+{proposal.hoursReclaimed}h Reclaimed</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500 leading-relaxed italic">"{proposal.rationale}"</p>
                </div>
              </div>

              <div className="w-full md:w-40 bg-white/[0.02] border-t md:border-t-0 md:border-l border-white/5 p-3 flex flex-col justify-center gap-1.5">
                <button 
                  onClick={() => handleAccept(proposal)}
                  className={clsx(
                    "w-full py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border",
                    proposal.type === 'eliminate' 
                      ? "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border-red-500/20 hover:border-red-500" 
                      : "bg-white/5 hover:bg-white/10 text-white border-white/5 hover:border-white/20"
                  )}
                >
                  {proposal.type === 'eliminate' ? 'Purge' : 'Accept'}
                </button>
                <button 
                  onClick={() => handleDismiss(proposal, '')}
                  className="w-full py-1 text-gray-600 hover:text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary / Shared Footer */}
      {acceptedProposals.length > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Commitment Reached</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              You've committed to reclaiming <span className="text-accent font-bold">{totalReclaimedWeekly.toFixed(1)} hours</span> per week. 
              That's <span className="text-accent font-bold">{(totalReclaimedWeekly * 52).toFixed(0)} hours</span> per year — 
              <span className="text-accent font-bold"> {(totalReclaimedWeekly * 52 / 24).toFixed(1)} full days</span> of your life returned to you.
            </p>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-accent text-bg-base rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(var(--color-accent),0.3)]"
          >
            <Share2 size={14} />
            Copy Summary
          </button>
        </div>
      )}

      {/* Manifesto */}
      <div className="pt-8 border-t border-white/5 text-center space-y-4">
        <p className="text-lg font-medium text-gray-400 italic leading-relaxed max-w-2xl mx-auto">
          "{subtractionManifesto}"
        </p>
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Next Audit in {subtractionInterval} Days · {format(addDays(new Date(lastSubtractionAudit), subtractionInterval), 'MMM d, yyyy')}</p>
      </div>
    </div>
  );
}
