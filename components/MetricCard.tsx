
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  Icon: React.ElementType;
  subtitle?: string;
  colorClass?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, Icon, subtitle, colorClass = "bg-white" }) => {
  return (
    <div className={`${colorClass} p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-sm font-medium">{title}</span>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          <Icon size={20} className="w-6 h-6 text-indigo-600" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
};
