import { useState, useMemo } from 'react';
import { useApp } from '../../contexts/useApp';
import clsx from 'clsx';
import { 
  Plus, ChevronRight, BookOpen, Layers, 
  Target, Zap, Trash2, Edit3, Save, X,
  FolderOpen, FileText, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

export function BlueprintsView() {
  const { activities, isDeepWork, blueprints, saveBlueprints } = useApp();
  
  const dwActivities = useMemo(() => 
    activities.filter(a => isDeepWork(a.name, activities, Object.keys(blueprints))), 
  [activities, isDeepWork, blueprints]);

  const [selectedActivityName, setSelectedActivityName] = useState(dwActivities[0]?.name);
  const selectedActivity = dwActivities.find(a => a.name === selectedActivityName);
  
  const [selectedSubcategory, setSelectedSubcategory] = useState(selectedActivity?.subcategories?.[0]?.name || 'General');
  const [selectedPageId, setSelectedPageId] = useState(null);

  // Access: blueprints[activityName][subcategoryName] = { pages: [] }
  const getActivePages = () => {
    return blueprints[selectedActivityName]?.[selectedSubcategory]?.pages || [];
  };

  const addActivity = () => {
    const name = prompt("Enter New Domain Name (e.g., Guitar Learning):");
    if (!name) return;
    
    if (dwActivities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      alert("Domain already exists.");
      return;
    }

    // We add it to the blueprints state as a "virtual" activity for now
    const newBlueprints = {
      ...blueprints,
      [name]: {
        'General': { pages: [] }
      }
    };
    saveBlueprints(newBlueprints);
    setSelectedActivityName(name);
    setSelectedSubcategory('General');
    setSelectedPageId(null);
  };

  const addSubcategory = () => {
    const name = prompt("Enter New Pillar Name (e.g., String Mastery):");
    if (!name) return;
    
    const activityData = blueprints[selectedActivityName] || {};
    if (activityData[name]) {
      alert("Pillar already exists.");
      return;
    }

    const newBlueprints = {
      ...blueprints,
      [selectedActivityName]: {
        ...activityData,
        [name]: { pages: [] }
      }
    };
    saveBlueprints(newBlueprints);
    setSelectedSubcategory(name);
    setSelectedPageId(null);
  };

  const addPage = () => {
    const title = prompt("Enter Page Title:");
    if (!title) return;
    
    const newPage = {
      id: Date.now().toString(),
      title,
      content: '',
      createdAt: new Date().toISOString()
    };
    
    const activityData = blueprints[selectedActivityName] || {};
    const subcatData = activityData[selectedSubcategory] || { pages: [] };
    
    const newBlueprints = {
      ...blueprints,
      [selectedActivityName]: {
        ...activityData,
        [selectedSubcategory]: {
          ...subcatData,
          pages: [...subcatData.pages, newPage]
        }
      }
    };
    saveBlueprints(newBlueprints);
    setSelectedPageId(newPage.id);
  };

  const updatePageContent = (content) => {
    if (!selectedPageId) return;
    
    const activityData = blueprints[selectedActivityName] || {};
    const subcatData = activityData[selectedSubcategory] || { pages: [] };
    
    const newBlueprints = {
      ...blueprints,
      [selectedActivityName]: {
        ...activityData,
        [selectedSubcategory]: {
          ...subcatData,
          pages: subcatData.pages.map(p => p.id === selectedPageId ? { ...p, content } : p)
        }
      }
    };
    saveBlueprints(newBlueprints);
  };

  const deletePage = (id) => {
    if (!confirm("Delete this page?")) return;
    
    const activityData = blueprints[selectedActivityName] || {};
    const subcatData = activityData[selectedSubcategory] || { pages: [] };
    
    const newBlueprints = {
      ...blueprints,
      [selectedActivityName]: {
        ...activityData,
        [selectedSubcategory]: {
          ...subcatData,
          pages: subcatData.pages.filter(p => p.id !== id)
        }
      }
    };
    saveBlueprints(newBlueprints);
    if (selectedPageId === id) setSelectedPageId(null);
  };

  const deleteDomain = (name) => {
    if (!confirm(`Delete all strategic data for domain "${name}"?`)) return;
    const newBlueprints = { ...blueprints };
    delete newBlueprints[name];
    saveBlueprints(newBlueprints);
    
    // Find next available domain
    const remainingBlueprints = Object.keys(newBlueprints);
    const nextDomain = dwActivities.find(a => a.name !== name)?.name || remainingBlueprints[0] || null;
    
    setSelectedActivityName(nextDomain);
    setSelectedSubcategory('General');
    setSelectedPageId(null);
  };

  const deletePillar = (pillarName) => {
    if (pillarName === 'General') {
      alert("Cannot delete the core General pillar.");
      return;
    }
    if (!confirm(`Delete pillar "${pillarName}" and all its strategic pages?`)) return;
    
    const activityData = { ...blueprints[selectedActivityName] };
    delete activityData[pillarName];
    
    const newBlueprints = {
      ...blueprints,
      [selectedActivityName]: activityData
    };
    
    saveBlueprints(newBlueprints);
    
    if (selectedSubcategory === pillarName) {
      const remaining = Object.keys(activityData);
      setSelectedSubcategory(remaining[0] || 'General');
      setSelectedPageId(null);
    }
  };

  const pages = getActivePages();
  const currentPage = pages.find(p => p.id === selectedPageId);

  return (
    <div className="flex h-full bg-bg-base overflow-hidden">
      {/* Navigation Layer 1: Elite Domains */}
      <div className="w-16 border-r border-white/5 bg-black/40 flex flex-col items-center py-6 gap-6 shrink-0">
        <div className="p-2 bg-accent/10 rounded-xl text-accent mb-4">
          <Zap size={20} />
        </div>
        {dwActivities.map(activity => (
          <button
            key={activity.name}
            onClick={() => {
              setSelectedActivityName(activity.name);
              const subcats = activity.subcategories || [];
              const firstSub = subcats[0]?.name || subcats[0] || 'General';
              setSelectedSubcategory(firstSub);
              setSelectedPageId(null);
            }}
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative",
              selectedActivityName === activity.name 
                ? "bg-accent text-bg-base shadow-[0_0_15px_rgba(var(--color-accent),0.4)]" 
                : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white"
            )}
            title={activity.name}
          >
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {activity.name.substring(0, 2)}
            </span>
            <div className={clsx(
              "absolute -left-1 w-1 h-4 bg-accent rounded-r-full transition-all duration-300",
              selectedActivityName === activity.name ? "opacity-100" : "opacity-0"
            )} />
            
            <button 
              onClick={(e) => { e.stopPropagation(); deleteDomain(activity.name); }}
              className="absolute -right-2 top-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-lg z-20"
              title="Clear Domain Data"
            >
              <X size={8} />
            </button>
          </button>
        ))}

        {/* Custom Activities from Blueprints */}
        {Object.keys(blueprints).filter(name => !dwActivities.some(a => a.name === name)).map(name => (
          <button
            key={name}
            onClick={() => {
              setSelectedActivityName(name);
              const subcats = Object.keys(blueprints[name]);
              setSelectedSubcategory(subcats[0] || 'General');
              setSelectedPageId(null);
            }}
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative border border-accent/20",
              selectedActivityName === name 
                ? "bg-accent text-bg-base shadow-[0_0_15px_rgba(var(--color-accent),0.4)]" 
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
            title={name}
          >
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {name.substring(0, 2)}
            </span>
            <div className={clsx(
              "absolute -left-1 w-1 h-4 bg-accent rounded-r-full transition-all duration-300",
              selectedActivityName === name ? "opacity-100" : "opacity-0"
            )} />
            
            <button 
              onClick={(e) => { e.stopPropagation(); deleteDomain(name); }}
              className="absolute -right-2 top-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-lg z-20"
              title="Delete Domain"
            >
              <X size={8} />
            </button>
          </button>
        ))}

        <button 
          onClick={addActivity}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-gray-600 hover:text-accent hover:bg-accent/10 border border-dashed border-white/10 transition-all active:scale-90"
          title="Add Domain"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Navigation Layer 2: Pillars (Subcategories) */}
      <div className="w-56 border-r border-white/5 bg-white/[0.01] flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between group/domain">
          <div className="flex-1 truncate">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-1">Domain</h2>
            <h1 className="text-xs font-black text-white uppercase tracking-wider truncate">{selectedActivityName}</h1>
          </div>
          {blueprints[selectedActivityName] && (
            <button 
              onClick={() => deleteDomain(selectedActivityName)}
              className="p-1.5 text-gray-600 hover:text-red-400 transition-all"
              title="Delete Domain"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(() => {
            const predefinedSubcats = selectedActivity?.subcategories?.map(s => typeof s === 'string' ? s : s.name) || [];
            const customSubcats = Object.keys(blueprints[selectedActivityName] || {});
            const allSubcats = Array.from(new Set([...predefinedSubcats, ...customSubcats, 'General']));

            return allSubcats.map(subName => {
              const subPageCount = blueprints[selectedActivityName]?.[subName]?.pages?.length || 0;
              const isCustomPillar = subName !== 'General' && (!selectedActivity?.subcategories?.some(s => (typeof s === 'string' ? s : s.name) === subName));
              
              return (
                <div key={subName} className="group/pillar relative">
                  <button
                    onClick={() => {
                      setSelectedSubcategory(subName);
                      setSelectedPageId(null);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      selectedSubcategory === subName 
                        ? "bg-white/5 text-accent border border-white/5 shadow-sm" 
                        : "text-gray-500 hover:bg-white/[0.02] hover:text-gray-300"
                    )}
                  >
                    <FolderOpen size={12} className={selectedSubcategory === subName ? "text-accent" : "opacity-40"} />
                    <span className="text-[10px] font-bold uppercase tracking-wide truncate flex-1">{subName}</span>
                    {subPageCount > 0 && (
                      <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded text-gray-500">{subPageCount}</span>
                    )}
                  </button>
                  
                  {subName !== 'General' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePillar(subName); }}
                      className="absolute right-8 top-1/2 -translate-y-1/2 p-1.5 text-gray-700 hover:text-red-400 opacity-0 group-hover/pillar:opacity-100 transition-all z-10"
                      title="Delete Pillar"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            });
          })()}

          <button 
            onClick={addSubcategory}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-accent transition-all group mt-2"
          >
            <Plus size={10} className="opacity-40 group-hover:opacity-100" />
            <span className="text-[9px] font-black uppercase tracking-widest">Add Pillar</span>
          </button>
        </div>
      </div>

      {/* Navigation Layer 3: Strategic Pages */}
      <div className="w-64 border-r border-white/5 bg-black/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600">Pillar</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedSubcategory}</span>
          </div>
          <button 
            onClick={addPage}
            className="p-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-all active:scale-95"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 opacity-20 text-center px-4">
              <FileText size={24} className="mb-2" />
              <p className="text-[10px] font-medium uppercase tracking-widest leading-relaxed">No pages yet.<br/>Initialize planning.</p>
            </div>
          )}
          {pages.map(page => (
            <div
              key={page.id}
              onClick={() => setSelectedPageId(page.id)}
              className={clsx(
                "group p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                selectedPageId === page.id
                  ? "bg-accent/10 border-accent/30 shadow-[0_0_20px_rgba(var(--color-accent),0.1)]"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={clsx(
                  "text-[10px] font-black uppercase tracking-tight truncate",
                  selectedPageId === page.id ? "text-accent" : "text-gray-400"
                )}>
                  {page.title}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <p className="text-[9px] text-gray-600 line-clamp-1 leading-relaxed">
                {page.content || "Empty strategy..."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Workspace: Editor */}
      <div className="flex-1 bg-bg-base relative flex flex-col">
        {currentPage ? (
          <>
            <div className="h-16 border-b border-white/5 px-8 flex items-center justify-between shrink-0 bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-accent text-bg-base rounded-lg shadow-[0_0_15px_rgba(var(--color-accent),0.3)]">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white uppercase tracking-wider">{currentPage.title}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{selectedActivityName}</span>
                    <ChevronRight size={8} className="text-gray-700" />
                    <span className="text-[8px] text-accent font-bold uppercase tracking-widest">{selectedSubcategory}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-accent text-bg-base rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
                  <Save size={12} />
                  <span>Execute</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-accent/20 to-transparent opacity-20" />
              <textarea
                value={currentPage.content}
                onChange={(e) => updatePageContent(e.target.value)}
                placeholder="UNLEASH STRATEGIC INTENT..."
                spellCheck="true"
                autoCorrect="on"
                className="w-full h-full bg-transparent border-none outline-none text-gray-300 font-medium leading-relaxed resize-none placeholder:text-white/5 placeholder:font-black placeholder:uppercase placeholder:tracking-[0.8em] text-sm scrollbar-hide"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 p-12 text-center select-none">
            <div className="relative mb-8">
              <BookOpen size={80} className="animate-pulse" />
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-bg-base">
                <Target size={16} />
              </div>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-[0.4em] mb-4 text-white">Strategy Forge</h2>
            <p className="text-[10px] max-w-xs font-bold leading-relaxed uppercase tracking-[0.2em] text-gray-400">
              Select a domain and pillar to initialize your elite execution blueprints.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
