import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateDuration } from '../../utils/analysisHelpers';
import { useApp } from "../../contexts/useApp";

export function ActivityBreakdownTab({ logs, activities }) {
  const [chartType, setChartType] = useState('donut'); // 'donut' or 'bar'
  const { setActivityFilter, setActiveModule } = useApp();

  const data = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      const act = activities.find(a => a.name === log.activityName);
      if (!act) return;
      
      if (!map[act.name]) {
        map[act.name] = { name: act.name, value: 0, color: act.baseColor };
      }
      map[act.name].value += calculateDuration(log);
    });
    
    return Object.values(map)
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [logs, activities]);

  const handleChartClick = (entry) => {
    if (entry && entry.name) {
      if (setActivityFilter && setActiveModule) {
        setActivityFilter(entry.name);
        setActiveModule('daylog');
      }
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-bg-surface border border-gray-700 p-3 rounded-lg shadow-xl">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-gray-400">{data.value.toFixed(1)} hours</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Activity Breakdown</h2>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button 
            onClick={() => setChartType('donut')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartType === 'donut' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Donut
          </button>
          <button 
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartType === 'bar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Bar
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Left: Legend */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          {data.map((entry, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group"
              onClick={() => handleChartClick(entry)}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">{entry.name}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600 group-hover:text-accent">{entry.value.toFixed(1)}h</span>
            </div>
          ))}
        </div>

        {/* Right: Chart */}
        <div className="h-[320px] flex-1 w-full">
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 font-heading text-[10px] uppercase tracking-widest">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'donut' ? (
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={4}
                    dataKey="value"
                    onClick={handleChartClick}
                    className="cursor-pointer outline-none"
                    animationBegin={0}
                    animationDuration={1000}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        className="hover:opacity-80 transition-opacity outline-none" 
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 'bold' }} 
                    axisLine={{ stroke: '#1f2937' }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.05 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={handleChartClick} className="cursor-pointer">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">Click any segment or bar to filter the Day Log</p>
    </div>
  );
}
