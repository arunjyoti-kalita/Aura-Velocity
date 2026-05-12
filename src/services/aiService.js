const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'PLACEHOLDER';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
export const isGeminiConfigured = GEMINI_API_KEY !== 'PLACEHOLDER';

// Activity keywords for local fallback parser
const ACTIVITY_KEYWORDS = {
  'comatose': 'Comatose', 'sleep': 'Comatose', 'nap': 'Comatose', 'rest': 'Comatose',
  'fresh_up': 'Fresh_UP', 'fresh up': 'Fresh_UP', 'shower': 'Fresh_UP', 'morning routine': 'Fresh_UP', 'freshen': 'Fresh_UP',
  'food': 'Food', 'eat': 'Food', 'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food', 'cook': 'Food', 'meal': 'Food',
  'boondoggle': 'Boondoggle', 'waste': 'Boondoggle', 'scroll': 'Boondoggle', 'social media': 'Boondoggle',
  'pm_theory': 'PM_theory', 'pm theory': 'PM_theory', 'product': 'PM_theory', 'management': 'PM_theory', 'strategy': 'PM_theory',
  'ai': 'Tech and AI', 'technical': 'Tech and AI', 'code': 'Tech and AI', 'coding': 'Tech and AI',
  'programming': 'Tech and AI', 'develop': 'Tech and AI', 'deep work': 'Tech and AI', 'study': 'Tech and AI',
  'sql': 'Tech and AI', 'python': 'Tech and AI', 'react': 'Tech and AI',
  'tool': 'Tool', 'setup': 'Tool', 'config': 'Tool', 'install': 'Tool',
  'work_out': 'Work_out', 'workout': 'Work_out', 'exercise': 'Work_out', 'gym': 'Work_out',
  'run': 'Work_out', 'running': 'Work_out', 'yoga': 'Work_out', 'fitness': 'Work_out', 'cardio': 'Work_out',
  'recreation': 'Recreation', 'game': 'Recreation', 'play': 'Recreation', 'movie': 'Recreation', 'relax': 'Recreation', 'read': 'Recreation',
  'corporate': 'Corporate Ready', 'meeting': 'Corporate Ready', 'work': 'Corporate Ready', 'office': 'Corporate Ready', 'call': 'Corporate Ready',
  'extra': 'Extra', 'errand': 'Extra', 'chore': 'Extra', 'task': 'Extra',
};

/**
 * Local fallback parser — uses keyword matching and regex to extract intent.
 */
function parseSchedulingLocally(userInput, currentDateStr) {
  const lower = userInput.toLowerCase();
  
  // 1. Extract duration
  let durationMinutes = 60;
  const hourMatch = lower.match(/(\d+\.?\d*)\s*(?:hour|hr|hrs|hours)/);
  const minMatch = lower.match(/(\d+)\s*(?:min|mins|minute|minutes)/);
  if (hourMatch) durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  else if (minMatch) durationMinutes = parseInt(minMatch[1], 10);

  // 2. Detect activity type
  let activityType = 'Extra';
  let bestMatchLength = 0;
  for (const [keyword, activity] of Object.entries(ACTIVITY_KEYWORDS)) {
    if (lower.includes(keyword) && keyword.length > bestMatchLength) {
      activityType = activity;
      bestMatchLength = keyword.length;
    }
  }

  // 3. Time of day preference
  let preferredTimeOfDay = 'any';
  if (/morning|am\b|early/.test(lower)) preferredTimeOfDay = 'morning';
  else if (/afternoon|midday|noon/.test(lower)) preferredTimeOfDay = 'afternoon';
  else if (/evening|pm\b|late/.test(lower)) preferredTimeOfDay = 'evening';
  else if (/night|midnight/.test(lower)) preferredTimeOfDay = 'night';

  // 4. Deadline
  let deadline = null;
  const today = new Date(currentDateStr);
  if (/today/.test(lower)) {
    deadline = currentDateStr;
  } else if (/tomorrow/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    deadline = d.toISOString().split('T')[0];
  } else if (/this week|later|soon/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() + 7);
    deadline = d.toISOString().split('T')[0];
  } else if (/next week/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() + 14);
    deadline = d.toISOString().split('T')[0];
  }

  // 5. Specific Start Time Extraction
  let preferredStartTime = null;
  const timeMatch = lower.match(/(?:at|from|around|@)\s*(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];
    
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    // Contextual adjustment (e.g., "6:30 in the evening" -> 18:30)
    if (!ampm && preferredTimeOfDay === 'evening' && hour < 12) hour += 12;
    if (!ampm && preferredTimeOfDay === 'afternoon' && hour < 7) hour += 12;
    
    preferredStartTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  // 6. Extract a readable task name
  let taskName = userInput.replace(/block\s*/i, '').replace(/find\s*(me\s*)?time\s*(to|for)?\s*/i, '').trim();
  if (taskName.length > 60) taskName = taskName.substring(0, 60) + '…';

  return {
    taskName: taskName || `${activityType} session`,
    activityType,
    durationMinutes,
    deadline,
    preferredTimeOfDay,
    preferredStartTime,
    preferredDate: null,
    flexibility: preferredStartTime ? 'rigid' : 'flexible',
    avoidBackToBack: false,
    notes: isGeminiConfigured ? null : 'Parsed locally (no API key)'
  };
}

/**
 * Parses natural language scheduling requests.
 * Uses Gemini 1.5 Flash when available, falls back to local keyword parser.
 */
export async function parseSchedulingRequest(userInput, currentDateStr, currentTimeStr) {
  // Fallback to local parser when no API key
  if (!isGeminiConfigured) {
    return parseSchedulingLocally(userInput, currentDateStr);
  }

  const prompt = `You are a scheduling parser for the "Aura Velocity" temporal engine.
Extract structured data from this scheduling request:
"${userInput}"

CONTEXT:
- Today's Date: ${currentDateStr}
- Current Time: ${currentTimeStr}
- Valid Activity Types: Comatose, Fresh_UP, Food, Boondoggle, PM_theory, Tech and AI, Tool, Work_out, Recreation, Corporate Ready, Extra

RULES:
1. If no specific activity type is mentioned, infer the best fit.
2. If no duration is mentioned, default to 60 minutes.
3. If "this week" or "later" is mentioned, set a deadline 7 days from today.
4. If a specific time is mentioned (e.g., "at 6 PM", "around 10.30"), extract it into "preferredStartTime" in HH:mm format.
5. Return ONLY a valid JSON object. No markdown, no explanation.

JSON STRUCTURE:
{
  "taskName": string,
  "activityType": string,
  "durationMinutes": number,
  "deadline": string | null (ISO date YYYY-MM-DD),
  "preferredTimeOfDay": string (morning/afternoon/evening/night/any),
  "preferredStartTime": string | null (format HH:mm),
  "preferredDate": string | null (ISO date YYYY-MM-DD),
  "flexibility": string (rigid/flexible/very_flexible),
  "avoidBackToBack": boolean,
  "notes": string | null
}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API connection failed');
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // Clean up potential markdown formatting
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (err) {
    console.error('AI Parsing Error:', err);
    // Graceful fallback to local parser on API failure
    return parseSchedulingLocally(userInput, currentDateStr);
  }
}

/**
 * Generates a local subtraction proposal from pattern data.
 */
function generateLocalSubtractionProposal(patterns) {
  const sorted = [...patterns].sort((a, b) => b.subtractionScore - a.subtractionScore);
  const topPatterns = sorted.slice(0, 5);
  
  const proposals = topPatterns.map(p => {
    const score = p.subtractionScore || 0;
    let type = 'question';
    let proposedHours = p.hoursPerWeek;
    
    if (score >= 80) { type = 'eliminate'; proposedHours = 0; }
    else if (score >= 60) { type = 'reduce'; proposedHours = Math.round(p.hoursPerWeek * 0.3 * 10) / 10; }
    else if (score >= 40) { type = 'merge'; proposedHours = Math.round(p.hoursPerWeek * 0.6 * 10) / 10; }
    
    return {
      type,
      activityName: p.activityName,
      subcategory: p.subcategory || null,
      currentHoursPerWeek: Math.round(p.hoursPerWeek * 10) / 10,
      proposedHoursPerWeek: proposedHours,
      hoursReclaimed: Math.round((p.hoursPerWeek - proposedHours) * 10) / 10,
      rationale: `This pattern scores ${score}/100 on subtraction analysis. ${p.avgRegret && p.avgRegret < 3 ? 'Low satisfaction detected.' : 'Review whether this serves your goals.'}`,
      challenge: `Would you notice if this disappeared for 30 days?`
    };
  });

  const weeklyReclaimed = proposals.reduce((sum, p) => sum + p.hoursReclaimed, 0);

  return {
    quarterlyHoursAtStake: Math.round(weeklyReclaimed * 13),
    weeklyHoursReclaimed: Math.round(weeklyReclaimed * 10) / 10,
    headline: 'Your time has silent leaks — here they are',
    proposals,
    subtractionManifesto: 'Every hour reclaimed is a vote for the life you actually want. Subtract deliberately.'
  };
}

/**
 * Generates a subtraction proposal using Gemini (or local fallback).
 */
export async function generateSubtractionProposal(patterns) {
  if (!isGeminiConfigured) {
    return generateLocalSubtractionProposal(patterns);
  }

  const patternsSummary = patterns.map(p => `
  - ${p.activityName} / ${p.subcategory || 'no subcategory'}
    Occurs: every ${p.avgGapDays.toFixed(1)} days on average
    Duration: ${p.avgDurationMinutes.toFixed(0)} minutes per session
    Time invested: ${p.hoursPerWeek.toFixed(1)} hours/week
    Energy level: ${p.avgEnergy ? p.avgEnergy.toFixed(0) + '/100' : 'not tracked'}
    Regret rating: ${p.avgRegret ? p.avgRegret.toFixed(1) + '/5' : 'not rated'}
    Subtraction score: ${p.subtractionScore.toFixed(0)}/100
  `).join('');

  const prompt = `You are The Subtraction Engine — a ruthless but compassionate time auditor.

This person has had the following recurring time patterns for 30+ days:
${patternsSummary}

Generate a concrete subtraction proposal. Return ONLY a JSON object:
{
  "quarterlyHoursAtStake": number,
  "weeklyHoursReclaimed": number,
  "headline": string (punchy one-liner, max 12 words),
  "proposals": [
    {
      "type": "eliminate" | "reduce" | "merge" | "question",
      "activityName": string,
      "subcategory": string | null,
      "currentHoursPerWeek": number,
      "proposedHoursPerWeek": number,
      "hoursReclaimed": number,
      "rationale": string (2 sentences max, brutally honest),
      "challenge": string (a provocative question to help them decide, max 15 words)
    }
  ],
  "subtractionManifesto": string (2–3 sentence philosophical closing statement about the value of subtraction, max 40 words)
}
Return only valid JSON. No markdown, no preamble.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API connection failed');
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (err) {
    console.error('Subtraction Audit Error:', err);
    throw new Error('Failed to generate subtraction proposal.');
  }
}
/**
 * Local fallback for semantic search.
 */
function localSemanticSearch(query, logs, relationships) {
  const lower = query.toLowerCase();
  const results = [];

  // Match activities
  logs.forEach(log => {
    if (log.activityName.toLowerCase().includes(lower) || (log.subcategory && log.subcategory.toLowerCase().includes(lower))) {
      results.push({
        type: 'log',
        date: log.date,
        time: log.startTime,
        activity: log.activityName,
        note: `Found matching activity: ${log.activityName}`
      });
    }
  });

  // Match relationships
  relationships.forEach(rel => {
    if (rel.personName.toLowerCase().includes(lower)) {
      results.push({
        type: 'relationship',
        name: rel.personName,
        note: `Last contact: ${rel.lastContactDate || 'No record'}`
      });
    }
  });

  return {
    answer: `I found ${results.length} relevant entries for "${query}" in your local history.`,
    results: results.slice(0, 5)
  };
}

/**
 * Performs a semantic search across logs and relationships.
 */
export async function semanticSearch(query, logs, relationships) {
  if (!isGeminiConfigured) {
    return localSemanticSearch(query, logs, relationships);
  }

  // Sample data to keep prompt size manageable
  const recentLogs = logs.slice(-50).map(l => `${l.date} ${l.startTime}: ${l.activityName} (${l.subcategory || ''})`).join('\n');
  const relSummary = relationships.map(r => `${r.personName}: last contact ${r.lastContactDate}`).join('\n');

  const prompt = `You are the "Life Librarian" for Aura Velocity.
Answer the user's question about their past behavior, habits, or relationships based on this data.

DATA:
LOGS (Recent):
${recentLogs}

RELATIONSHIPS:
${relSummary}

USER QUERY:
"${query}"

RULES:
1. Be specific and citation-heavy (mention dates/times).
2. If you don't know, say so.
3. Return ONLY a JSON object:
{
  "answer": string (concise, 2–3 sentences),
  "results": Array<{ "type": "log" | "rel", "date": string, "note": string }>
}
Return only valid JSON. No markdown.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
      })
    });

    if (!response.ok) throw new Error('API failed');
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (err) {
    console.error('Semantic Search Error:', err);
    return localSemanticSearch(query, logs, relationships);
  }
}
