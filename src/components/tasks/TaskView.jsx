import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, CheckCircle2, Circle, Trash2, 
  Flag, Calendar, Tag, ChevronRight,
  MoreVertical, List, LayoutGrid, Filter,
  ArrowUp, ArrowDown, Search, Copy,
  AlertCircle, Clock
} from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { format, isToday, isTomorrow, parseISO, subDays } from 'date-fns';
import { TaskTimer } from './TaskTimer';
import { MedicationPulse } from './MedicationPulse';

export function TaskView() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, currentDate, cloneTasks } = useApp();
  const [newTaskText, setNewTaskText] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todo'); // todo, completed, all

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const prevDateStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');
  const isPast = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return dateStr < todayStr;
  }, [dateStr]);

  // Default to 'all' if navigating to past dates
  useEffect(() => {
    if (isPast && activeTab === 'todo') {
      setActiveTab('all');
    }
  }, [isPast, dateStr]); // Reset when date changes

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesDate = task.date === dateStr;
      const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesDate) return false;
      if (activeTab === 'todo') return matchesSearch && !task.completed;
      if (activeTab === 'completed') return matchesSearch && task.completed;
      return matchesSearch;
    }).sort((a, b) => {
      // Completed tasks always go to the bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      // For non-completed tasks:
      if (!a.completed) {
        // 1. Prioritize tasks with scheduled time
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        if (a.scheduledTime) return -1;
        if (b.scheduledTime) return 1;
      }

      // 2. Secondary sort: Priority
      const priorityMap = { high: 0, medium: 1, low: 2 };
      if (priorityMap[a.priority] !== priorityMap[b.priority]) {
        return priorityMap[a.priority] - priorityMap[b.priority];
      }

      // 3. Tertiary sort: Creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [tasks, searchQuery, activeTab, dateStr]);

  const hasTasksOnPrevDate = useMemo(() => {
    return tasks.some(t => t.date === prevDateStr);
  }, [tasks, prevDateStr]);

  const handleAddTask = (e) => {
    if (e) e.preventDefault();
    if (!newTaskText.trim()) return;
    
    addTask({
      text: newTaskText,
      priority: 'medium',
      tags: [],
      dueDate: null,
      scheduledTime: scheduledTime || null
    }, dateStr);
    setNewTaskText('');
    setScheduledTime('');
  };

  const handleCarryForward = () => {
    cloneTasks(prevDateStr, dateStr);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f] overflow-hidden animate-in fade-in duration-500">
      {/* Sub-header Hero Area */}
      <div className="px-8 pt-12 pb-8 shrink-0">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/80">
                {format(currentDate, 'EEEE, MMM do').toUpperCase()}
              </span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
              Task <span className="text-white/20">Flow</span>
            </h1>
          </div>

          <div className="flex items-center gap-6 pb-1">
            <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-2 rounded-2xl">
              <div className="flex items-center gap-3 pr-4 border-r border-white/5">
                <TaskTimer />
                <MedicationPulse />
              </div>
              
              <div className="flex items-center gap-2">
                {hasTasksOnPrevDate && (
                  <button 
                    onClick={handleCarryForward}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5 group"
                  >
                    <Copy size={12} className="group-hover:scale-110 transition-transform" />
                    <span>Clone Yesterday</span>
                  </button>
                )}
                
                <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-xl h-9">
                  {['todo', 'completed', 'all'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={clsx(
                        "text-[9px] font-black uppercase tracking-widest transition-all px-3 h-full rounded-lg",
                        activeTab === tab 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                          : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {tab === 'todo' ? 'Todo' : tab === 'completed' ? 'Finished' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Import / Notification Area */}
          {hasTasksOnPrevDate && filteredTasks.length === 0 && activeTab === 'todo' && (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <Copy size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Carry forward yesterday's stream?</h4>
                  <p className="text-xs text-gray-500">Duplicate all tasks from {format(subDays(currentDate, 1), 'MMM do')} to today.</p>
                </div>
              </div>
              <button 
                onClick={handleCarryForward}
                className="px-4 py-2 bg-accent text-bg-base text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Initialize Import
              </button>
            </div>
          )}

          {/* Quick Add Bar */}
          <form onSubmit={handleAddTask} className="flex gap-3 relative group">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-accent transition-colors">
                <Plus size={20} />
              </div>
              <input 
                type="text"
                placeholder="Initialize new task... (Press Enter)"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-accent/40 focus:bg-white/5 transition-all shadow-2xl"
              />
            </div>
            
            <div className="relative w-32 shrink-0">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                <Clock size={16} />
              </div>
              <input 
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full h-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-10 pr-2 text-xs text-white focus:outline-none focus:border-accent/40 transition-all [color-scheme:dark]"
              />
            </div>
            
            <button 
              type="submit"
              className="bg-accent text-bg-base px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              Add
            </button>
          </form>

          {/* Search & Stats */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Day View</span>
                <span className="text-sm font-bold text-white">{filteredTasks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Done</span>
                <span className="text-sm font-bold text-emerald-500">{filteredTasks.filter(t => t.completed).length}</span>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
              <input 
                type="text"
                placeholder="Filter tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-gray-400 placeholder:text-gray-800 w-48 pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Task List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-20">
        <div className="max-w-4xl mx-auto space-y-1">
          {filteredTasks.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-16 h-16 bg-white/5 rounded-[32px] flex items-center justify-center mb-6 border border-white/5">
                <CheckCircle2 size={32} className="text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Clear Frequency</p>
              <p className="text-[11px] text-gray-600 mt-2 uppercase tracking-tighter font-bold">No tasks found for this date</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div 
                key={task.id}
                className={clsx(
                  "group flex items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-white/[0.02]",
                  task.completed 
                    ? "bg-transparent border-transparent opacity-40" 
                    : "bg-white/[0.01] border-white/5 hover:border-white/10 shadow-lg"
                )}
              >
                <button 
                  onClick={() => toggleTask(task.id)}
                  className={clsx(
                    "shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    task.completed 
                      ? "bg-accent border-accent text-bg-base" 
                      : "border-white/10 hover:border-accent/50 text-transparent hover:text-accent/30"
                  )}
                >
                  <CheckCircle2 size={14} strokeWidth={3} />
                </button>

                  <div className="flex-1 flex flex-col min-w-0">
                    <input 
                      type="text"
                      value={task.text}
                      onChange={(e) => updateTask(task.id, { text: e.target.value })}
                      className={clsx(
                        "w-full bg-transparent border-none outline-none text-[15px] transition-all",
                        task.completed ? "text-gray-600 line-through" : "text-gray-200"
                      )}
                    />
                    {task.completed && task.completedAt && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-accent/60 uppercase tracking-widest animate-in fade-in slide-in-from-left-1">
                        <Clock size={10} />
                        <span>Finished at {format(parseISO(task.completedAt), 'h:mm a')}</span>
                      </div>
                    )}
                    {!task.completed && task.scheduledTime && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left-1">
                        <Clock size={10} />
                        <span>Scheduled: {task.scheduledTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Metadata / Pills */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select 
                      value={task.priority}
                      onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                      className={clsx(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border appearance-none outline-none cursor-pointer",
                        getPriorityColor(task.priority)
                      )}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>

                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
