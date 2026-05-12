import { useState, useEffect, useMemo } from 'react';
import { useApp } from "../../contexts/useApp";
import { differenceInDays, parseISO, isAfter, addDays } from 'date-fns';
import { NudgeCard } from './NudgeCard';

export function RelationshipNudgeManager() {
  const { relationships } = useApp();
  const { people } = relationships;
  
  const [activeNudges, setActiveNudges] = useState([]);
  const [dismissedUntil, setDismissedUntil] = useState(() => {
    const saved = localStorage.getItem('aura_velocity_nudges_dismissed');
    return saved ? JSON.parse(saved) : {};
  });

  // Background scanner
  useEffect(() => {
    const scan = () => {
      const now = new Date();
      const overduePeople = people
        .filter(p => p.isActive !== false)
        .filter(p => {
          // Check if dismissed for today
          const dismissedDate = dismissedUntil[p.id];
          if (dismissedDate && isAfter(parseISO(dismissedDate), now)) return false;

          if (!p.lastContactDate) return true;
          const daysSince = differenceInDays(now, parseISO(p.lastContactDate));
          return daysSince >= p.cadenceDays - 3; // Nudge starts 3 days before due
        })
        .sort((a, b) => {
          const daysA = a.lastContactDate ? differenceInDays(now, parseISO(a.lastContactDate)) : 999;
          const daysB = b.lastContactDate ? differenceInDays(now, parseISO(b.lastContactDate)) : 999;
          return (daysB - b.cadenceDays) - (daysA - a.cadenceDays); // Sort by most overdue
        });

      // Show max 2 nudges
      setActiveNudges(overduePeople.slice(0, 2));
    };

    scan();
    const interval = setInterval(scan, 1000 * 60 * 60 * 4); // Every 4 hours
    return () => clearInterval(interval);
  }, [people, dismissedUntil]);

  const handleDismiss = (personId, permanent = false) => {
    if (permanent) {
      // In a real app, we might wait for interaction log, 
      // but here we just suppress for 24h as per requirement "Remind me tomorrow"
      const until = addDays(new Date(), 1).toISOString();
      const newDismissed = { ...dismissedUntil, [personId]: until };
      setDismissedUntil(newDismissed);
      localStorage.setItem('aura_velocity_nudges_dismissed', JSON.stringify(newDismissed));
    } else {
      setActiveNudges(prev => prev.filter(p => p.id !== personId));
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
      {activeNudges.map((person, index) => (
        <NudgeCard 
          key={person.id} 
          person={person} 
          index={index}
          onDismiss={() => handleDismiss(person.id)}
          onRemindTomorrow={() => handleDismiss(person.id, true)}
        />
      ))}
    </div>
  );
}
