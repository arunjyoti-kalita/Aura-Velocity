import { format, addDays, isWeekend } from 'date-fns';
import { serverTimestamp, doc, writeBatch, collection } from 'firebase/firestore';
import { timeStrToMinutes, minutesToTimeStr } from './dateHelpers';

/**
 * Robust temporal processing engine.
 * Takes current logs and a proposed change, returns the new stable state 
 * and a list of modified logs that need Firestore sync.
 */
export function processTemporalState(proposedLog, currentLogs) {
  // 1. Filter out the log we are updating (if it exists) to avoid self-conflict
  const otherLogs = currentLogs.filter(l => l.id !== proposedLog.id);
  
  // 2. Separate logs of the same date
  const dayLogs = otherLogs.filter(l => l.date === proposedLog.date);
  const otherDayLogs = otherLogs.filter(l => l.date !== proposedLog.date);
  
  // 3. Add the proposed log to the day's collection
  const rawDay = [...dayLogs, proposedLog];
  
  // 4. Sort day logs chronologically
  const sorted = rawDay.sort((a, b) => {
    const aStart = timeStrToMinutes(a.startTime);
    const bStart = timeStrToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    // Tie-breaker: prefer the one we just touched to stay "on top" or stay as is
    if (a.id === proposedLog.id) return -1;
    if (b.id === proposedLog.id) return 1;
    return a.id.localeCompare(b.id);
  });
  
  // 5. Cascade exclusivity enforcement
  // We process from start to end. Each log pushes/trims the NEXT one.
  let processed = [];
  sorted.forEach(log => {
    if (processed.length === 0) {
      processed.push({ ...log });
      return;
    }
    
    const prev = processed[processed.length - 1];
    const prevEnd = timeStrToMinutes(prev.endTime || prev.startTime, true);
    const currStart = timeStrToMinutes(log.startTime);
    const currEnd = timeStrToMinutes(log.endTime || log.startTime, true);
    
    // If current starts before previous ends, we have a conflict
    if (currStart < prevEnd) {
      const duration = currEnd - currStart;
      
      // Case A: Current is completely swallowed by previous -> Push it forward
      // Case B: Current overlaps but ends after previous -> Trim its start
      // We choose to ALWAYS push forward to maintain duration if possible, 
      // unless it's a massive push, then we might trim. 
      // For this engine, we prioritize PUSHING to maintain "work blocks".
      
      const newStart = prevEnd;
      const newEnd = newStart + duration;
      
      processed.push({
        ...log,
        startTime: minutesToTimeStr(newStart),
        endTime: minutesToTimeStr(newEnd),
        isModified: true // Flag for Firestore sync
      });
    } else {
      processed.push({ ...log });
    }
  });
  
  // 6. Final validity check (prevent grid overflow)
  const MAX_MINS = 32 * 60; // 8:00 AM next day
  const validDay = processed.filter(l => {
    const start = timeStrToMinutes(l.startTime);
    return start < MAX_MINS;
  }).map(l => {
    const start = timeStrToMinutes(l.startTime);
    const end = timeStrToMinutes(l.endTime || l.startTime, true);
    if (end > MAX_MINS) {
      return { ...l, endTime: minutesToTimeStr(MAX_MINS), isModified: true };
    }
    return l;
  });
  
  const finalLogs = [...otherDayLogs, ...validDay];
  const affectedLogs = validDay.filter(l => l.isModified || l.id === proposedLog.id);
  
  return { finalLogs, affectedLogs };
}
