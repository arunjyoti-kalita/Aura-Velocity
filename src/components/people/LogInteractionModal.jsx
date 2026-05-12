import { useState } from 'react';
import { X, Calendar, MessageSquare, Phone, MapPin, Users, Star, Clock } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { format } from 'date-fns';

const TYPES = [
  { id: 'Call', icon: Phone },
  { id: 'Message', icon: MessageSquare },
  { id: 'In-person', icon: MapPin },
  { id: 'Meeting', icon: Users }
];

export function LogInteractionModal({ isOpen, onClose, person }) {
  const { logInteraction } = useApp();
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    interactionType: 'Call',
    notes: '',
    qualityRating: 5,
    duration: 30
  });

  if (!isOpen || !person) return null;

  const handleSave = async () => {
    await logInteraction(person.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm bg-[#0f0f13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Log Neural Contact</h2>
            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Linking with {person.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Event Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="date"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-[11px] text-gray-200 focus:outline-none focus:border-accent/40 transition-all [color-scheme:dark]"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Duration (Min)</label>
              <div className="relative">
                <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="number"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-[11px] text-gray-200 focus:outline-none focus:border-accent/40 transition-all"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Interaction Type */}
          <div className="space-y-2">
            <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Transmission Medium</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, interactionType: type.id })}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all",
                    formData.interactionType === type.id 
                      ? "bg-white/10 border-white/20 text-white shadow-lg" 
                      : "bg-white/[0.02] border-white/5 text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"
                  )}
                >
                  <type.icon size={14} className={formData.interactionType === type.id ? "text-accent" : "opacity-40"} />
                  <span className="text-[7px] font-black uppercase tracking-tighter">{type.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Rating */}
          <div className="space-y-2">
            <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Neural Connection Quality</label>
            <div className="flex items-center justify-between bg-white/[0.03] p-3 rounded-xl border border-white/5">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setFormData({ ...formData, qualityRating: rating })}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    formData.qualityRating >= rating ? "text-yellow-500 scale-110" : "text-gray-800"
                  )}
                >
                  <Star size={18} fill={formData.qualityRating >= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] ml-1">Brief Context</label>
            <input
              type="text"
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-[11px] text-gray-300 focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all placeholder:text-gray-800"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="E.G. UPDATED ON Q2 GOALS..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={handleSave}
            className="w-full h-11 bg-accent text-bg-base font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all"
          >
            Log Protocol Execution
          </button>
        </div>
      </div>
    </div>
  );
}
