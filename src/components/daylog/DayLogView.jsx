import { useState, useEffect, useCallback, useRef } from 'react';
import { GridHeader } from './GridHeader';
import { TimeColumn } from './TimeColumn';
import { DayColumn } from './DayColumn';
import { EntryModal } from './EntryModal';
import { EventPopover } from './EventPopover';
import { QuickCreatePopover } from './QuickCreatePopover';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { getWeekDays, GRID_HEIGHT } from '../../utils/dateHelpers';
import { useApp } from "../../contexts/useApp";
import { MonthView } from './MonthView';
import { AuthBanner } from '../layout/AuthBanner';
import { NeuralProtocolsModal } from '../modals/NeuralProtocolsModal';
import { GhostSetupDrawer } from '../layout/GhostSetupDrawer';
import { FloatingActionBar } from './FloatingActionBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { CopilotPanel } from '../modals/CopilotPanel';
import { RelationshipBanner } from '../layout/RelationshipBanner';
import { JournalQuickWrite } from '../journal/JournalQuickWrite';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { TaskTimelineOverlay } from './TaskTimelineOverlay';
import { WaterLane } from './WaterLane';
import { isDeepWork } from '../../utils/analysisHelpers';

export function DayLogView() {
  const { 
    currentDate, logs, deleteLog, activeModule, 
    viewMode, setViewMode, activePopover, setActivePopover, 
    activeModal, setActiveModal, selectedLogIds, setSelectedLogIds,
    isGhostMode, activities, renderTick
  } = useApp();

  // Initialize global shortcuts
  useKeyboardShortcuts();

  const days = viewMode === 'week' ? getWeekDays(currentDate) : [currentDate];

  const handleEditLog = useCallback((log, anchorRect, preferredType = 'summary') => {
    setActivePopover(null);
    if (preferredType === 'full') {
      setActiveModal({ log, isNew: false });
    } else {
      setActivePopover({ type: 'summary', data: { log, anchorRect } });
    }
  }, [setActiveModal, setActivePopover]);

  const handleNewLog = useCallback((dateStr, startTime, endTime, anchorRect, initialData = {}) => {
    setActivePopover({
      type: 'create',
      data: {
        date: dateStr,
        startTime: startTime,
        endTime: endTime || startTime,
        anchorRect,
        ...initialData
      }
    });
  }, [setActivePopover]);

  const handleOpenMoreOptions = (data) => {
    setActivePopover(null);
    setActiveModal({
      log: {
        ...data,
        activityName: data.activityName || '',
        subcategory: data.subcategory || '',
        notes: '',
        referenceLink: '',
        isRecurring: false,
        recurringType: 'none',
        isDeepWork: isDeepWork(data.activityName, activities)
      },
      isNew: true
    });
  };

  const hoveredSlotRef = useRef(null);

  const handleSelectLog = useCallback((id, e) => {
    if (e.metaKey || e.ctrlKey) {
      setSelectedLogIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedLogIds([id]);
    }
  }, [setSelectedLogIds]);
  // Framer Motion variants for view switching and date sliding
  const variants = {
    initial: (direction) => ({
      x: direction === 'left' ? 20 : direction === 'right' ? -20 : 0,
      opacity: 0,
      scale: 0.99
    }),
    enter: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    },
    exit: (direction) => ({
      x: direction === 'left' ? -20 : direction === 'right' ? 20 : 0,
      opacity: 0,
      scale: 0.99,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.1 }
      }
    })
  };

  const [direction, setDirection] = useState(null);
  const prevDateRef = useRef(currentDate);
  const prevViewModeRef = useRef(viewMode);

  useEffect(() => {
    if (viewMode !== prevViewModeRef.current) {
      setDirection('fade'); // Neutral fade for view mode change
    } else if (currentDate.getTime() > prevDateRef.current.getTime()) {
      setDirection('left');
    } else if (currentDate.getTime() < prevDateRef.current.getTime()) {
      setDirection('right');
    }
    prevDateRef.current = currentDate;
    prevViewModeRef.current = viewMode;
  }, [currentDate, viewMode]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      <AuthBanner />
      <GridHeader viewMode={viewMode} setViewMode={setViewMode} />
      <RelationshipBanner />

      {viewMode === 'month' ? (
        <MonthView />
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-transparent scrollbar-gutter-stable">
          <motion.div 
            key={currentDate.toISOString() + viewMode + renderTick}
              custom={direction}
              variants={variants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="flex w-full h-full"
              style={{ 
                height: 'calc(100vh - 120px)',
                minHeight: '400px'
              }}
            >
              <div 
                className="relative flex w-full" 
                style={{ 
                  height: `${GRID_HEIGHT + 40}px`,
                  minHeight: '904px',
                  paddingTop: '20px',
                  paddingBottom: '20px'
                }}
              >
                <div className="relative flex flex-1">
                  {/* Unified 37px Gutter: Hyper-Slim Neural Aquarium + Time Axis */}
                  <div className="w-[37px] shrink-0 relative z-40 border-r border-white/5 bg-[#0a0a0c]/10">
                    <WaterLane />
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <TimeColumn />
                    </div>
                    <div className="relative z-20">
                      <TaskTimelineOverlay />
                    </div>
                  </div>
                  <div className="flex flex-1">
                    {days.map(day => (
                      <DayColumn
                        key={day.toISOString()}
                        day={day}
                        onEditLog={handleEditLog}
                        onNewLog={handleNewLog}
                        hoveredSlotRef={hoveredSlotRef}
                        selectedLogIds={selectedLogIds}
                        onSelectLog={handleSelectLog}
                      />
                    ))}
                  </div>
                  <CurrentTimeIndicator />
                </div>
              </div>
            </motion.div>
        </div>
      )}

      {/* Popovers & Modals */}
      {activePopover?.type === 'create' && (
        <QuickCreatePopover
          data={activePopover.data}
          onClose={() => setActivePopover(null)}
          onMoreOptions={handleOpenMoreOptions}
        />
      )}

      {activePopover?.type === 'journal_quick' && (
        <div 
          className="fixed z-[1500]"
          style={{ 
            top: `${activePopover.data.anchorRect.bottom + 12}px`, 
            left: `${activePopover.data.anchorRect.left}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <JournalQuickWrite 
            date={activePopover.data.date} 
            onClose={() => setActivePopover(null)} 
          />
        </div>
      )}

      {activePopover?.type === 'summary' && (
        <EventPopover
          log={activePopover.data.log}
          anchorRect={activePopover.data.anchorRect}
          onEdit={handleEditLog}
          onClose={() => setActivePopover(null)}
        />
      )}

      {activeModal && !activeModal.type && (
        <EntryModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          log={activeModal.log}
          isNew={activeModal.isNew}
        />
      )}

      <FloatingActionBar />
    </div>
  );
}
