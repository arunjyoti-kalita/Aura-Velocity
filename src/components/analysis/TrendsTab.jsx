import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { calculateDuration, isDeepWork, isBoondoggle } from '../../utils/analysisHelpers';
import { format, parseISO, eachDayOfInterval, min, max, subDays } from 'date-fns';

export function TrendsTab({ logs, activities }) {
  const data = useMemo(() => {
    if (logs.length === 0) return [];

    // Find date range of logs
    const dates = logs.map(l => parseISO(l.date));
    const minDate = min(dates);
    const maxDate = max(dates);
    
    // Create an array for every day in the range
    const days = eachDayOfInterval({ start: minDate, end: maxDate });
    
    // Map dates to metrics
    const dailyStats = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.date === dateStr);
      
      let deepWork = 0;
      let boondoggle = 0;
      
      dayLogs.forEach(log => {
        const dur = calculateDuration(log);
        if (isDeepWork(log, activities)) deepWork += dur;
        if (isBoondoggle(log)) boondoggle += dur;
      });
      
      return {
        dateStr,
        displayDate: format(day, 'MMM d'),
        deepWork,
        boondoggle,
      };
    });

    // Calculate 7-day rolling average
    return dailyStats.map((stat, i) => {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        sum += dailyStats[j].deepWork;
        count++;
      }
      return {
        ...stat,
        rollingAvg: sum / count,
        isZeroDeepWork: stat.deepWork === 0
      };
    });
  }, [logs, activities]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-surface border border-gray-700 p-4 rounded-lg shadow-xl">
          <p className="text-white font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value.toFixed(1)} hrs
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomizedAxisTick = ({ x, y, payload }) => {
    // Find if this specific date has zero deep work
    const dayData = data.find(d => d.displayDate === payload.value);
    const isZero = dayData && dayData.isZeroDeepWork;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill={isZero ? '#ef4444' : '#9ca3af'}
          fontSize={12}
          fontWeight={isZero ? 'bold' : 'normal'}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Deep Work Trends</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent"></div>Deep Work</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-50"></div>7D Avg</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div>Boondoggle</div>
        </div>
      </div>

      <div className="h-[320px] w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">No data for selected period</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                tick={<CustomizedAxisTick />}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              <Line 
                type="monotone" 
                name="Deep Work"
                dataKey="deepWork" 
                stroke="#00f2ea" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#1a1a1e', stroke: '#00f2ea', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#00f2ea' }}
              />
              <Line 
                type="monotone" 
                name="7D Rolling Avg"
                dataKey="rollingAvg" 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                opacity={0.7}
              />
              <Line 
                type="monotone" 
                name="Boondoggle"
                dataKey="boondoggle" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#1a1a1e', stroke: '#f97316', strokeWidth: 2 }}
                opacity={0.8}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
