import { memo, useMemo, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { format, isToday } from 'date-fns';
import { useApp } from "../../contexts/useApp";
import { motion } from 'framer-motion';
import { ActivityBlock } from './ActivityBlock';
import { EnergyWave } from './EnergyWave';
import {
  ROW_HEIGHT, GRID_TOTAL_SLOTS, GRID_HEIGHT, GRID_START_MINUTES,
  pixelToTime, snapToSlot, minutesToTimeStr, formatDisplayTime, timeToTop, timeToHeight,
  checkOverlap, timeStrToMinutes
} from '../../utils/dateHelpers';
import { mechanicalAudio } from '../../utils/mechanicalAudio';

export function DayColumn({
  day,
  onEditLog,
  onNewLog,
  hoveredSlotRef,
  selectedLogIds,
  onSelectLog
}) {
  const { 
    logs, activities, updateLog, deleteLog, 
    templates, setFocusedDate, currentDate,
    isGhostMode, ghostTemplate, setIsInteracting,
    addLog, showToast, isDeepWork
  } = useApp();
  const dateStr = format(day, 'yyyy-MM-dd');
  const dayLogs = logs.filter(log => log.date === dateStr);

  // ── CONSISTENCY SCORE ──
  const consistencyScore = useMemo(() => {
    if (!isGhostMode || !ghostTemplate || ghostTemplate.length === 0 || format(day, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd')) return null;
    let score = 0;
    ghostTemplate.forEach(g => {
      const gStart = g.start_offset || 0;
      const match = dayLogs.find(l => 
        l.activityName === g.activityName && 
        Math.abs(timeStrToMinutes(l.startTime) - gStart) < 30 // within 30 mins
      );
      if (match) score += 1;
    });
    return Math.round((score / ghostTemplate.length) * 100);
  }, [isGhostMode, ghostTemplate, dayLogs]);
  const columnRef = useRef(null);
  const phantomRef = useRef(null);

  // ── GRID LINES — 37 slots × 32px each ──
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_TOTAL_SLOTS; i++) {
      lines.push(
        <div
          key={i}
          className="w-full border-b absolute left-0 right-0 pointer-events-none"
          style={{ 
            top: `${(i * ROW_HEIGHT)}px`, 
            height: 0,
            borderColor: i % 2 === 0 ? 'var(--grid-line)' : 'var(--grid-line-subtle)'
          }}
        />
      );
    }
    return lines;
  }, []);

  // ── CLICK-DRAG CREATION (Google Calendar style) ──
  const handlePointerDown = useCallback((e) => {
    setFocusedDate(day);
    if (e.target !== e.currentTarget) return;
    e.preventDefault();

    const container = e.currentTarget;
    container.setPointerCapture(e.pointerId);
    setIsInteracting(true);

    const scrollContainer = container.closest('.overflow-y-auto, .overflow-y-scroll');
    const startScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const rect = container.getBoundingClientRect();
    const localStartY = e.clientY - rect.top;
    const snappedStartPx = snapToSlot(localStartY);
    const startTime = pixelToTime(snappedStartPx);

    let hasMoved = false;
    let endTime = startTime;
    let rafId = null;

    // Create phantom block
    const phantom = document.createElement('div');
    phantom.className = 'absolute left-[2px] right-[2px] bg-accent/30 border border-accent/60 rounded-lg pointer-events-none z-30 flex items-center justify-center';
    phantom.style.top = `${snappedStartPx}px`;
    phantom.style.height = `${ROW_HEIGHT}px`;
    phantom.style.width = 'calc(100% - 4px)';

    const label = document.createElement('span');
    label.className = 'text-[10px] font-mono font-bold text-accent';
    label.textContent = `${formatDisplayTime(startTime)} – ${formatDisplayTime(startTime)}`;
    phantom.appendChild(label);
    container.appendChild(phantom);

    const onPointerMove = (moveEvt) => {
      const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const scrollDelta = currentScrollTop - startScrollTop;
      const currentY = (moveEvt.clientY - rect.top) + scrollDelta;
      
      hasMoved = true;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const height = Math.max(ROW_HEIGHT / 2, currentY - snappedStartPx);
        phantom.style.height = `${height}px`;

        const snappedEndPx = snapToSlot(snappedStartPx + height);
        const snappedEndTime = pixelToTime(snappedEndPx);
        
        // Auto-trim to existing block boundary
        let actualEndMins = timeStrToMinutes(snappedEndTime);
        const startMins = timeStrToMinutes(startTime);
        for (const log of dayLogs) {
          const lStart = timeStrToMinutes(log.startTime);
          if (lStart > startMins && lStart < actualEndMins) {
            actualEndMins = lStart;
          }
        }
        endTime = minutesToTimeStr(actualEndMins);
        label.textContent = `${formatDisplayTime(startTime)} – ${formatDisplayTime(endTime)}`;
      });
    };

    const onPointerUp = (upEvt) => {
      if (rafId) cancelAnimationFrame(rafId);
      container.releasePointerCapture(upEvt.pointerId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      setIsInteracting(false);
      
      const anchorRect = phantom.getBoundingClientRect();
      phantom.remove();

      if (!hasMoved) {
        onNewLog(dateStr, startTime, null, anchorRect);
      } else {
        onNewLog(dateStr, startTime, endTime, anchorRect);
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
  }, [dateStr, dayLogs, onNewLog]);

  // ── MOUSE MOVE for keyboard shortcut context ──
  const handleMouseMove = useCallback((e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snappedTime = pixelToTime(snapToSlot(y));
    if (hoveredSlotRef) hoveredSlotRef.current = { dateStr, startTime: snappedTime };
  }, [dateStr, hoveredSlotRef]);

  return (
    <motion.div
      ref={columnRef}
      className={clsx(
        "flex-1 relative border-r border-white/5 min-w-[120px] day-column",
        isToday(day) ? "bg-white/5" : "hover:bg-white/[0.02]"
      )}
      data-date={dateStr}
      style={{ 
        height: `${GRID_HEIGHT}px`,
        willChange: 'transform, opacity'
      }}
    >
      {gridLines}

      {/* Activity blocks container */}
      <div
        className="absolute inset-0 cursor-crosshair"
        onPointerDown={handlePointerDown}
        onMouseMove={handleMouseMove}
      >
        {/* Ghost Blocks (Watermark / Ideal Day) */}
        {(ghostTemplate || []).map(block => {
          // RESTORED focused-day-only restriction as per user request
          if (format(day, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd')) return null;
          const blockStart = block.start_offset || 0;
          const blockEnd = blockStart + (block.duration_mins || 0);
          
          const top = (((blockStart - GRID_START_MINUTES) / 30) * ROW_HEIGHT);
          const height = ((block.duration_mins || 0) / 30) * ROW_HEIGHT;
          const isProminent = isGhostMode;
          
          if (height <= 0) return null;

          // HIDE IF OVERLAPPED: If a real activity block is already in this slot, hide the ghost.
          const hasOverlap = dayLogs.some(log => {
            const lStart = timeStrToMinutes(log.startTime);
            const lEnd = timeStrToMinutes(log.endTime || log.startTime, true);
            return (blockStart < lEnd && blockEnd > lStart);
          });

          if (hasOverlap) return null;

          const handleDoubleClick = async (e) => {
            e.stopPropagation();
            const startTime = minutesToTimeStr(blockStart);
            const endTime = minutesToTimeStr(blockEnd);
            
            const newLog = {
              date: dateStr,
              startTime,
              endTime,
              activityName: block.activityName,
              subcategory: block.subcategory || '',
              notes: '',
              referenceLink: '',
              isRecurring: false,
              isDeepWork: isDeepWork(block.activityName, activities)
            };

            await addLog(newLog);
            showToast(`Committed: ${block.activityName}`, "success");
            mechanicalAudio.play('success');
          };

          return (
            <div
              key={`ghost-${block.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={handleDoubleClick}
              className={clsx(
                "absolute left-[6px] right-[6px] rounded-2xl flex flex-col justify-center items-center overflow-hidden transition-all duration-500 group",
                "border border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/20",
                isProminent ? "opacity-100 pointer-events-auto cursor-pointer" : "opacity-0 pointer-events-none"
              )}
              style={{
                top: `${top}px`,
                height: `${height}px`,
              }}
              title={`Double-click to commit ${block.activityName}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-50" />
              <span className={clsx(
                "relative z-10 font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/60 transition-colors px-4 text-center italic",
                height < 22 ? "text-[6px]" : "text-[8px]"
              )}>
                {block.activityName}
              </span>
            </div>
          );
        })}
        {/* Drag highlight target */}
        <div
          id={`highlight-${dateStr}`}
          className="absolute left-0 right-0 bg-[#00f2ea]/30 shadow-[0_0_12px_#00f2ea] pointer-events-none opacity-0 transition-opacity duration-150 z-20 rounded-lg"
        />


        {/* Biological Energy Layer */}
        <EnergyWave />

        {/* Consistency Score Badge */}
        {consistencyScore !== null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
            <span className="text-[7px] font-semibold uppercase tracking-widest text-accent/80">
              {consistencyScore}% Flow Match
            </span>
          </div>
        )}


        {/* Actual Logs */}
        {dayLogs.map(log => (
          <ActivityBlock
            key={log.id}
            log={log}
            onEdit={onEditLog}
            isSelected={selectedLogIds.includes(log.id)}
            onSelect={onSelectLog}
          />
        ))}
      </div>
    </motion.div>
  );
}
