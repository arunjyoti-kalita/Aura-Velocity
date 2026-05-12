import { useState, useMemo } from 'react';
import { 
  Plus, Search, Book, Clock, Calendar, 
  ChevronRight, Filter, MoreVertical,
  LayoutGrid, List as ListIcon, Star,
  Trash2, Edit3
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useApp } from "../../contexts/useApp";
import { JournalEditor } from './JournalEditor';
import { generateUUID } from '../../utils/id';
import clsx from 'clsx';

export function JournalView() {
  const { journal, saveJournalEntry, deleteJournalEntry, currentDate } = useApp();
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const entries = useMemo(() => {
    return (journal?.entries || []).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [journal]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const titleMatch = (entry.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const contentMatch = (entry.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = titleMatch || contentMatch;
      const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [entries, searchQuery, filterCategory]);

  const selectedEntry = useMemo(() => {
    return entries.find(e => e.id === selectedId) || null;
  }, [entries, selectedId]);

  const handleCreateNew = () => {
    const newEntry = {
      id: generateUUID(),
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
    setSelectedId(newEntry.id);
  };

  const handleSave = (updatedEntry) => {
    saveJournalEntry(updatedEntry);
  };

  const handleDelete = (id) => {
    deleteJournalEntry(id || selectedId);
    if (selectedId === (id || selectedId)) {
      setSelectedId(null);
    }
  };

  return (
    <div className="flex h-full bg-[#0d0d0f] overflow-hidden animate-in fade-in duration-500">
      {/* Journal List Sidebar */}
      <div className="w-[320px] border-r border-white/5 flex flex-col shrink-0 bg-[#0a0a0c]/50 backdrop-blur-md">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Book size={18} className="text-accent" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Archives</h2>
            </div>
            <button 
              onClick={handleCreateNew}
              className="p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all border border-accent/20 group"
              title="New Entry"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-accent transition-colors" />
            <input 
              type="text"
              placeholder="Search stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-accent/40 focus:bg-white/5 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-8">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                <Edit3 size={20} className="text-gray-800" />
              </div>
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">No entries found</p>
              <button 
                onClick={handleCreateNew}
                className="mt-4 text-[10px] font-black text-accent uppercase tracking-widest hover:underline"
              >
                Initialize New Stream
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEntries.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={clsx(
                    "w-full text-left p-4 rounded-xl transition-all group relative overflow-hidden border",
                    selectedId === entry.id 
                      ? "bg-white/5 border-white/10 shadow-lg" 
                      : "border-transparent hover:bg-white/[0.02] hover:border-white/5"
                  )}
                >
                  {selectedId === entry.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full shadow-[0_0_8px_rgba(var(--color-accent),0.5)]" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="text-2xl pt-0.5 shrink-0">
                      {entry.emoji || '✦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={clsx(
                        "text-sm font-bold truncate mb-1 transition-colors",
                        selectedId === entry.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                      )}>
                        {entry.title || 'Untitled'}
                      </h4>
                      <p className="text-[11px] text-gray-600 font-medium truncate mb-2">
                        {(entry.content || '').substring(0, 60)}
                        {(entry.content || '').length > 60 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-700 uppercase tracking-tighter">
                          <Calendar size={10} />
                          {entry.linkedDate || entry.createdAt ? format(parseISO(entry.linkedDate || (entry.createdAt || new Date().toISOString()).split('T')[0]), 'MMM d') : 'No date'}
                        </div>
                        {entry.category && (
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-accent/40" />
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-tighter">{entry.category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative flex flex-col bg-transparent">
        {selectedEntry ? (
          <JournalEditor 
            key={selectedEntry.id}
            entry={selectedEntry} 
            onSave={handleSave}
            onDelete={() => handleDelete(selectedEntry.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/5 relative z-10">
                <Book size={40} className="text-gray-800" />
              </div>
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full animate-pulse opacity-20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Neural Reflection Stream</h3>
            <p className="text-gray-500 max-w-xs text-sm mb-8 leading-relaxed">
              Capture flashes of insight, daily summaries, and philosophical course-corrections.
            </p>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-3 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 hover:border-accent/40 transition-all active:scale-95 shadow-2xl"
            >
              <Plus size={16} />
              New Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
