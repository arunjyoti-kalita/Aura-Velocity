import React, { useState } from 'react';
import { useApp } from "../../contexts/useApp";
import { minutesToTimeStr, timeStrToMinutes } from '../../utils/dateHelpers';
import { X, Plus, Trash2, Clock, Target, CalendarDays, ChevronDown, Edit2, Check } from 'lucide-react';
import clsx from 'clsx';

export function GhostSetupDrawer() {
  const { 
    isGhostSetupOpen, setIsGhostSetupOpen, 
    ghostTemplate, setGhostTemplate,
    activities 
  } = useApp();

  const [newBlock, setNewBlock] = useState({
    activityName: activities[0]?.name || '',
    subcategory: '',
    startTime: '08:00',
    endTime: '09:00'
  });
  const [editingId, setEditingId] = useState(null);

  if (!isGhostSetupOpen) return null;

  const selectedActivity = activities.find(a => a.name === newBlock.activityName);

  const addBlock = () => {
    const startMins = timeStrToMinutes(newBlock.startTime);
    const endMins = timeStrToMinutes(newBlock.endTime);
    
    if (endMins <= startMins) {
      alert("End time must be after start time");
      return;
    }

    const blockData = {
      activityName: newBlock.activityName,
      subcategory: newBlock.subcategory,
      start_offset: startMins,
      duration_mins: endMins - startMins,
      color_hint: selectedActivity?.baseColor || '#94a3b8'
    };

    if (editingId) {
      setGhostTemplate(prev => prev.map(b => b.id === editingId ? { ...b, ...blockData } : b).sort((a, b) => a.start_offset - b.start_offset));
      setEditingId(null);
    } else {
      const block = {
        id: Math.random().toString(36).substr(2, 9),
        ...blockData
      };
      setGhostTemplate(prev => [...prev, block].sort((a, b) => a.start_offset - b.start_offset));
    }
    
    setNewBlock({
      activityName: activities[0]?.name || '',
      subcategory: '',
      startTime: '08:00',
      endTime: '09:00'
    });
  };

  const startEdit = (block) => {
    setEditingId(block.id);
    setNewBlock({
      activityName: block.activityName,
      subcategory: block.subcategory || '',
      startTime: minutesToTimeStr(block.start_offset),
      endTime: minutesToTimeStr(block.start_offset + block.duration_mins)
    });
  };

  const removeBlock = (id) => {
    setGhostTemplate(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[240px] bg-[#0A0A0B]/95 backdrop-blur-3xl border-l border-white/10 z-[250] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">
      {/* Header */}
      <div className="p-4 border-b border-white/5 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">
              NEURAL<span className="text-accent ml-1 opacity-80">BLUEPRINT</span>
            </h2>
            <p className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Ideal Day Protocol</p>
          </div>
          <button 
            onClick={() => setIsGhostSetupOpen(false)}
            className="w-6 h-6 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded text-white/40 hover:text-white transition-all"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Form */}
        <section className="space-y-3">
          <div className="space-y-2 p-2.5 bg-white/[0.02] rounded-xl border border-white/5">
            <div className="space-y-0.5">
              <label className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] px-1">Activity</label>
              <select 
                value={newBlock.activityName}
                onChange={(e) => {
                  const actName = e.target.value;
                  const act = activities.find(a => a.name === actName);
                  setNewBlock({
                    ...newBlock, 
                    activityName: actName,
                    subcategory: act?.subcategories?.[0]?.name || ''
                  });
                }}
                className="w-full bg-[#0f0f11] border border-white/5 rounded-md px-2 py-1 text-[8px] text-white/90 focus:border-accent/40 outline-none transition-all cursor-pointer font-bold"
              >
                {activities.map(a => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>

            {selectedActivity?.subcategories?.length > 0 && (
              <div className="space-y-0.5">
                <label className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] px-1">Subcategory</label>
                <select 
                  value={newBlock.subcategory}
                  onChange={(e) => setNewBlock({...newBlock, subcategory: e.target.value})}
                  className="w-full bg-[#0f0f11] border border-white/5 rounded-md px-2 py-1 text-[8px] text-white/90 focus:border-accent/40 outline-none transition-all cursor-pointer font-bold"
                >
                  {selectedActivity.subcategories.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-0.5">
                <label className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] px-1">Start</label>
                <input 
                  type="time"
                  step="60"
                  value={newBlock.startTime}
                  onChange={(e) => setNewBlock({...newBlock, startTime: e.target.value})}
                  className="w-full min-w-[80px] bg-[#0f0f11] border border-white/5 rounded-md px-2 py-1.5 text-[10px] text-white focus:border-accent/40 outline-none transition-all [color-scheme:dark] font-bold"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] px-1">End</label>
                <input 
                  type="time"
                  step="60"
                  value={newBlock.endTime}
                  onChange={(e) => setNewBlock({...newBlock, endTime: e.target.value})}
                  className="w-full min-w-[80px] bg-[#0f0f11] border border-white/5 rounded-md px-2 py-1.5 text-[10px] text-white focus:border-accent/40 outline-none transition-all [color-scheme:dark] font-bold"
                />
              </div>
            </div>

            <button 
              onClick={addBlock}
              className="w-full py-1.5 bg-accent/90 hover:bg-accent text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all active:scale-[0.98] shadow-lg shadow-accent/5 mt-1"
            >
              {editingId ? 'Update' : 'Commit'}
            </button>
          </div>
        </section>

        {/* Blueprint List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Stream Blueprint</h3>
            <span className="text-[8px] font-bold text-accent/50 tabular-nums">
              {ghostTemplate.length} Units
            </span>
          </div>

          <div className="space-y-2">
            {ghostTemplate.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Protocol Empty</p>
              </div>
            ) : (
              ghostTemplate.sort((a,b) => a.start_offset - b.start_offset).map((block) => (
                <div key={block.id} className="group relative flex items-center gap-2.5 p-2.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl transition-all">
                  <div 
                    className="w-0.5 h-5 rounded-full" 
                    style={{ backgroundColor: block.color_hint }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate leading-none">
                      {block.activityName}
                    </div>
                    <div className="text-[7px] text-white/20 font-black tracking-wider mt-1">
                      {minutesToTimeStr(block.start_offset)} — {minutesToTimeStr(block.start_offset + block.duration_mins)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(block)}
                      className="p-1 hover:text-white text-white/20 transition-colors"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button 
                      onClick={() => removeBlock(block.id)}
                      className="p-1 hover:text-red-400 text-white/20 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="p-3 border-t border-white/5 bg-black/20 shrink-0">
        <button 
          onClick={() => setIsGhostSetupOpen(false)}
          className="w-full py-2 bg-white/[0.02] hover:bg-white/[0.05] text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg transition-all border border-white/5 active:scale-[0.98]"
        >
          Finalize Protocol
        </button>
      </div>
    </div>
  );
}
