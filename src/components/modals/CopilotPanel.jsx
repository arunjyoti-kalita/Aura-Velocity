import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Calendar, Clock, ArrowRight, Zap, History, ChevronLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { useApp } from "../../contexts/useApp";
import { parseSchedulingRequest, isGeminiConfigured } from '../../services/aiService';
import { minutesToTimeStr } from '../../utils/dateHelpers';

export function CopilotPanel({ isOpen, onClose }) {
  const { 
    currentDate, findOptimalSlots, addLog, showToast, 
    copilotHistory, addCopilotHistory, setCurrentDate,
    activities 
  } = useApp();
  
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedIntent, setParsedIntent] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFindTime = async () => {
    if (!input.trim()) return;
    setIsParsing(true);
    setError(null);
    try {
      const intent = await parseSchedulingRequest(
        input, 
        format(currentDate, 'yyyy-MM-dd'), 
        format(new Date(), 'HH:mm')
      );
      setParsedIntent(intent);
      const slots = findOptimalSlots(intent);
      setResults(slots);
      addCopilotHistory(input, intent);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleBook = (slot) => {
    const startTime = minutesToTimeStr(slot.startTimeMins);
    const endTime = minutesToTimeStr(slot.startTimeMins + parsedIntent.durationMinutes);
    
    addLog({
      activityName: parsedIntent.activityType,
      date: slot.date,
      startTime,
      endTime,
      notes: parsedIntent.taskName,
      isPasted: true // triggers pulse
    });

    showToast(`Booked ${parsedIntent.activityType} on ${slot.date}`, "success");
    onClose();
  };

  const handleSeeOnGrid = (slot) => {
    setCurrentDate(parseISO(slot.date));
    onClose();
    // Highlight logic would go here, for now we just navigate
  };

  const handleHistoryClick = (hist) => {
    setInput(hist.request);
    setShowHistory(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[560px] bg-[#14141c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Sparkles size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white leading-none mb-1">Scheduling Copilot</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                {isGeminiConfigured ? 'Powered by Gemini + Energy Patterns' : 'Local Pattern Matching · No API Key'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={clsx("p-2 rounded-lg transition-colors", showHistory ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
            >
              <History size={16} />
            </button>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!results.length && !isParsing && !showHistory && (
            <div className="space-y-6">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  spellCheck="true"
                  autoCorrect="on"
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Block 3 hours for deep work before Thursday · Find me time to study SQL this week..."
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none font-medium leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleFindTime();
                    }
                  }}
                />
                <div className="absolute bottom-3 right-3 text-[10px] font-bold text-white/10 uppercase tracking-widest">
                  Press Enter to search
                </div>
              </div>

              <button 
                onClick={handleFindTime}
                disabled={!input.trim()}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
              >
                Find Optimal Slot
              </button>

              {copilotHistory.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Recent Intelligence</span>
                  <div className="flex flex-wrap gap-2">
                    {copilotHistory.slice(0, 3).map((h, i) => (
                      <button 
                        key={i}
                        onClick={() => handleHistoryClick(h)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[11px] text-white/60 transition-colors truncate max-w-[200px]"
                      >
                        {h.request}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isParsing && (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-white uppercase tracking-widest animate-pulse">Analyzing Neural Schedule</p>
                <p className="text-[10px] text-white/30 uppercase font-black mt-1">Gemini is processing your intent...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <X size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-widest">Intake Failed</p>
                <p className="text-xs text-red-400/80 mt-1">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/40"
              >
                Try Again
              </button>
            </div>
          )}

          {results.length > 0 && !isParsing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={() => setResults([])}
                  className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Edit Request</span>
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Optimal Results</span>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {results.map((slot, i) => {
                  const activity = activities.find(a => a.name === parsedIntent.activityType) || activities[0];
                  return (
                    <div 
                      key={i}
                      className={clsx(
                        "relative group p-4 rounded-xl border transition-all duration-300",
                        i === 0 ? "bg-orange-500/10 border-orange-500/30 ring-1 ring-orange-500/20" : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      {i === 0 && (
                        <div className="absolute top-[-10px] right-4 px-2 py-0.5 bg-orange-500 text-[8px] font-black text-white rounded uppercase tracking-widest">
                          Recommended
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="mt-1 w-2 h-2 rounded-full" style={{ backgroundColor: activity.baseColor }} />
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">
                              {format(parseISO(slot.date), 'EEEE · MMM d')}
                              <span className="text-white/40 font-medium ml-2 text-xs">
                                {minutesToTimeStr(slot.startTimeMins)} – {minutesToTimeStr(slot.startTimeMins + parsedIntent.durationMinutes)}
                              </span>
                            </h3>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-2">
                              <Zap size={10} className={clsx("text-yellow-500", parsedIntent.flexibility === 'rigid' && "text-orange-400")} />
                              {parsedIntent.flexibility === 'rigid' 
                                ? "Strict Time Adherence · Matching your explicit request" 
                                : "Optimal Energy Synergy · Your focus is historically high"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={clsx(
                            "text-xl font-black leading-none",
                            slot.score > 80 ? "text-green-400" : slot.score > 50 ? "text-amber-400" : "text-red-400"
                          )}>
                            {slot.score}
                          </div>
                          <div className="text-[8px] font-black uppercase tracking-tighter text-white/20">Score</div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={() => handleBook(slot)}
                          className="flex-1 py-2.5 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-400 hover:text-white transition-all active:scale-95"
                        >
                          Book This Slot
                        </button>
                        <button 
                          onClick={() => handleSeeOnGrid(slot)}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                        >
                          See on Grid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showHistory && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Intelligence Log</span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {copilotHistory.length === 0 ? (
                  <div className="py-12 text-center text-white/20 uppercase font-black text-[10px] tracking-widest">
                    No history recorded
                  </div>
                ) : (
                  copilotHistory.map((h, i) => (
                    <button 
                      key={i}
                      onClick={() => handleHistoryClick(h)}
                      className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">{h.request}</p>
                      <p className="text-[9px] text-white/20 font-medium mt-1 uppercase tracking-tighter">
                        {format(parseISO(h.timestamp), 'MMM d · HH:mm')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-center">
           <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
            Optimization Logic: Energy Synergy + Regret Minimization
          </p>
        </div>
      </div>
    </div>
  );
}
