import { useEffect, useCallback } from 'react';
import { useApp } from "../contexts/useApp";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';

export function useKeyboardShortcuts() {
  const { 
    currentDate, setCurrentDate, goToToday,
    viewMode, setViewMode,
    isGhostMode, setIsGhostMode,
    selectedLogIds, setSelectedLogIds, selectAll,
    copySelection, cutSelection, pasteSelection, deleteSelection, moveSelection, terminateSelection,
    undo, redo,
    activeModal, setActiveModal, 
    activePopover, setActivePopover,
    isInteracting,
    clipboard, setClipboard,
    setIsGhostSetupOpen,
    showToast
  } = useApp();

  const handleKeyDown = useCallback((e) => {
    // 1. "/" (Forward Slash) - Protocol Guide (Always works)
    if (e.key === '/') {
      e.preventDefault();
      setActiveModal({ type: 'shortcuts' });
      return;
    }

    // Exclusion Logic
    const isTyping = e.target.tagName === 'INPUT' || 
                     e.target.tagName === 'TEXTAREA' || 
                     e.target.isContentEditable;
    
    const isModalOpen = !!activeModal && activeModal.type !== 'shortcuts';
    const isPopoverOpen = !!activePopover;
    
    // Special case: Delete/Backspace should work if it's just a summary popover (EventPopover)
    const isDeletableContext = isPopoverOpen && activePopover.type === 'summary';

    if (isTyping || (isModalOpen && !isDeletableContext) || (isPopoverOpen && !isDeletableContext)) {
      if (e.key === 'Escape') {
        // Hierarchical Clear inside typing/modal
        if (isTyping) { e.target.blur(); return; }
        if (isModalOpen) { setActiveModal(null); return; }
        if (isPopoverOpen) { setActivePopover(null); return; }
      }
      return;
    }

    const isMod = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    // 2. ESC - Hyper-Clear
    if (e.key === 'Escape') {
      if (activeModal) { setActiveModal(null); return; }
      if (activePopover) { setActivePopover(null); return; }
      if (selectedLogIds.length > 0) { setSelectedLogIds([]); return; }
      if (clipboard.length > 0) {
        setClipboard([]);
        showToast("Clipboard cleared");
        return;
      }
      if (isGhostMode) { setIsGhostMode(false); return; }
      return;
    }

    // 3. Logic & History
    if (isMod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (isShift) redo();
      else undo();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedLogIds.length > 0) {
        e.preventDefault();
        deleteSelection();
      }
      return;
    }

    if (e.key.toLowerCase() === 'x' && !isMod && !isShift) {
      if (selectedLogIds.length > 0) {
        e.preventDefault();
        terminateSelection();
      }
      return;
    }

    // 4. Flow Control
    if (isMod && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copySelection();
      return;
    }
    if (isMod && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      cutSelection();
      return;
    }
    if (isMod && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteSelection(format(currentDate, 'yyyy-MM-dd'));
      return;
    }

    if (isShift && e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-30);
      return;
    }
    if (isShift && e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(30);
      return;
    }

    // 5. Navigation
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (viewMode === 'day') setCurrentDate(prev => subDays(prev, 1));
      else if (viewMode === 'week') setCurrentDate(prev => subWeeks(prev, 1));
      else if (viewMode === 'month') setCurrentDate(prev => subMonths(prev, 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (viewMode === 'day') setCurrentDate(prev => addDays(prev, 1));
      else if (viewMode === 'week') setCurrentDate(prev => addWeeks(prev, 1));
      else if (viewMode === 'month') setCurrentDate(prev => addMonths(prev, 1));
      return;
    }
    if (e.key.toLowerCase() === 't') {
      const wasToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      goToToday();
      if (!wasToday) showToast("Snapped to Today");
      return;
    }
    if (e.key.toLowerCase() === 'v') {
      setViewMode(prev => prev === 'day' ? 'week' : 'day');
      return;
    }

    // 6. Interface
    if (isMod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAll();
      return;
    }
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes() < 30 ? '00' : '30';
      setActiveModal({
        type: 'entry',
        log: {
          activityName: '',
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime: `${hours}:${minutes}`,
          endTime: minutes === '00' ? `${hours}:30` : `${(parseInt(hours) + 1).toString().padStart(2, '0')}:00`
        },
        isNew: true
      });
      return;
    }

    // 7. Ghost Mode
    if (e.key.toLowerCase() === 'g') {
      setIsGhostMode(prev => {
        const next = !prev;
        return next;
      });
      return;
    }

    // 8. Copilot
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setActiveModal({ type: 'copilot' });
      return;
    }

  }, [
    currentDate, setCurrentDate, goToToday, 
    viewMode, setViewMode, 
    isGhostMode, setIsGhostMode,
    selectedLogIds, setSelectedLogIds, selectAll,
    copySelection, cutSelection, pasteSelection, deleteSelection, moveSelection, terminateSelection,
    undo, redo,
    activeModal, setActiveModal,
    activePopover, setActivePopover,
    isInteracting,
    clipboard, setClipboard,
    setIsGhostSetupOpen,
    showToast
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
