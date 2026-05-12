import { useState, useEffect } from 'react';
import { X, Trash2, Tag, Info, User, Shield, Briefcase, Heart, Plus } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';

const ROLES = [
  { id: 'Family', icon: Heart, color: 'text-pink-400' },
  { id: 'Friend', icon: User, color: 'text-emerald-400' },
  { id: 'Mentor', icon: Shield, color: 'text-purple-400' },
  { id: 'Collaborator', icon: Briefcase, color: 'text-blue-400' },
  { id: 'Other', icon: Info, color: 'text-gray-400' }
];

export function AddPersonModal({ isOpen, onClose, person }) {
  const { addPerson, updatePerson, deletePerson } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'Friend',
    cadenceDays: 7,
    notes: '',
    tags: [],
    avatarColor: '#3b82f6'
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        role: person.role || 'Friend',
        cadenceDays: person.cadenceDays || 7,
        notes: person.notes || '',
        tags: person.tags || [],
        avatarColor: person.avatarColor || '#3b82f6'
      });
    } else {
      setFormData({
        name: '',
        role: 'Friend',
        cadenceDays: 7,
        notes: '',
        tags: [],
        avatarColor: '#3b82f6'
      });
    }
  }, [person, isOpen]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    if (person) {
      await updatePerson(person.id, formData);
    } else {
      await addPerson(formData);
    }
    onClose();
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[#0f0f13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
              <UserPlusIcon size={18} />
            </div>
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">
              {person ? 'Update Neural Link' : 'Initialize Connection'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Identity Section */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Legal Name</label>
              <input
                type="text"
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-[13px] text-gray-200 focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all placeholder:text-gray-800"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="FULL NAME..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Relationship Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setFormData({ ...formData, role: role.id })}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all",
                      formData.role === role.id 
                        ? "bg-white/10 border-white/20 text-white shadow-lg" 
                        : "bg-white/[0.02] border-white/5 text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"
                    )}
                  >
                    <role.icon size={14} className={formData.role === role.id ? role.color : "opacity-40"} />
                    <span className="text-[7px] font-black uppercase tracking-tighter">{role.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cadence Section */}
          <div className="space-y-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Contact Cadence</label>
              <span className="text-accent font-black text-xs uppercase tracking-widest">{formData.cadenceDays} Days</span>
            </div>
            <input 
              type="range"
              min="1"
              max="90"
              className="w-full accent-accent bg-white/5 rounded-lg h-1.5 cursor-pointer"
              value={formData.cadenceDays}
              onChange={(e) => setFormData({ ...formData, cadenceDays: parseInt(e.target.value) })}
            />
            <div className="flex justify-between text-[7px] font-black text-gray-800 uppercase tracking-widest px-1">
              <span>Daily</span>
              <span>Weekly</span>
              <span>Monthly</span>
              <span>Quarterly</span>
            </div>
          </div>

          {/* Tags & Metadata */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Neural Tags</label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-white/[0.03] border border-white/5 rounded-xl">
                {formData.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[9px] font-black uppercase tracking-widest">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input 
                  type="text"
                  placeholder="ADD TAG + ENTER..."
                  className="bg-transparent border-none outline-none text-[10px] font-bold text-gray-400 placeholder:text-gray-800 flex-1 min-w-[100px] px-2"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Strategic Notes</label>
              <textarea
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-[12px] text-gray-300 focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all placeholder:text-gray-800 resize-none h-24"
                value={formData.notes}
                spellCheck="true"
                autoCorrect="on"
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="E.G. PREFERS CALLS ON WEEKENDS, FOCUS ON TECH TRENDS..."
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          {person ? (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete this connection?')) {
                  deletePerson(person.id);
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
            >
              <Trash2 size={14} />
              Terminate Link
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 font-black text-[9px] uppercase tracking-widest hover:text-white transition-all"
            >
              Abort
            </button>
            <button 
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-8 py-2.5 bg-accent text-bg-base font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all disabled:opacity-30"
            >
              {person ? 'Update Protocol' : 'Initialize Protocol'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPlusIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
