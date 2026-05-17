import { useState, useMemo } from 'react';
import { 
  Menu, Plus, Search, ChevronDown, ChevronUp,
  Clock, BarChart2, Wallet, Film, NotebookText, Sun, Moon, Users,
  User, UserCircle, LogOut, Settings as SettingsIcon, ShieldCheck,
  Scissors, Book, CheckSquare, Layout, LayoutGrid, Calendar
} from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import clsx from 'clsx';
import { useApp } from "../../contexts/useApp";
import { useTheme } from '../../contexts/ThemeContext';

export function Sidebar({ onOpenSearch }) {
  const { 
    activeModule, setActiveModule, isSidebarOpen, setIsSidebarOpen,
    user, signOutUser, signInWithGoogle,
    currentDate, setCurrentDate, setActiveModal,
    isSubtractionAuditDue, saveJournalEntry, addTask, setViewMode,
    financeSelectedDate, setFinanceSelectedDate
  } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [showUserPopover, setShowUserPopover] = useState(false);

  const handleQuickCreate = () => {
    if (activeModule === 'journal') {
      const newEntry = {
        id: format(new Date(), 'yyyyMMddHHmmss') + Math.random().toString(36).substr(2, 9),
        title: '',
        content: '',
        emoji: '✦',
        category: 'Daily',
        tags: [],
        mood: 'neutral',
        linkedDate: format(currentDate, 'yyyy-MM-dd'),
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveJournalEntry(newEntry);
      return;
    }
    
    if (activeModule === 'tasks') {
      addTask({ text: '', priority: 'medium' });
      return;
    }

    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    setActiveModal({
      log: {
        date: format(currentDate, 'yyyy-MM-dd'),
        startTime: `${currentHour}:00`,
        endTime: `${(now.getHours() + 1).toString().padStart(2, '0')}:00`,
        activityName: '',
        subcategory: '',
        notes: '',
        referenceLink: '',
        isRecurring: false,
        recurringType: 'none',
        energyLevel: 50
      },
      isNew: true
    });
  };

  const prevDay = () => setCurrentDate(prev => addDays(prev, -1));
  const nextDay = () => setCurrentDate(prev => addDays(prev, 1));

  // Real Mini-Calendar Logic
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - monthStart.getDay());
  
  const days = [];
  let day = new Date(startDate);
  while (day <= monthEnd || days.length < 42) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const [expandedSections, setExpandedSections] = useState({
    daylog: true,
    finance: true
  });

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const mainModules = [
    { id: 'daylog', name: 'Temporal Stream', icon: Clock, enabled: true, hasSub: true },
    { id: 'finance', name: 'Resource Flow', icon: Wallet, enabled: true, hasSub: true },
  ];

  const temporalSubModules = [
    { id: 'tasks', name: 'Task Flow', icon: CheckSquare, enabled: true },
    { id: 'people', name: 'Relationship Cadence', icon: Users, enabled: true },
    { id: 'journal', name: 'Journal', icon: Book, enabled: true },
    { id: 'blueprints', name: 'Blueprints', icon: Layout, enabled: true },
    { id: 'analysis', name: 'Life Capital', icon: BarChart2, enabled: true },
    { id: 'subtraction', name: 'Subtraction', icon: Scissors, enabled: true, badge: isSubtractionAuditDue },
  ];

  const financeSubModules = [
    { id: 'finance-terminal', name: 'Terminal', icon: LayoutGrid, enabled: true },
    { id: 'finance-ledger', name: 'Ledger', icon: Wallet, enabled: true },
    { id: 'finance-month', name: 'Monthly', icon: Calendar, enabled: true },
  ];

  const renderModuleButton = (mod, isSub = false) => {
    const isActive = activeModule === mod.id || (mod.id === 'finance' && activeModule?.startsWith('finance-'));
    const isSubActive = isSub && isActive;
    
    return (
      <button
        key={mod.id}
        onClick={() => {
          if (!mod.enabled) return;
          
          // Always switch to the module
          if (mod.id === 'finance') {
            setActiveModule('finance-terminal');
          } else {
            setActiveModule(mod.id);
          }

          // Toggle expansion if it's a parent module
          if (mod.id === 'daylog' || mod.id === 'finance') {
            setExpandedSections(prev => ({
              ...prev,
              [mod.id]: !prev[mod.id]
            }));
          }

          if (mod.id === 'daylog') setViewMode('week');
        }}
        disabled={!mod.enabled}
        className={clsx(
          "flex items-center gap-3 px-4 py-2 rounded-lg transition-all group relative",
          isSub ? "ml-4 py-1.5 opacity-80 hover:opacity-100" : "mb-1",
          isActive 
            ? "bg-white/5 text-accent border border-white/5 shadow-sm" 
            : mod.enabled 
              ? "text-gray-500 hover:bg-white/[0.03] hover:text-gray-300"
              : "text-gray-800 cursor-not-allowed opacity-40"
        )}
      >
        <mod.icon size={isSub ? 12 : 14} className={isActive ? "text-accent" : "opacity-60"} />
        <span className={clsx(
          "font-heading font-medium uppercase tracking-widest pt-0.5",
          isSub ? "text-[8px]" : "text-[9px]"
        )}>
          {mod.name}
        </span>
        
        {!isSub && mod.hasSub && (
          <div className="ml-auto">
            {expandedSections[mod.id] ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
          </div>
        )}

        {mod.badge && (
          <div className="absolute right-3 w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
        )}
        
        {isActive && !mod.badge && (
          <div className="absolute right-3 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
        )}
      </button>
    );
  };

  return (
    <div className={clsx(
      "flex flex-col bg-black/10 backdrop-blur-3xl border-r border-white/5 h-full transition-all duration-300 ease-in-out z-50 overflow-hidden shadow-2xl",
      isSidebarOpen ? "w-64" : "w-0"
    )}>
      {/* Sidebar Header */}
      <div className="h-12 flex items-center px-4 shrink-0 border-b border-white/5 bg-white/[0.02]">
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/5 transition-all"
        >
          <Menu size={16} />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="w-4 h-4 bg-accent/20 border border-accent/30 rounded flex items-center justify-center text-[8px] font-semibold text-accent uppercase tracking-tighter">
            {format(currentDate, 'dd')}
          </div>
          <span className="font-heading text-[10px] font-medium text-gray-500 uppercase tracking-widest">Workspace</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8 scrollbar-hide">
        {/* Create Button - Refined Pill */}
        <button 
          onClick={handleQuickCreate}
          className="flex items-center justify-center gap-2 w-full h-10 bg-accent text-bg-base rounded-lg shadow-[0_4px_20px_rgba(var(--color-accent),0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <Plus size={16} strokeWidth={2} />
          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] pt-0.5">+ New Entry</span>
        </button>

        {/* Modules Section - Structured List */}
        <div className="flex flex-col">
          <h3 className="px-4 text-[8px] font-semibold text-gray-600 uppercase tracking-[0.2em] mb-3">Systems</h3>
          
          {/* Main Modules */}
          {mainModules.map((mod) => (
            <div key={mod.id}>
              {renderModuleButton(mod)}
              
              {/* Nested Submodules for Temporal Stream */}
              {mod.id === 'daylog' && expandedSections.daylog && (
                <div className="flex flex-col gap-0.5 mb-2 mt-1 border-l border-white/5 ml-6">
                  {temporalSubModules.map(sub => renderModuleButton(sub, true))}
                </div>
              )}

              {/* Nested Submodules for Resource Flow */}
              {mod.id === 'finance' && expandedSections.finance && (
                <div className="flex flex-col gap-0.5 mb-2 mt-1 border-l border-white/5 ml-6">
                  {financeSubModules.map(sub => renderModuleButton(sub, true))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mini Calendar - High Density */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">{format(currentDate, 'MMMM yyyy')}</span>
            <div className="flex items-center bg-white/5 border border-white/5 rounded-md p-0.5">
              <button 
                onClick={() => setCurrentDate(prev => addMonths(prev, -1))}
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <ChevronDown size={12} className="rotate-90" />
              </button>
              <button 
                onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
                className="p-1 text-gray-500 hover:text-white transition-colors border-l border-white/5"
              >
                <ChevronDown size={12} className="-rotate-90" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-0.5 text-[7px] font-semibold text-gray-700 text-center mb-2 uppercase tracking-tighter">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const isCurrentMonth = d.getMonth() === currentDate.getMonth();
              const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              // Use finance date if in finance module
              const activeDate = activeModule?.startsWith('finance-') ? financeSelectedDate : currentDate;
              const isSelected = format(d, 'yyyy-MM-dd') === format(activeDate, 'yyyy-MM-dd');
              
              return (
                <div 
                  key={i} 
                  onClick={() => {
                    if (activeModule?.startsWith('finance-')) {
                      setFinanceSelectedDate(d);
                    } else {
                      setCurrentDate(d);
                    }
                  }}
                  className={clsx(
                    "aspect-square flex items-center justify-center text-[9px] font-medium rounded-md cursor-pointer transition-all",
                    isSelected 
                      ? "bg-accent text-bg-base font-semibold shadow-[0_4px_12px_rgba(var(--color-accent),0.4)]" 
                      : isToday 
                        ? "text-accent border border-accent/30 bg-accent/5 font-semibold"
                        : isCurrentMonth 
                          ? "text-gray-500 hover:bg-white/5 hover:text-white" 
                          : "text-gray-800 opacity-30 hover:opacity-100"
                  )}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Search - Ultra Minimal */}
        <div className="relative group mt-auto">
          <button 
            onClick={onOpenSearch}
            className="w-full bg-white/[0.02] border border-white/5 focus:border-accent/20 rounded-lg py-2 pl-9 pr-3 text-[10px] font-medium text-gray-400 outline-none transition-all placeholder:text-gray-800 text-left flex items-center relative"
          >
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 group-hover:text-accent transition-colors" />
            <span>Command (⌘ + K)</span>
          </button>
        </div>
      </div>
      
      {/* Footer & Account Status */}
      <div className="mt-auto border-t border-white/5 bg-white/[0.01] p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-1.5 text-gray-600 hover:text-accent transition-all rounded-md hover:bg-white/5"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button 
              onClick={() => setActiveModal({ type: 'shortcuts' })}
              className="p-1.5 text-gray-600 hover:text-accent transition-all rounded-md hover:bg-white/5"
              title="Security Key (Shortcuts)"
            >
              <ShieldCheck size={14} />
            </button>
          </div>
          <span className="text-[7px] text-gray-700 font-semibold tracking-[0.2em] uppercase">V1.0.4-STABLE</span>
        </div>

        <div className="relative">
          {user ? (
            <button 
              onClick={() => setShowUserPopover(!showUserPopover)}
              className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="relative">
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-7 h-7 rounded-lg border border-white/10 group-hover:border-accent/30 transition-colors"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-black rounded-full" />
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-[11px] font-bold text-gray-300 truncate w-full text-left">{user.displayName}</span>
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest text-left mt-0.5">Stream Active</span>
              </div>
              <ChevronUp size={12} className={clsx("ml-auto text-gray-700 transition-transform", showUserPopover && "rotate-180")} />
            </button>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="w-full h-10 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group"
            >
              <UserCircle size={16} className="text-gray-600 group-hover:text-accent" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white">Authenticate</span>
            </button>
          )}

          {/* Account Popover */}
          {showUserPopover && user && (
            <>
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setShowUserPopover(false)}
              />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#121216] border border-white/10 rounded-xl p-1 shadow-2xl z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="px-3 py-2 border-b border-white/5 mb-1 bg-white/[0.02] rounded-t-lg">
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] mb-0.5">Identified As</p>
                  <p className="text-[10px] text-gray-400 truncate font-medium">{user.email}</p>
                </div>
                <button 
                  onClick={() => setShowUserPopover(false)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-all uppercase tracking-wider"
                >
                  <SettingsIcon size={12} />
                  <span>Preferences</span>
                </button>
                <button 
                  onClick={() => {
                    setShowUserPopover(false);
                    signOutUser();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-red-900/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all mt-1 uppercase tracking-wider"
                >
                  <LogOut size={12} />
                  <span>Terminate Session</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
