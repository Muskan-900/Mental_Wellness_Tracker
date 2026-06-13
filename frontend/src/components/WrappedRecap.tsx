'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Share2, Award, Calendar, AlertCircle, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WrappedData {
  totalCheckins: number;
  topMood: string;
  topTrigger: string;
  bestDay: string;
  strongestWeek: string;
  aura: string;
  xpEarned: number;
  maxStreak: number;
  petStage: string;
}

interface WrappedRecapProps {
  data: WrappedData;
  onClose: () => void;
}

const MOOD_EMOJIS: Record<string, string> = {
  'Locked In': '🔥',
  'Chill': '🙂',
  'Overloaded': '😵',
  'Running on 2%': '😴',
  'Feeling Low': '😔',
  'Motivated': '🚀'
};

const AURA_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  'Focused': { bg: 'from-purple-600 to-indigo-600', text: 'text-purple-200', glow: 'rgba(168, 85, 247, 0.4)' },
  'Calm': { bg: 'from-blue-600 to-sky-500', text: 'text-blue-200', glow: 'rgba(14, 165, 233, 0.4)' },
  'Stressed': { bg: 'from-orange-600 to-red-500', text: 'text-orange-200', glow: 'rgba(249, 115, 22, 0.4)' },
  'Tired': { bg: 'from-slate-700 to-zinc-900', text: 'text-slate-200', glow: 'rgba(100, 116, 139, 0.4)' },
  'Overwhelmed': { bg: 'from-rose-600 to-pink-500', text: 'text-rose-200', glow: 'rgba(244, 114, 182, 0.4)' },
  'Balanced': { bg: 'from-emerald-600 to-teal-500', text: 'text-emerald-200', glow: 'rgba(52, 211, 153, 0.4)' }
};

export default function WrappedRecap({ data, onClose }: WrappedRecapProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const totalSlides = 5;
  const auraStyle = AURA_COLORS[data.aura] || AURA_COLORS.Balanced;

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
      // Trigger subtle side confetti on the final slide
      if (currentSlide + 1 === totalSlides - 1) {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const shareWrapped = () => {
    // Simulate share action
    alert("Copied your MindPulse Wrapped card to clipboard! Post it on your close friends list! 📸");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md h-[520px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between p-6 bg-slate-900">
        
        {/* Neon top background splash */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] rounded-full bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-transparent blur-3xl pointer-events-none"></div>

        {/* Header Progress Indicators */}
        <div className="flex gap-1.5 w-full relative z-10">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div 
              key={idx} 
              className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden"
            >
              <div 
                className={`h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                  idx < currentSlide ? 'w-full' : idx === currentSlide ? 'w-full' : 'w-0'
                }`}
              ></div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-9 right-6 text-slate-400 hover:text-white text-xs font-bold bg-white/5 border border-white/15 px-3 py-1 rounded-full z-10 cursor-pointer"
        >
          Exit Recap
        </button>

        {/* SLIDE CONTENT AREA */}
        <div className="flex-1 flex flex-col justify-center py-8 relative z-10 px-2 select-none">
          
          {/* Slide 0: Intro Stats */}
          {currentSlide === 0 && (
            <div className="text-center space-y-4 animate-scale-up">
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold uppercase px-3 py-1 rounded-full border border-purple-500/30 tracking-wider">
                My MindPulse Wrapped
              </span>
              <h1 className="text-3xl font-extrabold font-outfit text-white tracking-tight leading-tight pt-2">
                You checked in <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-sky-400 font-black text-5xl">
                  {data.totalCheckins} Days
                </span> <br />
                this month!
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                That's {data.totalCheckins} moments of self-awareness. In a world of notifications, you chose to check in on yourself. 🤍
              </p>
              <div className="pt-4 flex justify-center gap-6 text-xs font-bold text-slate-300">
                <div className="text-center bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider">Streak</p>
                  <p className="text-base text-amber-400 font-black">{data.maxStreak} Days</p>
                </div>
                <div className="text-center bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider">XP Accumulated</p>
                  <p className="text-base text-teal-400 font-black">+{data.xpEarned} XP</p>
                </div>
              </div>
            </div>
          )}

          {/* Slide 1: Dominant Mood */}
          {currentSlide === 1 && (
            <div className="text-center space-y-4 animate-scale-up">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Your Main Vibe</p>
              <div className="text-8xl py-4 animate-bounce">
                {MOOD_EMOJIS[data.topMood] || '💪'}
              </div>
              <h2 className="text-3xl font-black text-white font-outfit">
                Mostly <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{data.topMood}</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Prepared, focused, or pushing through the limits. No matter the score drops or deadlines, you stayed committed.
              </p>
            </div>
          )}

          {/* Slide 2: Top Trigger */}
          {currentSlide === 2 && (
            <div className="text-center space-y-4 animate-scale-up">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">The Stress Factor</p>
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white font-outfit max-w-xs mx-auto leading-tight pt-2">
                Your biggest trigger was <br />
                <span className="text-rose-400 text-3xl font-black">{data.topTrigger}</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mt-2">
                Nova noticed that comparisons or test pressure triggered increased anxiety. Naming it is the first step to neutralising it.
              </p>
            </div>
          )}

          {/* Slide 3: Strength Day */}
          {currentSlide === 3 && (
            <div className="text-center space-y-4 animate-scale-up">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Peak Chill Day</p>
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white font-outfit max-w-xs mx-auto leading-tight pt-2">
                You felt best on <br />
                <span className="text-sky-400 text-4xl font-black">{data.bestDay}s</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mt-2">
                Usually, this correlates with getting proper sleep or wrapping up goals early. Let's aim to repeat that routine next week!
              </p>
            </div>
          )}

          {/* Slide 4: Study Aura sharing card */}
          {currentSlide === 4 && (
            <div className="space-y-4 text-center animate-scale-up">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Your Study Aura Card</p>
              
              {/* Shareable Card Grid */}
              <div className={`p-6 rounded-3xl bg-gradient-to-br ${auraStyle.bg} border border-white/20 text-left relative overflow-hidden shadow-2xl mx-auto max-w-[280px]`}>
                
                {/* Aura glowing circle */}
                <div 
                  className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl pointer-events-none"
                  style={{ backgroundColor: auraStyle.glow }}
                ></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-white/50">Study Aura</span>
                    <h4 className="text-2xl font-black text-white leading-tight font-outfit">{data.aura}</h4>
                  </div>
                  <span className="text-2xl">{MOOD_EMOJIS[data.topMood] || '🐣'}</span>
                </div>

                <div className="space-y-2 mt-8 text-white">
                  <div className="flex justify-between items-center text-[10px] border-b border-white/10 pb-1">
                    <span className="opacity-60">Month check-ins</span>
                    <span className="font-bold">{data.totalCheckins} Days</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-b border-white/10 pb-1">
                    <span className="opacity-60">Top Trigger</span>
                    <span className="font-bold max-w-[120px] truncate">{data.topTrigger}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="opacity-60">Companion Stage</span>
                    <span className="font-bold capitalize">{data.petStage}</span>
                  </div>
                </div>

                <div className="mt-8 flex justify-between items-center border-t border-white/10 pt-3 text-[9px] text-white/50 font-bold uppercase tracking-wider">
                  <span>MindPulse AI</span>
                  <span>made in india</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 max-w-[280px] mx-auto pt-2">
                <button
                  onClick={shareWrapped}
                  className="flex-1 py-2 px-3 bg-white text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-200 transition"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Aura Card
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Slides Navigation */}
        <div className="flex justify-between items-center border-t border-white/5 pt-4 relative z-10">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`p-2.5 rounded-full border border-white/15 bg-white/5 text-slate-300 hover:text-white cursor-pointer transition ${
              currentSlide === 0 ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs text-slate-500 font-semibold">
            Slide {currentSlide + 1} of {totalSlides}
          </span>

          {currentSlide < totalSlides - 1 ? (
            <button
              onClick={nextSlide}
              className="p-2.5 rounded-full border border-white/15 bg-purple-600 text-white hover:bg-purple-500 cursor-pointer transition"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="py-2 px-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 rounded-full text-xs font-bold cursor-pointer transition"
            >
              Finish Wrapped
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
