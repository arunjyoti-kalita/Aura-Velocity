import { addDays, format, differenceInDays } from 'date-fns';

/**
 * Calculates when a user will reach a specific hour milestone for an activity.
 * @param {Array} logs - All activity logs
 * @param {string} activityName - The name of the activity to project
 * @param {number} targetHours - The goal (default 1000 for mastery)
 * @returns {Object|null} Projection data
 */
export function calculateMasteryProjection(logs, activityName, targetHours = 1000) {
  const activityLogs = logs.filter(l => l.activityName === activityName);
  if (activityLogs.length < 5) return null; // Need enough data points

  // Calculate total hours to date
  const totalMins = activityLogs.reduce((acc, log) => {
    if (!log.startTime) return acc;
    const s = log.startTime.split(':').map(Number);
    const e = (log.endTime || log.startTime).split(':').map(Number);
    if (s.length < 2 || e.length < 2) return acc;
    let mins = (e[0] * 60 + e[1]) - (s[0] * 60 + s[1]);
    if (mins <= 0) mins += 1440;
    return acc + mins;
  }, 0);
  
  const totalHours = totalMins / 60;
  const remainingHours = targetHours - totalHours;
  
  if (remainingHours <= 0) return { reached: true };

  // Calculate velocity (hours per day since first log)
  const sortedLogs = [...activityLogs].filter(l => l.date).sort((a, b) => a.date.localeCompare(b.date));
  if (sortedLogs.length === 0) return null;
  
  const firstDate = new Date(sortedLogs[0].date);
  if (isNaN(firstDate.getTime())) return null;
  
  const lastDate = new Date();
  const daysDiff = Math.max(1, differenceInDays(lastDate, firstDate));
  
  const hoursPerDay = totalHours / daysDiff;
  
  if (hoursPerDay <= 0.1 || isNaN(hoursPerDay)) return null; // Too slow to project meaningfully

  const daysToMastery = Math.ceil(remainingHours / hoursPerDay);
  if (daysToMastery > 3650 || isNaN(daysToMastery)) return null; // Max 10 years projection

  const masteryDate = addDays(lastDate, daysToMastery);

  return {
    totalHours: Math.round(totalHours),
    remainingHours: Math.round(remainingHours),
    masteryDate,
    hoursPerDay: hoursPerDay.toFixed(2),
    daysToMastery
  };
}
