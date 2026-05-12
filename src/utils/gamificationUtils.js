/**
 * Gamification Utilities for Aura Velocity Dashboard
 */
import { timeStrToMinutes } from './dateHelpers';

export const OPERATIVE_RANKS = [
  { level: 0, title: 'Initiate', minAura: 0, color: '#94a3b8' },
  { level: 10, title: 'Shadow Operative', minAura: 1000, color: '#818cf8' },
  { level: 30, title: 'Ghost Operative', minAura: 5000, color: '#a855f7' },
  { level: 60, title: 'Vampire Sovereign', minAura: 15000, color: '#ec4899' },
  { level: 100, title: 'Aura Zenith', minAura: 50000, color: '#facc15' }
];

/**
 * Calculates Aura points for a single log entry
 */
export function calculateAuraForLog(log, alignmentScore) {
  const start = timeStrToMinutes(log.startTime);
  const end = timeStrToMinutes(log.endTime || log.startTime);
  const durationMins = end - start;
  
  if (durationMins <= 0) return 0;

  // Base points: 1 point per 5 minutes of activity
  let points = (durationMins / 5) * (alignmentScore / 100);

  // Deep Work Multiplier
  if (log.isDeepWork) {
    points *= 1.5;
  }

  // Turbo Phase Multiplier (1 AM - 3 AM)
  const startHour = Math.floor(start / 60);
  if (startHour >= 1 && startHour < 3) {
    points *= 2.0;
  }

  // Boondoggle Penalty
  if (log.activityName === 'Boondoggle') {
    points *= -0.5;
  }

  return Math.round(points);
}

/**
 * Gets current rank info based on total aura
 */
export function getRankInfo(totalAura) {
  let currentRank = OPERATIVE_RANKS[0];
  let nextRank = OPERATIVE_RANKS[1];

  for (let i = 0; i < OPERATIVE_RANKS.length; i++) {
    if (totalAura >= OPERATIVE_RANKS[i].minAura) {
      currentRank = OPERATIVE_RANKS[i];
      nextRank = OPERATIVE_RANKS[i + 1] || OPERATIVE_RANKS[i];
    } else {
      break;
    }
  }

  const progress = nextRank === currentRank 
    ? 100 
    : ((totalAura - currentRank.minAura) / (nextRank.minAura - currentRank.minAura)) * 100;

  return { ...currentRank, nextRank, progress };
}
