import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from "../../contexts/useApp";
import { formatDisplayTime, checkOverlap } from '../../utils/dateHelpers';
import { isDeepWork } from '../../utils/analysisHelpers';

export function QuickCreatePopover({ data, onClose, onMoreOptions }) {
  const { activities, logs, addLog, addSubcategory, triggerMechanicalFeedback } = useApp();
  const popoverRef = useRef(null);
  
  const [formData, setFormData] = useState({
    activityName: data.activityName || activities[0]?.name || '',
    subcategory: data.subcategory || '',
    startTime: data.startTime,
    endTime: data.endTime,
    date: data.date,
    energyLevel: 50,
    regretRating: 0
  });

  const [localEnergy, setLocalEnergy] = useState(50);
  const [localRegret, setLocalRegret] = useState(0);

  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [overlapError, setOverlapError] = useState(null);

  const localEnergyColor = localEnergy > 80 ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" : 
                          localEnergy > 40 ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]" : 
                          "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]";

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentActivity = activities.find(a => a.name === formData.activityName);
  const activityColor = currentActivity?.baseColor || '#555';

  const handleSave = async () => {
    if (formData.startTime && formData.endTime && formData.date) {
      const conflict = checkOverlap(formData.date, formData.startTime, formData.endTime, null, logs);
      if (conflict) {
        setOverlapError(`Overlaps with "${conflict.activityName}"`);
        return;
      }
    }

    await addLog({
      ...formData,
      energyLevel: localEnergy,
      regretRating: localRegret,
      id: Math.random().toString(36).substr(2, 9),
      notes: '',
      referenceLink: '',
      isRecurring: false,
      recurringType: 'none',
      isDeepWork: isDeepWork(formData.activityName, activities)
    });
    onClose();
  };

  // Smart positioning logic
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const popoverW = 320;
  const popoverH = 400; // Increased height for new controls

  let left = data.anchorRect.right + 12;
  let top = data.anchorRect.top;

  if (left + popoverW > viewW - 16) {
    left = data.anchorRect.left - popoverW - 12;
  }
  if (top + popoverH > viewH - 16) {
    top = viewH - popoverH - 16;
  }
  if (top < 16) top = 16;
  if (left < 16) left = 16;

  const inputCls = "w-full bg-transparent border-none p-0 text-[13px] text-white placeholder:text-gray-500 focus:ring-0 appearance-none";

  return (
    <div
      ref={popoverRef}
      className="fixed z-[110] glass-popover rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ left: `${left}px`, top: `${top}px`, width: `${popoverW}px` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ backgroundColor: activityColor }} />
      
      <div className="flex items-center justify-between pl-4 pr-2 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Quick Create</span>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-white hover-bg rounded-md">
          <X size={16} />
        </button>
      </div>

      <div className="px-4 py-2 space-y-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activityColor }} />
          <select 
            className="flex-1 bg-transparent border-none p-0 text-[13px] text-white focus:ring-0 cursor-pointer"
            value={formData.activityName}
            onChange={(e) => setFormData({ ...formData, activityName: e.target.value, subcategory: '' })}
          >
            {activities.map(act => (
              <option key={act.name} value={act.name} className="bg-[#1a1a1e]">{act.name}</option>
            ))}
          </select>
        </div>

        {currentActivity && (
          <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
            {!isAddingSubcat ? (
              <select 
                className="w-full bg-transparent border-none p-0 text-[13px] text-white focus:ring-0 cursor-pointer"
                value={formData.subcategory}
                onChange={(e) => {
                  if (e.target.value === 'ADD_NEW') {
                    setIsAddingSubcat(true);
                  } else {
                    setFormData({ ...formData, subcategory: e.target.value });
                  }
                }}
              >
                <option value="">Choose subcategory...</option>
                {currentActivity.subcategories.map(sub => {
                  const name = typeof sub === 'string' ? sub : sub.name;
                  return (
                    <option key={name} value={name} className="bg-[#1a1a1e]">{name}</option>
                  );
                })}
                <option value="ADD_NEW" className="text-accent font-black">+ ADD NEW...</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="New subcategory..." 
                  className="flex-1 bg-transparent border-none p-0 text-[13px] text-white focus:ring-0" 
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newSubcatName.trim()) {
                        addSubcategory(formData.activityName, newSubcatName.trim());
                        setFormData({ ...formData, subcategory: newSubcatName.trim() });
                        setNewSubcatName('');
                        setIsAddingSubcat(false);
                      }
                    }
                    if (e.key === 'Escape') {
                      setIsAddingSubcat(false);
                      setNewSubcatName('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newSubcatName.trim()) {
                      addSubcategory(formData.activityName, newSubcatName.trim());
                      setFormData({ ...formData, subcategory: newSubcatName.trim() });
                      setNewSubcatName('');
                      setIsAddingSubcat(false);
                    }
                  }}
                  className="text-[10px] font-bold text-accent uppercase"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 font-mono text-[12px] text-white">
          <input 
            type="time" 
            className="bg-transparent border-none p-0 w-16 focus:ring-0 text-center" 
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
          <ChevronRight size={14} className="text-gray-500" />
          <input 
            type="time" 
            className="bg-transparent border-none p-0 w-16 focus:ring-0 text-center" 
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
        </div>

        {/* Row 4: Energy Vector & Neural Retrospective */}
        <div className="flex flex-col gap-4 mt-1 bg-white/[0.02] border border-white/5 rounded-xl p-3">
          {/* Energy Vector Scale */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Energy Vector</span>
              <span className="text-[9px] font-mono font-bold text-white/40">{localEnergy}%</span>
            </div>
            <div className="relative h-1.5 flex items-center">
              <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={clsx("h-full transition-all duration-300", localEnergyColor)}
                  style={{ width: `${localEnergy}%` }}
                />
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                step="1"
                value={localEnergy}
                onChange={(e) => {
                  setLocalEnergy(parseInt(e.target.value));
                }}
                onMouseUp={() => triggerMechanicalFeedback('click')}
                onTouchEnd={() => triggerMechanicalFeedback('click')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer accent-transparent z-10"
              />
            </div>
          </div>

          {/* Neural Retrospective Icons */}
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Neural Retrospective</div>
            <div className="flex justify-between items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => {
                const emojis = ["😞", "😐", "🤷", "😊", "🔥"];
                const isActive = localRegret === val;
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setLocalRegret(val);
                      triggerMechanicalFeedback('clink');
                    }}
                    className={clsx(
                      "flex-1 py-1 flex flex-col items-center gap-0.5 rounded-lg transition-all",
                      isActive ? "bg-white/10 scale-110 shadow-lg" : "hover:bg-white/5 grayscale-[0.5] opacity-40 hover:opacity-100 hover:grayscale-0"
                    )}
                  >
                    <span className="text-sm">{emojis[val-1]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {overlapError && (
          <p className="text-[11px] text-red-400 px-1">{overlapError}</p>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-black/20 mt-2">
        <button 
          onClick={() => onMoreOptions({ ...formData, energyLevel: localEnergy, regretRating: localRegret })}
          className="text-[12px] text-gray-400 hover:text-white transition-colors"
        >
          More options
        </button>
        <button 
          onClick={handleSave}
          className="px-4 py-1.5 bg-accent text-bg-base font-semibold text-[12px] rounded-lg shadow-lg active:scale-95 transition-all"
        >
          Save
        </button>
      </div>
    </div>
  );
}
