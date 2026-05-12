import { useState } from 'react';
import { Search, Sparkles, Clock, User, X, MessageSquare } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import { semanticSearch } from "../../services/aiService";
import clsx from 'clsx';

export function SemanticSearchPanel({ onClose }) {
  const { logs, relationships } = useApp();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const data = await semanticSearch(query, logs, relationships);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg text-accent">
            <Search size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Semantic Life Search</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Query your existence</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Ask anything: 'When did I last workout?' or 'Who have I neglected?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-gray-700"
          />
          <button 
            type="submit"
            disabled={isSearching}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent text-bg-base rounded-xl disabled:opacity-50 transition-all hover:scale-105"
          >
            {isSearching ? <div className="w-5 h-5 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" /> : <Sparkles size={18} />}
          </button>
        </form>

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <MessageSquare size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Librarian's Answer</span>
              </div>
              <p className="text-lg font-medium leading-relaxed text-gray-200">
                {result.answer}
              </p>
            </div>

            {result.results?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Evidence Found</h3>
                {result.results.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors group">
                    <div className={clsx(
                      "p-2 rounded-lg",
                      item.type === 'log' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                    )}>
                      {item.type === 'log' ? <Clock size={16} /> : <User size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-accent transition-colors">{item.date || item.name}</span>
                        {item.time && <span className="text-[10px] text-gray-600 font-medium">at {item.time}</span>}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!result && !isSearching && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SuggestionCard 
              icon={Clock} 
              text="When was my last deep work session?" 
              onClick={() => setQuery("When was my last deep work session?")}
            />
            <SuggestionCard 
              icon={User} 
              text="Who have I neglected this month?" 
              onClick={() => setQuery("Who have I neglected this month?")}
            />
            <SuggestionCard 
              icon={Sparkles} 
              text="What is my most common distraction?" 
              onClick={() => setQuery("What is my most common distraction?")}
            />
            <SuggestionCard 
              icon={Clock} 
              text="Last high-energy workout?" 
              onClick={() => setQuery("When was my last high-energy workout?")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ icon: Icon, text, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-left hover:bg-white/5 hover:border-white/10 transition-all group"
    >
      <Icon size={16} className="text-gray-600 group-hover:text-accent mb-3 transition-colors" />
      <p className="text-xs font-bold text-gray-500 group-hover:text-gray-300 transition-colors">{text}</p>
    </button>
  );
}
