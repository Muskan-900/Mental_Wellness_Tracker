'use client';

import React, { useState } from 'react';
import { BookOpen, Sparkles, Smile, Shield, AlertTriangle, Moon, BookOpen as StudyIcon, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AIJournalProps {
  userId: string;
  role: 'student' | 'professional';
  onJournalLogged: (data: {
    analysis: any;
    user: any;
  }) => void;
  apiBaseUrl: string;
}

export default function AIJournal({ userId, role, onJournalLogged, apiBaseUrl }: AIJournalProps) {
  const [journalText, setJournalText] = useState('');
  const [sleepHours, setSleepHours] = useState(7);
  const [studyHours, setStudyHours] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spamAlert, setSpamAlert] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJournalText(text);
    setCharacterCount(text.length);
    
    // Quick spam check client side
    if (text.length > 8 && !text.includes(' ')) {
      setSpamAlert(true);
    } else {
      setSpamAlert(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalText.trim()) {
      setError("Please write something about your day before submitting!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          journalText,
          sleepHours,
          studyHours,
          role
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit journal entry');
      }

      const data = await response.json();
      
      // If safety triggered or valid response, let parent know
      onJournalLogged({
        analysis: data.analysis,
        user: data.user
      });

      // Clear input on success
      setJournalText('');
      setCharacterCount(0);
      
      // Trigger Confetti Celebration for XP reward!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#a78bfa', '#f472b6', '#38bdf8', '#34d399']
      });

    } catch (err: any) {
      console.error(err);
      setError('Could not connect to the MindPulse server. Please make sure the backend is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 md:p-8 relative overflow-hidden">
      {/* Background soft glow decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-jakarta text-white">Mindfulness Journal</h2>
          <p className="text-xs text-slate-400">What happened today that made you feel this way?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sleep and Study parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sleep Hours Slider */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-blue-400" /> Sleep Duration
              </label>
              <span className="text-xs font-bold text-blue-400">{sleepHours} hrs</span>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Too short</span>
              <span>Healthy (7-8h)</span>
              <span>Excessive</span>
            </div>
          </div>

          {/* Study Hours Slider */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <StudyIcon className="w-3.5 h-3.5 text-purple-400" /> Study / Focus time
              </label>
              <span className="text-xs font-bold text-purple-400">{studyHours} hrs</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              step="0.5"
              value={studyHours}
              onChange={(e) => setStudyHours(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Chill</span>
              <span>Productive (4-8h)</span>
              <span>Hardcore (10h+)</span>
            </div>
          </div>
        </div>

        {/* Text Journal Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Share what's on your mind. Don't filter yourself.
          </label>
          <div className="relative">
            <textarea
              value={journalText}
              onChange={handleTextChange}
              placeholder={
                role === 'student'
                  ? "e.g. Spent 6 hours studying Physics but couldn't focus on the formula revision. Worried that everyone else is far ahead and my mock scores might drop..."
                  : "e.g. Tough day, meetings back-to-back. Manager wants the product deck by tomorrow, feeling overloaded and guilty for wasting 2 hours scrolling..."
              }
              rows={4}
              maxLength={15000}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition duration-200 resize-none font-jakarta"
            />
            
            {/* Edge Case Spam warning */}
            {spamAlert && (
              <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-amber-500 text-[10px] bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                <AlertTriangle className="w-3 h-3" />
                <span>Just letting you know: this reads a bit like keyboard spam. Real sentences help Nova analyze better!</span>
              </div>
            )}

            {/* Word count & Limit indicators */}
            <div className="absolute bottom-3 right-4 text-[10px] text-slate-500">
              {characterCount} / 15000 chars
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button with loader */}
        <button
          type="submit"
          disabled={loading || !journalText.trim()}
          className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition duration-300 ${
            loading || !journalText.trim()
              ? 'bg-purple-950/20 text-slate-500 border border-white/5 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Nova is analyzing patterns...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5" />
              <span>Log Entry & Grow Pet (+15 XP)</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 px-1 border-t border-white/5 pt-4">
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-emerald-500" /> Privacy-First: Local AES Encryption At Rest
        </span>
        <span>No diagnostic medical claims</span>
      </div>
    </div>
  );
}
