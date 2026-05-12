import { timeStrToMinutes } from './dateHelpers';

/**
 * Group by utility
 */
const groupBy = (array, keyFn) => {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

/**
 * Calculate difference in days between two dates
 */
const getDaysDiff = (d1, d2) => {
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Average utility
 */
const average = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

/**
 * Check if the frequency of an activity is declining over time
 * Strategy: Compare the gap of the first half vs the second half of occurrences
 */
const isFrequencyDeclining = (pattern) => {
  if (pattern.entries.length < 6) return false;
  
  const entries = [...pattern.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const midpoint = Math.floor(entries.length / 2);
  
  const firstHalf = entries.slice(0, midpoint);
  const secondHalf = entries.slice(midpoint);
  
  const firstGaps = [];
  for (let i = 1; i < firstHalf.length; i++) {
    firstGaps.push(getDaysDiff(new Date(firstHalf[i-1].date), new Date(firstHalf[i].date)));
  }
  
  const secondGaps = [];
  for (let i = 1; i < secondHalf.length; i++) {
    secondGaps.push(getDaysDiff(new Date(secondHalf[i-1].date), new Date(secondHalf[i].date)));
  }
  
  const avgFirstGap = average(firstGaps);
  const avgSecondGap = average(secondGaps);
  
  // If gaps are getting larger, frequency is declining
  return avgSecondGap > avgFirstGap * 1.2;
};

/**
 * PART 1 — Recurring Pattern Detection Algorithm
 */
export function detectRecurringPatterns(logs, daysLimit = 30) {
  const today = new Date();
  
  // Filter logs within the specified range
  const rangeLogs = logs.filter(log => {
    const diff = getDaysDiff(new Date(log.date), today);
    return diff <= daysLimit;
  });

  // Group logs by activityName + subcategory combination
  const groups = groupBy(rangeLogs, log =>
    `${log.activityName}__${log.subcategory || 'none'}`
  );

  const patterns = [];

  for (const [key, entries] of Object.entries(groups)) {
    // For shorter intervals, lower the requirement slightly
    const minOccurrences = daysLimit <= 7 ? 2 : 4;
    if (entries.length < minOccurrences) continue;

    const sortedEntries = entries
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const sortedDates = sortedEntries.map(e => new Date(e.date));

    // Check if first occurrence is within the range
    const daysSinceFirst = getDaysDiff(sortedDates[0], today);

    // Calculate average gap between occurrences
    const gaps = [];
    for (let i = 1; i < sortedDates.length; i++) {
      gaps.push(getDaysDiff(sortedDates[i-1], sortedDates[i]));
    }
    const avgGapDays = average(gaps);

    // Calculate average duration
    const avgDurationMinutes = average(
      entries.map(e => {
        const start = e.startTime ? timeStrToMinutes(e.startTime) : 0;
        const end = (e.endTime || e.startTime) ? timeStrToMinutes(e.endTime || e.startTime) : start;
        return end - start;
      })
    );

    // Calculate average energy level
    const ratedEntries = entries.filter(e => e.energyLevel !== undefined && e.energyLevel !== null);
    const avgEnergy = ratedEntries.length > 0
      ? average(ratedEntries.map(e => e.energyLevel))
      : null;

    // Calculate average regret rating
    const ratedRegret = entries.filter(e => e.regretRating !== undefined && e.regretRating !== null);
    const avgRegret = ratedRegret.length > 0
      ? average(ratedRegret.map(e => e.regretRating))
      : null;

    // Calculate hours per week
    const totalHours = (avgDurationMinutes * entries.length) / 60;
    const weeksSpan = Math.max(1, daysSinceFirst / 7);
    const hoursPerWeek = totalHours / weeksSpan;

    patterns.push({
      activityName: sortedEntries[0].activityName,
      subcategory: sortedEntries[0].subcategory,
      occurrenceCount: entries.length,
      daysSinceFirst,
      avgGapDays,
      avgDurationMinutes,
      avgEnergy,
      avgRegret,
      hoursPerWeek,
      totalHoursLogged: totalHours,
      entries: sortedEntries
    });
  }

  const scoredPatterns = patterns.map(p => ({
    ...p,
    subtractionScore: calculateSubtractionScore(p)
  }));

  return scoredPatterns.sort((a, b) => b.subtractionScore - a.subtractionScore);
}

/**
 * PART 2 — Subtraction Score
 */
export function calculateSubtractionScore(pattern) {
  let score = 0;

  // Low regret rating → strong subtraction candidate
  // User logic: rating 1 = +40, rating 5 = -40 (based on 3-rating * 20)
  if (pattern.avgRegret !== null) {
    score += (3 - pattern.avgRegret) * 20;
  }

  // Low energy → draining activity
  if (pattern.avgEnergy !== null) {
    score += (50 - pattern.avgEnergy) * 0.4;
  }

  // High hours per week → high leverage if eliminated
  score += Math.min(30, pattern.hoursPerWeek * 6);

  // Boondoggle activity → automatic high score
  if (pattern.activityName === 'Entropy Flux') score += 30;

  // Long-running (30+ days) with declining frequency → fading relevance
  if (pattern.daysSinceFirst > 60 && isFrequencyDeclining(pattern)) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}
