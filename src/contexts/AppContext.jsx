import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { addDays, isWeekend, format, parseISO, subMonths, addMonths, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { INITIAL_ACTIVITIES } from '../utils/constants';
import { getExclusivityAdjustments, timeStrToMinutes, minutesToTimeStr, getGridDate } from '../utils/dateHelpers';
import { auth, googleProvider, db, isFirebaseConfigured } from '../config/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, 
  query, where, writeBatch, serverTimestamp, deleteDoc, updateDoc 
} from 'firebase/firestore';
import { detectRecurringPatterns } from '../utils/subtractionUtils';
import { generateSubtractionProposal } from '../services/aiService';
import { CHRONOTYPES } from '../utils/circadian.js';
import { getEnergyLevel, calculateAlignmentScore } from '../utils/circadian';
import { calculateAuraForLog } from '../utils/gamificationUtils';
import { calculateMasteryProjection } from '../utils/masteryUtils';
import { isDeepWork, calculateDuration } from '../utils/analysisHelpers';
import { mechanicalAudio } from '../utils/mechanicalAudio';
import { processTemporalState } from '../utils/temporalEngine';

export const AppContext = createContext();

export function AppProvider({ children }) {
  useEffect(() => {
    // Legacy Migration: Copy lifeapp_ keys to aura_velocity_ keys
    const LEGACY_KEYS = [
      'logs', 'activities', 'intents', 'templates', 'ghostMode', 
      'ghostTemplate', 'regret_model', 'copilot_history', 
      'relationships', 'last_subtraction_audit', 'subtraction_results', 'viewMode', 'journal'
    ];

    try {
      LEGACY_KEYS.forEach(key => {
        const oldVal = localStorage.getItem(`lifeapp_${key}`);
        const newVal = localStorage.getItem(`aura_velocity_${key}`);
        if (oldVal && !newVal) {
          localStorage.setItem(`aura_velocity_${key}`, oldVal);
        }
      });
    } catch (e) {
      console.warn("Local storage migration skipped:", e);
    }

    // Default Links Migration
    try {
      const migrated = localStorage.getItem('aura_velocity_links_migrated');
      if (!migrated) {
        const savedActivities = localStorage.getItem('aura_velocity_activities');
        if (savedActivities) {
          const parsed = JSON.parse(savedActivities);
          const updated = parsed.map(act => {
            const seed = INITIAL_ACTIVITIES.find(s => s.name === act.name);
            if (!seed) return act;
            
            // Migrate Tool color to high-contrast Cyan
            if (act.name === 'Tool') {
              act.baseColor = '#06b6d4';
              act.lightColor = '#67e8f9';
            }
            
            // Migrate Food color from Amber to Orange
            if (act.name === 'Food' && act.baseColor === '#f59e0b') {
              act.baseColor = '#f97316';
              act.lightColor = '#fb923c';
            }
            
            // Merge activity-level default link
            const newAct = { 
              ...act, 
              defaultReferenceLink: seed.defaultReferenceLink || act.defaultReferenceLink || null 
            };
            
            // Merge subcategories
            if (seed.subcategories && seed.subcategories.length > 0) {
              const mergedSubcats = [...(act.subcategories || [])].map(sub => {
                const subName = typeof sub === 'string' ? sub : sub.name;
                const seedSub = seed.subcategories.find(s => s.name === subName);
                if (seedSub) {
                  return { 
                    name: subName, 
                    defaultReferenceLink: seedSub.defaultReferenceLink || (typeof sub === 'object' ? sub.defaultReferenceLink : null) 
                  };
                }
                return typeof sub === 'string' ? { name: sub, defaultReferenceLink: null } : sub;
              });
              
              // Add any missing default subcategories from seed
              seed.subcategories.forEach(seedSub => {
                if (!mergedSubcats.find(ms => ms.name === seedSub.name)) {
                  mergedSubcats.push(seedSub);
                }
              });
              
              newAct.subcategories = mergedSubcats;
            } else if (act.subcategories && act.subcategories.length > 0) {
              // Convert existing string subcategories to objects if they weren't already
              newAct.subcategories = act.subcategories.map(sub => 
                typeof sub === 'string' ? { name: sub, defaultReferenceLink: null } : sub
              );
            }
            
            return newAct;
          });
          
          localStorage.setItem('aura_velocity_activities', JSON.stringify(updated));
          setActivities(updated);
        }
        localStorage.setItem('aura_velocity_links_migrated', 'true');
      }
    } catch (e) {
      console.error("Default links migration failed:", e);
    }
  }, []);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const recentlyDeleted = useRef(new Set());

  // Water Intake State
  const [waterIntake, setWaterIntake] = useState(() => {
    const saved = localStorage.getItem('water_intake');
    if (saved) {
      const { count, date } = JSON.parse(saved);
      if (date === getGridDate()) return count;
    }
    return 0;
  });

  const gulpWater = () => {
    setWaterIntake(prev => {
      const next = prev >= 12 ? 0 : prev + 1;
      localStorage.setItem('water_intake', JSON.stringify({
        count: next,
        date: getGridDate(currentDate)
      }));
      return next;
    });
  };

  const degulpWater = () => {
    setWaterIntake(prev => {
      const next = Math.max(0, prev - 1);
      localStorage.setItem('water_intake', JSON.stringify({
        count: next,
        date: getGridDate(currentDate)
      }));
      return next;
    });
  };

  // Activities state
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_activities');
      if (!saved) return INITIAL_ACTIVITIES;
      
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_ACTIVITIES;
      
      // Auto-sync colors to latest refined palette
      return parsed.map(act => {
        const seed = INITIAL_ACTIVITIES.find(s => s.name.toLowerCase() === act.name.toLowerCase());
        if (seed) {
          // AGGRESSIVE OVERRIDE: Force certain activities to sync with seeds regardless of local storage (case-insensitive)
          if (['tool', 'dark matter', 'spruce_up', 'cognitive drift', 'bio-fuel intake'].includes(act.name.toLowerCase())) {
            return { ...act, baseColor: seed.baseColor, lightColor: seed.lightColor };
          }
          
          const isLegacy = [
            '#ec4899', '#ff00ff', '#3b82f6', '#ffffff', 
            '#10b981', '#f43f5e', '#0ea5e9', '#6366f1', '#8b5cf6'
          ].includes(act.baseColor?.toLowerCase() || '');

          const isYellowish = [
            '#eab308', '#f59e0b', '#f97316', '#fbbf24', '#fb923c'
          ].includes(act.baseColor?.toLowerCase() || '');

          if (isLegacy || (act.name.toLowerCase() === 'tool' && isYellowish)) {
            return { ...act, baseColor: seed.baseColor, lightColor: seed.lightColor };
          }
        }
        return act;
      });
    } catch (e) {
      console.error("Error parsing activities:", e);
      return INITIAL_ACTIVITIES;
    }
  });

  // History state for logs
  const [pastLogs, setPastLogs] = useState([]);
  const [renderTick, setRenderTick] = useState(0);
  const triggerRender = () => setRenderTick(prev => prev + 1);

  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_logs');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing logs:", e);
      return [];
    }
  });
  // Chronotype state
  const [chronotype, setChronotype] = useState(() => localStorage.getItem('aura_velocity_chronotype') || 'balanced');


  // Medication Protocol State
  const [meds, setMeds] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_meds');
      if (saved) {
        const { data, date } = JSON.parse(saved);
        if (date === getGridDate()) return data;
      }
    } catch (e) {}
    return [
      { id: 1, taken: false },
      { id: 2, taken: false },
      { id: 3, taken: false },
      { id: 4, taken: false }
    ];
  });

  const toggleMed = (id) => {
    setMeds(prev => {
      const next = prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m);
      localStorage.setItem('aura_velocity_meds', JSON.stringify({
        data: next,
        date: getGridDate()
      }));
      if (next.find(m => m.id === id).taken) {
        mechanicalAudio.play('success');
      }
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('aura_velocity_chronotype', chronotype);
  }, [chronotype]);

  const [futureLogs, setFutureLogs] = useState([]);

  // Intents state
  const [intents, setIntents] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_intents');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error parsing intents:", e);
      return {};
    }
  });

  // Templates & Ghost Mode state
  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing templates:", e);
      return [];
    }
  });
  const [isShaking, setIsShaking] = useState(false);

  // Strategy Forge / Blueprints State
  const [blueprints, setBlueprints] = useState(() => {
    const saved = localStorage.getItem('aura_velocity_blueprints_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const saveBlueprints = (newBlueprints) => {
    setBlueprints(newBlueprints);
    localStorage.setItem('aura_velocity_blueprints_v2', JSON.stringify(newBlueprints));
    if (user) {
      updateDoc(doc(db, 'users', user.uid), { blueprints: newBlueprints }).catch(e => console.error("Blueprint sync error:", e));
    }
  };

  const triggerMechanicalFeedback = (type = 'clunk') => {
    if (type === 'clunk') {
      mechanicalAudio.playClunk();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } else if (type === 'click') {
      mechanicalAudio.playClick();
    } else if (type === 'buzz') {
      mechanicalAudio.playBuzz();
    } else if (type === 'coin') {
      mechanicalAudio.playCoinDrop();
    }
  };

  const setGhostModeProxy = (val) => {
    console.log("Mechanical Grid: Toggling Ghost Mode to", val);
    triggerMechanicalFeedback('clunk');
    setIsGhostMode(val);
  };

  const setShowIntentionalityProxy = (val) => {
    console.log("Mechanical Grid: Toggling Intentionality to", val);
    triggerMechanicalFeedback('clunk');
    setShowIntentionality(val);
  };

  const [isGhostMode, setIsGhostMode] = useState(() => {
    return localStorage.getItem('aura_velocity_ghostMode') === 'true';
  });
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [clipboard, setClipboard] = useState([]); // Array of log snapshots
  const [toasts, setToasts] = useState([]); // { id, message, type, action }
  const [isGhostSetupOpen, setIsGhostSetupOpen] = useState(false);
  const [auraScore, setAuraScore] = useState(0);

  // Aura Score Engine: Calculate total aura from all logs
  useEffect(() => {
    if (logs && logs.length > 0) {
      let total = 0;
      logs.forEach(log => {
        const energy = getEnergyLevel(timeStrToMinutes(log.startTime) / 60, chronotype);
        const alignment = calculateAlignmentScore(log, energy, activities);
        total += calculateAuraForLog(log, alignment);
      });
      setAuraScore(total);
    }
  }, [logs, chronotype, activities]);

  const [ghostTemplate, setGhostTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_ghostTemplate');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing ghostTemplate:", e);
      return [];
    }
  });
  const [regretModel, setRegretModel] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_regret_model');
      return saved ? JSON.parse(saved) : {
        activityPatterns: {},
        subcategoryPatterns: {},
        timeOfDayPatterns: {},
        modelConfidence: 0
      };
    } catch (e) {
      console.error("Error parsing regretModel:", e);
      return {
        activityPatterns: {},
        subcategoryPatterns: {},
        timeOfDayPatterns: {},
        modelConfidence: 0
      };
    }
  });

  const [copilotHistory, setCopilotHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_copilot_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing copilotHistory:", e);
      return [];
    }
  });
  const [relationships, setRelationships] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_relationships');
      const parsed = saved ? JSON.parse(saved) : { people: [], interactions: [] };
      return (parsed && typeof parsed === 'object') ? parsed : { people: [], interactions: [] };
    } catch (e) {
      console.error("Error parsing relationships:", e);
      return { people: [], interactions: [] };
    }
  });
  const [isInteracting, setIsInteracting] = useState(false); // dragging/resizing

  const [lastSubtractionAudit, setLastSubtractionAudit] = useState(() => {
    return localStorage.getItem('aura_velocity_last_subtraction_audit') || null;
  });
  const [subtractionAuditResults, setSubtractionAuditResults] = useState(() => {
    const saved = localStorage.getItem('aura_velocity_subtraction_results');
    return saved ? JSON.parse(saved) : null;
  });
  const [subtractionInterval, setSubtractionInterval] = useState(() => {
    return parseInt(localStorage.getItem('aura_velocity_subtraction_interval')) || 30;
  });

  const [journal, setJournal] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_journal');
      const parsed = saved ? JSON.parse(saved) : { entries: [] };
      return (parsed && typeof parsed === 'object') ? parsed : { entries: [] };
    } catch (e) {
      console.error("Error parsing journal:", e);
      return { entries: [] };
    }
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing tasks:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('aura_velocity_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // ── FINANCE STATE ──
  const [financeLogs, setFinanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_finance_logs');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing finance logs:", e);
      return [];
    }
  });

  const [financialGoals, setFinancialGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_velocity_financial_goals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [financeSelectedDate, setFinanceSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_finance_logs', JSON.stringify(financeLogs));
      localStorage.setItem('aura_velocity_financial_goals', JSON.stringify(financialGoals));
    }
  }, [financeLogs, financialGoals, user]);

  const addFinanceLog = useCallback(async (log) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newLog = { ...log, id, timestamp: log.timestamp || new Date().toISOString() };
    
    setFinanceLogs(prev => [newLog, ...prev]);
    triggerMechanicalFeedback('clunk');

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'financeLogs', id), {
        ...newLog,
        updatedAt: serverTimestamp()
      });
    }
  }, [user]);

  const updateFinanceLog = useCallback(async (id, updates) => {
    setFinanceLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (user) {
      await updateDoc(doc(db, 'users', user.uid, 'financeLogs', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  }, [user]);

  const deleteFinanceLog = useCallback(async (id) => {
    triggerMechanicalFeedback('clunk');
    setFinanceLogs(prev => prev.filter(l => l.id !== id));
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'financeLogs', id));
    }
  }, [user]);

  const saveFinancialGoal = useCallback(async (goal) => {
    const id = goal.id || Math.random().toString(36).substr(2, 9);
    const newGoal = { ...goal, id };
    setFinancialGoals(prev => {
      const idx = prev.findIndex(g => g.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newGoal;
        return next;
      }
      return [newGoal, ...prev];
    });

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'financialGoals', id), {
        ...newGoal,
        updatedAt: serverTimestamp()
      });
    }
  }, [user]);

  const deleteFinancialGoal = useCallback(async (id) => {
    setFinancialGoals(prev => prev.filter(g => g.id !== id));
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'financialGoals', id));
    }
  }, [user]);

  const liquidityPulse = useMemo(() => {
    const balance = financeLogs.reduce((acc, log) => {
      if (log.type === 'income') return acc + log.amount;
      if (log.type === 'expense') return acc - log.amount;
      return acc;
    }, 0);
    return balance;
  }, [financeLogs]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_journal', JSON.stringify(journal));
  }, [journal]);
  
  // Navigation & View State
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return now.getHours() < 8 ? addDays(now, -1) : now;
  });
  const [focusedDate, setFocusedDate] = useState(() => {
    const now = new Date();
    return now.getHours() < 8 ? addDays(now, -1) : now;
  });
  const [activeModule, setActiveModule] = useState(() => {
    const saved = localStorage.getItem('aura_velocity_activeModule');
    if (saved === 'finance') return 'finance-terminal'; // Migration
    if (saved) return saved;
    const path = window.location.pathname.replace('/', '');
    if (['daylog', 'people', 'journal', 'analysis', 'subtraction', 'blueprints', 'finance-terminal', 'finance-ledger', 'finance-month'].includes(path)) {
      return path;
    }
    return 'daylog';
  });

  useEffect(() => {
    localStorage.setItem('aura_velocity_activeModule', activeModule);
    // Reset finance date to today when entering ledger
    if (activeModule === 'finance-ledger') {
      setFinanceSelectedDate(new Date());
    }
  }, [activeModule]);
  const [activityFilter, setActivityFilter] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('aura_velocity_viewMode') || 'week');
  const [activePopover, setActivePopover] = useState(null); 
  const [activeModal, setActiveModal] = useState(null); 
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  useEffect(() => { localStorage.setItem('aura_velocity_viewMode', viewMode); }, [viewMode]);

  // Activity Name Migration: Update old names to new elite names
  useEffect(() => {
    const MAPPING = {
      'Hibernation': 'Comatose',
      'Fresh_UP': 'Spruce_Up',
      'System Reboot': 'Spruce_Up',
      'Food': 'Bio Fuel',
      'Bio-Fuel Intake': 'Bio Fuel',
      'Entropy Flux': 'Boondoggle',
      'PM_theory': 'PM Archives',
      'AI & Technical': 'Tech and AI',
      'Work_out': 'Isometrics',
      'Recreation': 'Cognitive',
      'Cognitive Drift': 'Cognitive',
      'Corporate Ready': 'Armor Equipping',
      'Dark Matter': 'Extra'
    };

    // 1. Migrate Logs
    if (user && logs && logs.length > 0) {
      const oldLogs = logs.filter(log => MAPPING[log.activityName] && MAPPING[log.activityName] !== log.activityName);
      if (oldLogs.length > 0) {
        console.log(`Migrating ${oldLogs.length} log activity names to Firestore...`);
        const batch = writeBatch(db);
        const updatedLogs = logs.map(log => {
          if (MAPPING[log.activityName] && MAPPING[log.activityName] !== log.activityName) {
            const newName = MAPPING[log.activityName];
            const lRef = doc(db, 'users', user.uid, 'logs', log.id);
            batch.update(lRef, { activityName: newName, updatedAt: serverTimestamp() });
            return { ...log, activityName: newName };
          }
          return log;
        });
        
        // Optimistic update
        setLogs(updatedLogs);
        localStorage.setItem('aura_velocity_logs', JSON.stringify(updatedLogs));
        
        batch.commit().catch(e => console.error("Migration sync error:", e));
      }
    } else if (!user && logs && logs.length > 0) {
      // Local-only migration
      const hasOldNames = logs.some(log => MAPPING[log.activityName] && MAPPING[log.activityName] !== log.activityName);
      if (hasOldNames) {
        const updated = logs.map(log => {
          if (MAPPING[log.activityName] && MAPPING[log.activityName] !== log.activityName) {
            return { ...log, activityName: MAPPING[log.activityName] };
          }
          return log;
        });
        setLogs(updated);
        localStorage.setItem('aura_velocity_logs', JSON.stringify(updated));
      }
    }

    // 2. Migrate Activities List
    if (activities && activities.length > 0) {
      const hasDuplicate = activities.some(a => a.name === 'AI & Technical');
      if (hasDuplicate) {
        console.log("CRITICAL PURGE: Removing 'AI & Technical' from blueprint...");
        const filtered = activities.filter(a => a.name !== 'AI & Technical');
        setActivities(filtered);
        localStorage.setItem('aura_velocity_activities', JSON.stringify(filtered));
        if (user) {
          updateDoc(doc(db, 'users', user.uid), { activities: filtered });
        }
      }
    }

    // 2.5 Migrate Blueprints (Purge 'AI & Technical' keys)
    if (blueprints && Object.keys(blueprints).length > 0) {
      if (blueprints['AI & Technical']) {
        console.log("CRITICAL PURGE: Merging 'AI & Technical' blueprint into 'Tech and AI'...");
        const newBlueprints = { ...blueprints };
        const oldData = newBlueprints['AI & Technical'];
        newBlueprints['Tech and AI'] = {
          ...(newBlueprints['Tech and AI'] || {}),
          ...oldData
        };
        delete newBlueprints['AI & Technical'];
        saveBlueprints(newBlueprints);
      }
    }

    // 3. Migrate Templates
    if (templates && templates.length > 0) {
      let templatesChanged = false;
      const updatedTemplates = templates.map(t => {
        const hasOld = t.blocks?.some(b => b.label === 'AI & Technical');
        if (hasOld) {
          templatesChanged = true;
          return {
            ...t,
            blocks: t.blocks.map(b => b.label === 'AI & Technical' ? { ...b, label: 'Tech and AI' } : b)
          };
        }
        return t;
      });

      if (templatesChanged) {
        console.log("Migrating template activity names...");
        setTemplates(updatedTemplates);
        localStorage.setItem('aura_velocity_templates', JSON.stringify(updatedTemplates));
        if (user) {
          updateDoc(doc(db, 'users', user.uid), { templates: updatedTemplates });
        }
      }
    }
  }, [logs, activities, templates]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_ghostMode', isGhostMode);
  }, [isGhostMode]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_ghostTemplate', JSON.stringify(ghostTemplate));
  }, [ghostTemplate]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_last_subtraction_audit', lastSubtractionAudit || '');
  }, [lastSubtractionAudit]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_subtraction_results', JSON.stringify(subtractionAuditResults));
  }, [subtractionAuditResults]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_subtraction_interval', subtractionInterval.toString());
  }, [subtractionInterval]);

  // Toast Helper
  const showToast = useCallback((message, type = 'info', action = null) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      triggerRender();
    }, 4000);
  }, []);

  const deleteLog = useCallback(async (id) => {
    if (!id) return;
    
    // Mechanical Feedback
    triggerMechanicalFeedback('clunk');
    
    // Optimistic Update
    setLogs(prevLogs => {
      setPastLogs(prevHistory => [...prevHistory, prevLogs].slice(-50));
      setFutureLogs([]);
      return prevLogs.filter(l => l.id !== id);
    });
    triggerRender();

    if (user) {
      try {
        recentlyDeleted.current.add(id);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'users', user.uid, 'logs', id));
        
        // Also delete any associated interactions
        const associatedInteractions = (relationships?.interactions || []).filter(i => i.logEntryId === id);
        associatedInteractions.forEach(i => {
          batch.delete(doc(db, 'users', user.uid, 'interactions', i.id));
        });

        await batch.commit();
        // Clear from recentlyDeleted after a safe delay (sync window)
        setTimeout(() => {
          recentlyDeleted.current.delete(id);
        }, 5000);
      } catch (e) {
        recentlyDeleted.current.delete(id);
        console.error("Delete failed:", e);
        showToast("Delete failed. Syncing...", "error");
      }
    }
  }, [user, relationships, showToast]);

  const saveJournalEntry = useCallback((entry) => {
    setJournal(prev => {
      const existingIdx = prev.entries.findIndex(e => e.id === entry.id);
      const now = new Date().toISOString();
      const newEntry = {
        ...entry,
        updatedAt: now,
        createdAt: entry.createdAt || now
      };
      
      let newEntries;
      if (existingIdx >= 0) {
        newEntries = [...prev.entries];
        newEntries[existingIdx] = newEntry;
      } else {
        newEntries = [newEntry, ...prev.entries];
      }
      
      return { ...prev, entries: newEntries };
    });
  }, []);

  const deleteJournalEntry = useCallback((id) => {
    setJournal(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== id)
    }));
  }, []);


  const addTask = useCallback(async (task, date = null) => {
    const taskId = Math.random().toString(36).substr(2, 9);
    const newTask = {
      ...task,
      id: taskId,
      completed: false,
      notified: false,
      date: date || getGridDate(),
      createdAt: new Date().toISOString()
    };

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'tasks', taskId), {
        ...newTask,
        updatedAt: serverTimestamp()
      });
    } else {
      setTasks(prev => [newTask, ...prev]);
    }
  }, [user]);

  const cloneTasks = useCallback(async (sourceDate, targetDate) => {
    const sourceTasks = tasks.filter(t => t.date === sourceDate);
    const newTasks = sourceTasks.map(t => ({
      ...t,
      id: Math.random().toString(36).substr(2, 9),
      completed: false,
      date: targetDate,
      createdAt: new Date().toISOString()
    }));

    if (user) {
      const batch = writeBatch(db);
      newTasks.forEach(t => {
        batch.set(doc(db, 'users', user.uid, 'tasks', t.id), {
          ...t,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } else {
      setTasks(prev => [...newTasks, ...prev]);
    }
  }, [user, tasks]);

  const updateTask = useCallback(async (id, updates) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'tasks', id), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, [user]);

  const deleteTask = useCallback(async (id) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    triggerRender();
  }, [user]);

  const toggleTask = useCallback(async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isCompleting = !task.completed;
    const completedAt = isCompleting ? new Date().toISOString() : null;

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'tasks', id), {
        completed: isCompleting,
        completedAt,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: isCompleting, completedAt } : t));
    }
  }, [user, tasks]);

  // ── TASK REMINDER SERVICE ──
  useEffect(() => {
    const checkOverdueTasks = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      const currentTimeInMins = currentHour * 60 + currentMin;

      const overdueTasks = tasks.filter(task => {
        if (task.completed || task.notified || task.date !== todayStr || !task.scheduledTime) {
          return false;
        }

        const taskTimeInMins = timeStrToMinutes(task.scheduledTime);
        // If task was scheduled for 1 minute ago or more, it's overdue
        return currentTimeInMins > taskTimeInMins;
      });

      if (overdueTasks.length > 0) {
        overdueTasks.forEach(task => {
          showToast(`Missed Activity: ${task.text}`, "warning", {
            label: "Review",
            onClick: () => setActiveModule('tasks')
          });
          updateTask(task.id, { notified: true });
        });
      }
    };

    const interval = setInterval(checkOverdueTasks, 60000); // Check every minute
    checkOverdueTasks(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, showToast, updateTask, setActiveModule]);

  // Core Logic Helpers
  const commitChange = useCallback((newLogs) => {
    setPastLogs(prev => [...prev, logs]);
    setLogs(newLogs);
    setFutureLogs([]);
  }, [logs]);

  const syncLogsToFirebase = useCallback(async (newLogs, oldLogs) => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);
      
      // Identify deleted logs
      const deleted = oldLogs.filter(ol => !newLogs.find(nl => nl.id === ol.id));
      deleted.forEach(dl => {
        batch.delete(doc(db, 'users', user.uid, 'logs', dl.id));
      });
      
      // Identify new/updated logs
      const updated = newLogs.filter(nl => {
        const old = oldLogs.find(ol => ol.id === nl.id);
        return !old || JSON.stringify(old) !== JSON.stringify(nl);
      });
      updated.forEach(ul => {
        batch.set(doc(db, 'users', user.uid, 'logs', ul.id), {
          ...ul,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Firebase sync failed during history action:", error);
    }
  }, [user]);

  const undo = useCallback(async () => {
    if (pastLogs.length === 0) {
      showToast("Nothing to undo", "warning");
      return;
    }
    const previous = pastLogs[pastLogs.length - 1];
    const current = [...logs];
    
    setPastLogs(prev => prev.slice(0, prev.length - 1));
    setFutureLogs(prev => [logs, ...prev]);
    setLogs(previous);
    
    if (user) {
      await syncLogsToFirebase(previous, current);
    }
    showToast("Undo successful");
  }, [pastLogs, logs, showToast, user, syncLogsToFirebase]);

  const redo = useCallback(async () => {
    if (futureLogs.length === 0) {
      showToast("Nothing to redo", "warning");
      return;
    }
    const next = futureLogs[0];
    const current = [...logs];
    
    setFutureLogs(prev => prev.slice(1));
    setPastLogs(prev => [...prev, logs]);
    setLogs(next);
    
    if (user) {
      await syncLogsToFirebase(next, current);
    }
    showToast("Redo successful");
  }, [futureLogs, logs, showToast, user, syncLogsToFirebase]);

  const enforceExclusivity = useCallback((log, currentLogs) => {
    if (!log || !log.startTime || !log.date) return currentLogs;
    
    const start = timeStrToMinutes(log.startTime);
    const end = timeStrToMinutes(log.endTime || log.startTime, true);
    const finalEnd = end <= start ? start + 15 : end; // Minimum 15 mins for exclusivity

    return currentLogs.map(l => {
      if (!l || l.id === log.id || l.date !== log.date) return l;
      
      const lStart = timeStrToMinutes(l.startTime);
      const lEnd = timeStrToMinutes(l.endTime || l.startTime, true);
      
      // Overlap detection
      const isOverlapping = (start < lEnd && finalEnd > lStart);
      if (!isOverlapping) return l;

      // Case 1: Swallowed or pushed forward
      if (lStart >= start && lStart < finalEnd) {
        const duration = lEnd - lStart;
        const newStart = finalEnd;
        const newEnd = newStart + Math.max(15, duration);
        
        return { 
          ...l, 
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          isModified: true
        };
      }
      
      return l;
    }).filter(Boolean);
  }, []);


  const healLogs = useCallback((firestoreLogs, localLogs = []) => {
    if (!firestoreLogs) return localLogs;

    const uniqueById = new Map();
    // Pre-fill with local logs to ensure we don't lose optimistic updates
    localLogs.forEach(l => {
      if (!recentlyDeleted.current.has(l.id)) {
        uniqueById.set(l.id, l);
      }
    });

    const seenContent = new Set();
    const firestoreIds = new Set(firestoreLogs.map(l => l.id));

    firestoreLogs.forEach(l => {
      if (!l.id || !l.date || !l.startTime) return;
      if (recentlyDeleted.current.has(l.id)) return;
      
      const contentKey = `${l.date}-${l.startTime}-${l.endTime || l.startTime}-${l.activityName}`;
      const existing = uniqueById.get(l.id);
      
      // Comparison logic: 
      // 1. If Firestore has it, and local doesn't -> New from server
      // 2. If both have it -> Take the one with the newer updatedAt
      // 3. If local has it and Firestore doesn't -> 
      //    - If local has a server timestamp, it's been deleted on server -> REMOVE
      //    - If local is a Date object, it's a pending local write -> KEEP
      
      const lMillis = l.updatedAt?.toMillis?.() || (l.updatedAt instanceof Date ? l.updatedAt.getTime() : 0);
      const eMillis = existing?.updatedAt?.toMillis?.() || (existing?.updatedAt instanceof Date ? existing.updatedAt.getTime() : 0);
      
      // Safety: If the existing local log was updated very recently (last 10s), 
      // treat it as newer even if the server version has a slightly different timestamp.
      const isVeryRecent = (Date.now() - eMillis) < 10000;
      const isNewer = !existing || (!isVeryRecent && lMillis > eMillis);
      
      if (isNewer) {
        uniqueById.set(l.id, { ...l });
      }
    });

    // Cleanup: Remove local logs that were already synced but are now missing from Firestore (Deletions)
    const now = Date.now();
    for (const [id, log] of uniqueById.entries()) {
      const logMillis = log.updatedAt?.toMillis?.() || (log.updatedAt instanceof Date ? log.updatedAt.getTime() : 0);
      const isVeryRecent = (now - logMillis) < 10000;
      
      const isSynced = log.updatedAt?.toMillis || (log.updatedAt && !(log.updatedAt instanceof Date));
      if (isSynced && !firestoreIds.has(id) && !isVeryRecent) {
        uniqueById.delete(id);
      }
    }

    // Final pass for temporal consistency and content deduplication
    const merged = Array.from(uniqueById.values());
    const finalUnique = [];
    merged.sort((a, b) => timeStrToMinutes(a.startTime) - timeStrToMinutes(b.startTime)).forEach(l => {
      const contentKey = `${l.date}-${l.startTime}-${l.endTime || l.startTime}-${l.activityName}`;
      if (!seenContent.has(contentKey)) {
        finalUnique.push(l);
        seenContent.add(contentKey);
      }
    });

    const uniqueLogs = Array.from(uniqueById.values());
    const dayGroups = new Map();
    
    uniqueLogs.forEach(log => {
      if (!dayGroups.has(log.date)) dayGroups.set(log.date, []);
      dayGroups.get(log.date).push(log);
    });

    let healed = [];
    dayGroups.forEach((dayLogs, date) => {
      // Sort by start time primarily
      const sorted = dayLogs.sort((a, b) => {
        const aStart = timeStrToMinutes(a.startTime);
        const bStart = timeStrToMinutes(b.startTime);
        if (aStart !== bStart) return aStart - bStart;
        return a.id.localeCompare(b.id);
      });

      let processedDay = [];
      sorted.forEach(log => {
        // Greedy forward push: ensure this log starts AFTER the previous one ends
        if (processedDay.length > 0) {
          const prev = processedDay[processedDay.length - 1];
          const prevEnd = timeStrToMinutes(prev.endTime || prev.startTime, true);
          const currentStart = timeStrToMinutes(log.startTime);
          
          if (currentStart < prevEnd) {
            // Shift forward
            const duration = timeStrToMinutes(log.endTime || log.startTime, true) - currentStart;
            const newStart = prevEnd;
            const newEnd = newStart + Math.max(15, duration);
            
            log.startTime = minutesToTimeStr(newStart);
            log.endTime = minutesToTimeStr(newEnd);
          }
        }
        processedDay.push(log);
      });
      healed = healed.concat(processedDay);
    });

    return healed;
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      showToast("Firebase not configured — add your API keys to src/config/firebase.js to enable cloud sync", "warning");
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await migrateLocalData(result.user.uid);
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      showToast("Sign-in failed. Please try again.", "error");
    }
  };

  const migrateLocalData = async (uid) => {
    const localLogs = JSON.parse(localStorage.getItem('aura_velocity_logs') || '[]');
    const localActivities = JSON.parse(localStorage.getItem('aura_velocity_activities') || '[]');
    const localIntents = JSON.parse(localStorage.getItem('aura_velocity_intents') || '{}');
    const localTemplates = JSON.parse(localStorage.getItem('aura_velocity_templates') || '[]');
    const localTasks = JSON.parse(localStorage.getItem('aura_velocity_tasks') || '[]');

    if (localLogs.length === 0 && 
        localActivities.length === INITIAL_ACTIVITIES.length && 
        Object.keys(localIntents).length === 0 && 
        localTemplates.length === 0 &&
        localTasks.length === 0) {
      return; // Nothing to migrate
    }

    const batch = writeBatch(db);
    
    // Migrate Profile
    const userRef = doc(db, 'users', uid);
    batch.set(userRef, {
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
      photoURL: auth.currentUser.photoURL,
      lastSeen: serverTimestamp()
    }, { merge: true });

    // Migrate Logs
    localLogs.forEach(log => {
      const logRef = doc(collection(db, 'users', uid, 'logs'), log.id);
      batch.set(logRef, { ...log, updatedAt: serverTimestamp() });
    });

    // Migrate Custom Activities
    localActivities.filter(a => a.isCustom).forEach(act => {
      const actId = act.id || Math.random().toString(36).substr(2, 9);
      const actRef = doc(collection(db, 'users', uid, 'activities'), actId);
      batch.set(actRef, { ...act, updatedAt: serverTimestamp() });
    });

    // Migrate Intents
    Object.entries(localIntents).forEach(([date, data]) => {
      const intentRef = doc(db, 'users', uid, 'dailyIntents', date);
      batch.set(intentRef, { ...data, updatedAt: serverTimestamp() });
    });

    // Migrate Templates
    localTemplates.forEach(tpl => {
      const tplRef = doc(collection(db, 'users', uid, 'templates'), tpl.id);
      batch.set(tplRef, { ...tpl, updatedAt: serverTimestamp() });
    });

    // Migrate Tasks
    localTasks.forEach(task => {
      const taskRef = doc(collection(db, 'users', uid, 'tasks'), task.id);
      batch.set(taskRef, { ...task, updatedAt: serverTimestamp() });
    });

    // Migrate Regret Model
    const localRegretModel = JSON.parse(localStorage.getItem('lifeapp_regret_model') || 'null');
    if (localRegretModel) {
      batch.set(doc(db, 'users', uid, 'regretModel', 'main'), { ...localRegretModel, updatedAt: serverTimestamp() });
    }

    // Migrate Relationships
    const localRel = JSON.parse(localStorage.getItem('lifeapp_relationships') || 'null');
    if (localRel) {
      localRel.people.forEach(p => {
        batch.set(doc(db, 'users', uid, 'people', p.id), { ...p, updatedAt: serverTimestamp() });
      });
      localRel.interactions.forEach(i => {
        batch.set(doc(db, 'users', uid, 'interactions', i.id), { ...i, updatedAt: serverTimestamp() });
      });
    }

    await batch.commit();
    
    // Clear local storage after successful migration
    localStorage.removeItem('aura_velocity_logs');
    localStorage.removeItem('aura_velocity_activities');
    localStorage.removeItem('aura_velocity_intents');
    localStorage.removeItem('aura_velocity_templates');
    localStorage.removeItem('aura_velocity_regret_model');
    localStorage.removeItem('aura_velocity_relationships');
    localStorage.removeItem('aura_velocity_tasks');
    console.log("Migration complete");
  };

  const signOutUser = async () => {
    try {
      // Keep a small snapshot before signing out as requested
      const snapshot = {
        logs: logs.slice(0, 100), // Last 100 entries or similar
        activities,
        intents,
        templates,
        regretModel
      };
      localStorage.setItem('lifeapp_logs', JSON.stringify(snapshot.logs));
      localStorage.setItem('lifeapp_activities', JSON.stringify(snapshot.activities));
      localStorage.setItem('lifeapp_intents', JSON.stringify(snapshot.intents));
      localStorage.setItem('lifeapp_templates', JSON.stringify(snapshot.templates));
      localStorage.setItem('lifeapp_regret_model', JSON.stringify(snapshot.regretModel));
      localStorage.setItem('lifeapp_relationships', JSON.stringify(relationships));
      
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // Sync Engine Effect
  useEffect(() => {
    if (!user) return;

    const unsubLogs = onSnapshot(collection(db, 'users', user.uid, 'logs'), { includeMetadataChanges: true }, (snapshot) => {
      const firestoreLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setLogs(prev => {
        const healed = healLogs(firestoreLogs, prev);
        return healed;
      });
    });

    const unsubActivities = onSnapshot(collection(db, 'users', user.uid, 'activities'), (snapshot) => {
      const firestoreActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (firestoreActivities.length > 0) {
        setActivities(prev => {
          // Map initial activities to their firestore overrides if they exist
          const merged = INITIAL_ACTIVITIES.map(base => {
            const override = firestoreActivities.find(f => f.name.toLowerCase() === base.name.toLowerCase());
            if (!override) return base;
            
            // AGGRESSIVE OVERRIDE: Prevent Firestore from overwriting refined colors for Tool/Extra or legacy yellows
            const finalOverride = { ...override };
            const isYellowish = ['#eab308', '#f59e0b', '#f97316', '#fbbf24', '#fb923c'].includes(override.baseColor?.toLowerCase());
            
            if (base.name.toLowerCase() === 'tool' || base.name.toLowerCase() === 'extra' || isYellowish) {
              delete finalOverride.baseColor;
              delete finalOverride.lightColor;
            }
            
            return { ...base, ...finalOverride };
          });
          // Add truly new custom activities
          const extra = firestoreActivities.filter(f => !INITIAL_ACTIVITIES.find(base => base.name === f.name));
          return [...merged, ...extra];
        });
      }
    });

    const unsubIntents = onSnapshot(collection(db, 'users', user.uid, 'dailyIntents'), (snapshot) => {
      const firestoreIntents = {};
      snapshot.docs.forEach(doc => {
        firestoreIntents[doc.id] = doc.data();
      });
      setIntents(firestoreIntents);
    });

    const unsubTemplates = onSnapshot(collection(db, 'users', user.uid, 'templates'), (snapshot) => {
      const firestoreTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort templates by created_at descending
      firestoreTemplates.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setTemplates(firestoreTemplates);
    });

    const unsubRegretModel = onSnapshot(doc(db, 'users', user.uid, 'regretModel', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setRegretModel(docSnap.data());
      }
    });

    const unsubPeople = onSnapshot(collection(db, 'users', user.uid, 'people'), (snapshot) => {
      const firestorePeople = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRelationships(prev => ({ ...prev, people: firestorePeople }));
    });

    const unsubInteractions = onSnapshot(collection(db, 'users', user.uid, 'interactions'), (snapshot) => {
      const firestoreInteractions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRelationships(prev => ({ ...prev, interactions: firestoreInteractions }));
    });

    const unsubTasks = onSnapshot(collection(db, 'users', user.uid, 'tasks'), (snapshot) => {
      const firestoreTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(firestoreTasks);
    });

    const unsubFinanceLogs = onSnapshot(collection(db, 'users', user.uid, 'financeLogs'), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinanceLogs(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    });

    const unsubFinancialGoals = onSnapshot(collection(db, 'users', user.uid, 'financialGoals'), (snapshot) => {
      const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinancialGoals(goals);
    });

    return () => {
      unsubLogs();
      unsubActivities();
      unsubIntents();
      unsubTemplates();
      unsubRegretModel();
      unsubPeople();
      unsubInteractions();
      unsubTasks();
      unsubFinanceLogs();
      unsubFinancialGoals();
    };
  }, [user]);

  // Auto-save to localStorage (only if NOT signed in)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_logs', JSON.stringify(logs));
    }
  }, [logs, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_activities', JSON.stringify(activities));
    }
  }, [activities, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_intents', JSON.stringify(intents));
    }
  }, [intents, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_templates', JSON.stringify(templates));
    }
  }, [templates, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_regret_model', JSON.stringify(regretModel));
    }
  }, [regretModel, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura_velocity_relationships', JSON.stringify(relationships));
    }
  }, [relationships, user]);

  useEffect(() => {
    localStorage.setItem('aura_velocity_copilot_history', JSON.stringify(copilotHistory.slice(0, 50)));
  }, [copilotHistory]);

  // Selection Actions
  const selectAll = useCallback(() => {
    const targetDateStr = format(focusedDate, 'yyyy-MM-dd');
    const dayLogIds = logs.filter(l => l.date === targetDateStr).map(l => l.id);
    setSelectedLogIds(dayLogIds);
  }, [logs, focusedDate]);

  const copySelection = useCallback(() => {
    if (selectedLogIds.length === 0) return;
    const toCopy = logs.filter(l => selectedLogIds.includes(l.id));
    setClipboard(toCopy);
    showToast("Entry copied");
  }, [selectedLogIds, logs, showToast]);

  const terminateSelection = useCallback(async () => {
    if (selectedLogIds.length === 0) return;
    const now = new Date();
    const timeStr = format(now, 'HH:mm');
    const idsToTerminate = [...selectedLogIds];
    
    setLogs(prevLogs => {
      setPastLogs(prevHistory => [...prevHistory, prevLogs].slice(-50));
      setFutureLogs([]);
      return prevLogs.map(l => {
        if (idsToTerminate.includes(l.id)) {
          return { ...l, endTime: timeStr, updatedAt: new Date().toISOString() };
        }
        return l;
      });
    });
    
    setSelectedLogIds([]);

    if (user) {
      try {
        const batch = writeBatch(db);
        idsToTerminate.forEach(id => {
          batch.update(doc(db, 'users', user.uid, 'logs', id), {
            endTime: timeStr,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        showToast(`Terminated ${idsToTerminate.length} ${idsToTerminate.length === 1 ? 'activity' : 'activities'}`);
      } catch (e) {
        console.error("Terminate failed:", e);
        showToast("Terminate failed", "error");
      }
    }
  }, [selectedLogIds, user, logs, showToast]);

  const deleteSelection = useCallback(async () => {
    if (selectedLogIds.length === 0) return;
    const count = selectedLogIds.length;
    const idsToDelete = [...selectedLogIds];
    
    // Mechanical Feedback
    triggerMechanicalFeedback('clunk');
    
    // Optimistic update
    setLogs(prevLogs => {
      setPastLogs(prevHistory => [...prevHistory, prevLogs].slice(-50));
      setFutureLogs([]);
      return prevLogs.filter(l => !idsToDelete.includes(l.id));
    });
    
    setSelectedLogIds([]);

    if (user) {
      try {
        const batch = writeBatch(db);
        idsToDelete.forEach(id => {
          batch.delete(doc(db, 'users', user.uid, 'logs', id));
          
          // Also delete associated interactions
          const associatedInteractions = (relationships?.interactions || []).filter(i => i.logEntryId === id);
          associatedInteractions.forEach(i => {
            batch.delete(doc(db, 'users', user.uid, 'interactions', i.id));
          });
        });
        
        await batch.commit();
        showToast(`${count} ${count === 1 ? 'entry' : 'entries'} deleted`, "info", {
          label: "Undo",
          onClick: () => undo()
        });
      } catch (e) {
        console.error("Batch delete failed:", e);
        showToast("Delete failed. Syncing...", "error");
      }
    }
  }, [selectedLogIds, user, logs, relationships, showToast, undo]);

  const wipeCurrentDay = useCallback(async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently wipe all logs for the current day. Use this only to clear corruption.")) return;
    
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    const logsToDelete = logs.filter(l => l.date === dayStr);
    
    // Clear state optimistically
    const remainingLogs = logs.filter(l => l.date !== dayStr);
    setLogs(remainingLogs);

    if (user) {
      try {
        const batch = writeBatch(db);
        logsToDelete.forEach(l => {
          batch.delete(doc(db, 'users', user.uid, 'logs', l.id));
        });
        await batch.commit();
      } catch (e) {
        console.error("Wipe failed:", e);
        showToast("Cloud wipe failed, local state cleared.", "error");
      }
    }
    showToast(`Wiped ${logsToDelete.length} entries for ${dayStr}`, "warning");
  }, [currentDate, logs, user, showToast]);

  const cutSelection = useCallback(async () => {
    if (selectedLogIds.length === 0) return;
    copySelection();
    await deleteSelection();
    showToast("Entry cut", "info", {
      label: "Undo",
      onClick: () => undo()
    });
  }, [copySelection, deleteSelection, selectedLogIds, showToast, undo]);

  const pasteSelection = useCallback(async (targetDate, targetTimeMins = null) => {
    if (clipboard.length === 0) {
      showToast("Nothing to paste", "warning");
      return;
    }
    
    // If no target time provided, use current time rounded to 30 min
    if (targetTimeMins === null) {
      const now = new Date();
      targetTimeMins = now.getHours() * 60 + (now.getMinutes() < 30 ? 0 : 30);
    }

    // Find first available slot if target is occupied
    let baseOffset = targetTimeMins;
    const dayLogs = logs.filter(l => l.date === targetDate);
    
    const isOccupied = (offset) => dayLogs.some(l => {
      if (!l.startTime) return false;
      const start = timeStrToMinutes(l.startTime);
      const end = timeStrToMinutes(l.endTime || l.startTime);
      return offset >= start && offset < end;
    });

    while (isOccupied(baseOffset) && baseOffset < 1440) {
      baseOffset += 30;
    }

    if (baseOffset >= 1440) {
      showToast("No free slots available", "error");
      return;
    }

    const firstOriginalStart = Math.min(...clipboard.map(l => timeStrToMinutes(l.startTime)));
    
    const newLogs = clipboard.map(l => {
      const originalStart = timeStrToMinutes(l.startTime);
      const originalEnd = timeStrToMinutes(l.endTime || l.startTime);
      const duration = originalEnd - originalStart;
      const relativeOffset = originalStart - firstOriginalStart;
      const newStart = baseOffset + relativeOffset;
      const newEnd = newStart + duration;

      return {
        ...l,
        id: Math.random().toString(36).substr(2, 9),
        date: targetDate,
        startTime: minutesToTimeStr(newStart),
        endTime: minutesToTimeStr(newEnd),
        createdAt: user ? serverTimestamp() : new Date().toISOString(),
        updatedAt: user ? serverTimestamp() : new Date().toISOString(),
        isPasted: true // For visual feedback pulse
      };
    });

    if (user) {
      const batch = writeBatch(db);
      newLogs.forEach(nl => {
        batch.set(doc(db, 'users', user.uid, 'logs', nl.id), nl);
      });
      await batch.commit();
    } else {
      let cumulativeLogs = [...logs];
      newLogs.forEach(nl => {
        cumulativeLogs = enforceExclusivity(nl, cumulativeLogs);
        cumulativeLogs.push(nl);
      });
      commitChange(cumulativeLogs);
    }
    showToast(`${newLogs.length} ${newLogs.length === 1 ? 'entry' : 'entries'} pasted`);
  }, [clipboard, user, logs, showToast]);

  const moveSelection = useCallback(async (mins) => {
    if (selectedLogIds.length === 0) return;
    
    const targetIds = selectedLogIds;
    
    // Boundary check for first/last block
    const sortedLogs = logs.filter(l => targetIds.includes(l.id)).sort((a, b) => timeStrToMinutes(a.startTime) - timeStrToMinutes(b.startTime));
    if (sortedLogs.length === 0) return;

    const earliestStart = timeStrToMinutes(sortedLogs[0].startTime);
    const latestEnd = timeStrToMinutes(sortedLogs[sortedLogs.length - 1].endTime || sortedLogs[sortedLogs.length - 1].startTime);

    if (mins < 0 && earliestStart + mins < 480) { // 8:00 AM = 480 mins
      showToast("Can't move earlier", "warning");
      return;
    }
    if (mins > 0 && latestEnd + mins > 1560) { // 2:00 AM = 1560 mins (26 * 60)
      showToast("Can't move later", "warning");
      return;
    }

    // Overlap check
    const otherLogs = logs.filter(l => !targetIds.includes(l.id));
    let blocked = false;
    let blockerName = "";

    sortedLogs.forEach(log => {
      const newStart = timeStrToMinutes(log.startTime) + mins;
      const newEnd = timeStrToMinutes(log.endTime || log.startTime) + mins;
      
      const overlap = otherLogs.find(ol => {
        const oStart = timeStrToMinutes(ol.startTime);
        const oEnd = timeStrToMinutes(ol.endTime || ol.startTime);
        return (newStart < oEnd && newEnd > oStart);
      });

      if (overlap) {
        blocked = true;
        blockerName = overlap.activityName;
      }
    });

    if (blocked) {
      showToast(`Blocked by ${blockerName}`, "warning");
      return;
    }

    if (user) {
      const batch = writeBatch(db);
      targetIds.forEach(id => {
        const log = logs.find(l => l.id === id);
        if (!log) return;
        const newStart = timeStrToMinutes(log.startTime) + mins;
        const newEnd = timeStrToMinutes(log.endTime || log.startTime) + mins;
        batch.update(doc(db, 'users', user.uid, 'logs', id), {
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } else {
      let updatedLogs = [...logs];
      targetIds.forEach(id => {
        const log = updatedLogs.find(l => l.id === id);
        if (!log) return;
        const newStart = timeStrToMinutes(log.startTime) + mins;
        const newEnd = timeStrToMinutes(log.endTime || log.startTime) + mins;
        updatedLogs = updatedLogs.map(l => l.id === id ? {
          ...l,
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd)
        } : l);
      });
      commitChange(updatedLogs);
    }
  }, [selectedLogIds, user, logs, showToast, commitChange]);

  // ── OPPORTUNITY COST ENGINE ──
  const opportunityCost = useMemo(() => {
    // 1. Get all Boondoggle logs for the current week
    const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 1 });
    const boondoggles = logs.filter(l => {
      const logDate = parseISO(l.date);
      return l.activityName === 'Entropy Flux' && isWithinInterval(logDate, { start: startOfCurrentWeek, end: endOfCurrentWeek });
    });
    
    let totalBoondoggleMins = 0;
    const displacedActivities = {}; // { 'Tech and AI': minutes }

    boondoggles.forEach(log => {
      const startMins = timeStrToMinutes(log.startTime);
      const endMins = timeStrToMinutes(log.endTime || log.startTime);
      const duration = endMins - startMins;
      totalBoondoggleMins += duration;

      // Find what template activity was displaced
      // For simplicity, we check the first active template
      const activeTemplate = templates[0];
      if (activeTemplate && activeTemplate.logs) {
        const displaced = activeTemplate.logs.find(tLog => {
          const tStart = timeStrToMinutes(tLog.startTime);
          const tEnd = timeStrToMinutes(tLog.endTime);
          // Overlap check
          return (startMins < tEnd && endMins > tStart);
        });

        if (displaced && displaced.activityName !== 'Boondoggle') {
          displacedActivities[displaced.activityName] = (displacedActivities[displaced.activityName] || 0) + duration;
        }
      }
    });

    return {
      totalHours: Math.round((totalBoondoggleMins / 60) * 10) / 10,
      displaced: Object.entries(displacedActivities)
        .sort((a, b) => b[1] - a[1])
        .map(([name, mins]) => ({ name, hours: Math.round((mins / 60) * 10) / 10 }))
    };
  }, [logs, templates]);

  const purgeActivity = async (activityName, subcategory = null) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const logsToPurge = logs.filter(l => 
      l.activityName === activityName && 
      (!subcategory || l.subcategory === subcategory) &&
      l.date >= todayStr
    );

    if (logsToPurge.length === 0) {
      showToast("No future occurrences found to purge.", "info");
      return;
    }

    try {
      const batch = writeBatch(db);
      logsToPurge.forEach(log => {
        const logRef = doc(db, 'users', user.uid, 'logs', log.id);
        batch.delete(logRef);
      });
      await batch.commit();
      
      setLogs(prev => prev.filter(l => !logsToPurge.find(p => p.id === l.id)));
      showToast(`Purged ${logsToPurge.length} future sessions of ${activityName}`, "success");
    } catch (error) {
      console.error("Purge error:", error);
      showToast("Failed to purge activity", "error");
    }
  };


  const addLog = async (log) => {
    const logId = log.id || Math.random().toString(36).substr(2, 9);
    // Use a local Date for the optimistic state so healLogs can compare it correctly.
    // Firestore will still use serverTimestamp() for the actual write.
    const newLog = { ...log, id: logId, createdAt: new Date(), updatedAt: new Date() };

    setPastLogs(h => [...h, logs].slice(-50));
    setFutureLogs([]);

    if (user) {
      if (!log.recurringType || log.recurringType === 'none') {
        const { finalLogs, affectedLogs } = processTemporalState(newLog, logs);
        setLogs(finalLogs);
        triggerRender();
        
        // Sync all affected logs
        const batch = writeBatch(db);
        affectedLogs.forEach(l => {
          const lRef = doc(db, 'users', user.uid, 'logs', l.id);
          batch.set(lRef, { ...l, updatedAt: serverTimestamp() }, { merge: true });
        });
        await batch.commit().catch(e => console.error("Sync error:", e));
      } else {
        const batch = writeBatch(db);
        const groupId = Math.random().toString(36).substr(2, 9);
        const [year, month, day] = log.date.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        let daysToGenerate = log.recurringType === 'daily' ? 30 : log.recurringType === 'weekly' ? 84 : 28;
        let step = log.recurringType === 'weekly' ? 7 : 1;
        
        let localBatch = [...logs];
        for (let i = 0; i < daysToGenerate; i += step) {
          const nextDate = addDays(startDate, i);
          if (log.recurringType === 'weekdays' && isWeekend(nextDate)) continue;
          const entryId = Math.random().toString(36).substr(2, 9);
          const entry = {
            ...newLog,
            id: entryId,
            date: format(nextDate, 'yyyy-MM-dd'),
            isRecurring: true,
            recurringGroupId: groupId
          };
          batch.set(doc(db, 'users', user.uid, 'logs', entryId), entry);
          localBatch = enforceExclusivity(entry, localBatch);
          localBatch.push(entry);
        }
        
        // Sync affected existing logs in localBatch (if any were modified by the new series)
        localBatch.forEach(l => {
          if (l.isModified) {
            batch.set(doc(db, 'users', user.uid, 'logs', l.id), { ...l, updatedAt: serverTimestamp() }, { merge: true });
          }
        });

        setLogs(localBatch);
        await batch.commit();
      }
    } else {
      // Local logic
      if (!log.recurringType || log.recurringType === 'none') {
        const cleanedLogs = enforceExclusivity({ ...log, id: logId }, logs);
        setLogs([...cleanedLogs, { ...log, id: logId }]);
      } else {
        const groupId = Math.random().toString(36).substr(2, 9);
        const [year, month, day] = log.date.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        let daysToGenerate = log.recurringType === 'daily' ? 30 : log.recurringType === 'weekly' ? 84 : 28;
        let step = log.recurringType === 'weekly' ? 7 : 1;
        let cumulativeLogs = [...logs];
        for (let i = 0; i < daysToGenerate; i += step) {
          const nextDate = addDays(startDate, i);
          if (log.recurringType === 'weekdays' && isWeekend(nextDate)) continue;
          const newEntry = {
            ...log,
            id: Math.random().toString(36).substr(2, 9),
            date: format(nextDate, 'yyyy-MM-dd'),
            isRecurring: true,
            recurringGroupId: groupId
          };
          cumulativeLogs = enforceExclusivity(newEntry, cumulativeLogs);
          cumulativeLogs.push(newEntry);
        }
        setLogs(cumulativeLogs);
      }
    }
  };

  const updateLog = async (id, updates) => {
    if (!id) return;
    
    setPastLogs(h => [...h, logs].slice(-50));
    setFutureLogs([]);

    const existing = logs.find(l => l.id === id);
    if (!existing) return;

    const proposed = { ...existing, ...updates, updatedAt: new Date() };
    const { finalLogs, affectedLogs } = processTemporalState(proposed, logs);
    setLogs(finalLogs);
    triggerRender();

    if (user && affectedLogs.length > 0) {
      const batch = writeBatch(db);
      affectedLogs.forEach(l => {
        const lRef = doc(db, 'users', user.uid, 'logs', l.id);
        batch.set(lRef, { ...l, updatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit().catch(e => console.error("Sync error:", e));
    }
  };
  const updateLogSeries = async (groupId, updates) => {
    if (user) {
      const batch = writeBatch(db);
      const targetLogs = logs.filter(l => l.recurringGroupId === groupId);
      targetLogs.forEach(l => {
        batch.set(doc(db, 'users', user.uid, 'logs', l.id), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
    } else {
      const targetLogs = logs.filter(l => l.recurringGroupId === groupId);
      const otherLogs = logs.filter(l => l.recurringGroupId !== groupId);
      let finalLogs = [...otherLogs];
      targetLogs.forEach(l => {
        const updated = { ...l, ...updates };
        finalLogs = enforceExclusivity(updated, finalLogs);
        finalLogs.push(updated);
      });
      commitChange(finalLogs);
    }
  };

  const deleteLogSeries = useCallback(async (groupId) => {
    if (!groupId) return;

    // Mechanical Feedback
    triggerMechanicalFeedback('clunk');

    setPastLogs(prev => [...prev, logs].slice(-50));
    const remainingLogs = logs.filter(log => log.recurringGroupId !== groupId);
    const targetLogs = logs.filter(log => log.recurringGroupId === groupId);
    setLogs(remainingLogs);

    if (user) {
      try {
        const batch = writeBatch(db);
        targetLogs.forEach(l => {
          batch.delete(doc(db, 'users', user.uid, 'logs', l.id));
          
          // Also delete associated interactions
          const associatedInteractions = (relationships?.interactions || []).filter(i => i.logEntryId === l.id);
          associatedInteractions.forEach(i => {
            batch.delete(doc(db, 'users', user.uid, 'interactions', i.id));
          });
        });
        await batch.commit();
        showToast(`Deleted ${targetLogs.length} recurring entries`);
      } catch (e) {
        console.error("Series delete failed:", e);
        showToast("Delete series failed", "error");
      }
    }
  }, [user, logs, relationships, showToast]);

  const clearDay = async (dateStr) => {
    setPastLogs(prev => [...prev, logs].slice(-50));
    const remainingLogs = logs.filter(log => log.date !== dateStr || log.isRecurring);
    setLogs(remainingLogs);

    if (user) {
      try {
        const batch = writeBatch(db);
        const targetLogs = logs.filter(log => log.date === dateStr && !log.isRecurring);
        targetLogs.forEach(l => {
          batch.delete(doc(db, 'users', user.uid, 'logs', l.id));
        });
        await batch.commit();
      } catch (e) {
        console.error("Clear day failed:", e);
      }
    }
  };

  const addSubcategory = async (activityName, subcategory) => {
    const newSub = typeof subcategory === 'string' ? { name: subcategory, defaultReferenceLink: null } : subcategory;
    
    let updatedActivities = [];
    
    setActivities(prev => {
      updatedActivities = prev.map(act => {
        if (act.name === activityName) {
          const exists = act.subcategories.some(s => (typeof s === 'string' ? s : s.name) === (typeof subcategory === 'string' ? subcategory : subcategory.name));
          if (exists) return act;
          return { ...act, subcategories: [...act.subcategories, newSub] };
        }
        return act;
      });
      
      // Update localStorage immediately if no user
      if (!user) {
        localStorage.setItem('aura_velocity_activities', JSON.stringify(updatedActivities));
      }
      
      return updatedActivities;
    });

    if (user) {
      const act = activities.find(a => a.name === activityName);
      if (act) {
        const actId = act.id || activityName;
        await setDoc(doc(db, 'users', user.uid, 'activities', actId), {
          ...act,
          subcategories: [...act.subcategories, newSub],
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  };

  const addActivity = async (activity) => {
    if (user) {
      const actId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'users', user.uid, 'activities', actId), {
        ...activity,
        id: actId,
        isCustom: true,
        updatedAt: serverTimestamp()
      });
    } else {
      setActivities(prev => [...prev, { ...activity, isCustom: true }]);
    }
  };

  const deleteActivity = async (activityId) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'activities', activityId));
    } else {
      setActivities(prev => prev.filter(act => act.id !== activityId));
    }
  };

  // Relationship Management
  const addPerson = async (person) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newPerson = { ...person, id, createdAt: new Date().toISOString(), isActive: true };
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'people', id), { ...newPerson, updatedAt: serverTimestamp() });
    } else {
      setRelationships(prev => ({ ...prev, people: [...prev.people, newPerson] }));
    }
    return id;
  };

  const updatePerson = async (id, updates) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'people', id), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      setRelationships(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
    }
  };

  const deletePerson = async (id) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'people', id));
    } else {
      setRelationships(prev => ({
        ...prev,
        people: prev.people.filter(p => p.id !== id)
      }));
    }
  };

  const logInteraction = async (personId, data) => {
    const interactionId = Math.random().toString(36).substr(2, 9);
    const newInteraction = { 
      ...data, 
      id: interactionId, 
      personId, 
      createdAt: new Date().toISOString() 
    };

    const personUpdates = {
      lastContactDate: data.date,
      lastContactLogId: data.logEntryId || null
    };

    if (user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'interactions', interactionId), { ...newInteraction, updatedAt: serverTimestamp() });
      batch.set(doc(db, 'users', user.uid, 'people', personId), { ...personUpdates, updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
    } else {
      setRelationships(prev => ({
        people: prev.people.map(p => p.id === personId ? { ...p, ...personUpdates } : p),
        interactions: [...prev.interactions, newInteraction]
      }));
    }
    showToast("Contact logged · Cadence reset", "success");
  };

  const setIntent = async (dateStr, text) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'dailyIntents', dateStr), {
        text,
        completed: intents[dateStr]?.completed || false,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      setIntents(prev => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], text, completed: prev[dateStr]?.completed || false }
      }));
    }
  };

  const toggleIntentCompleted = async (dateStr) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'dailyIntents', dateStr), {
        completed: !intents[dateStr]?.completed,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      setIntents(prev => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], completed: !prev[dateStr]?.completed }
      }));
    }
  };

  const saveTemplate = async (name, dateStr) => {
    const dayLogs = logs.filter(l => l.date === dateStr);
    if (dayLogs.length === 0) return false;

    const blocks = dayLogs.map(log => {
      const startMins = timeStrToMinutes(log.startTime);
      const endMins = timeStrToMinutes(log.endTime || log.startTime);
      return {
        id: Math.random().toString(36).substr(2, 9),
        label: log.activityName,
        subcategory: log.subcategory || '',
        start_offset: startMins,
        duration_mins: endMins - startMins,
        color_hint: activities.find(a => a.name === log.activityName)?.color || '#94a3b8'
      };
    });

    const templateId = Math.random().toString(36).substr(2, 9);
    const newTemplate = {
      id: templateId,
      name,
      blocks,
      is_active: true,
      created_at: new Date().toISOString()
    };

    if (user) {
      const batch = writeBatch(db);
      templates.forEach(t => {
        if (t.is_active) {
          batch.update(doc(db, 'users', user.uid, 'templates', t.id), { is_active: false });
        }
      });
      batch.set(doc(db, 'users', user.uid, 'templates', templateId), { ...newTemplate, synced_at: serverTimestamp() });
      await batch.commit();
    } else {
      setTemplates(prev => [
        ...prev.map(t => ({ ...t, is_active: false })),
        newTemplate
      ]);
    }
    return true;
  };

  const setActiveTemplate = async (templateId) => {
    if (user) {
      const batch = writeBatch(db);
      templates.forEach(t => {
        if (t.id === templateId && !t.is_active) {
          batch.update(doc(db, 'users', user.uid, 'templates', t.id), { is_active: true });
        } else if (t.id !== templateId && t.is_active) {
          batch.update(doc(db, 'users', user.uid, 'templates', t.id), { is_active: false });
        }
      });
      await batch.commit();
    } else {
      setTemplates(prev => prev.map(t => ({ ...t, is_active: t.id === templateId })));
    }
  };

  const deleteTemplate = async (templateId) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'templates', templateId));
    } else {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };


  const energyPatterns = useMemo(() => {
    const patterns = {
      morning: { total: 0, count: 0, average: 50 },
      afternoon: { total: 0, count: 0, average: 50 },
      evening: { total: 0, count: 0, average: 50 },
      night: { total: 0, count: 0, average: 50 }
    };

    logs
      .filter(log => log.energyLevel !== null && log.energyLevel !== undefined)
      .forEach(log => {
        const startMins = timeStrToMinutes(log.startTime);
        let tod = 'night';
        if (startMins >= 360 && startMins < 720) tod = 'morning';
        else if (startMins >= 720 && startMins < 1020) tod = 'afternoon';
        else if (startMins >= 1020 && startMins < 1260) tod = 'evening';

        patterns[tod].total += log.energyLevel;
        patterns[tod].count += 1;
        patterns[tod].average = patterns[tod].total / patterns[tod].count;
      });

    return patterns;
  }, [logs]);

  const findOptimalSlots = useCallback((parsed) => {
    const searchStart = new Date();
    // Ensure searchEnd includes the full deadline day (end of day)
    const searchEnd = parsed.deadline ? addDays(parseISO(parsed.deadline), 1) : addDays(searchStart, 7);
    
    // 1. Get all free slots (30-min increments)
    const allFreeSlots = [];
    let current = new Date(searchStart);
    while (current <= searchEnd) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.date === dateStr);
      
      // 8 AM to 10 PM search window
      for (let mins = 480; mins < 1320; mins += 30) {
        // Skip past slots if it's today
        const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
        if (isToday && mins < nowMins) continue;

        const isOccupied = dayLogs.some(l => {
          if (!l.startTime) return false;
          const s = timeStrToMinutes(l.startTime);
          const e = timeStrToMinutes(l.endTime || l.startTime);
          return mins >= s && mins < e;
        });
        
        if (!isOccupied) {
          allFreeSlots.push({ date: dateStr, time: mins });
        }
      }
      current = addDays(current, 1);
    }

    // 2. Filter by TOD preference
    let filteredSlots = allFreeSlots;
    if (parsed.preferredTimeOfDay && parsed.preferredTimeOfDay !== 'any') {
      filteredSlots = allFreeSlots.filter(s => {
        let tod = 'night';
        if (s.time >= 360 && s.time < 720) tod = 'morning';
        else if (s.time >= 720 && s.time < 1020) tod = 'afternoon';
        else if (s.time >= 1020 && s.time < 1260) tod = 'evening';
        return tod === parsed.preferredTimeOfDay;
      });
    }

    // 3. Find contiguous blocks
    const contiguous = [];
    const duration = parsed.durationMinutes || 60;
    const blocksNeeded = Math.ceil(duration / 30);

    for (let i = 0; i <= filteredSlots.length - blocksNeeded; i++) {
      let isContiguous = true;
      for (let j = 0; j < blocksNeeded; j++) {
        if (filteredSlots[i + j].date !== filteredSlots[i].date || 
            filteredSlots[i + j].time !== filteredSlots[i].time + j * 30) {
          isContiguous = false;
          break;
        }
      }
      if (isContiguous) {
        contiguous.push({
          date: filteredSlots[i].date,
          startTimeMins: filteredSlots[i].time,
          durationMins: duration
        });
      }
    }

    // 4. Scoring
    const scored = contiguous.map(block => {
      let score = 100;
      const todFunc = (mins) => {
        if (mins >= 360 && mins < 720) return 'morning';
        if (mins >= 720 && mins < 1020) return 'afternoon';
        if (mins >= 1020 && mins < 1260) return 'evening';
        return 'night';
      };
      
      const blockTod = todFunc(block.startTimeMins);

      // 1. Specific Start Time Match (Highest Priority)
      if (parsed.preferredStartTime) {
        const preferredMins = timeStrToMinutes(parsed.preferredStartTime);
        if (block.startTimeMins === preferredMins) {
          score += 500; // Massive boost for exact match
        } else {
          // Penalty for distance from preferred time
          const diff = Math.abs(block.startTimeMins - preferredMins);
          score -= diff * (parsed.flexibility === 'rigid' ? 5 : 1);
        }
      }

      // 2. Energy Pattern Bonus
      const historicalEnergy = energyPatterns[blockTod]?.average || 50;
      score += (historicalEnergy - 50) * 0.4;

      // 3. Regret Model Bonus
      const activityRegret = regretModel.activityPatterns[parsed.activityType]?.averageRating || 3;
      score += (activityRegret - 3) * 5;

      // 4. Activity-specific preferences
      if (['PM_theory', 'Tech and AI', 'Tool'].includes(parsed.activityType)) {
        if (blockTod === 'morning') score += 15;
      }

      // 5. Temporal Proximity (prefer earlier dates)
      const daysFromNow = (parseISO(block.date).getTime() - searchStart.getTime()) / (1000 * 60 * 60 * 24);
      score -= daysFromNow * 10;

      return { ...block, score: Math.round(Math.max(0, Math.min(100, score))) };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [logs, regretModel, energyPatterns]);

  const addCopilotHistory = useCallback((request, parsedIntent, bookedSlot = null) => {
    setCopilotHistory(prev => {
      const newEntry = { request, parsedIntent, bookedSlot, timestamp: new Date().toISOString() };
      return [newEntry, ...prev].slice(0, 50);
    });
  }, []);


  const alignmentScore = useMemo(() => {
    if (!ghostTemplate || ghostTemplate.length === 0) return 0;
    
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => l.date === dayStr);
    
    let matchedMins = 0;
    let totalIdealMins = 0;

    ghostTemplate.forEach(ideal => {
      totalIdealMins += ideal.duration_mins;
      
      const matches = dayLogs.filter(l => l.activityName === ideal.activityName);
      
      matches.forEach(log => {
        const logStart = timeStrToMinutes(log.startTime);
        const logEnd = timeStrToMinutes(log.endTime || log.startTime);
        const idealEnd = ideal.start_offset + ideal.duration_mins;
        
        const overlapStart = Math.max(logStart, ideal.start_offset);
        const overlapEnd = Math.min(logEnd, idealEnd);
        
        if (overlapEnd > overlapStart) {
          matchedMins += (overlapEnd - overlapStart);
        }
      });
    });

    return totalIdealMins > 0 ? Math.round((matchedMins / totalIdealMins) * 100) : 0;
  }, [logs, ghostTemplate, currentDate]);

  const neuralEfficiency = useMemo(() => {
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => l.date === dayStr);
    
    if (dayLogs.length === 0) return 0;
    
    let deepWorkMins = 0;
    let totalActiveMins = 0;
    
    dayLogs.forEach(log => {
      // Helper returns hours, convert to mins
      const duration = calculateDuration(log) * 60; 
      
      // Exclude base maintenance activities from the efficiency ratio
      if (['Comatose', 'Sustenance'].includes(log.activityName)) return;
      
      totalActiveMins += duration;
      const customDWNames = Object.keys(blueprints);
      if (isDeepWork(log, activities, customDWNames)) {
        deepWorkMins += duration;
      }
    });
    
    return totalActiveMins > 0 ? Math.round((deepWorkMins / totalActiveMins) * 100) : 0;
  }, [logs, currentDate, activities, blueprints]);

  const goToToday = useCallback(() => {
    const now = new Date();
    const logicalToday = now.getHours() < 8 ? addDays(now, -1) : now;
    setCurrentDate(logicalToday);
    setFocusedDate(logicalToday);
  }, []);

  const prevMonth = useCallback(() => {
    setCurrentDate(prev => addDays(prev, -7));
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentDate(prev => addDays(prev, 7));
  }, []);

  const runSubtractionAudit = useCallback(async (isManual = false, days = subtractionInterval) => {
    const patterns = detectRecurringPatterns(logs, days);
    
    // Minimum requirement: at least 3 recurring patterns for auto, 1 for manual
    if (patterns.length < 3 && !isManual) return;
    
    if (isManual && patterns.length === 0) {
      showToast(`No patterns detected in the last ${days} days`, "warning");
      return;
    }

    try {
      const topPatterns = patterns.slice(0, 8);
      const results = await generateSubtractionProposal(topPatterns);
      setSubtractionAuditResults(results);
      const now = new Date().toISOString();
      setLastSubtractionAudit(now);
      showToast(`${days}-Day Subtraction Audit Complete`, "success");
    } catch (err) {
      console.error(err);
      if (isManual) showToast("Audit Failed", "error");
    }
  }, [logs, showToast, subtractionInterval]);

  // Auto-audit scheduler
  useEffect(() => {
    const ratedCount = logs.filter(l => l.regretRating !== undefined).length;
    if (ratedCount < 20) return;

    if (!lastSubtractionAudit) {
      runSubtractionAudit();
      return;
    }

    const lastDate = new Date(lastSubtractionAudit);
    const intervalMs = subtractionInterval * 24 * 60 * 60 * 1000;
    if (new Date() - lastDate > intervalMs) {
      runSubtractionAudit();
    }
  }, [lastSubtractionAudit, logs, runSubtractionAudit, subtractionInterval]);

  const isSubtractionAuditDue = useMemo(() => {
    const ratedCount = logs.filter(l => l.regretRating !== undefined && l.regretRating !== null).length;
    if (ratedCount < 10) return false;

    if (!lastSubtractionAudit) return true;

    const lastDate = new Date(lastSubtractionAudit);
    const intervalMs = subtractionInterval * 24 * 60 * 60 * 1000;
    return (new Date() - lastDate > intervalMs);
  }, [lastSubtractionAudit, logs, subtractionInterval]);

  const value = {
    activities,
    logs,
    renderTick,
    pastLogs,
    futureLogs,
    addLog,
    chronotype,
    setChronotype,
    opportunityCost,
    purgeActivity,

    setShowIntentionality: setShowIntentionalityProxy,
    deleteLog,
    updateLog,
    updateLogSeries,
    deleteLogSeries,
    clearDay,
    undo,
    redo,
    clipboard,
    setClipboard,
    regretModel,
    energyPatterns,
    findOptimalSlots,
    copilotHistory,
    addCopilotHistory,
    addSubcategory,
    addActivity,
    deleteActivity,
    currentDate,
    setCurrentDate,
    activeModule,
    setActiveModule,
    activityFilter,
    setActivityFilter,
    isSidebarOpen,
    setIsSidebarOpen,
    goToToday,
    prevMonth,
    nextMonth,
    intents,
    setIntent,
    toggleIntentCompleted,
    user,
    authLoading,
    signInWithGoogle,
    signOutUser,
    viewMode,
    setViewMode,
    activePopover,
    setActivePopover,
    activeModal,
    setActiveModal,
    selectedLogIds,
    setSelectedLogIds,
    selectAll,
    copySelection,
    terminateSelection,
    cutSelection,
    pasteSelection,
    deleteSelection,
    wipeCurrentDay,
    healLogs,
    setLogs,
    clipboard,
    setClipboard,
    moveSelection,
    templates,
    isGhostMode,
    setIsGhostMode: setGhostModeProxy,
    toggleGhostMode: () => setGhostModeProxy(!isGhostMode),
    waterIntake,
    gulpWater,
    degulpWater,
    ghostTemplate,
    setGhostTemplate,
    isGhostSetupOpen,
    setIsGhostSetupOpen,
    toasts,
    setToasts,
    showToast,
    isInteracting,
    setIsInteracting,
    alignmentScore,
    neuralEfficiency,
    focusedDate,
    setFocusedDate,
    saveTemplate,
    setActiveTemplate,
    deleteTemplate,
    lastSubtractionAudit,
    subtractionAuditResults,
    subtractionInterval,
    setSubtractionInterval,
    runSubtractionAudit,
    isSubtractionAuditDue,
    relationships,
    addPerson,
    updatePerson,
    deletePerson,
    logInteraction,
    journal,
    saveJournalEntry,
    deleteJournalEntry,
    meds,
    toggleMed,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    cloneTasks,
    triggerMechanicalFeedback,
    isShaking,
    isDeepWork,
    auraScore,
    addLog,
    updateLog,
    blueprints,
    saveBlueprints,
    financeLogs,
    financialGoals,
    liquidityPulse,
    addFinanceLog,
    updateFinanceLog,
    deleteFinanceLog,
    saveFinancialGoal,
    deleteFinancialGoal,
    setFinanceLogs,
    financeSelectedDate,
    setFinanceSelectedDate
  };

  // Sync water intake with the active grid date and handle the 8am reset
  useEffect(() => {
    const refreshWater = () => {
      const activeDateStr = getGridDate(currentDate);
      const saved = localStorage.getItem('water_intake');
      if (saved) {
        const { count, date } = JSON.parse(saved);
        if (date === activeDateStr) {
          setWaterIntake(count);
        } else {
          setWaterIntake(0);
        }
      } else {
        setWaterIntake(0);
      }
    };

    refreshWater();
    const interval = setInterval(() => {
      const now = new Date();
      // If we hit exactly 8am, refresh the dashboard date to trigger a full daily reset
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        setCurrentDate(new Date());
      } else {
        refreshWater();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

