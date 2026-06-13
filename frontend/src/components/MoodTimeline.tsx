'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CalendarRange, Info, Activity } from 'lucide-react';

interface TimelineItem {
  date: string;
  mood: string;
  moodScore: number;
  sleepHours: number;
  studyHours: number;
}

interface MoodTimelineProps {
  timeline: TimelineItem[];
}

const MOOD_LABELS: Record<number, string> = {
  1: '😔 Low',
  2: '😵 Overloaded',
  3: '🙂 Chill',
  4: '🚀 Motivated',
  5: '🔥 Locked In'
};

export default function MoodTimeline({ timeline }: MoodTimelineProps) {
  const hasData = timeline && timeline.length > 0;

  // Custom tooltips to fit dark theme
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-white/15 px-3.5 py-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white border-b border-white/5 pb-1 mb-1.5">{data.date}</p>
          <p className="text-slate-300 font-semibold flex items-center justify-between gap-4">
            <span>Vibe:</span>
            <span className="text-purple-400 font-bold">{MOOD_LABELS[data.moodScore] || data.mood}</span>
          </p>
          <p className="text-slate-300 flex items-center justify-between gap-4">
            <span>Sleep:</span>
            <span className="text-blue-400 font-semibold">{data.sleepHours} hrs</span>
          </p>
          <p className="text-slate-300 flex items-center justify-between gap-4">
            <span>Study/Work:</span>
            <span className="text-emerald-400 font-semibold">{data.studyHours} hrs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Format date to local month day (e.g. Jun 13)
  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch (e) {
      return dateStr;
    }
  };

  // Analyze positive factors for user feedback
  const getCorrelationTip = () => {
    if (timeline.length < 3) return null;
    
    // Check if high mood correlates with high sleep
    const goodDays = timeline.filter(t => t.moodScore >= 4);
    const avgSleepGood = goodDays.length > 0 ? goodDays.reduce((sum, d) => sum + d.sleepHours, 0) / goodDays.length : 0;
    
    if (avgSleepGood >= 7.0) {
      return {
        check: "Sleep > 7 hours",
        message: "Your mood improves significantly on days when sleep is over 7 hours! 😴"
      };
    }

    // Check if high study correlates with motivated
    const highStudyDays = timeline.filter(t => t.studyHours >= 7);
    const avgMoodHighStudy = highStudyDays.length > 0 ? highStudyDays.reduce((sum, d) => sum + d.moodScore, 0) / highStudyDays.length : 0;
    if (avgMoodHighStudy >= 4) {
      return {
        check: "Focus > 7 hours",
        message: "Your vibe peaks (Motivated/Locked In) on days with high study sessions! 🔥"
      };
    }

    return {
      check: "Consistent checks",
      message: "Your mood balances out when you maintain consistent, regular sleep schedules."
    };
  };

  const correlation = getCorrelationTip();

  return (
    <div className="glass-card p-6 md:p-8 relative h-full flex flex-col justify-between" role="region" aria-label="Mood Timeline">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20" aria-hidden="true">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-jakarta text-white">Mood Timeline</h2>
            <p className="text-xs text-slate-400">Track how sleep and focus hours impact your vibe</p>
          </div>
        </div>

        {!hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 mb-4 animate-pulse-glow">
              <CalendarRange className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">Awaiting Log History</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Add daily logs for sleep and study hours to see a detailed correlation trendline.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart */}
            <div className="h-[220px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDateLabel} 
                    stroke="rgba(255,255,255,0.3)" 
                    tickLine={false} 
                  />
                  <YAxis 
                    yAxisId="left"
                    domain={[1, 5]} 
                    ticks={[1, 2, 3, 4, 5]} 
                    tickFormatter={(tick) => MOOD_LABELS[tick] ? MOOD_LABELS[tick].split(' ')[0] : tick} 
                    stroke="rgba(255,255,255,0.3)" 
                    tickLine={false} 
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 16]} 
                    stroke="rgba(255,255,255,0.3)" 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle" 
                    iconSize={6}
                    wrapperStyle={{ paddingTop: -10, color: '#94a3b8' }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="moodScore" 
                    name="Vibe Score" 
                    stroke="#a78bfa" 
                    strokeWidth={3} 
                    dot={{ fill: '#c084fc', strokeWidth: 1, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="sleepHours" 
                    name="Sleep (hrs)" 
                    stroke="#38bdf8" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ fill: '#38bdf8', r: 3 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="studyHours" 
                    name="Study/Work (hrs)" 
                    stroke="#34d399" 
                    strokeWidth={2} 
                    strokeDasharray="2 2"
                    dot={{ fill: '#34d399', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {hasData && correlation && (
        <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl flex gap-2.5 items-start">
          <Activity className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[10.5px] font-bold text-purple-300">Correlation Insight</h4>
            <p className="text-[10.5px] text-purple-300/80 leading-normal mt-0.5">
              {correlation.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
