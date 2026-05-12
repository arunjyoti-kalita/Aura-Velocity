import React, { useState } from 'react';
import { X, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';

export function CustomActivityModal({ isOpen, onClose, onActivityCreated }) {
  const { activities, addActivity, deleteActivity } = useApp();
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [formData, setFormData] = useState({
    name: '',
    baseColor: '#3b82f6',
    referenceLink: '',
    isSkillBased: false
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (formData.name.trim()) {
      addActivity({
        name: formData.name.trim(),
        baseColor: formData.baseColor,
        lightColor: formData.baseColor,
        subcategories: [],
        allowsCustomSubcategories: true,
        referenceLink: formData.referenceLink,
        isSkillBased: formData.isSkillBased
      });
      if (onActivityCreated) {
        onActivityCreated(formData.name.trim());
      }
      setView('list');
      setFormData({ name: '', baseColor: '#3b82f6', referenceLink: '', isSkillBased: false });
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm shadow-2xl overflow-hidden bg-[#0f0f13] border border-white/10 rounded-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {view === 'create' && (
              <button onClick={() => setView('list')} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
              {view === 'list' ? 'Protocol Library' : 'Create Protocol'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {view === 'list' ? (
          <div className="flex flex-col h-[420px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {activities.map((act) => (
                <div 
                  key={act.name} 
                  className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: act.baseColor }} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wide">{act.name}</span>
                      {act.isCustom && <span className="text-[7px] font-black text-accent uppercase tracking-widest mt-0.5">Custom Entry</span>}
                    </div>
                  </div>
                  {act.isCustom && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteActivity(act.id || act.name);
                      }}
                      className="p-1.5 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
              <button 
                onClick={() => setView('create')}
                className="w-full h-11 flex items-center justify-center gap-2 bg-accent text-bg-base font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-95 transition-all hover:shadow-accent/20"
              >
                <Plus size={16} />
                New Protocol
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Protocol Identifier</label>
              <input
                type="text"
                className="w-full bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 text-[12px] text-gray-200 focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all placeholder:text-gray-800"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ENTER NAME..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Visual Signature</label>
              <div className="flex items-center gap-4 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="relative">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer appearance-none"
                    value={formData.baseColor}
                    onChange={(e) => setFormData({ ...formData, baseColor: e.target.value })}
                  />
                  <div className="absolute inset-0 rounded-lg border border-white/10 pointer-events-none" />
                </div>
                <span className="text-gray-400 font-mono text-[10px] uppercase tracking-wider">{formData.baseColor}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Archetype Scope</label>
              <label className="flex items-center gap-3 cursor-pointer bg-white/[0.03] p-3 rounded-xl border border-white/5 hover:bg-white/[0.05] transition-all group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/10 text-accent focus:ring-accent focus:ring-offset-[#0f0f13] bg-transparent"
                  checked={formData.isSkillBased}
                  onChange={(e) => setFormData({ ...formData, isSkillBased: e.target.checked })}
                />
                <span className="text-[9px] font-bold text-gray-400 group-hover:text-gray-200 uppercase tracking-widest">Skill-Based Analytics</span>
              </label>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="w-full h-11 bg-accent text-bg-base font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-30 hover:shadow-accent/30"
              >
                Initialize Protocol
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
