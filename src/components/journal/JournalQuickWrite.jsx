import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/useApp';
import { X, Save, Book, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { generateUUID } from '../../utils/id';
import clsx from 'clsx';

const CATEGORIES = [
  { id: 'Daily', name: 'Daily', color: '#7c3aed' },
  { id: 'Personal', name: 'Personal', color: '#dc6b4a' },
  { id: 'Work', name: 'Work', color: '#3b82f6' },
  { id: 'Special Event', name: 'Special Event', color: '#d97706' },
  { id: 'Planning', name: 'Planning', color: '#ea580c' },
  { id: 'Reflection', name: 'Reflection', color: '#0d9488' }
];

export function JournalQuickWrite({ date, onClose }) {
  const { saveJournalEntry } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Daily');

  const handleSave = () => {
    const newEntry = {
      id: generateUUID(),
      title: title || 'Quick Note',
      content,
      emoji: null,
      category,
      tags: [],
      mood: null,
      linkedDate: date,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveJournalEntry(newEntry);
    onClose();
  };

  return (
    <div className="bg-[#16161a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] w-[340px] animate-in zoom-in-95 fade-in duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shadow-inner">
            <Sparkles size={14} className="text-accent" />
          </div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/90">Quick Realization</h3>
        </div>
        <button 
          onClick={onClose} 
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all group"
        >
          <X size={14} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600">Title</label>
            <span className="text-[8px] text-gray-700 font-bold uppercase">{format(parseISO(date), 'MMM d, yyyy')}</span>
          </div>
          <input
            autoFocus
            type="text"
            placeholder="Highlight of the moment..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 outline-none focus:border-accent/40 focus:bg-white/5 transition-all shadow-inner"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-600">Reflection</label>
          <textarea
            placeholder="What's unfolding?"
            value={content}
            spellCheck="true"
            autoCorrect="on"
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-700 outline-none focus:border-accent/40 focus:bg-white/5 transition-all resize-none h-32 leading-relaxed shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-600">Context</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all border",
                  category === cat.id 
                    ? "bg-white/10 text-white border-white/20 shadow-lg" 
                    : "text-gray-600 hover:text-gray-400 border-transparent hover:bg-white/[0.03]"
                )}
                style={{ color: category === cat.id ? cat.color : undefined }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="w-full flex items-center justify-center gap-2 bg-accent text-bg-base py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 group"
          >
            <Save size={14} className="group-hover:scale-110 transition-transform" />
            Append to Journal
          </button>
        </div>
      </div>
    </div>
  );
}
