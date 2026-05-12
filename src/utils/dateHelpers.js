import { startOfWeek, addDays, format } from 'date-fns';

// ============================================================
// GRID CONSTANTS — Single source of truth for ALL positioning
// ============================================================
export const ROW_HEIGHT = 22;                       // px per 30-min slot (1 hour = 44px)
export const GRID_START_HOUR = 8;                   // 8:00 AM = pixel 0
export const GRID_START_MINUTES = GRID_START_HOUR * 60; // 480
export const GRID_END_HOUR = 32;                    // 8:00 AM next day (= 32 in grid coords)
export const GRID_TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * 2; // 48 slots
export const GRID_HEIGHT = GRID_TOTAL_SLOTS * ROW_HEIGHT; // 864px (Total 24h)

// ============================================================
// TIME ↔ PIXEL CONVERSION — The two formulas, used everywhere
// ============================================================

/**
 * Convert a 24h "HH:mm" time string to a pixel offset from the top of the grid.
 * Formula: topOffset = ((hour * 60 + minute) - 480) / 30 * 20
 * 
 * For times past midnight (e.g. 1:00 AM), we treat them as hour 25.
 */
export function timeToTop(timeStr24) {
  const totalMins = timeStrToMinutes(timeStr24);
  return ((totalMins - GRID_START_MINUTES) / 30) * ROW_HEIGHT;
}

/**
 * Convert two 24h "HH:mm" strings into a pixel height.
 * Formula: blockHeight = ((endH*60+endM) - (startH*60+startM)) / 30 * 20
 */
export function timeToHeight(startStr24, endStr24) {
  const startMins = timeStrToMinutes(startStr24);
  const endMins = timeStrToMinutes(endStr24, true);
  const diff = endMins - startMins;
  // Allow minimum height for 15-minute blocks (9px).
  return Math.max(9, (diff / 30) * ROW_HEIGHT);
}

/**
 * Convert a pixel offset from grid top back to a "HH:mm" 24h string.
 * Inverse of timeToTop.
 */
export function pixelToTime(px) {
  const totalMins = Math.round((px / ROW_HEIGHT) * 30) + GRID_START_MINUTES;
  return minutesToTimeStr(totalMins);
}

/**
 * Snap a pixel value to the nearest ROW_HEIGHT (20px = 30 min) boundary.
 */
export function snapToSlot(px) {
  const slotSize = ROW_HEIGHT / 2; // 15-minute precision
  return Math.round(px / slotSize) * slotSize;
}

/**
 * Snap a pixel value to the nearest ROW_HEIGHT boundary, returning the time.
 */
export function snapPixelToTime(px) {
  return pixelToTime(snapToSlot(px));
}

// ============================================================
// TIME STRING HELPERS — Work with raw "HH:mm" 24h strings
// ============================================================

/**
 * Parse "HH:mm" or "H:mm AM/PM" into total minutes from midnight.
 * Times before GRID_START_HOUR (e.g. 1:00 AM) are treated as next-day (+ 24*60).
 */
export function timeStrToMinutes(timeStr, isEnd = false) {
  if (!timeStr) return GRID_START_MINUTES;

  let hours = 0;
  let minutes = 0;

  const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  } else {
    const parts = timeStr.split(':').map(Number);
    hours = parts[0] || 0;
    minutes = parts[1] || 0;
  }

  // Times before grid start (midnight to 7:59 AM) are next-day
  // Also treat 08:00 as next-day ONLY if it's specifically an end time
  if (hours < GRID_START_HOUR || (isEnd && hours === GRID_START_HOUR && minutes === 0)) {
    hours += 24;
  }

  return hours * 60 + minutes;
}

/**
 * Convert total minutes (from midnight, possibly > 24*60) to "HH:mm" 24h string.
 */
export function minutesToTimeStr(totalMins) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Add minutes to a "HH:mm" time string, return new "HH:mm".
 */
export function addMinutesToTime(timeStr24, minutesToAdd) {
  const totalMins = timeStrToMinutes(timeStr24) + minutesToAdd;
  return minutesToTimeStr(totalMins);
}

// ============================================================
// DISPLAY FORMATTING — For UI labels
// ============================================================

/**
 * "17:00" → "5:00pm"
 */
export function formatDisplayTime(timeStr24) {
  if (!timeStr24 || typeof timeStr24 !== 'string' || !timeStr24.includes(':')) return '';
  try {
    const parts = timeStr24.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return '';
    const h24 = parts[0];
    const m = parts[1];
    const ampm = h24 >= 12 ? 'pm' : 'am';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
  } catch (e) {
    return '';
  }
}

/**
 * "14:30", "15:37" → "2:30 – 3:37pm"
 */
export function formatDisplayRange(startTime24, endTime24) {
  if (!startTime24 || !endTime24 || typeof startTime24 !== 'string' || typeof endTime24 !== 'string') return '';
  if (!startTime24.includes(':') || !endTime24.includes(':')) return '';
  
  try {
    const sParts = startTime24.split(':').map(Number);
    const eParts = endTime24.split(':').map(Number);
    
    if (sParts.length < 2 || eParts.length < 2 || isNaN(sParts[0]) || isNaN(eParts[0])) return '';
    
    const sh = sParts[0];
    const sm = sParts[1];
    const eh = eParts[0];
    const em = eParts[1];

  const startAmpm = sh >= 12 ? 'pm' : 'am';
  const endAmpm = eh >= 12 ? 'pm' : 'am';

  let sh12 = sh % 12; if (sh12 === 0) sh12 = 12;
  let eh12 = eh % 12; if (eh12 === 0) eh12 = 12;

  const startStr = `${sh12}:${sm.toString().padStart(2, '0')}`;
  const endStr = `${eh12}:${em.toString().padStart(2, '0')}${endAmpm}`;

    if (startAmpm !== endAmpm) {
      return `${startStr}${startAmpm} – ${endStr}`;
    }
    return `${startStr} – ${endStr}`;
  } catch (e) {
    return '';
  }
}

/**
 * Generates 12h AM/PM labels for the Y-axis: "8 AM", "9 AM", ..., "1 AM"
 */
export function generateTimeLabels() {
  const labels = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    const hour24 = h % 24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    let h12 = hour24 % 12;
    if (h12 === 0) h12 = 12;
    labels.push(`${h12} ${ampm}`);
  }
  return labels;
}

// ============================================================
// WEEK HELPERS
// ============================================================

/**
 * Returns the "Active Grid Date" string (yyyy-MM-dd).
 * Since the dashboard day starts at 8:00 AM, any time before 8 AM 
 * is considered part of the "Previous" calendar day.
 */
export function getGridDate(date = new Date()) {
  const h = date.getHours();
  const target = h < 8 ? addDays(date, -1) : date;
  return format(target, 'yyyy-MM-dd');
}

export function getWeekDays(currentDate) {
  const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday to Saturday
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

// ============================================================
// OVERLAP DETECTION — Pure function, no Firestore
// ============================================================

/**
 * Check if a proposed time range overlaps with any existing log on the same date.
 * Returns the first conflicting log, or null if no overlap.
 */
export function checkOverlap(date, startTime, endTime, excludeId, allLogs) {
  const newStart = timeStrToMinutes(startTime);
  const newEnd = timeStrToMinutes(endTime);

  const dayLogs = allLogs.filter(l => l.date === date && l.id !== excludeId);

  for (const log of dayLogs) {
    const lStart = timeStrToMinutes(log.startTime);
    const lEnd = timeStrToMinutes(log.endTime || log.startTime);

    if (newStart < lEnd && newEnd > lStart) {
      return log; // overlap found
    }
  }
  return null; // no overlap
}

/**
 * Find the nearest boundary (end of previous block, start of next block)
 * that limits a resize operation.
 */
export function findAdjacentBoundary(date, currentId, edge, allLogs) {
  const dayLogs = allLogs.filter(l => l.date === date && l.id !== currentId);
  const currentLog = allLogs.find(l => l.id === currentId);
  if (!currentLog) return null;

  const currentStart = timeStrToMinutes(currentLog.startTime);
  const currentEnd = timeStrToMinutes(currentLog.endTime);

  if (edge === 'top') {
    // Find the closest block ending before our start
    let closest = GRID_START_MINUTES;
    dayLogs.forEach(l => {
      const lEnd = timeStrToMinutes(l.endTime);
      const lStart = timeStrToMinutes(l.startTime);
      if (lEnd <= currentStart && lEnd > closest) {
        closest = lEnd;
      }
      // Also prevent crossing INTO a block above
      if (lStart < currentStart && lEnd > currentStart) {
        closest = Math.max(closest, lEnd);
      }
    });
    return closest;
  } else {
    // Find the closest block starting after our end
    let closest = GRID_START_MINUTES + GRID_TOTAL_SLOTS * 30;
    dayLogs.forEach(l => {
      const lStart = timeStrToMinutes(l.startTime);
      if (lStart >= currentEnd && lStart < closest) {
        closest = lStart;
      }
    });
    return closest;
  }
}

/**
 * Exclusivity adjustments — trims or removes overlapping logs.
 */
export function getExclusivityAdjustments(targetDate, newStartTime, newEndTime, logId, allLogs) {
  const newStart = timeStrToMinutes(newStartTime);
  const newEnd = timeStrToMinutes(newEndTime);
  const dayLogs = allLogs.filter(l => l.date === targetDate && l.id !== logId);
  const adjustments = { updates: [], deletes: [] };

  dayLogs.forEach(l => {
    const lStart = timeStrToMinutes(l.startTime);
    const lEnd = timeStrToMinutes(l.endTime || l.startTime);

    if (lStart >= newStart && lEnd <= newEnd) {
      adjustments.deletes.push(l.id);
    } else if (newEnd > lStart && newEnd < lEnd) {
      adjustments.updates.push({ id: l.id, updates: { startTime: minutesToTimeStr(newEnd) } });
    } else if (newStart < lEnd && newStart > lStart) {
      adjustments.updates.push({ id: l.id, updates: { endTime: minutesToTimeStr(newStart) } });
    }
  });

  return adjustments;
}
