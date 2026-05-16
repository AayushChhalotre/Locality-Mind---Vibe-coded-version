
import React, { useState, useMemo } from 'react';
import { ShoppingBag, Info, Filter, Search, X } from 'lucide-react';
import { LocalityMetrics } from '../types';

interface CompetitionPanelProps {
  competition: LocalityMetrics['storeCompetition'];
}

export const CompetitionPanel: React.FC<CompetitionPanelProps> = ({ competition }) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique types and count occurrences for badges
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = { 'All': competition.length };
    competition.forEach(c => {
      stats[c.type] = (stats[c.type] || 0) + 1;
    });
    return stats;
  }, [competition]);

  const uniqueTypes = useMemo(() => Object.keys(typeStats), [typeStats]);

  // Combined Filtering Logic: Type + Search Text
  const filteredCompetition = useMemo(() => {
    return competition.filter(c => {
      const matchesType = activeFilter === 'All' || c.type === activeFilter;
      const matchesSearch = searchQuery === '' || 
        c.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [competition, activeFilter, searchQuery]);

  return (
    <div className="bg-white p-10 lg:p-14 rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col h-full space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Filter size={16} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Competitive Landscape</h3>
          </div>
          <p className="text-slate-900 text-3xl font-black tracking-tight leading-tight">
            Micro-Market Rivalry Matrix
          </p>
          <p className="text-slate-500 text-sm font-medium mt-3">
            Real-time synthesis of local business density, pricing benchmarks, and service archetypes.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Advanced Search Input */}
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rivals by name or service..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High-Fidelity Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-10">
        {uniqueTypes.map(type => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`group flex items-center gap-3 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeFilter === type 
              ? 'bg-slate-950 border-slate-950 text-white shadow-xl translate-y-[-2px]' 
              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'
            }`}
          >
            {type}
            <span className={`px-2 py-0.5 rounded-md text-[8px] transition-colors ${
              activeFilter === type ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
            }`}>
              {typeStats[type]}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
        {filteredCompetition.map((item, idx) => (
          <div 
            key={idx} 
            className="group relative p-10 rounded-[3.5rem] border border-slate-100 bg-white hover:bg-slate-950 hover:border-slate-950 transition-all duration-700 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2"
          >
            <div className="flex justify-between items-start mb-10">
              <div className="p-5 bg-indigo-50 rounded-[2rem] text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-700 shadow-sm">
                <ShoppingBag size={28} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-5 py-2 bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/20 transition-all">
                  {item.count} Nodes
                </span>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white/40">Density Index</span>
              </div>
            </div>
            
            <h4 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter group-hover:text-white transition-colors">{item.type}</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-12 h-16 overflow-hidden line-clamp-3 group-hover:text-slate-400 transition-colors">
              {item.description}
            </p>
            
            <div className="flex items-center justify-between pt-10 border-t border-slate-50 group-hover:border-white/10 transition-colors">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white/30">Pricing Benchmark</span>
                  <span className="text-lg font-black text-slate-950 group-hover:text-white transition-colors">
                    {item.avgPricePoint}
                  </span>
               </div>
               <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all hover:scale-110">
                  <Info size={20} />
               </button>
            </div>
          </div>
        ))}

        {filteredCompetition.length === 0 && (
          <div className="col-span-full py-48 text-center flex flex-col items-center">
            <div className="p-10 bg-slate-50 rounded-[3rem] mb-8 text-slate-200">
               <Search size={80} />
            </div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase">No Matching Rivals</h4>
            <p className="text-slate-400 font-bold mt-4 max-w-sm text-sm">
              The current filter parameters yielded no matches. Try expanding your search or clearing the type filters.
            </p>
            <button 
              onClick={() => { setActiveFilter('All'); setSearchQuery(''); }}
              className="mt-10 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all"
            >
              Reset Search Parameters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
