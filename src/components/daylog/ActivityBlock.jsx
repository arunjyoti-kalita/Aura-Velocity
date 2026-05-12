import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useApp } from "../../contexts/useApp";
import {
  timeToTop, timeToHeight, ROW_HEIGHT, GRID_HEIGHT, GRID_END_HOUR,
  timeStrToMinutes, minutesToTimeStr, formatDisplayTime, formatDisplayRange,
  checkOverlap, findAdjacentBoundary
} from '../../utils/dateHelpers';
import { Zap, User, AlertCircle } from 'lucide-react';
import { getEnergyLevel, calculateAlignmentScore } from '../../utils/circadian';
import { calculateMasteryProjection } from '../../utils/masteryUtils';
import { isDeepWork } from '../../utils/analysisHelpers';

export const ActivityBlock = memo(function ActivityBlock({ log, onEdit, isSelected, onSelect, styleOverride = {} }) {
  const { logs, activities, updateLog, activityFilter, clipboard, showToast, regretModel, relationships, chronotype, templates, isGhostMode, triggerMechanicalFeedback, setIsInteracting } = useApp();
  const activity = activities.find(a => a.name === log.activityName) || activities[0] || { name: 'Unknown', baseColor: '#555', lightColor: '#777' };

  const blockRef = useRef(null);
  const labelRef = useRef(null);
  const [isPulsing, setIsPulsing] = useState(log.isPasted);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isCopied = clipboard.some(c => c.id === log.id);
  const isConcentrated = log.activityName === 'Tech and AI' || log.activityName === 'PM Archives';
  const isDimmed = activityFilter && log.activityName !== activityFilter;

  useEffect(() => {
    if (log.isPasted) {
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [log.isPasted]);

  // ── POSITIONING & COLOR ──
  const bgColor = useMemo(() => {
    const base = activity.baseColor;
    if (!log.subcategory) return base;
    
    // Find index in predefined list for stable shifts
    let subIndex = activity.subcategories?.findIndex(s => 
      (typeof s === 'string' ? s : s.name) === log.subcategory
    ) ?? -1;
    
    // If not in predefined list, generate a deterministic index from the name
    if (subIndex === -1) {
      subIndex = log.subcategory.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }

    // Apply a subtle shade shift based on index
    // We use a wider range of shifts to ensure ad-hoc subcategories feel distinct
    const shifts = [0, -12, 12, -20, 20, -30, 30, -5, 5];
    const shift = shifts[subIndex % shifts.length] || 0;
    
    // Simple hex brightness shift
    const adjust = (color, amount) => {
      try {
        const hex = color.replace("#", "");
        const num = parseInt(hex, 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      } catch (e) {
        return color;
      }
    };

    return adjust(base, shift);
  }, [log.subcategory, activity]);

  const top = timeToTop(log.startTime);
  const height = timeToHeight(log.startTime, log.endTime || log.startTime);
  const timeRange = formatDisplayRange(log.startTime, log.endTime);
  const energyLevel = log.energyLevel ?? 50;
  
  // Calculate energy color
  let energyColor = "bg-blue-500/50";
  if (energyLevel > 80) energyColor = "bg-orange-500/80";
  else if (energyLevel > 40) energyColor = "bg-yellow-500/60";

  // Regret Score Badge logic
  const patterns = regretModel?.activityPatterns || {};
  const subPatterns = regretModel?.subcategoryPatterns || {};
  
  const pattern = patterns[log.activityName];
  const subKey = `${log.activityName}:${log.subcategory}`;
  const subPattern = log.subcategory ? subPatterns[subKey] : null;
  const targetPattern = (subPattern && subPattern.totalRated >= 3) ? subPattern : pattern;
  
  const actualRating = log.regretRating;
  const predictedRating = targetPattern?.averageRating;
  
  const displayRating = actualRating || predictedRating;
  const hasEnoughData = (regretModel?.modelConfidence >= 20 && predictedRating) || actualRating;

  let badgeColor = "bg-gray-400";
  let badgeLabel = "";
  if (displayRating >= 4.5) { badgeColor = "bg-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.6)]"; badgeLabel = "Peak Value"; }
  else if (displayRating >= 3.5) { badgeColor = "bg-[#86efac] shadow-[0_0_10px_rgba(134,239,172,0.4)]"; badgeLabel = "Worth it"; }
  else if (displayRating >= 2.5) { badgeColor = "bg-[#facc15] shadow-[0_0_10px_rgba(250,204,21,0.4)]"; badgeLabel = "Neutral"; }
  else if (displayRating > 0) { badgeColor = "bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.6)]"; badgeLabel = "Regret Warning"; }

  const tooltipText = actualRating 
    ? `Rated ${actualRating}/5` 
    : predictedRating 
      ? `Neural Prediction: ${Number(predictedRating).toFixed(1)}/5`
      : null;
  
  const interactions = relationships?.interactions || [];
  const people = relationships?.people || [];
  const interaction = interactions.find(i => i.logEntryId === log.id);
  const person = interaction ? people.find(p => p.id === interaction.personId) : null;

  // ── CLICK / DOUBLE-CLICK ──
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    // Only proceed if we weren't just dragging
    const rect = blockRef.current.getBoundingClientRect();
    onSelect(log.id, e);
    onEdit(log, rect, 'summary');
  }, [onSelect, onEdit, log]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    const rect = blockRef.current.getBoundingClientRect();
    onEdit(log, rect, 'full');
  }, [onEdit, log]);

  // ── DRAG ENGINE — Logical state as source of truth ──
  const handlePointerDownDrag = useCallback((e) => {
    // Strict guard to prevent dragging when a resize handle is targeted
    if (e.target.closest('.resize-handle')) return;
    
    e.preventDefault();
    e.stopPropagation();

    const el = blockRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    setIsInteracting(true);
    setIsDragging(true);
    triggerMechanicalFeedback('click');

    const container = el.closest('.overflow-y-auto');
    const dragStartY = e.clientY;
    const startScrollTop = container ? container.scrollTop : 0;
    
    // CALC FROM PROPS, NOT DOM
    const originalStartMins = timeStrToMinutes(log.startTime);
    const originalEndMins = timeStrToMinutes(log.endTime || log.startTime);
    const durationMins = originalEndMins - originalStartMins;
    const initialTop = timeToTop(log.startTime);

    let hasMoved = false;
    const DRAG_THRESHOLD = 3;
    let currentTargetDate = log.date;
    let finalStartMins = originalStartMins;
    let rafId = null;

    el.style.transition = 'none';
    el.style.zIndex = '1000';
    el.style.cursor = 'grabbing';
    // Sync starting position
    el.style.top = `${initialTop}px`;

    const onPointerMove = (moveEvt) => {
      const currentScrollTop = container ? container.scrollTop : 0;
      const dy = (moveEvt.clientY - dragStartY) + (currentScrollTop - startScrollTop);
      const dx = moveEvt.clientX - e.clientX;

      if (!hasMoved && Math.abs(dy) + Math.abs(dx) < DRAG_THRESHOLD) return;

      if (!hasMoved) {
        hasMoved = true;
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
        el.style.opacity = '0.9';
      }

      const minsDelta = (dy / ROW_HEIGHT) * 30;
      let newStartMins = originalStartMins + minsDelta;
      
      const minBound = 8 * 60;
      const maxBound = (GRID_END_HOUR * 60) - durationMins;
      newStartMins = Math.max(minBound, Math.min(maxBound, newStartMins));
      
      finalStartMins = newStartMins;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const topPx = ((newStartMins - originalStartMins) / 30) * ROW_HEIGHT;
        el.style.top = `${initialTop}px`;
        el.style.transform = `translateY(${topPx}px)`;

        if (labelRef.current) {
          const snappedStart = Math.round(newStartMins / 30) * 30;
          const snappedEnd = snappedStart + durationMins;
          labelRef.current.textContent = `${minutesToTimeStr(snappedStart)} → ${minutesToTimeStr(snappedEnd)}`;
        }

        // HEURISTIC COLUMN DETECTION (much faster than elementsFromPoint)
        const grid = document.querySelector('.grid-container');
        if (grid) {
          const gridRect = grid.getBoundingClientRect();
          const colWidth = gridRect.width / 7;
          const colIndex = Math.floor((moveEvt.clientX - gridRect.left) / colWidth);
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const date = grid.getAttribute('data-start-date'); // Should be provided by parent
          
          // For now, we'll stick to a slightly optimized elementsFromPoint 
          // or just assume the column doesn't change every single pixel move.
          if (!window._lastColCheck || Date.now() - window._lastColCheck > 50) {
            window._lastColCheck = Date.now();
            const els = document.elementsFromPoint(moveEvt.clientX, moveEvt.clientY);
            const colEl = els.find(element => element.classList.contains('day-column'));
            if (colEl) {
              const newDate = colEl.getAttribute('data-date');
              if (newDate && newDate !== currentTargetDate) {
                const oldHl = document.getElementById(`highlight-${currentTargetDate}`);
                if (oldHl) oldHl.style.opacity = '0';
                currentTargetDate = newDate;
              }
              const hl = document.getElementById(`highlight-${currentTargetDate}`);
              if (hl) {
                const snappedStart = Math.round(newStartMins / 30) * 30;
                const hlTop = timeToTop(minutesToTimeStr(snappedStart));
                hl.style.opacity = '1';
                hl.style.top = `${hlTop}px`;
                hl.style.height = `${timeToHeight(minutesToTimeStr(snappedStart), minutesToTimeStr(snappedStart + durationMins))}px`;
              }
            }
          }
        }
      });
    };

    const onPointerUp = (upEvt) => {
      if (rafId) cancelAnimationFrame(rafId);
      el.releasePointerCapture(upEvt.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDragging(false);
      setIsInteracting(false);
      
      // If we moved, we want to prevent the click handler from showing the popover immediately
      // We can do this by stopping propagation or using a temporary state.
      // But for now, let's just restore movement.
      if (hasMoved) {
        upEvt.stopPropagation();
      }
      triggerMechanicalFeedback('click');

      // We DO NOT clear top/transform/height here. 
      // React will overwrite them when the state update completes.
      // This prevents the "jump" during the gap between pointerUp and re-render.
      el.style.zIndex = '';
      el.style.cursor = '';

      const hl = document.getElementById(`highlight-${currentTargetDate}`);
      if (hl) hl.style.opacity = '0';
      if (labelRef.current) labelRef.current.textContent = '';

      if (!hasMoved) return;

      const snappedStart = Math.round(finalStartMins / 30) * 30;
      const snappedEnd = snappedStart + durationMins;
      const newStartTime = minutesToTimeStr(snappedStart);
      const newEndTime = minutesToTimeStr(snappedEnd);


      updateLog(log.id, {
        date: currentTargetDate,
        startTime: newStartTime,
        endTime: newEndTime
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [log, logs, updateLog]);

  // ── RESIZE ENGINE — Multi-frame anchor locking ──
  const handlePointerDownResize = useCallback((e, edge) => {
    e.preventDefault();
    e.stopPropagation();

    const handle = e.currentTarget;
    const block = blockRef.current;
    if (!block) return;
    setIsInteracting(true);
    handle.setPointerCapture(e.pointerId);
    triggerMechanicalFeedback('click');

    const container = block.closest('.overflow-y-auto');
    const resizeStartY = e.clientY;
    const startScrollTop = container ? container.scrollTop : 0;
    
    // ANCHOR TO LOGICAL STATE
    const originalStartMins = timeStrToMinutes(log.startTime);
    const originalEndMins = timeStrToMinutes(log.endTime || log.startTime);
    const initialTop = timeToTop(log.startTime);

    const boundary = findAdjacentBoundary(log.date, log.id, edge, logs);
    
    let finalStartMins = originalStartMins;
    let finalEndMins = originalEndMins;
    let rafId = null;

    block.style.transition = 'none';
    block.style.zIndex = '1000';
    // LOCK TOP IMMEDIATELY
    block.style.top = `${initialTop}px`;

    const onPointerMove = (moveEvt) => {
      const currentScrollTop = container ? container.scrollTop : 0;
      const deltaY = (moveEvt.clientY - resizeStartY) + (currentScrollTop - startScrollTop);
      const minsDelta = (deltaY / ROW_HEIGHT) * 30;

      if (edge === 'bottom') {
        let newEndMins = originalEndMins + minsDelta;
        if (newEndMins - originalStartMins < 15) newEndMins = originalStartMins + 15;
        if (boundary && newEndMins > boundary) newEndMins = boundary;
        const maxMins = (GRID_END_HOUR * 60);
        if (newEndMins > maxMins) newEndMins = maxMins;
        finalEndMins = newEndMins;
      } else {
        let newStartMins = originalStartMins + minsDelta;
        if (originalEndMins - newStartMins < 15) newStartMins = originalEndMins - 15;
        if (boundary && newStartMins < boundary) newStartMins = boundary;
        const minMins = 8 * 60;
        if (newStartMins < minMins) newStartMins = minMins;
        finalStartMins = newStartMins;
      }

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (edge === 'bottom') {
          const newHeight = ((finalEndMins - originalStartMins) / 30) * ROW_HEIGHT;
          // RE-ENFORCE TOP LOCK IN EVERY FRAME. 
          // This prevents React re-renders from ever overriding the manual top position.
          block.style.top = `${initialTop}px`;
          block.style.height = `${newHeight}px`;
          block.style.transform = ''; 
          
          const lbl = labelRef.current;
          if (lbl) {
            const snappedEnd = Math.round(finalEndMins / 30) * 30;
            lbl.textContent = minutesToTimeStr(snappedEnd);
          }
        } else {
          const newStartTimeStr = minutesToTimeStr(finalStartMins);
          const newTop = timeToTop(newStartTimeStr); 
          block.style.top = `${newTop}px`;
          const newHeight = ((originalEndMins - finalStartMins) / 30) * ROW_HEIGHT;
          block.style.height = `${newHeight}px`;
          block.style.transform = '';
          const lbl = labelRef.current;
          if (lbl) {
            const snappedStart = Math.round(finalStartMins / 30) * 30;
            lbl.textContent = minutesToTimeStr(snappedStart);
          }
        }
      });
    };

    const onPointerUp = (upEvt) => {
      if (rafId) cancelAnimationFrame(rafId);
      handle.releasePointerCapture(upEvt.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsInteracting(false);
      triggerMechanicalFeedback('click');

      // We DO NOT clear top/height here. 
      // React will overwrite them when the state update completes.
      block.style.zIndex = '';
      if (labelRef.current) labelRef.current.textContent = '';

      const snappedStart = Math.round(finalStartMins / 30) * 30;
      const snappedEnd = Math.round(finalEndMins / 30) * 30;
      const newStartTime = minutesToTimeStr(snappedStart);
      const newEndTime = minutesToTimeStr(snappedEnd);

      if (newStartTime === log.startTime && newEndTime === log.endTime) return;


      updateLog(log.id, { startTime: newStartTime, endTime: newEndTime });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [log, logs, updateLog]);

  // ── BIOLOGICAL ALIGNMENT ──
  const startHour = log.startTime && typeof log.startTime === 'string' ? parseInt(log.startTime.split(':')[0], 10) : 0;
  const currentEnergy = getEnergyLevel(isNaN(startHour) ? 0 : startHour, chronotype);
  const alignmentScore = calculateAlignmentScore(log.activityName || 'Extra', currentEnergy, activities);

  let alignmentColor = "text-gray-400";
  let alignmentLabel = "Neutral Alignment";
  if (alignmentScore >= 85) { alignmentColor = "text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"; alignmentLabel = "Peak Alignment"; }
  else if (alignmentScore >= 60) { alignmentColor = "text-blue-400"; alignmentLabel = "Good Alignment"; }
  else if (alignmentScore < 40) { alignmentColor = "text-red-400 animate-pulse"; alignmentLabel = "Biological Friction"; }

  const showTimeRange = height >= 10;
  const showSubcategory = height >= 20;

  // ── OPPORTUNITY COST (GHOST SHADOW) ──
  const isBoondoggle = log.activityName?.toLowerCase() === 'boondoggle';
  const displaced = useMemo(() => {
    if (!isBoondoggle || !templates || !templates[0] || !templates[0].logs) return null;
    const startMins = timeStrToMinutes(log.startTime);
    const endMins = timeStrToMinutes(log.endTime || log.startTime);
    return (templates[0].logs || []).find(tLog => {
      if (!tLog || !tLog.startTime || !tLog.endTime) return false;
      const tStart = timeStrToMinutes(tLog.startTime);
      const tEnd = timeStrToMinutes(tLog.endTime);
      return (startMins < tEnd && endMins > tStart) && tLog.activityName !== 'Boondoggle';
    });
  }, [isBoondoggle, log.startTime, log.endTime, templates]);

  // ── MASTERY PROJECTION ──
  const mastery = useMemo(() => {
    if (!['Tech and AI', 'Tool', 'PM_theory'].includes(log.activityName)) return null;
    return calculateMasteryProjection(logs, log.activityName);
  }, [log.activityName, logs]);
  
  const durationMinutes = (timeStrToMinutes(log.endTime || log.startTime) - timeStrToMinutes(log.startTime) + 1440) % 1440;
  const durationHours = parseFloat((durationMinutes / 60).toFixed(2));
  const durationStr = `${durationHours}h`;

  return (
    <div
      ref={blockRef}
      onPointerDown={handlePointerDownDrag}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "absolute rounded-lg overflow-hidden",
        "flex flex-col justify-center items-center text-center px-1 group activity-block select-none",
        "transition-[opacity,transform,background-color,box-shadow,top,height] duration-300",
        "cursor-pointer active:cursor-grabbing block-kinetic",
        isDragging && "block-drag-tilt z-[1000]",
        isSelected && "animate-vibrate",
        log.isRecurring && "border-dashed border-2 border-white/20",
        isSelected || isHovered ? "z-30" : "z-10",
        isPulsing && "animate-pulse-accent",
        isCopied && "border-dashed border-2 border-orange-500/50",
        isDimmed && "opacity-20 grayscale",
        isBoondoggle && !isSelected && !isHovered && "animate-shiver"
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: '1px',
        right: '1px',
        width: 'calc(100% - 2px)',
        // ── BALANCED PERFORMANCE ──
        // Keep colors distinct (idle), use rich effects (interaction)
        backgroundColor: `${bgColor}33`,
        background: `linear-gradient(135deg, ${bgColor}44 0%, ${bgColor}11 100%)`,
        backdropFilter: (isHovered || isSelected) ? 'blur(8px) saturate(180%)' : 'none',
        WebkitBackdropFilter: (isHovered || isSelected) ? 'blur(8px) saturate(180%)' : 'none',
        
        willChange: 'transform, top, height, opacity',
        contain: 'layout style',
        boxShadow: isSelected
          ? `0 20px 45px rgba(0,0,0,0.7), 0 0 35px ${activity.baseColor}, inset 0 0 0 2.5px ${activity.baseColor}`
          : isHovered 
            ? `0 15px 35px rgba(0,0,0,0.5), 0 0 40px ${activity.baseColor}bb, inset 0 1px 1px rgba(255,255,255,0.4)` 
            : `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.2)`,
        border: `1px solid ${activity.baseColor}${isHovered || isSelected ? '88' : '33'}`,
        ...styleOverride
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Top Resize Handle */}
      <div
        className="resize-handle absolute top-0 left-0 right-0 h-2.5 cursor-ns-resize z-50 opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(e) => handlePointerDownResize(e, 'top')}
      />

      {/* Ghost Shadow (Displaced Intent) */}
      {isBoondoggle && displaced && (
        <div 
          className="absolute inset-0 -z-10 opacity-40 blur-[2px] animate-shiver pointer-events-none"
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.05)',
            transform: 'translate(-8px, -8px)',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: 'inherit'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 whitespace-nowrap overflow-hidden">
              Sacrificed: {displaced?.activityName || 'Ideal Flow'}
            </span>
          </div>
        </div>
      )}

      {/* Left Accent Bar - Pure Identity */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ backgroundColor: activity.baseColor }}
      />

      <div className="pointer-events-none z-10 w-full h-full">
        {/* Circadian/Energy Indicator */}
        {height >= 15 && (
          <div className="absolute right-0 top-0 bottom-0 w-1 flex flex-col justify-end opacity-60">
            <div 
              className={clsx(
                "w-full transition-all duration-700",
                currentEnergy > 80 ? "bg-accent" : currentEnergy > 50 ? "bg-emerald-400" : currentEnergy > 30 ? "bg-amber-400" : "bg-rose-400"
              )}
              style={{ height: `${currentEnergy}%` }}
            />
          </div>
        )}

        {/* Live drag/resize label */}
        <span
          ref={labelRef}
          className="font-heading text-[7px] font-black text-white bg-black/40 px-1 rounded tracking-tighter empty:hidden absolute top-1 left-1"
        />

        <div className="flex flex-col w-full h-full relative px-2 py-0 items-center justify-center overflow-hidden gap-0.5">
          {height >= 30 ? (
            /* Premium Multi-line Layout (> 45 mins) */
            <>
              <div className={clsx(
                "font-black text-white tracking-tight leading-tight text-shadow-glow truncate w-full px-1",
                height < 50 ? "text-[9px]" : "text-[11px]"
              )}>
                {activity.name}
              </div>
              <div className="text-[8.5px] font-bold text-white/70 tabular-nums leading-none">
                {log.startTime} — {log.endTime}
              </div>
              {log.subcategory && height > 50 && (
                <div 
                  className="text-[10px] font-black italic mt-0.5 tracking-tight truncate w-full"
                  style={{ color: activity.lightColor || activity.baseColor }}
                >
                  {log.subcategory}
                </div>
              )}
            </>
          ) : (
            /* Adaptive Dense Layout (<= 45 mins) */
            <div className={clsx(
              "font-black text-white tracking-tight text-center w-full truncate whitespace-nowrap leading-tight text-shadow-glow px-1",
              height < 20 ? "text-[7.5px]" : "text-[8.5px]"
            )}>
              {activity.name}
              {log.subcategory && (
                <span 
                  className="font-black text-[0.9em]"
                  style={{ color: activity.lightColor || activity.baseColor }}
                > : {log.subcategory}</span>
              )}
            </div>
          )}

          {/* Priority 4: Notes (Visible if height > 120px) */}
          {height >= 120 && log.notes && (
            <div className="w-full mt-2 pt-1 border-t border-black/10">
              <p className="text-[7px] text-black/50 text-center leading-tight font-bold italic line-clamp-2 px-1">
                {log.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Regret Score Badge — only if height > 35 */}
      {hasEnoughData && height > 35 && (
        <div 
          className="absolute top-1 left-1.5 z-20 group/badge"
          title={tooltipText}
        >
          <div className={clsx("w-1.5 h-1.5 rounded-full", badgeColor)} />
          <div className="absolute left-3 top-[-4px] bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black text-white opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {tooltipText}
          </div>
        </div>
      )}
      
      {/* Interaction Indicator — only if height > 35 */}
      {interaction && height > 35 && (
        <div className="absolute top-1 right-1.5 z-20 group/interaction" title={`Contact with ${person?.name || 'Unknown'}`}>
          <User size={10} className="text-accent shadow-[0_0_8px_rgba(var(--color-accent),0.4)]" />
        </div>
      )}
 
      {/* Bio Alignment Indicator — only if height > 35 */}
      {height > 35 && (
        <div 
          className="absolute bottom-1 right-1.5 z-20 group/bio" 
          title={`${alignmentLabel} (${Math.round(alignmentScore)}%)`}
        >
          {alignmentScore < 40 ? <AlertCircle size={10} className={alignmentColor} /> : <Zap size={10} className={alignmentColor} />}
          <div className="absolute right-3 bottom-0 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black text-white opacity-0 group-hover/bio:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {alignmentLabel} ({Math.round(alignmentScore)}%)
          </div>
        </div>
      )}

      {/* Mastery Projection HUD */}
      {mastery && isHovered && (
        <div className="absolute top-0 left-full ml-2 z-[100] bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 w-48 shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-accent/20 rounded-lg text-accent">
              <Zap size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Mastery Path</span>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Projected Mastery</p>
            <p className="text-sm font-black text-white">{format(mastery.masteryDate, 'MMMM yyyy')}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">
              <span>Progress</span>
              <span>{mastery.totalHours} / 1000h</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent" 
                style={{ width: `${(mastery.totalHours / 1000) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[8px] text-accent/60 font-medium">
              At current velocity of {mastery.hoursPerDay}h / day
            </p>
          </div>
        </div>
      )}

      {/* Bottom Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize z-50 opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(e) => handlePointerDownResize(e, 'bottom')}
      />
    </div>
  );
});

