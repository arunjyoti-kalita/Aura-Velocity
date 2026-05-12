import { useState, useMemo } from 'react';
import { 
  Menu, ChevronLeft, ChevronRight, Search, UserCircle, 
  Settings, LogOut, Bell, Zap, CalendarDays, CheckSquare, 
  Users, Book, BarChart2, Ghost, Save, Sparkles, Trash2,
  HelpCircle, Key, ChevronDown, AlertCircle, CheckCircle2, X, Layout
} from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from "../../contexts/useApp";
import { useTheme } from '../../contexts/ThemeContext';
import clsx from 'clsx';
import { WeatherWidget } from './WeatherWidget';
import { CircadianWave } from './CircadianWave';
import { AuraHUD } from './AuraHUD';
// import { MedicationPulse } from '../tasks/MedicationPulse';

export function TopBar() {
  const { 
    currentDate, goToToday, prevMonth, nextMonth, 
    activeModule, setActiveModule, isSidebarOpen, setIsSidebarOpen,
    user, signInWithGoogle, viewMode, setViewMode,
    isGhostMode, toggleGhostMode, setIsGhostMode, saveTemplate, templates, setActiveTemplate, deleteTemplate,
    alignmentScore, neuralEfficiency, setIsGhostSetupOpen, setActiveModal,
    logs, regretModel, healLogs, setLogs, wipeCurrentDay, showToast,
    meds, toggleMed
  } = useApp();
  const { theme } = useTheme();
  const [showOracle, setShowOracle] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const [tplName, setTplName] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const energyLeaks = useMemo(() => {
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => l.date === dayStr);
    
    const leaks = [];
    
    // 1. Identify Boondoggle
    const boondoggle = dayLogs.filter(l => l.activityName === 'Boondoggle');
    if (boondoggle.length > 0) {
      const totalMins = boondoggle.reduce((acc, l) => {
        if (!l.startTime || !l.endTime) return acc;
        const start = parseInt(l.startTime.split(':')[0]) * 60 + parseInt(l.startTime.split(':')[1]);
        const end = parseInt(l.endTime.split(':')[0]) * 60 + parseInt(l.endTime.split(':')[1]);
        return acc + (end - start);
      }, 0);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const formattedTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      leaks.push({
        title: `Unstructured Boondoggle (${formattedTime})`,
        description: "Low-value activity pattern detected. Consider converting this block into active recovery.",
        type: 'leak'
      });
    }

    // 2. Low Regret Scores
    const lowValue = dayLogs.filter(l => l.regretRating && l.regretRating <= 2);
    if (lowValue.length > 0) {
      leaks.push({
        title: "Low Energy Return Logged",
        description: `You rated ${lowValue[0].activityName} low on retrospective. High friction detected.`,
        type: 'friction'
      });
    }

    // 3. Predicted Regret
    if (regretModel?.subcategoryPatterns) {
      const highRisk = dayLogs.find(l => {
        const key = `${l.activityName}:${l.subcategory}`;
        const pattern = regretModel.subcategoryPatterns[key];
        return pattern && pattern.averageRating < 2.5 && !l.regretRating;
      });
      if (highRisk) {
        leaks.push({
          title: `Neural Warning: ${highRisk.activityName}`,
          description: "Historically, this activity leads to high regret. Proceed with intentionality.",
          type: 'warning'
        });
      }
    }

    return leaks;
  }, [logs, currentDate, regretModel]);

  const oracleRecommendation = useMemo(() => {
    if (alignmentScore > 90) return "Peak performance achieved. Maintain the current neural rhythm to compound these gains.";
    if (alignmentScore > 70) return "Solid consistency. Your Actual stream is aligning well with your Ghost intentions.";
    if (alignmentScore > 0) return "Intentionality gap detected. Re-align with your Ghost Template to reduce biological friction.";
    return "Initialize your Ghost Template to receive personalized performance optimizations from the Oracle.";
  }, [alignmentScore]);

  const handleOpenSaveTpl = () => {
    setTplName(format(currentDate, 'EEEE · MMM d'));
    setShowSaveTpl(true);
  };

  const handleConfirmSaveTpl = async () => {
    const success = await saveTemplate(tplName, format(currentDate, 'yyyy-MM-dd'));
    if (!success) {
      alert("Log some blocks first to save a template.");
    }
    setShowSaveTpl(false);
  };
  
  return (
    <>
    <CircadianWave />
    <div className="h-10 flex items-center justify-between px-3 border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur-md shrink-0 z-40 relative">
      
      {/* LEFT SECTOR: Core Navigation (Restored) */}
      <div className="flex items-center gap-1.5 z-10 min-w-0 translate-x-[1.5px]">
        <div className="flex items-center gap-1.5 border-r border-white/5 pr-2 h-5 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 text-gray-500 hover:text-accent transition-colors"
          >
            <Menu size={12} />
          </button>
          <h1 className="font-heading text-[9px] font-black tracking-[0.2em] text-white uppercase leading-none truncate">
            AURA<span className="text-accent ml-1 text-opacity-80 font-medium tracking-[0.05em]">VELOCITY</span>
          </h1>
        </div>

        <div className="flex items-center bg-white/[0.03] border border-white/5 rounded px-1.5 h-6 gap-1.5 min-w-0 flex-1 max-w-fit">
          <button onClick={goToToday} className="px-1 text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all shrink-0">Today</button>
          <div className="flex items-center gap-1 border-l border-white/10 pl-1 shrink-0">
            <button onClick={prevMonth} className="text-gray-500 hover:text-accent transition-all"><ChevronLeft size={12} /></button>
            <button onClick={nextMonth} className="text-gray-500 hover:text-accent transition-all"><ChevronRight size={12} /></button>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-1 text-accent/60 border-l border-white/10 truncate">
            {format(currentDate, 'MMMM yyyy')}
          </span>
        </div>
      </div>

      {/* RIGHT SECTOR: Controls & Switcher (Precise Screenshot Style) */}
      <div className="flex items-center gap-1 z-10 ml-auto translate-x-[1.5px]">
        {/* Instrumentation Cluster */}
        <div className="flex items-center gap-0.5 mr-0.5">
          <div className="scale-90 origin-right">
            <AuraHUD />
          </div>
          
          {/* Template Controls (Ghost & Save) */}
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl h-8 px-1 gap-1">
            <div className="flex items-center gap-1 px-1">
              <button 
                onClick={toggleGhostMode}
                className={clsx(
                  "w-8 h-7 flex items-center justify-center transition-all rounded-lg",
                  isGhostMode ? "text-accent bg-accent/10" : "text-white/30 hover:text-white hover:bg-white/5"
                )}
                title="Toggle Intentionality (Ghost Mode)"
              >
                <Ghost size={14} className={isGhostMode ? "animate-pulse" : ""} />
              </button>
              
              {isGhostMode && (
                <div className="flex flex-col items-start px-1 pointer-events-none">
                  <span className="text-[6px] font-black uppercase tracking-[0.1em] text-white/30 leading-none">Flow Match</span>
                  <span className={clsx(
                    "text-[10px] font-black tabular-nums leading-none",
                    alignmentScore > 80 ? "text-emerald-400" : alignmentScore > 50 ? "text-amber-400" : "text-red-400"
                  )}>
                    {alignmentScore}%
                  </span>
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-white/10" />
            
            <button 
              onClick={handleOpenSaveTpl}
              className="w-8 h-7 flex items-center justify-center text-white/30 hover:text-white transition-all hover:bg-white/5 rounded-lg"
              title="Save Blueprint"
            >
              <Save size={14} />
            </button>
          </div>
        </div>
        {/* Action Strip */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {[
            { icon: Sparkles, action: () => { setIsGhostSetupOpen(false); setActiveModal({ type: 'oracle' }); }, color: 'text-blue-400', label: "Neural Oracle" },
            { icon: BarChart2, action: () => { setIsGhostSetupOpen(false); setActiveModal({ type: 'life_capital' }); }, color: 'text-orange-500', label: "Neural Protocols" },
            { icon: Layout, action: () => { setActiveModal(null); setIsGhostSetupOpen(true); }, color: 'text-blue-400', label: "Ghost Blueprint Setup" },
            { icon: Zap, action: () => { setLogs(healLogs(logs)); showToast("Heal Loop Active", "success"); }, color: 'text-emerald-500', label: "Heal Loop" },
            { icon: Key, action: () => { setIsGhostSetupOpen(false); setActiveModal({ type: 'shortcuts' }); }, color: 'text-gray-400', label: "Security Key" },
          ].map((btn, i) => (
            <button 
              key={i}
              onClick={btn.action}
              title={btn.label}
              className="w-7 h-7 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center transition-all hover:bg-white/[0.05] hover:border-white/10"
            >
              <btn.icon size={13} className={btn.color} />
            </button>
          ))}
        </div>

        {/* View Selector */}
        <button 
          onClick={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
          className="flex items-center gap-4 px-4 h-9 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all"
        >
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
            {viewMode === 'week' ? 'WEEK' : 'DAY'}
          </span>
          <ChevronDown size={14} className="text-white/20" />
        </button>

        {/* Module Switcher Pill */}
        <div className="flex items-center bg-white/[0.02] border border-white/10 rounded-[20px] p-1 h-10 gap-1 ml-1">
          {[
            { id: 'daylog', icon: CalendarDays },
            { id: 'tasks', icon: CheckSquare },
            { id: 'people', icon: Users },
            { id: 'journal', icon: Book },
            { id: 'analysis', icon: BarChart2 }
          ].map((m) => (
            <button 
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={clsx(
                "w-9 h-8 rounded-xl transition-all flex items-center justify-center",
                activeModule === m.id 
                  ? "bg-[#3d241c] text-orange-500 border border-orange-500/20" 
                  : "text-white/20 hover:text-white hover:bg-white/5"
              )}
            >
              <m.icon size={16} />
            </button>
          ))}
        </div>

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        {/* Profile */}
        <button 
          onClick={user ? undefined : signInWithGoogle}
          className="w-10 h-10 rounded-xl border border-white/10 p-1 bg-white/[0.03] hover:border-accent transition-all shrink-0 overflow-hidden group"
        >
          <div className="w-full h-full rounded-lg overflow-hidden bg-white/5 flex items-center justify-center relative">
            {user ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            ) : (
              <UserCircle size={20} className="text-gray-600" />
            )}
            <div className="absolute inset-0 border border-orange-500/20 rounded-lg pointer-events-none" />
          </div>
        </button>
      </div>
    </div>


    {/* Save Template Modal */}
    {showSaveTpl && (
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSaveTpl(false)} />
        <div className="relative w-[400px] bg-[#1a1a1e] rounded-2xl overflow-hidden border border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-200">
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-2">Save as Template</h3>
            <p className="text-sm text-gray-400 mb-4">This will snapshot today's layout into a reusable ideal day.</p>
            <input 
              type="text" 
              value={tplName}
              onChange={e => setTplName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent outline-none transition-colors"
              placeholder="Template Name"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowSaveTpl(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleConfirmSaveTpl} className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20">Save</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Template Manager Modal */}
    {showTemplateManager && (
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplateManager(false)} />
        <div className="relative w-[500px] bg-[#1a1a1e] rounded-2xl overflow-hidden border border-white/10 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold text-white">Template Manager</h2>
            <button onClick={() => setShowTemplateManager(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
          <div className="p-4 flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No templates saved yet. Log your perfect day and click "Save TPL".</div>
            ) : (
              templates.map(tpl => (
                <div key={tpl.id} className={clsx("flex items-center justify-between p-4 rounded-xl border transition-all", tpl.is_active ? "bg-accent/10 border-accent/30" : "bg-white/5 border-white/5 hover:border-white/10")}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">{tpl.name}</h4>
                      {tpl.is_active && <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider">Active</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{tpl.blocks.length} blocks • Created {format(new Date(tpl.created_at), 'MMM d, yyyy')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!tpl.is_active && (
                      <button onClick={() => setActiveTemplate(tpl.id)} className="p-2 text-gray-400 hover:text-accent bg-black/20 rounded-lg transition-colors" title="Set Active">
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button onClick={() => deleteTemplate(tpl.id)} className="p-2 text-gray-400 hover:text-red-400 bg-black/20 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
