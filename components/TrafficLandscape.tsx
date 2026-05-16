
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp, MapPin } from 'lucide-react';

interface TrafficLandscapeProps {
  data: { hour: number; traffic: number }[];
}

export const TrafficLandscape: React.FC<TrafficLandscapeProps> = ({ data }) => {
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const peakHours = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.traffic - a.traffic);
    return sorted.slice(0, 3); // Get top 3 peaks for a richer timeline
  }, [data]);

  const maxTraffic = useMemo(() => Math.max(...data.map(d => d.traffic)), [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{formatHour(label)}</p>
          <p className="text-xl font-black text-white">{payload[0].value.toLocaleString()}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Estimated Visitors</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100 overflow-hidden relative flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Traffic Landscape</h3>
          <p className="text-slate-500 text-sm font-semibold">24-hour pedestrian & vehicle flow distribution</p>
        </div>
        <div className="flex gap-2">
          {peakHours.slice(0, 2).map((peak, idx) => (
            <div key={idx} className="px-4 py-1.5 bg-indigo-50 rounded-full text-[9px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={12} /> {formatHour(peak.hour)}
            </div>
          ))}
        </div>
      </div>
      
      <div className="h-[200px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="hour" 
              tickFormatter={formatHour}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }}
              interval={3}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="traffic" 
              stroke="#4f46e5" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorTraffic)" 
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap Timeline (YouTube Style Peak Indicators) */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Clock size={12} className="text-indigo-500" /> Peak Intensity Timeline
          </p>
          <span className="text-[10px] font-black text-slate-400">00:00 — 23:59</span>
        </div>
        
        <div className="relative pt-8 pb-4">
          {/* Timeline Bar */}
          <div className="relative h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
            {data.map((item, idx) => {
              const intensity = item.traffic / maxTraffic;
              return (
                <div 
                  key={idx} 
                  className="flex-1 transition-all duration-1000"
                  style={{ 
                    backgroundColor: '#6366f1',
                    opacity: Math.max(0.05, intensity)
                  }}
                  title={`${formatHour(item.hour)}: ${item.traffic} traffic`}
                />
              );
            })}
          </div>

          {/* Peak Indicators on Timeline */}
          {peakHours.map((peak, idx) => {
            const leftPosition = (peak.hour / 23) * 100;
            return (
              <div 
                key={idx} 
                className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-700 group"
                style={{ left: `${leftPosition}%` }}
              >
                {/* Numerical Indicator Label */}
                <div className="mb-1 px-2 py-1 bg-slate-900 text-[9px] font-black text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-none">
                  {formatHour(peak.hour)}: {(peak.traffic / 1000).toFixed(1)}k
                </div>
                
                {/* Marker Pin */}
                <div className="relative h-10 w-px bg-indigo-500/50 group-hover:bg-indigo-600 transition-colors">
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-125 ${idx === 0 ? 'bg-indigo-600' : 'bg-indigo-400'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend for Timeline */}
        <div className="flex justify-between px-2">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-50">Late Night</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-50 text-center">Business Hours</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-50 text-right">Evening Peak</span>
        </div>

        {/* Bottom Callout Metrics */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {peakHours.slice(0, 2).map((peak, idx) => (
            <div key={idx} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {idx === 0 ? 'Primary Peak' : 'Secondary Peak'}
                </p>
                <p className="text-xl font-black text-slate-900 leading-none">{formatHour(peak.hour)}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-600">{(peak.traffic / 1000).toFixed(1)}k</p>
                <p className="text-[8px] font-black text-slate-400 uppercase">Visitors / Hr</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
