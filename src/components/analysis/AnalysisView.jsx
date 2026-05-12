import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useApp } from "../../contexts/useApp";
import clsx from 'clsx';
import { OverviewTab } from './OverviewTab';
import { ActivityBreakdownTab } from './ActivityBreakdownTab';
import { TrendsTab } from './TrendsTab';
import { BoondoggleAuditTab } from './BoondoggleAuditTab';
import { RegretMapTab } from './RegretMapTab';
import { SubtractionEngine } from './SubtractionEngine';
import { RelationshipAnalysisTab } from './RelationshipAnalysisTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Activity Breakdown' },
  { id: 'trends', label: 'Trends' },
  { id: 'regret', label: 'Regret Map' },
  { id: 'audit', label: 'Boondoggle Audit' },
  { id: 'subtraction', label: 'Subtraction' },
  { id: 'relationships', label: 'Relationships' }
];

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' }
];

export function AnalysisView() {
  const { logs, activities, currentDate } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRangeType, setDateRangeType] = useState('week');
  const [customStart, setCustomStart] = useState(format(currentDate, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(currentDate, 'yyyy-MM-dd'));

  const filteredLogs = useMemo(() => {
    let start, end;
    const now = currentDate;

    if (dateRangeType === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (dateRangeType === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (dateRangeType === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      start = parseISO(customStart);
      end = parseISO(customEnd);
    }

    return logs.filter(log => {
      const logDate = parseISO(log.date);
      try {
        return isWithinInterval(logDate, { start, end });
      } catch (e) {
        return false;
      }
    });
  }, [logs, dateRangeType, currentDate, customStart, customEnd]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="h-10 px-6 border-b border-white/5 bg-[#0a0a0c]/40 backdrop-blur-md shrink-0 flex items-center justify-between">
        <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5 h-6">
          {DATE_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => setDateRangeType(range.id)}
              className={clsx(
                "px-3 h-full text-[8px] font-black uppercase tracking-widest rounded transition-all",
                dateRangeType === range.id 
                  ? "bg-white/10 text-white border border-white/5" 
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {dateRangeType === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <input 
              type="date" 
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 h-5 text-[8px] text-white focus:outline-none focus:border-accent transition-all"
            />
            <span className="text-[8px] text-gray-500 uppercase">to</span>
            <input 
              type="date" 
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 h-5 text-[8px] text-white focus:outline-none focus:border-accent transition-all"
            />
          </div>
        )}
      </div>

      <div className="h-10 px-6 bg-white/[0.01] border-b border-white/5 flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "h-full text-[8px] font-black uppercase tracking-widest transition-all relative px-1",
              activeTab === tab.id ? "text-accent" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_8px_rgba(var(--color-accent),0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          {activeTab === 'overview' && <OverviewTab logs={filteredLogs} activities={activities} />}
          {activeTab === 'breakdown' && <ActivityBreakdownTab logs={filteredLogs} activities={activities} />}
          {activeTab === 'trends' && <TrendsTab logs={filteredLogs} activities={activities} />}
          {activeTab === 'regret' && <RegretMapTab logs={filteredLogs} activities={activities} />}
          {activeTab === 'audit' && <BoondoggleAuditTab logs={filteredLogs} activities={activities} />}
          {activeTab === 'subtraction' && <SubtractionEngine />}
          {activeTab === 'relationships' && <RelationshipAnalysisTab />}
        </div>
      </div>
    </div>
  );
}
