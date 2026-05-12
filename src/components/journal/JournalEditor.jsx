import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Smile, Calendar, Pin, Trash2, Tag, Plus,
  ChevronDown, Clock, Check, AlertCircle, X,
  Layout, Type, MoreHorizontal, Sparkles,
  Maximize2, Minimize2, Share2, Info, Edit3
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

const COMMON_EMOJIS = [
  '✦', '✨', '📝', '🧠', '💡', '🔥', '🌱', '🚀', '🎯', '⚓️',
  '❤️', '⚡️', '🌈', '☀️', '🌙', '🌊', '☕️', '🎨', '🎬', '📚',
  '💻', '🛠', '🏗', '🧘', '🏃', '🥗', '🏡', '🌍', '📈', '✅',
  '⚠️', '⭐️', '💎', '🔑', '🎁', '🎈', '💬', '💭', '🔔', '📌'
];

const CATEGORIES = [
  { id: 'Daily', name: 'Daily', color: '#7c3aed' },
  { id: 'Personal', name: 'Personal', color: '#dc6b4a' },
  { id: 'Work', name: 'Work', color: '#3b82f6' },
  { id: 'Special Event', name: 'Special Event', color: '#d97706' },
  { id: 'Planning', name: 'Planning', color: '#ea580c' },
  { id: 'Reflection', name: 'Reflection', color: '#0d9488' }
];

const MOODS = [
  { emoji: '😊', id: 'great', label: 'Energized' },
  { emoji: '😐', id: 'neutral', label: 'Stable' },
  { emoji: '😔', id: 'low', label: 'Tired' },
  { emoji: '😤', id: 'bad', label: 'Stressed' },
  { emoji: '🔥', id: 'peak', label: 'Flow' }
];

export function JournalEditor({ entry, onSave, onDelete }) {
  const [formData, setFormData] = useState(entry);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const saveTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync state with prop when entry.id changes
  useEffect(() => {
    setFormData(entry);
    // Reset height of textarea on entry change
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [entry.id]);

  // Auto-save logic
  const triggerAutoSave = useCallback((updatedData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      onSave(updatedData);
      setTimeout(() => setIsSaving(false), 1200);
    }, 1000);
  }, [onSave]);

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    triggerAutoSave(updated);
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const tags = [...new Set([...(formData.tags || []), newTag.trim()])];
      handleChange('tags', tags);
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const removeTag = (tag) => {
    const tags = formData.tags.filter(t => t !== tag);
    handleChange('tags', tags);
  };

  const currentCategory = CATEGORIES.find(c => c.id === formData.category) || CATEGORIES[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative bg-[#0d0d0f] animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Top Action Bar (Floating Style) */}
      <div className="sticky top-0 z-[100] px-8 py-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {isSaving ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full animate-pulse">
              <Clock size={10} className="text-accent" />
              <span className="text-[10px] font-black text-accent uppercase tracking-widest">Auto-saving...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full opacity-40 hover:opacity-100 transition-opacity">
              <Check size={10} className="text-gray-400" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saved</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-1 shadow-2xl">
          <button className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Share">
            <Share2 size={16} />
          </button>
          <button className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="History">
            <Clock size={16} />
          </button>
          <button 
            onClick={() => handleChange('isPinned', !formData.isPinned)}
            className={clsx(
              "p-2 rounded-lg transition-all",
              formData.isPinned ? "text-accent bg-accent/10" : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
            title="Pin Entry"
          >
            <Pin size={16} />
          </button>
          <div className="relative group/menu">
            <button className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <MoreHorizontal size={16} />
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-[200] p-1">
              <button 
                onClick={() => onDelete()}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <Trash2 size={14} />
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto px-6 md:px-12">
        {/* Sticky Head Part */}
        <div className="sticky top-[72px] z-[90] bg-[#0d0d0f]/80 backdrop-blur-xl -mx-6 md:-mx-12 px-6 md:px-12 pt-1 pb-2 border-b border-white/5 mb-4">
          {/* Cover Placeholder / Spacing */}
          <div className="h-4 group relative mb-2">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute -bottom-2 left-0 flex items-center gap-4">
               <div className="relative group/emoji">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-16 h-16 flex items-center justify-center rounded-2xl bg-[#1a1a1e] border border-white/10 shadow-2xl hover:scale-105 active:scale-95 transition-all text-3xl group-hover/emoji:border-accent/30"
                >
                  {formData.emoji || <Smile size={24} className="text-gray-700 group-hover/emoji:text-gray-500" />}
                </button>

                {showEmojiPicker && (
                  <div className="absolute top-20 left-0 z-[200] p-4 bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] w-[320px] animate-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-8 gap-2">
                      {COMMON_EMOJIS.map(e => (
                        <button
                          key={e}
                          onClick={() => { handleChange('emoji', e); setShowEmojiPicker(false); }}
                          className="w-8 h-8 flex items-center justify-center text-xl hover:bg-white/5 rounded-lg transition-all hover:scale-110"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => { handleChange('emoji', null); setShowEmojiPicker(false); }}
                      className="w-full mt-4 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-white border-t border-white/5 transition-colors"
                    >
                      Remove Emoji
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title Input */}
          <textarea
            rows={1}
            placeholder="Untitled"
            spellCheck="true"
            autoCorrect="on"
            value={formData.title}
            onChange={(e) => {
              handleChange('title', e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className="w-full bg-transparent border-none outline-none text-4xl font-bold text-white/90 placeholder-white/5 mb-4 font-serif leading-tight resize-none"
            style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
          />

          {/* Metadata Properties Grid (Compact 2-line) */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {/* Category Property */}
            <div className="flex items-center group/prop py-0.5 rounded-lg hover:bg-white/[0.02] transition-colors px-1 -ml-1">
              <div className="w-[85px] flex items-center gap-2 text-gray-600 shrink-0">
                <Layout size={12} />
                <span className="text-[11px] font-medium">Category</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="flex items-center gap-2 px-2 py-0.5 rounded-md transition-all hover:bg-white/5 group/btn"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentCategory.color }} />
                  <span className="text-[12px] font-medium text-gray-300">
                    {currentCategory.name}
                  </span>
                  <ChevronDown size={12} className="text-gray-700 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </button>

                {showCategoryMenu && (
                  <div className="absolute top-8 left-0 z-[150] py-2 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl w-[200px] animate-in fade-in zoom-in-95 duration-150">
                    <p className="px-4 py-2 text-[10px] font-black uppercase text-gray-600 tracking-widest">Select Category</p>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { handleChange('category', cat.id); setShowCategoryMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-all"
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-[12px] font-medium text-gray-300">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Property */}
            <div className="flex items-center group/prop py-0.5 rounded-lg hover:bg-white/[0.02] transition-colors px-1 -ml-1">
              <div className="w-[85px] flex items-center gap-2 text-gray-600 shrink-0">
                <Calendar size={12} />
                <span className="text-[11px] font-medium">Date</span>
              </div>
              <div className="relative group/date">
                <input
                  type="date"
                  value={formData.linkedDate || ''}
                  onChange={(e) => handleChange('linkedDate', e.target.value)}
                  className="bg-transparent border-none outline-none text-[12px] font-medium text-gray-400 hover:text-white cursor-pointer transition-colors"
                />
              </div>
            </div>

            {/* Energy Vector Property */}
            <div className="flex items-center group/prop py-0.5 rounded-lg hover:bg-white/[0.02] transition-colors px-1 -ml-1">
              <div className="w-[85px] flex items-center gap-2 text-gray-600 shrink-0">
                <Smile size={12} />
                <span className="text-[11px] font-medium">Energy Vector</span>
              </div>
              <div className="flex items-center gap-1.5">
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    title={m.label}
                    onClick={() => handleChange('mood', formData.mood === m.id ? null : m.id)}
                    className={clsx(
                      "w-6 h-6 flex items-center justify-center rounded-md transition-all text-sm border",
                      formData.mood === m.id 
                        ? "bg-accent/10 border-accent/30 grayscale-0 scale-110" 
                        : "bg-white/[0.02] border-transparent grayscale hover:grayscale-0 hover:bg-white/5"
                    )}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Property */}
            <div className="flex items-center group/prop py-0.5 rounded-lg hover:bg-white/[0.02] transition-colors px-1 -ml-1">
              <div className="w-[85px] flex items-center gap-2 text-gray-600 shrink-0">
                <Tag size={12} />
                <span className="text-[11px] font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                {formData.tags?.map(tag => (
                  <div key={tag} className="flex items-center gap-1 px-1.5 py-0 bg-white/5 rounded-md border border-white/5 group/tag">
                    <span className="text-[11px] font-medium text-gray-400">#{tag}</span>
                    <button 
                      onClick={() => removeTag(tag)}
                      className="text-gray-600 hover:text-red-400 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                
                {showTagInput ? (
                  <input
                    autoFocus
                    type="text"
                    placeholder="..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={addTag}
                    onBlur={() => setShowTagInput(false)}
                    className="bg-transparent border-none outline-none text-[12px] font-medium text-accent placeholder-accent/40 w-16"
                  />
                ) : (
                  <button 
                    onClick={() => setShowTagInput(true)}
                    className="p-1 text-gray-700 hover:text-gray-400 hover:bg-white/5 rounded transition-all"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <textarea
          ref={textareaRef}
          placeholder="Type '/' for commands..."
          spellCheck="true"
          autoCorrect="on"
          value={formData.content}
          onChange={(e) => {
            handleChange('content', e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          className="w-full bg-transparent border-none outline-none text-[17px] leading-[1.8] text-gray-200 placeholder-white/20 font-serif min-h-[500px] resize-none pb-20 pt-4"
          style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
        />
      </div>

      {/* Footer Info / Delete (Sticky at bottom) */}
      <div className="sticky bottom-0 z-[100] mt-auto px-8 py-4 bg-[#0d0d0f]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between text-gray-600">
        <div className="flex items-center gap-4 text-[11px] font-medium uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Clock size={12} />
            <span>Created {formData.createdAt ? format(new Date(formData.createdAt), 'MMM d, h:mm a') : 'Recently'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Edit3 size={12} />
            <span>Edited {formData.updatedAt ? format(new Date(formData.updatedAt), 'MMM d, h:mm a') : 'Just now'}</span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[11px] font-black uppercase tracking-widest",
              showDeleteConfirm ? "text-red-400 bg-red-400/10" : "hover:text-red-400 hover:bg-red-400/5"
            )}
          >
            <Trash2 size={14} />
            Delete Entry
          </button>

          {showDeleteConfirm && (
            <div className="absolute bottom-12 right-0 bg-[#1a1a1e] border border-red-500/30 rounded-xl p-4 shadow-2xl w-[220px] z-[200] animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                  <AlertCircle size={20} className="text-red-500" />
                </div>
                <p className="text-[12px] font-bold text-white mb-1">Delete this entry?</p>
                <p className="text-[10px] text-gray-500 mb-4">This action is permanent and cannot be reversed.</p>
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-lg bg-white/5 text-[11px] font-black uppercase text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[11px] font-black uppercase shadow-lg shadow-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
