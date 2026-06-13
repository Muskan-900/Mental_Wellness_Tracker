'use client';

import React, { useState } from 'react';
import { Heart, Trophy, Sparkles, Edit2, Check } from 'lucide-react';

interface MoodPetProps {
  userId: string;
  petStage: string;
  petName: string;
  focusXP: number;
  activeMood: string;
  onPetRenamed: (newName: string) => void;
  apiBaseUrl: string;
}

// Stage configuration details
const STAGE_DETAILS: Record<string, {
  label: string;
  emoji: string;
  desc: string;
  nextLevelXP: number;
  level: number;
}> = {
  egg: {
    label: 'Cosmic Egg',
    emoji: '🐣',
    desc: 'Nova is resting inside. Log your vibe today to hatch your companion! 🌱',
    nextLevelXP: 50,
    level: 1
  },
  hatchling: {
    label: 'Baby Hatchling',
    emoji: '🐥',
    desc: 'Nova has hatched! Eager, bubbly, and learning mindfulness with you.',
    nextLevelXP: 150,
    level: 2
  },
  sprite: {
    label: 'Forest Sprite',
    emoji: '🧚',
    desc: 'Nova has sprouted wings! Glowing with positive focus and study auras.',
    nextLevelXP: 300,
    level: 3
  },
  guardian: {
    label: 'Mindful Guardian',
    emoji: '🦄',
    desc: 'Nova is fully evolved! A beacon of mental strength, helping you conquer all deadlines.',
    nextLevelXP: 9999, // Max level
    level: 4
  }
};

export default function MoodPet({ userId, petStage, petName, focusXP, activeMood, onPetRenamed, apiBaseUrl }: MoodPetProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(petName);
  const [petting, setPetting] = useState(false);
  const [petMessage, setPetMessage] = useState<string | null>(null);

  const stage = STAGE_DETAILS[petStage] || STAGE_DETAILS.egg;
  const progressPercent = Math.min((focusXP / stage.nextLevelXP) * 100, 100);

  // Interactive petting actions
  const handlePetClick = () => {
    if (petting) return;
    setPetting(true);
    
    // Choose a happy response from Nova
    const chirps = [
      `*Happy chirps* Thank you for the pets! ${stage.emoji}`,
      `${petName} leans into your touch! 💖`,
      `*Bounces with joy* We are in this check-in streak together! 🚀`,
      `*Glows softly* Remember to drink water today! 💧`
    ];
    const randomChirp = chirps[Math.floor(Math.random() * chirps.length)];
    setPetMessage(randomChirp);

    setTimeout(() => {
      setPetting(false);
    }, 1200);

    setTimeout(() => {
      setPetMessage(null);
    }, 5000);
  };

  // Rename pet backend trigger
  const handleRenameSubmit = async () => {
    if (!tempName.trim()) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/rename-pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petName: tempName.trim() })
      });
      if (response.ok) {
        onPetRenamed(tempName.trim());
        setIsEditingName(false);
      }
    } catch (err) {
      console.error('Failed to rename pet:', err);
    }
  };

  // Get conversational message based on active mood
  const getNovaQuote = () => {
    if (petMessage) return petMessage;

    switch (activeMood) {
      case 'Overloaded':
        return `“Breathe in, breathe out. You don't have to finish everything today. I'm right here with you.” 😵`;
      case 'Running on 2%':
        return `“Oof, running on empty? Let's take a break. Shut down your devices and get some sleep.” 😴`;
      case 'Feeling Low':
        return `“It's okay to feel down. You are doing your best, and that is more than enough.” 😔`;
      case 'Locked In':
        return `“Wow, you're absolutely crushing it! Let's maintain this focus aura.” 🔥`;
      case 'Motivated':
        return `“Energy is high! Let's take on our targets, step by step!” 🚀`;
      default:
        return `“Hey! Log your entry today to earn focus XP and help me evolve!” 🌱`;
    }
  };

  return (
    <div className="glass-card p-6 md:p-8 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Glow effect */}
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={15}
                  className="bg-slate-900 border border-white/20 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button onClick={handleRenameSubmit} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded-md cursor-pointer">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base font-jakarta">{petName}</h3>
                <button onClick={() => setIsEditingName(true)} className="p-1 hover:bg-white/5 text-slate-400 hover:text-white rounded-md cursor-pointer">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Lvl {stage.level}
            </span>
          </div>
          <span className="text-slate-500 text-xs font-semibold">{stage.label}</span>
        </div>

        {/* Pet Avatar Display with active animations */}
        <div className="flex flex-col items-center py-6 select-none">
          <div 
            onClick={handlePetClick}
            className={`text-6xl cursor-pointer transition duration-300 relative ${
              petting ? 'scale-125 -translate-y-4 animate-bounce' : 'animate-pet hover:scale-110'
            }`}
          >
            {stage.emoji}
            {petting && (
              <span className="absolute -top-3 -right-3 text-red-400 animate-ping">
                <Heart className="w-4 h-4 fill-red-400" />
              </span>
            )}
          </div>
          
          {/* Interactive message bubble */}
          <div className="mt-5 bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 max-w-xs text-center relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-slate-900 border-t border-l border-white/5"></div>
            <p className="text-[11.5px] font-medium text-slate-300 italic leading-relaxed">
              {getNovaQuote()}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar & Streaks */}
      <div className="space-y-4 border-t border-white/5 pt-4">
        {/* XP Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Focus XP
            </span>
            <span className="text-slate-200">{focusXP} / {stage.nextLevelXP} XP</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          {petStage !== 'guardian' ? (
            <p className="text-[9.5px] text-slate-500 text-right">
              Need {stage.nextLevelXP - focusXP} more XP to reach level {stage.level + 1}
            </p>
          ) : (
            <p className="text-[9.5px] text-slate-500 text-right flex items-center justify-end gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Nova is fully evolved!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
