/**
 * Circadian Rhythm Logic for Biological Peak Alignment
 */

export const CHRONOTYPES = {
  LARK: 'lark',
  OWL: 'owl',
  BALANCED: 'balanced',
  VAMPIRE: 'vampire'
};

/**
 * Returns an energy score (0-100) for a given hour (0-23) based on chronotype.
 * Uses a simplified double-peak circadian model.
 */
export function getEnergyLevel(hour, chronotype = CHRONOTYPES.BALANCED) {
  // Normalize hour to 0-24
  const h = hour % 24;

  switch (chronotype) {
    case CHRONOTYPES.VAMPIRE:
      // Wake 10:30 AM. Peak 1 (11:30-14), Trough (14-15:30), Peak 2 (15:30-21:30), Dip (21:30-01), Peak 3 (01-03)
      if (h >= 11 && h < 14) return 85 + Math.sin((h - 11) * (Math.PI / 3)) * 10;
      if (h >= 14 && h < 16) return 40 + Math.sin((h - 14) * (Math.PI / 2)) * 10;
      if (h >= 16 && h < 22) return 90 + Math.sin((h - 16) * (Math.PI / 6)) * 8;
      if (h >= 22 || h < 1) return 60 + (h >= 22 ? (h-22)*5 : (1+h)*5);
      if (h >= 1 && h < 3) return 95 + Math.sin((h - 1) * (Math.PI / 2)) * 5;
      return 20; // Sleep 3 AM - 10:30 AM

    case CHRONOTYPES.LARK:
      // Peak 8 AM - 11 AM, Deep Trough 3 PM, Small evening bump 7 PM
      if (h >= 6 && h < 12) return 85 + Math.sin((h - 6) * (Math.PI / 6)) * 15;
      if (h >= 12 && h < 17) return 60 - Math.sin((h - 12) * (Math.PI / 5)) * 30;
      if (h >= 17 && h < 21) return 50 + Math.sin((h - 17) * (Math.PI / 4)) * 20;
      return 20; // Sleepy

    case CHRONOTYPES.OWL:
      // Morning fog, Peak 7 PM - 11 PM, Trough 11 AM
      if (h >= 7 && h < 14) return 40 - Math.sin((h - 7) * (Math.PI / 7)) * 20;
      if (h >= 14 && h < 19) return 50 + (h - 14) * 6;
      if (h >= 19 && h < 24) return 90 + Math.sin((h - 19) * (Math.PI / 5)) * 10;
      return 30;

    case CHRONOTYPES.BALANCED:
    default:
      // Peak 10 AM, Trough 4 PM, Evening steady
      if (h >= 7 && h < 13) return 70 + Math.sin((h - 7) * (Math.PI / 6)) * 25;
      if (h >= 13 && h < 18) return 55 - Math.sin((h - 13) * (Math.PI / 5)) * 25;
      if (h >= 18 && h < 23) return 60 + Math.sin((h - 18) * (Math.PI / 5)) * 10;
      return 25;
  }
}

/**
 * Default intensity requirements for activity types.
 */
export const ACTIVITY_INTENSITY = {
  'Comatose': 0,
  'Spruce_Up': 40,
  'Bio-Fuel Intake': 20,
  'Boondoggle': 10,
  'PM Archives': 85,
  'Tech and AI': 95,
  'Tool': 60,
  'Isometrics': 80,
  'Cognitive': 30,
  'Armor Equipping': 75,
  'Extra': 50
};

/**
 * Calculates alignment between activity intensity and current energy.
 * Returns 0-100 score.
 */
export function calculateAlignmentScore(log, energyLevel, activities = []) {
  const activityName = typeof log === 'string' ? log : log.activityName;
  const activity = activities.find(a => a.name === activityName);
  
  // Use manual override if present, otherwise fallback to activity defaults
  let intensity = 50;
  if (typeof log === 'object' && log.isDeepWork) {
    intensity = 95; // Forced high intensity for manual Deep Work
  } else if (activity && activity.intensity !== undefined) {
    intensity = activity.intensity;
  } else {
    intensity = ACTIVITY_INTENSITY[activityName] || 50;
  }
  
  // If intensity is very low (sleep/food), alignment is always good unless energy is maxed
  if (intensity < 30) return 100 - Math.abs(intensity - (100 - energyLevel)) / 2;

  // For high intensity, alignment is high when energy is high
  const score = 100 - Math.abs(intensity - energyLevel);
  return Math.max(0, Math.min(100, score));
}
