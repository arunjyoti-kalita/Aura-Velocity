import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Clock, FileText, Link2, Repeat as RepeatIcon, Tag, Calendar, ChevronRight, Zap, Smile } from 'lucide-react';
import { useApp } from "../../contexts/useApp";
import { CustomActivityModal } from './CustomActivityModal';
import { LogInteractionModal } from '../people/LogInteractionModal';
import { checkOverlap, formatDisplayTime } from '../../utils/dateHelpers';
import { isDeepWork } from '../../utils/analysisHelpers';
import clsx from 'clsx';

export function EntryModal({ isOpen, onClose, log, isNew }) {
  const { activities, logs, updateLog, updateLogSeries, addLog, deleteLog, deleteLogSeries, addSubcategory, relationships, triggerMechanicalFeedback } = useApp();
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    activityName: '', subcategory: '', date: '', startTime: '', endTime: '',
    notes: '', referenceLink: '', isRecurring: false, recurringType: 'none',
    energyLevel: 50,
    isDeepWork: false,
    isDefaultLink: true, // Flag to track if the current link is a prefilled default
  });

  const [newSubcatName, setNewSubcatName] = useState('');
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [recurringAction, setRecurringAction] = useState(null);
  const [overlapError, setOverlapError] = useState(null);
  const [detectedPerson, setDetectedPerson] = useState(null);
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);

  useEffect(() => {
    if (isOpen && log) {
      setFormData({
        ...log,
        date: log.date || '',
        subcategory: log.subcategory || '',
        notes: log.notes || '',
        referenceLink: log.referenceLink || '',
        recurringType: log.recurringType || 'none',
        isRecurring: log.isRecurring || false,
        energyLevel: log.energyLevel ?? 50,
        isDeepWork: log.isDeepWork || false,
        isDefaultLink: !log.referenceLink // If it has a link already, consider it non-default for editing
      });
      setIsAddingSubcat(false);
      setRecurringAction(null);
      setOverlapError(null);
    }
  }, [isOpen, log]);

  // Auto-set isDeepWork for elite categories when changing activity in modal (for new entries)
  useEffect(() => {
    if (isOpen && isNew && formData.activityName) {
      const shouldBeDeep = isDeepWork(formData.activityName, activities);
      if (shouldBeDeep && !formData.isDeepWork) {
        setFormData(prev => ({ ...prev, isDeepWork: true }));
      }
    }
  }, [formData.activityName, activities, isNew, isOpen]);

  // Auto-detect person in notes
  useEffect(() => {
    if (formData.notes && relationships.people.length > 0) {
      const notes = formData.notes.toLowerCase();
      const found = relationships.people.find(p => notes.includes(p.name.toLowerCase()));
      setDetectedPerson(found || null);
    } else {
      setDetectedPerson(null);
    }
  }, [formData.notes, relationships.people]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentActivity = activities.find(a => a.name === formData.activityName);
  const activityColor = currentActivity?.baseColor || '#555';
  const showSubcatDropdown = !!currentActivity;

  // Handle auto-prefill logic for reference links
  useEffect(() => {
    if (!isOpen || !currentActivity) return;

    // Only prefill if we are currently in "default link" mode
    if (formData.isDefaultLink) {
      let defaultLink = null;
      
      // Priority 1: Subcategory specific link
      if (formData.subcategory) {
        const sub = currentActivity.subcategories.find(s => 
          (typeof s === 'string' ? s : s.name) === formData.subcategory
        );
        if (sub && typeof sub === 'object' && sub.defaultReferenceLink) {
          defaultLink = sub.defaultReferenceLink;
        }
      }
      
      // Priority 2: Activity level default link
      if (!defaultLink && currentActivity.defaultReferenceLink) {
        defaultLink = currentActivity.defaultReferenceLink;
      }

      if (defaultLink && defaultLink !== formData.referenceLink) {
        setFormData(prev => ({ 
          ...prev, 
          referenceLink: defaultLink, 
          isDefaultLink: true 
        }));
      } else if (!defaultLink && formData.isDefaultLink && formData.referenceLink) {
        // If there's no default but we HAD a default, clear it if switching
        // to something with no default
        setFormData(prev => ({ 
          ...prev, 
          referenceLink: '', 
          isDefaultLink: true 
        }));
      }
    }
  }, [formData.activityName, formData.subcategory, currentActivity, isOpen]);

  const handleSave = async (choice) => {
    // Allow fluid auto-trimming via AppContext enforceExclusivity

    if (isNew) {
      await addLog({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    } else {
      const wasRecurring = !!log.recurringGroupId;
      const isNowRecurring = formData.recurringType !== 'none';

      if (wasRecurring) {
        if (!choice) {
          setRecurringAction('save');
          return;
        }
        if (choice === 'series') {
          if (isNowRecurring) {
            await updateLogSeries(log.recurringGroupId, formData);
          } else {
            // Updated series to no longer recur
            await updateLogSeries(log.recurringGroupId, { ...formData, recurringGroupId: null, isRecurring: false });
          }
        } else {
          // Edited a single entry of a series
          await updateLog(log.id, { ...formData, recurringGroupId: null, isRecurring: false });
        }
      } else {
        // Was single
        if (isNowRecurring) {
          // Changed to recurring: delete single and create new series
          await deleteLog(log.id);
          await addLog(formData);
        } else {
          await updateLog(log.id, { ...formData, recurringGroupId: null, isRecurring: false });
        }
      }
    }
    onClose();
  };

  const inputCls = "w-full bg-white/[0.03] border border-white/5 rounded-lg px-3 py-1.5 text-[12px] text-gray-200 focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all appearance-none placeholder:text-gray-700 font-medium";
  const rowCls = "flex items-start gap-3 group";
  const iconCls = "w-4 h-4 text-gray-600 mt-2 flex-shrink-0 group-focus-within:text-accent transition-colors";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050507]/60 backdrop-blur-md" onClick={onClose} />
      
      <div
        ref={modalRef}
        className="relative w-[440px] max-h-[90vh] bg-[#0f0f13] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_32px_64px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: activityColor }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex flex-col">
            <h2 className="font-heading text-xs font-black uppercase tracking-[0.2em] text-white">
              {isNew ? 'Initialize Event' : 'Modify Segment'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Synchronized Stream</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-white hover:bg-white/5 rounded-md transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3 scrollbar-hide">
          {/* Date */}
          <div className={rowCls}>
            <Calendar className={iconCls} />
            <div className="flex-1">
              <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1 ml-1">Temporal Origin</div>
              <input type="date" className={inputCls} value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>

          {/* Time Range */}
          <div className={rowCls}>
            <Clock className={iconCls} />
            <div className="flex-1">
              <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1 ml-1">Time Horizon</div>
              <div className="flex items-center gap-2">
                <input type="time" className={clsx(inputCls, "text-center")} value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                <div className="w-4 h-[1px] bg-white/10 flex-shrink-0" />
                <input type="time" className={clsx(inputCls, "text-center")} value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
          </div>


          {/* Deep Work Toggle */}
          <div className={rowCls}>
            <div className="w-4 flex-shrink-0" />
            <div className="flex-1 flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <Zap size={12} className={clsx("transition-colors", formData.isDeepWork ? "text-accent fill-accent/20" : "text-gray-700")} />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Neural Intensity (Deep Work)</span>
              </div>
              <button
                onClick={() => setFormData({ ...formData, isDeepWork: !formData.isDeepWork })}
                className={clsx(
                  "w-8 h-4 rounded-full transition-all relative flex items-center px-0.5",
                  formData.isDeepWork ? "bg-accent shadow-[0_0_12px_rgba(var(--color-accent),0.4)]" : "bg-white/10"
                )}
              >
                <div className={clsx(
                  "w-3 h-3 rounded-full bg-white transition-transform duration-200",
                  formData.isDeepWork ? "translate-x-4" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>

          {/* Activity */}
          <div className={rowCls}>
            <Tag className={iconCls} />
            <div className="flex-1 space-y-2">
              <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">Functional Category</div>
              <select className={inputCls} value={formData.activityName} onChange={(e) => {
                if (e.target.value === 'new_activity') setIsCustomModalOpen(true);
                else setFormData({ ...formData, activityName: e.target.value, subcategory: '' });
              }}>
                <option value="" disabled>Select Activity</option>
                {activities.map(act => (<option key={act.name} value={act.name} className="bg-[#0f0f13]">{act.name}</option>))}
                <option value="new_activity" className="bg-[#0f0f13] text-accent font-black">⚙ MANAGE PROTOCOLS</option>
              </select>

              {showSubcatDropdown && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-2">
                  <div className="flex gap-2">
                    {!isAddingSubcat ? (
                      <select className={inputCls} value={formData.subcategory}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setIsAddingSubcat(true);
                          } else {
                            setFormData({ ...formData, subcategory: e.target.value });
                          }
                        }}>
                        <option value="">NO SUBCATEGORY</option>
                        {currentActivity.subcategories.map(sub => {
                          const name = typeof sub === 'string' ? sub : sub.name;
                          return (<option key={name} value={name} className="bg-[#0f0f13]">{name}</option>);
                        })}
                        <option value="ADD_NEW" className="text-accent font-black">+ ADD NEW...</option>
                      </select>
                    ) : (
                      <div className="flex-1 flex gap-2">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="Type new subcategory..." 
                          className={inputCls} 
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
                          className="px-3 bg-accent/20 border border-accent/30 rounded-lg text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent/30 transition-all"
                        >
                          Add
                        </button>
                        <button 
                          onClick={() => {
                            setIsAddingSubcat(false);
                            setNewSubcatName('');
                          }}
                          className="px-2 text-gray-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className={rowCls}>
            <FileText className={iconCls} />
            <div className="flex-1">
              <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1 ml-1">Observations</div>
              <textarea 
                placeholder="ADD CONTEXTUAL NOTES..." 
                className={clsx(inputCls, "h-14 resize-none pt-2")} 
                value={formData.notes}
                spellCheck="true"
                autoCorrect="on"
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
              
              {detectedPerson && (
                <div className="mt-2 p-2 bg-accent/5 border border-accent/20 rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-accent/20 flex items-center justify-center text-[8px] font-black text-accent uppercase">
                      {detectedPerson.name.charAt(0)}
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Involve {detectedPerson.name}?
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsLogInteractionOpen(true)}
                    className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline"
                  >
                    Log Contact →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Link */}
          <div className={rowCls}>
            <Link2 className={iconCls} />
            <div className="flex-1">
              <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1 ml-1">Reference Artifact</div>
              <div className="flex gap-2">
                <input type="url" placeholder="HTTPS://..." className={inputCls} value={formData.referenceLink}
                  onChange={(e) => setFormData({ ...formData, referenceLink: e.target.value, isDefaultLink: false })} />
                {formData.referenceLink && (
                  <a href={formData.referenceLink} target="_blank" rel="noreferrer" 
                     className="p-2 bg-accent/10 border border-accent/20 rounded-lg text-accent hover:bg-accent/20 transition-all">
                    <Link2 size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Repeat */}
          <div className={rowCls}>
            <RepeatIcon className={iconCls} />
            <div className="flex-1">
              <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1 ml-1">Temporal Pattern</div>
              <select className={inputCls} value={formData.recurringType}
                onChange={(e) => setFormData({ ...formData, recurringType: e.target.value, isRecurring: e.target.value !== 'none' })}>
                <option value="none" className="bg-[#0f0f13]">DOES NOT REPEAT</option>
                <option value="daily" className="bg-[#0f0f13]">DAILY CYCLE</option>
                <option value="weekly" className="bg-[#0f0f13]">WEEKLY CYCLE</option>
                <option value="weekdays" className="bg-[#0f0f13]">WEEKDAYS ONLY</option>
              </select>
            </div>
          </div>

          {/* Energy Vector (Moved to bottom) */}
          <div className={rowCls}>
            <Zap className={clsx("w-4 h-4 mt-2.5 flex-shrink-0 transition-colors", formData.energyLevel > 80 ? "text-orange-500" : formData.energyLevel > 40 ? "text-yellow-500" : "text-blue-500")} />
            <div className="flex-1 pt-1">
              <div className="flex justify-between text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1">
                <span>Low Energy</span>
                <span className="text-gray-400">Energy Vector: {formData.energyLevel}%</span>
                <span>Peak Energy</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={formData.energyLevel}
                onChange={(e) => setFormData({ ...formData, energyLevel: parseInt(e.target.value) })}
                className="w-full accent-accent bg-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Regret Rating (Only for entries that are in the past) */}
          {new Date(formData.date + 'T' + formData.startTime) < new Date() && (
            <div className={clsx(rowCls, "pt-2")}>
              <Smile className={clsx(iconCls, formData.regretRating ? "text-emerald-500" : "")} />
              <div className="flex-1">
                <div className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-2 ml-1 flex justify-between items-center">
                  <span>Neural Retrospective</span>
                  {formData.regretRating && (
                    <span className="text-emerald-500/60 lowercase font-medium">Rated {formData.regretRating}/5</span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/5">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const emojis = ["😞", "😐", "🤷", "😊", "🔥"];
                    const isActive = formData.regretRating === val;
                    return (
                      <button
                        key={val}
                        onClick={() => {
                          setFormData({ ...formData, regretRating: val });
                          if (!isNew && log?.id) {
                            updateLog(log.id, { regretRating: val });
                          }
                          triggerMechanicalFeedback('clink');
                        }}
                        className={clsx(
                          "flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-lg transition-all",
                          isActive ? "bg-white/10 scale-105 shadow-lg" : "hover:bg-white/5 grayscale-[0.5] opacity-40 hover:opacity-100 hover:grayscale-0"
                        )}
                      >
                        <span className="text-base">{emojis[val-1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {overlapError && (
            <div className="ml-7 text-[9px] font-bold text-red-400/80 uppercase tracking-wider bg-red-500/5 p-2 rounded-lg border border-red-500/10">
              {overlapError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-t border-white/5">
          {!isNew ? (
            <button 
              onClick={() => {
                deleteLog(log.id);
                onClose();
              }} 
              className="text-red-900/60 text-[9px] font-black uppercase tracking-widest hover:text-red-400 transition-colors px-2 py-1"
            >
              Terminate
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all">
              Cancel
            </button>
            <button onClick={() => handleSave()} className="px-6 py-2 bg-accent text-bg-base font-black text-[10px] uppercase tracking-[0.2em] rounded-lg shadow-lg active:scale-95 transition-all">
              {isNew ? 'Initialize' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>

      <CustomActivityModal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)}
        onActivityCreated={(name) => setFormData({ ...formData, activityName: name, subcategory: '' })} />

      <LogInteractionModal 
        isOpen={isLogInteractionOpen}
        onClose={() => setIsLogInteractionOpen(false)}
        person={detectedPerson}
      />

      {recurringAction && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-[340px] bg-[#0f0f13] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-heading text-sm font-black uppercase tracking-[0.2em] text-white">Update Sequence?</h3>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Select temporal scope</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => handleSave('single')} className="w-full h-11 bg-white/5 border border-white/5 rounded-xl text-gray-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Single Instance
              </button>
              <button onClick={() => handleSave('series')} className="w-full h-11 bg-accent text-bg-base rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                Entire Series
              </button>
              <button onClick={() => setRecurringAction(null)} className="text-[9px] font-black text-gray-700 hover:text-white uppercase tracking-[0.2em] transition-colors pt-2 block w-full">Abort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
