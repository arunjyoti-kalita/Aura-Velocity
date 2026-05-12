import { useMemo } from 'react';
import { calculateDuration, isBoondoggle } from '../../utils/analysisHelpers';
import clsx from 'clsx';
import { Lightbulb, AlertTriangle, ArrowRight } from 'lucide-react';

export function BoondoggleAuditTab({ logs, activities }) {
  const { heatmapData, topHour, totalBoondoggleHours, equivalentSessions } = useMemo(() => {
    let totalMins = 0;
    const hourCounts = Array(24).fill(0); // 0 to 23

    logs.forEach(log => {
      if (isBoondoggle(log)) {
        const start = log.startTime;
        const [sh, sm] = start.split(':').map(Number);
        const duration = calculateDuration(log);
        totalMins += duration * 60;
        
        // Add to hour buckets
        let currentH = sh;
        let remainingDuration = duration;
        while (remainingDuration > 0) {
          const allocation = Math.min(1, remainingDuration);
          hourCounts[currentH] += allocation;
          remainingDuration -= allocation;
          currentH = (currentH + 1) % 24;
        }
      }
    });

    const maxCount = Math.max(...hourCounts, 1); // Avoid div by 0
    let topH = 0;
    let maxHVal = 0;

    // Filter to our 8am - 2am range and map to heatmap format
    const heatmapData = [];
    for (let i = 0; i < 18; i++) {
      const h = (8 + i) % 24;
      const count = hourCounts[h];
      if (count > maxHVal) {
        maxHVal = count;
        topH = h;
      }
      
      const label = `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      const intensity = (count / maxCount) * 100;
      
      heatmapData.push({
        hour: h,
        label,
        count,
        intensity
      });
    }

    const totalBoondoggleHours = totalMins / 60;
    const equivalentSessions = Math.round((totalMins / 60) * 2); // 30-min sessions

    return {
      heatmapData,
      topHour: topH,
      totalBoondoggleHours,
      equivalentSessions
    };
  }, [logs]);

  // Find skill-based activities to suggest
  const skillActivities = activities.filter(a => a.isSkillBased || ['PM_theory', 'Tech and AI', 'Tool'].includes(a.name));
  const suggestedActivity = skillActivities.length > 0 ? skillActivities[0].name : "Skill Building";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20"><AlertTriangle size={64} className="text-orange-500" /></div>
          <h3 className="text-orange-500 font-bold mb-2">Wasted Potential</h3>
          <div className="text-4xl font-bold text-white mb-2">{totalBoondoggleHours.toFixed(1)} <span className="text-xl text-gray-400 font-medium">hrs</span></div>
          <p className="text-gray-400 text-sm">Total time spent on Boondoggle activities in this period.</p>
        </div>

        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20"><Lightbulb size={64} className="text-accent" /></div>
          <h3 className="text-accent font-bold mb-2">Equivalent Sessions</h3>
          <div className="text-4xl font-bold text-white mb-2">{equivalentSessions} <span className="text-xl text-gray-400 font-medium">blocks</span></div>
          <p className="text-gray-400 text-sm">You could have completed {equivalentSessions} × 30-min <span className="text-white font-medium">{suggestedActivity}</span> sessions.</p>
        </div>
      </div>

      {/* Heatmap & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-100 mb-6">Time-of-Day Concentration</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {heatmapData.map(slot => (
              <div 
                key={slot.hour} 
                className="flex flex-col items-center p-2 rounded-lg border border-gray-800/50 bg-bg-surface group hover:border-gray-600 transition-colors"
              >
                <span className="text-xs text-gray-400 mb-2">{slot.label}</span>
                <div className="w-full h-12 rounded bg-gray-800 relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-orange-500 transition-all duration-500"
                    style={{ height: `${slot.intensity}%`, opacity: Math.max(0.2, slot.intensity / 100) }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2 font-mono">{slot.count.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Action Plan</h3>
          
          {totalBoondoggleHours > 0 ? (
            <div className="space-y-4 flex-1">
              <p className="text-sm text-gray-400 leading-relaxed">
                Your highest Boondoggle concentration occurs around <strong className="text-white">{topHour % 12 || 12}:00 {topHour >= 12 ? 'PM' : 'AM'}</strong>.
              </p>
              
              <div className="bg-bg-surface border border-gray-700 rounded-xl p-4 mt-4">
                <h4 className="text-sm font-bold text-gray-200 mb-2">Replacement Strategy:</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Replace the first 30 minutes of this specific block tomorrow with a pre-planned Deep Work session to break the habit loop.
                </p>
                <div className="flex items-center gap-2 text-sm text-accent font-medium bg-accent/10 p-2 rounded-lg">
                  <span>Boondoggle</span>
                  <ArrowRight size={14} />
                  <span>{suggestedActivity}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h4 className="font-bold text-green-400 mb-2">Zero Boondoggle!</h4>
              <p className="text-sm text-gray-400">You have successfully eliminated Boondoggle time in this period. Keep up the momentum!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
