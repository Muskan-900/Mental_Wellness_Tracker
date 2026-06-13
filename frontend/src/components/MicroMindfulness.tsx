'use client';

import React, { useState, useEffect } from 'react';
import { Wind, Eye, Compass, Award, CheckCircle, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { rewardLocalXP } from '../utils/localDb';

interface MicroMindfulnessProps {
  userId: string;
  onXPAwarded: (xpGained: number, reason: string) => void;
  apiBaseUrl: string;
}

export default function MicroMindfulness({ userId, onXPAwarded, apiBaseUrl }: MicroMindfulnessProps) {
  const [activeTab, setActiveTab] = useState<'reset' | 'breathing' | 'reboot'>('reset');
  const [loading, setLoading] = useState(false);

  // 1. 30 Second Reset States
  const [see1, setSee1] = useState('');
  const [see2, setSee2] = useState('');
  const [see3, setSee3] = useState('');
  const [hear1, setHear1] = useState('');
  const [hear2, setHear2] = useState('');
  const [feel1, setFeel1] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);

  // 2. Exam Calm States
  const [breathState, setBreathState] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Ready'>('Ready');
  const [breathTimer, setBreathTimer] = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);
  const [breathingCompleted, setBreathingCompleted] = useState(false);

  // 3. Confidence Reboot States
  const [smallWin, setSmallWin] = useState('');
  const [rebootCompleted, setRebootCompleted] = useState(false);

  // Box Breathing Loop Logic
  useEffect(() => {
    if (breathState === 'Ready' || breathingCompleted) return;

    const interval = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          // Transition state
          if (breathState === 'Inhale') {
            setBreathState('Hold');
            return 4; // hold 4s
          } else if (breathState === 'Hold') {
            setBreathState('Exhale');
            return 6; // exhale 6s
          } else if (breathState === 'Exhale') {
            const nextCycle = breathCycles + 1;
            setBreathCycles(nextCycle);
            if (nextCycle >= 3) {
              setBreathingCompleted(true);
              setBreathState('Ready');
              triggerXPReward(15, 'Exam Calm Mode');
              return 0;
            } else {
              setBreathState('Inhale');
              return 4; // inhale 4s
            }
          }
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breathState, breathTimer, breathCycles, breathingCompleted]);

  // Award XP helper
  const triggerXPReward = async (xpAmount: number, reason: string) => {
    setLoading(true);
    try {
      const updatedUser = rewardLocalXP(userId, xpAmount);
      if (updatedUser) {
        onXPAwarded(xpAmount, reason);
        confetti({
          particleCount: 50,
          spread: 45,
          origin: { y: 0.8 },
          colors: ['#34d399', '#38bdf8', '#a78bfa']
        });
      }
    } catch (err) {
      console.error('Failed to update XP:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!see1 || !see2 || !see3 || !hear1 || !hear2 || !feel1) return;
    setResetCompleted(true);
    triggerXPReward(15, '30-Second Reset');
  };

  const startBreathing = () => {
    setBreathingCompleted(false);
    setBreathCycles(0);
    setBreathState('Inhale');
    setBreathTimer(4);
  };

  const handleRebootSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smallWin.trim()) return;
    setRebootCompleted(true);
    triggerXPReward(15, 'Confidence Reboot');
  };

  // Reset exercise states to try again
  const resetExercise = (tab: 'reset' | 'breathing' | 'reboot') => {
    if (tab === 'reset') {
      setSee1(''); setSee2(''); setSee3('');
      setHear1(''); setHear2('');
      setFeel1('');
      setResetCompleted(false);
    } else if (tab === 'breathing') {
      setBreathingCompleted(false);
      setBreathCycles(0);
      setBreathState('Ready');
    } else {
      setSmallWin('');
      setRebootCompleted(false);
    }
  };

  return (
    <div className="glass-card p-6 md:p-8 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Background soft glow decoration */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-jakarta text-white">2-Minute Reset</h2>
            <p className="text-xs text-slate-400">Micro-mindfulness to calm exam or deadline anxiety</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-white/5 mb-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('reset')}
            className={`flex-1 py-2 rounded-lg cursor-pointer transition ${
              activeTab === 'reset' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            30s Grounding
          </button>
          <button
            onClick={() => setActiveTab('breathing')}
            className={`flex-1 py-2 rounded-lg cursor-pointer transition ${
              activeTab === 'breathing' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Exam Calm
          </button>
          <button
            onClick={() => setActiveTab('reboot')}
            className={`flex-1 py-2 rounded-lg cursor-pointer transition ${
              activeTab === 'reboot' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Small Win
          </button>
        </div>

        {/* Tab Content: 30s Grounding Reset */}
        {activeTab === 'reset' && (
          <div className="space-y-4">
            {!resetCompleted ? (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <p className="text-[11.5px] text-slate-400 italic">
                  Look around you right now. Ground your senses to dissolve panic:
                </p>

                {/* 3 things you see */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-teal-400" /> Name 3 things you see
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Thing 1"
                      value={see1}
                      onChange={(e) => setSee1(e.target.value)}
                      required
                      className="bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Thing 2"
                      value={see2}
                      onChange={(e) => setSee2(e.target.value)}
                      required
                      className="bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Thing 3"
                      value={see3}
                      onChange={(e) => setSee3(e.target.value)}
                      required
                      className="bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* 2 things you hear */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-teal-400" /> Name 2 things you hear
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Sound 1"
                      value={hear1}
                      onChange={(e) => setHear1(e.target.value)}
                      required
                      className="bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Sound 2"
                      value={hear2}
                      onChange={(e) => setHear2(e.target.value)}
                      required
                      className="bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* 1 thing you feel */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-teal-400" /> Name 1 thing you physically feel
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cold air from fan, fabric of shirt"
                    value={feel1}
                    onChange={(e) => setFeel1(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition"
                >
                  {loading ? 'Submitting...' : 'Ground Yourself (+15 XP)'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-teal-400 animate-bounce" />
                <h4 className="text-sm font-bold text-white">Reset Completed!</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Nice job. You brought your awareness back to the present moment. Earned +15 XP! 🌱
                </p>
                <button
                  onClick={() => resetExercise('reset')}
                  className="px-4 py-1.5 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                >
                  Do it again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Exam Calm (Box Breathing) */}
        {activeTab === 'breathing' && (
          <div className="space-y-6">
            {!breathingCompleted ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-6">
                <p className="text-[11.5px] text-slate-400 text-center italic max-w-xs">
                  Breathe in sync with the circle. Inhale 4s, Hold 4s, Exhale 6s. Repeat 3 times.
                </p>

                {/* Animated breathing circle */}
                <div className="relative flex items-center justify-center w-36 h-36">
                  {/* Outer glowing pulsing aura */}
                  <div 
                    className={`absolute inset-0 bg-teal-500/10 rounded-full border border-teal-500/30 transition-transform duration-1000 ${
                      breathState === 'Inhale' ? 'scale-125' : breathState === 'Exhale' ? 'scale-90' : 'scale-110'
                    }`}
                  ></div>
                  
                  {/* Central interactive circle */}
                  <div 
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg bg-teal-600/90 text-white transition-transform duration-1000 ${
                      breathState === 'Inhale' ? 'scale-115' : breathState === 'Exhale' ? 'scale-90' : 'scale-100'
                    }`}
                  >
                    <Wind className="w-6 h-6 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5">{breathState}</span>
                    {breathState !== 'Ready' && <span className="text-sm font-extrabold mt-0.5">{breathTimer}s</span>}
                  </div>
                </div>

                {breathState === 'Ready' ? (
                  <button
                    onClick={startBreathing}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-md"
                  >
                    Start Breathing Circle
                  </button>
                ) : (
                  <div className="text-center w-full space-y-3">
                    <span className="text-xs font-bold text-slate-300">Cycle {breathCycles + 1} of 3</span>
                    <div className="flex gap-1.5 justify-center mt-1.5">
                      {[0, 1, 2].map((i) => (
                        <div 
                          key={i} 
                          className={`w-2.5 h-2.5 rounded-full border border-teal-500/30 ${
                            i < breathCycles ? 'bg-teal-400' : 'bg-slate-900'
                          }`}
                        ></div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setBreathState('Ready');
                        setBreathCycles(0);
                        setBreathTimer(4);
                      }}
                      className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold cursor-pointer transition"
                    >
                      Stop Breathing
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-teal-400 animate-bounce" />
                <h4 className="text-sm font-bold text-white">Mindfulness Unlocked!</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Your nervous system is calming down. You logged +15 focus XP. Keep riding this wave! 🌊
                </p>
                <button
                  onClick={() => resetExercise('breathing')}
                  className="px-4 py-1.5 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                >
                  Do it again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Confidence Reboot (Small Wins) */}
        {activeTab === 'reboot' && (
          <div className="space-y-4">
            {!rebootCompleted ? (
              <form onSubmit={handleRebootSubmit} className="space-y-4">
                <p className="text-[11.5px] text-slate-400 italic">
                  Anxiety forces your brain to only see threats. Reprogram it by naming one small success from today.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-teal-400" /> What's one thing you completed?
                  </label>
                  <textarea
                    value={smallWin}
                    onChange={(e) => setSmallWin(e.target.value)}
                    required
                    placeholder="e.g. Attended physics mock review, wrote 10 lines of code, drank 3L water, or just sat through a hard class. Small wins count!"
                    rows={3}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 resize-none font-jakarta"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !smallWin.trim()}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging win...' : 'Celebrate Small Win (+15 XP)'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-teal-400 animate-bounce" />
                <h4 className="text-sm font-bold text-white">Small Win Celebrated!</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Every step is progress. Keep adding small bricks, and you will build the whole wall. +15 XP logged! 🧱
                </p>
                <button
                  onClick={() => resetExercise('reboot')}
                  className="px-4 py-1.5 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                >
                  Log another win
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
