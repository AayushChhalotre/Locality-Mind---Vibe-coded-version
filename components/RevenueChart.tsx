
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RevenueProjections } from '../types';

interface RevenueChartProps {
  projections?: RevenueProjections;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ projections }) => {
  // Graceful fallback if projections are missing
  if (!projections) {
    return (
      <div className="h-[500px] w-full bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Revenue data unavailable for this synthesis</p>
      </div>
    );
  }

  const data = [
    { name: 'Monthly', value: projections.monthly || 0, color: '#6366f1' },
    { name: 'Quarterly', value: projections.quarterly || 0, color: '#8b5cf6' },
    { name: 'Yearly', value: projections.yearly || 0, color: '#ec4899' },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: projections.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="h-[500px] w-full bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-10">Revenue Projections (Est.)</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} padding={{ left: 20, right: 20 }} />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => `₹${val >= 100000 ? (val/100000).toFixed(1)+'L' : val}`}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
          />
          <Bar dataKey="value" radius={[16, 16, 16, 16]} barSize={60}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
