export function calculateDuration(log) {
  if (!log.startTime) return 0;
  const [sh, sm] = log.startTime.split(':').map(Number);
  const [eh, em] = (log.endTime || log.startTime).split(':').map(Number);
  let durationMins = (eh * 60 + em) - (sh * 60 + sm);
  if (durationMins <= 0) durationMins += 24 * 60;
  return durationMins / 60;
}

export function isDeepWork(input, activities = [], customDeepWorkNames = []) {
  if (!input) return false;
  
  // If it's a log object with isDeepWork flag
  if (typeof input === 'object' && input.isDeepWork) return true;
  
  const name = typeof input === 'string' ? input : input.activityName || input.name;
  if (!name) return false;

  // Check if it's a custom domain from Blueprints
  if (customDeepWorkNames.includes(name)) return true;

  const activity = activities.find(a => a.name === name);
  
  // Hardcoded elite categories
  const eliteCategories = ['PM_theory', 'Tech and AI', 'Tool', 'Corporate Ready'];
  if (eliteCategories.includes(name)) return true;

  if (!activity) return false;
  if (activity.isSkillBased) return true;
  
  return false;
}

export function isBoondoggle(log) {
  return log.activityName === 'Boondoggle';
}

export function isComatose(log) {
  return log.activityName === 'Comatose';
}
