'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Flame, Calendar, Info, RefreshCw, Trash2, Heart, Award, ShieldAlert, GraduationCap, Briefcase } from 'lucide-react';
import AIJournal from '../components/AIJournal';
import TriggerAnalysis from '../components/TriggerAnalysis';
import MoodTimeline from '../components/MoodTimeline';
import MoodPet from '../components/MoodPet';
import MicroMindfulness from '../components/MicroMindfulness';
import WrappedRecap from '../components/WrappedRecap';
import confetti from 'canvas-confetti';
import {
  registerLocalUser,
  getLocalUserProfile,
  seedLocalUserData,
  deleteLocalUserProfile,
  getLocalDashboardData
} from '../utils/localDb';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface UserProfile {
  id: string;
  name: string;
  focusXP: number;
  streakCount: number;
  petStage: string;
  petName: string;
  petXP: number;
  studyAura: string;
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<'student' | 'professional'>('student');
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPetName, setOnboardingPetName] = useState('');
  
  // Dashboard Analytics States
  const [timeline, setTimeline] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Modal / Alert States
  const [showWrapped, setShowWrapped] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<any | null>(null);
  const [recentXPAward, setRecentXPAward] = useState<{ amount: number; reason: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // 1. Check if user already registered on load
  useEffect(() => {
    const savedUserId = localStorage.getItem('mindpulse_userId');
    const savedRole = localStorage.getItem('mindpulse_role') as 'student' | 'professional';
    if (savedUserId) {
      setUserId(savedUserId);
      if (savedRole) setRole(savedRole);
      fetchDashboardData(savedUserId);
    }
  }, []);

  // 2. Fetch all database telemetry
  const fetchDashboardData = async (uid: string) => {
    setIsLoading(true);
    setBackendError(false);
    try {
      const dashData = getLocalDashboardData(uid);
      if (!dashData) {
        localStorage.removeItem('mindpulse_userId');
        localStorage.removeItem('mindpulse_role');
        setUserId(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setProfile({
        id: dashData.user.id,
        name: dashData.user.name,
        focusXP: dashData.user.focus_xp,
        streakCount: dashData.user.streak_count,
        petStage: dashData.user.pet_stage,
        petName: dashData.user.pet_name,
        petXP: dashData.user.pet_xp,
        studyAura: dashData.user.study_aura
      });

      // Format timeline items for Recharts
      const moodScores: Record<string, number> = {
        'Locked In': 5,
        'Motivated': 4,
        'Chill': 3,
        'Overloaded': 2,
        'Running on 2%': 1,
        'Feeling Low': 1
      };
      const mappedTimeline = dashData.timeline.map((t: any) => ({
        date: t.entry_date,
        mood: t.mood,
        moodScore: moodScores[t.mood] || 3,
        sleepHours: parseFloat(t.sleep_hours),
        studyHours: parseFloat(t.study_hours)
      }));
      setTimeline(mappedTimeline);

      // Format trigger statistics
      const mappedTriggers = Object.entries(dashData.triggers).map(([name, count]: any) => {
        const totalLogs = dashData.timeline.length || 1;
        const percentage = Math.round((count / totalLogs) * 100);
        return { name, count, percentage };
      }).sort((a, b) => b.count - a.count);
      setTriggers(mappedTriggers);

      setSuggestions(dashData.suggestions || []);
    } catch (err) {
      console.error(err);
      setBackendError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Register user onboarding
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim()) return;

    setIsLoading(true);
    setBackendError(false);
    try {
      const newUser = registerLocalUser(onboardingName.trim(), onboardingPetName.trim(), role);
      localStorage.setItem('mindpulse_userId', newUser.id);
      localStorage.setItem('mindpulse_role', role);
      setUserId(newUser.id);
      
      setProfile({
        id: newUser.id,
        name: newUser.name,
        focusXP: newUser.focus_xp,
        streakCount: newUser.focus_xp, // Initial streak is 0
        petStage: newUser.pet_stage,
        petName: newUser.pet_name,
        petXP: newUser.pet_xp,
        studyAura: newUser.study_aura
      });

      // Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error(err);
      setBackendError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Journal Submission results
  const handleJournalLogged = (data: { analysis: any; user: any }) => {
    // Check if safety filter was triggered
    if (data.analysis.safetyTriggered) {
      setSafetyAlert(data.analysis.safetyResources);
    }

    // Award XP alert animation
    const oldXP = profile?.focusXP || 0;
    const gained = data.user.focus_xp - oldXP;
    if (gained > 0) {
      showXPTotification(gained, 'Daily Journal Logging');
    }

    // Refresh telemetry
    if (userId) fetchDashboardData(userId);
  };

  // 5. XP Award Alert helper
  const showXPTotification = (amount: number, reason: string) => {
    setRecentXPAward({ amount, reason });
    setTimeout(() => {
      setRecentXPAward(null);
    }, 4000);
  };

  // 6. Seed dummy records (6-day historical data) for demo
  const handleSeedData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const updatedUser = seedLocalUserData(userId);
      if (updatedUser) {
        alert("Demo data successfully pre-populated! Nova pet, wrapped recap, and analytics are fully updated. 🚀");
        fetchDashboardData(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Delete Profile (GDPR compliance)
  const handleDeleteProfile = async () => {
    if (!userId) return;
    const confirmDelete = window.confirm("Are you sure you want to delete your profile? This deletes all your local journal logs, history, and pet stats permanently. ⚠️");
    if (!confirmDelete) return;

    try {
      deleteLocalUserProfile(userId);
      localStorage.removeItem('mindpulse_userId');
      localStorage.removeItem('mindpulse_role');
      setUserId(null);
      setProfile(null);
      setTimeline([]);
      setTriggers([]);
      setSuggestions([]);
      alert("Profile successfully deleted.");
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to compile Spotify wrapped summary
  const getWrappedDataObj = () => {
    // Dominant Mood calculation
    const moods = timeline.map(t => t.mood);
    const moodCounts = moods.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {} as Record<string, number>);
    const sortedMoods = (Object.entries(moodCounts) as Array<[string, number]>).sort((a, b) => b[1] - a[1]);
    const topMood = sortedMoods[0] ? sortedMoods[0][0] : 'Chill';

    // Best Day calculation
    const dayOfWeek = timeline.map(t => {
      const date = new Date(t.date);
      return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    });
    const dayCounts = dayOfWeek.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>);
    const sortedDays = (Object.entries(dayCounts) as Array<[string, number]>).sort((a, b) => b[1] - a[1]);
    const bestDay = sortedDays[0] ? sortedDays[0][0] : 'Wednesday';

    return {
      totalCheckins: timeline.length,
      topMood,
      topTrigger: triggers[0]?.name || 'Routine pressure',
      bestDay,
      strongestWeek: 'Week 2',
      aura: profile?.studyAura || 'Balanced',
      xpEarned: profile?.focusXP || 0,
      maxStreak: profile?.streakCount || 0,
      petStage: profile?.petStage || 'egg'
    };
  };

  // Onboarding registration form rendering
  if (!userId) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[80vh] px-4">
        <div className="glass-card p-8 w-full max-w-md relative overflow-hidden" role="region" aria-label="User onboarding">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" aria-hidden="true"></div>
          
          <div className="text-center space-y-3 mb-8">
            <span className="text-3xl" role="img" aria-label="Seedling">🌱</span>
            <h1 className="text-3xl font-extrabold font-outfit text-white tracking-tight leading-tight">
              MindPulse AI
            </h1>
            <p className="text-sm text-slate-400">
              Your Study & Stress Sidekick
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6" aria-label="Registration form">
            <div className="space-y-2">
              <label htmlFor="onboarding-name" className="text-xs font-semibold text-slate-300 block">
                Hey! What should I call you?
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                placeholder="Enter your name"
                required
                autoComplete="name"
                aria-required="true"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="onboarding-pet-name" className="text-xs font-semibold text-slate-300 block">
                What would you like to name your pet companion?
              </label>
              <input
                id="onboarding-pet-name"
                type="text"
                value={onboardingPetName}
                onChange={(e) => setOnboardingPetName(e.target.value)}
                placeholder="Default: Nova"
                autoComplete="off"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            {/* Role selection toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block" id="role-group-label">
                What describes your focus area right now?
              </label>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="role-group-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === 'student'}
                  onClick={() => setRole('student')}
                  className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    role === 'student'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-white/5 bg-slate-950/20 text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-5 h-5 text-purple-400" aria-hidden="true" />
                  <span className="text-xs font-semibold">Exams (JEE, NEET, GATE)</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === 'professional'}
                  onClick={() => setRole('professional')}
                  className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    role === 'professional'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-white/5 bg-slate-950/20 text-slate-400 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-5 h-5 text-pink-400" aria-hidden="true" />
                  <span className="text-xs font-semibold">Office & Deadlines</span>
                </button>
              </div>
            </div>

            {backendError && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-lg" role="alert">
                Could not save data locally. Please try again.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !onboardingName.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-sm cursor-pointer shadow-lg shadow-purple-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Sidekick...' : "Let's Go! 🚀"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      
      {/* XP Achievement Floating Banner */}
      {recentXPAward && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950 border border-emerald-500/30 px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce" role="status" aria-live="polite">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center" aria-hidden="true">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-white">+{recentXPAward.amount} XP Awarded!</p>
            <p className="text-[10px] text-slate-400">Reason: {recentXPAward.reason}</p>
          </div>
        </div>
      )}

      {/* Safety hotline modal */}
      {safetyAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="safety-dialog-title">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 md:p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 flex items-center justify-center rounded-full mx-auto" aria-hidden="true">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 id="safety-dialog-title" className="text-xl font-bold text-white font-jakarta">You're Not Alone. Support is Here.</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We noticed some really heavy thoughts in your entry. Your life is valuable. Please connect with someone who can help right now.
            </p>
            
            <ul className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1" aria-label="Crisis helpline resources">
              {safetyAlert.resources.map((res: any) => (
                <li key={res.name} className="p-3 bg-slate-950 border border-white/5 rounded-xl text-left">
                  <p className="text-xs font-bold text-white">{res.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-black text-red-400">{res.number}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">{res.hours}</span>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setSafetyAlert(null)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              I Understand, Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* TOP PROFILE HEADER */}
      {profile && (
        <header className="glass-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-purple-500 relative overflow-hidden" aria-label="User profile summary">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" aria-hidden="true"></div>
          
          <div className="flex items-center gap-4">
            <div className="text-3xl p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              {profile.petStage === 'egg' ? '🐣' : profile.petStage === 'hatchling' ? '🐥' : profile.petStage === 'sprite' ? '🧚' : '🦄'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-jakarta">Hey, {profile.name}!</h1>
                <span className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase">
                  {role === 'student' ? 'Student' : 'Professional'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                Companion: <span className="text-emerald-400 font-bold">{profile.petName}</span> • 
                Active Study Aura: 
                <span className={`font-bold px-1.5 py-0.2 rounded ${
                  profile.studyAura === 'Focused' ? 'text-purple-400 bg-purple-400/5' :
                  profile.studyAura === 'Calm' ? 'text-blue-400 bg-blue-400/5' :
                  profile.studyAura === 'Stressed' ? 'text-orange-400 bg-orange-400/5' : 'text-emerald-400 bg-emerald-400/5'
                }`}>
                  {profile.studyAura}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Streak Counter */}
            <div className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-[9px] uppercase text-slate-500 font-bold">Streak</p>
                <p className="text-xs font-black text-white">{profile.streakCount} Days</p>
              </div>
            </div>

            {/* Total Focus XP */}
            <div className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[9px] uppercase text-slate-500 font-bold">Focus XP</p>
                <p className="text-xs font-black text-white">{profile.focusXP} XP</p>
              </div>
            </div>

            {/* Seed Demo Button */}
            <button
              onClick={handleSeedData}
              title="Inject 6 days of historical logs to see visual charts, pet evolution stages, and study wrapped instantly!"
              className="bg-slate-950/60 hover:bg-slate-950 border border-white/5 hover:border-white/10 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> Seed Demo
            </button>

            {/* Delete Profile Button */}
            <button
              onClick={handleDeleteProfile}
              title="Delete Profile & All Logs"
              aria-label="Delete profile and all logs"
              className="p-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/30 rounded-xl text-red-400 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Delete profile and all logs</span>
            </button>
          </div>
        </header>
      )}

      {/* API ERROR BAR */}
      {backendError && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-2.5 text-red-400 text-xs" role="alert">
          <Info className="w-4.5 h-4.5 shrink-0" aria-hidden="true" />
          <span>Something went wrong. Please refresh the page and try again.</span>
        </div>
      )}

      {/* DASHBOARD GRID WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Logging & Pet Companion */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          <AIJournal
            userId={userId}
            role={role}
            onJournalLogged={handleJournalLogged}
            apiBaseUrl={API_BASE_URL}
          />
          {profile && (
            <div className="flex-1">
              <MoodPet
                userId={userId}
                petStage={profile.petStage}
                petName={profile.petName}
                focusXP={profile.focusXP}
                activeMood={timeline[0]?.mood || 'Chill'}
                onPetRenamed={(name) => setProfile(prev => prev ? { ...prev, petName: name } : null)}
                apiBaseUrl={API_BASE_URL}
              />
            </div>
          )}
        </div>

        {/* Right Column: Grounding widget & Analytics charts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <MicroMindfulness
              userId={userId}
              onXPAwarded={(xp, reason) => {
                setProfile(prev => prev ? { ...prev, focusXP: prev.focusXP + xp } : null);
                showXPTotification(xp, reason);
              }}
              apiBaseUrl={API_BASE_URL}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeline */}
            <div className="h-full">
              <MoodTimeline timeline={timeline} />
            </div>

            {/* Hidden Triggers */}
            <div className="h-full">
              <TriggerAnalysis triggers={triggers} />
            </div>
          </div>
        </div>

      </div>

      {/* SPOTIFY WRAPPED FLOATING BANNER OR BUTTON */}
      {timeline.length >= 3 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowWrapped(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-2xl hover:scale-105 transition duration-300 cursor-pointer animate-pulse-glow"
          >
            <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-spin" />
            <span>Open MindPulse Wrapped!</span>
          </button>
        </div>
      )}

      {/* IMMERSIVE SPOTIFY WRAPPED CAROUSEL MODAL */}
      {showWrapped && (
        <WrappedRecap
          data={getWrappedDataObj()}
          onClose={() => setShowWrapped(false)}
        />
      )}

    </div>
  );
}
