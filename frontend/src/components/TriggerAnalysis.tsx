'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShieldAlert, Info, TrendingUp } from 'lucide-react';

interface TriggerItem {
  name: string;
  count: number;
  percentage: number;
}

interface TriggerAnalysisProps {
  triggers: TriggerItem[];
}

// Curated harmonious color palette for dark theme triggers
const COLORS = [
  '#f472b6', // pink
  '#a78bfa', // purple
  '#38bdf8', // blue
  '#fbbf24', // amber
  '#34d399', // green
  '#fb7185', // rose
  '#818cf8', // indigo
  '#2dd4bf'  // teal
];

export default function TriggerAnalysis({ triggers }: TriggerAnalysisProps) {
  const hasData = triggers && triggers.length > 0;

  // Custom tooltips to fit dark aesthetic
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-white/15 px-3 py-2 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-white mb-0.5">{data.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }}></span>
            <span className="text-slate-300 font-semibold">{data.percentage}% ({data.count} times)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 md:p-8 relative h-full flex flex-col justify-between" role="region" aria-label="Hidden Triggers Analysis">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20" aria-hidden="true">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-jakarta text-white">Hidden Triggers</h2>
              <p className="text-xs text-slate-400">Recurring patterns parsed from check-ins</p>
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 mb-4 animate-pulse-glow">
              <Info className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">Awaiting Pattern Discovery</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Keep checking in and writing journal entries. Nova will scan for triggers (comparison, sleep, procrastination, burnout) and map them here.
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Chart Area */}
            <div className="h-[200px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={triggers}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {triggers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(17, 18, 25, 0.8)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Inside circle summary */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top Trigger</span>
                <span className="text-xs font-bold text-white max-w-[90px] truncate">{triggers[0].name}</span>
                <span className="text-xs font-semibold text-rose-400 mt-0.5">{triggers[0].percentage}%</span>
              </div>
            </div>

            {/* Legend / Breakdown List */}
            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
              {triggers.map((trigger, index) => (
                <div key={trigger.name} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="font-medium text-slate-300">{trigger.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">({trigger.count} logs)</span>
                    <span className="font-bold text-slate-200">{trigger.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl flex gap-2.5 items-start">
          <TrendingUp className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-rose-300 leading-normal">
            When **{triggers[0].name.toLowerCase()}** appears, your average mood drops. Pro-tip: Check out Nova's coping advice or use the breathing widgets!
          </p>
        </div>
      )}
    </div>
  );
}
