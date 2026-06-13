// Client-side Local Database & Rules-based Heuristics Engine

// Crisis Resources (India & International)
const CRISIS_RESOURCES = {
  message: "I'm really concerned about your safety. Please reach out to someone you trust or contact emergency support immediately.",
  resources: [
    { name: "Kiran Mental Health Helpline (India)", number: "1800-599-0019", hours: "24/7" },
    { name: "Vandrevala Foundation (India)", number: "+91-9999-666-555", hours: "24/7" },
    { name: "AASRA (India)", number: "+91-9820466726", hours: "24/7" },
    { name: "Sneha India", number: "+91-44-24640050", hours: "24/7" },
    { name: "National Suicide Prevention Lifeline (US)", number: "988", hours: "24/7" },
    { name: "Crisis Text Line", number: "Text HOME to 741741", hours: "24/7" }
  ]
};

// Heuristic keyword definitions for trigger detection
const TRIGGER_KEYWORDS: Record<string, string[]> = {
  "Academic pressure": [
    'exam', 'test', 'mock', 'study', 'score', 'rank', 'syllabus', 'physics', 'chemistry', 'maths', 'biology', 
    'jee', 'neet', 'upsc', 'gate', 'placement', 'grade', 'marks', 'fail', 'college', 'professor', 'teacher'
  ],
  "Comparison with peers": [
    'comparison', 'compare', 'friend', 'peer', 'ahead of me', 'better than me', 'everyone else', 'scores', 'rank list',
    'smarter', 'topper', 'behind', 'lacking'
  ],
  "Sleep deprivation": [
    'sleep', 'insomnia', 'awake', 'tired', 'exhausted', 'night', 'rest', 'sleepy', 'slept 2 hours', 'slept 3 hours', 
    'slept 4 hours', 'slept 5 hours', 'running on no sleep', 'groggy'
  ],
  "Procrastination guilt": [
    'procrastinate', 'wasted time', 'scroll', 'instagram', 'youtube', 'phone', 'distracted', 'lazy', 'should have',
    'delay', 'put off', 'doing nothing', 'guilt'
  ],
  "Family expectations": [
    'parent', 'mom', 'dad', 'family', 'expectation', 'disappoint', 'relatives', 'brother', 'sister', 'mother', 'father'
  ],
  "Workplace deadlines": [
    'deadline', 'manager', 'boss', 'meeting', 'project', 'client', 'workload', 'office', 'job', 'deliverable',
    'jira', 'sprint', 'task list'
  ],
  "Burnout": [
    'burnout', 'exhausted', 'break', 'can\'t do this', 'drained', 'tired of everything', 'give up', 'no energy',
    'overwhelmed', 'done with life'
  ],
  "Financial concerns": [
    'money', 'loan', 'cost', 'fee', 'financial', 'debt', 'salary', 'job hunt', 'expensive', 'afford'
  ]
};

// Mood classification heuristic rules
const MOOD_RULES = [
  {
    mood: 'Overloaded',
    vibe: '😵 Overloaded',
    keywords: ['stressed', 'anxious', 'panic', 'overwhelmed', 'scared', 'worry', 'fear', 'tension', 'heavy', 'mock test score dropped', 'mock test', 'mock exam'],
    weight: 1.5
  },
  {
    mood: 'Running on 2%',
    vibe: '😴 Running on 2%',
    keywords: ['tired', 'sleepy', 'exhausted', 'drained', 'no sleep', 'burnout', 'insomnia', 'fatigue', 'heavy eyes'],
    weight: 1.4
  },
  {
    mood: 'Feeling Low',
    vibe: '😔 Feeling Low',
    keywords: ['sad', 'low', 'depressed', 'cry', 'lonely', 'disappointed', 'failed', 'behind', 'hopeless', 'bad day'],
    weight: 1.3
  },
  {
    mood: 'Locked In',
    vibe: '🔥 Locked In',
    keywords: ['focus', 'concentrate', 'study', 'productive', 'completed', 'syllabus', 'finish', 'revision', 'prepared'],
    weight: 1.2
  },
  {
    mood: 'Motivated',
    vibe: '🚀 Motivated',
    keywords: ['excited', 'happy', 'motivated', 'confident', 'ready', 'achieve', 'cracked', 'good score', 'positive', 'energetic'],
    weight: 1.2
  },
  {
    mood: 'Chill',
    vibe: '🙂 Chill',
    keywords: ['chill', 'fine', 'okay', 'relax', 'nothing much', 'peaceful', 'good sleep', 'watching movie', 'hanging out'],
    weight: 1.0
  }
];

// In-memory schema definitions
export interface LocalUser {
  id: string;
  name: string;
  focus_xp: number;
  streak_count: number;
  pet_stage: string;
  pet_name: string;
  pet_xp: number;
  study_aura: string;
}

export interface LocalJournal {
  id: string;
  user_id: string;
  journal_text: string;
  sleep_hours: number;
  study_hours: number;
  mood: string;
  vibe: string;
  triggers: string; // JSON string of array
  nova_response: string;
  suggestion: string;
  entry_date: string;
}

export interface LocalCoping {
  id: string;
  user_id: string;
  suggestion_text: string;
  category: string;
  completed: number;
}

// Generate random ID fallback
const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper to calculate pet stage based on XP
function getPetStage(xp: number): string {
  if (xp >= 150) return 'cosmic_guardian'; // Adult
  if (xp >= 80) return 'sparkle_puff';     // Teen/Toddler
  if (xp >= 30) return 'cosmic_egg_cracked'; // Hatching
  return 'egg';                          // Baby
}

// Helper to determine Study Aura
function getStudyAura(journals: LocalJournal[]): string {
  if (journals.length === 0) return 'Balanced';
  
  // Calculate average hours
  let totalStudy = 0;
  let totalSleep = 0;
  let lockedInCount = 0;
  let overloadCount = 0;
  
  journals.forEach(j => {
    totalStudy += j.study_hours;
    totalSleep += j.sleep_hours;
    if (j.mood === 'Locked In' || j.mood === 'Motivated') lockedInCount++;
    if (j.mood === 'Overloaded') overloadCount++;
  });
  
  const avgStudy = totalStudy / journals.length;
  const avgSleep = totalSleep / journals.length;
  
  if (avgStudy > 8 && avgSleep < 5) return 'Hardcore Hustler';
  if (lockedInCount > journals.length * 0.5) return 'Deep Focus';
  if (overloadCount > journals.length * 0.4) return 'Stress Zone';
  if (avgSleep >= 7 && avgStudy >= 4) return 'Mindful Scholar';
  
  return 'Balanced';
}

// Read/Write Local DB
function readDb() {
  if (typeof window === 'undefined') {
    return { users: [], journals: [], coping_suggestions: [] };
  }
  const raw = localStorage.getItem('mindpulse_local_db');
  if (!raw) {
    const fresh = { users: [], journals: [], coping_suggestions: [] };
    localStorage.setItem('mindpulse_local_db', JSON.stringify(fresh));
    return fresh;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const fresh = { users: [], journals: [], coping_suggestions: [] };
    localStorage.setItem('mindpulse_local_db', JSON.stringify(fresh));
    return fresh;
  }
}

function writeDb(data: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mindpulse_local_db', JSON.stringify(data));
  }
}

// Heuristics Analysis Functions
function checkSafetyFilter(text: string) {
  const safetyKeywords = [
    'suicide', 'kill myself', 'want to die', 'wish i was dead', 'want to end my life',
    'hurt myself', 'harm myself', 'cut myself', 'ending my life', 'self-harm', 'hang myself', 'take my life'
  ];
  const lowerText = text.toLowerCase();
  return safetyKeywords.some(keyword => lowerText.includes(keyword));
}

function detectSpam(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 5) return false;
  if (!trimmed.includes(' ') && trimmed.length > 10) return true;
  const gibberishRegex = /(asdf|qwerty|zxcv|ghjk|hjkl|jkl;|abcd)/i;
  if (gibberishRegex.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    if (words.length <= 2) return true;
  }
  return false;
}

function getCopingSuggestions(triggers: string[], role: string): string[] {
  const suggestions: string[] = [];
  if (triggers.includes("Academic pressure") || triggers.includes("Comparison with peers")) {
    if (role === 'student') {
      suggestions.push("Try: 1. Solve one easy question to build momentum. 2. Take a 5-minute offline break. 3. Return to the difficult topic later.");
    } else {
      suggestions.push("Try: Focus on your own growth. Block out peers' highlights and identify one small metric you improved this week.");
    }
  }
  if (triggers.includes("Workplace deadlines") || triggers.includes("Burnout")) {
    if (role === 'professional') {
      suggestions.push("Try: 1. Write down your top 3 priorities. 2. Push low-impact tasks to tomorrow. 3. Block 30 mins of focus time with notifications paused.");
    } else {
      suggestions.push("Try: Break down your daunting tasks into micro-steps. Focus on finishing just the first step today.");
    }
  }
  if (triggers.includes("Sleep deprivation")) {
    suggestions.push("Try: Dim your room lights 30 minutes before bed. Keep your phone out of arm's reach to avoid late-night scrolling.");
  }
  if (triggers.includes("Procrastination guilt")) {
    suggestions.push("Try: Use the 2-Minute Rule. If a task takes less than 2 minutes, do it right now to break the freeze response.");
  }
  if (triggers.includes("Family expectations")) {
    suggestions.push("Try: Take 3 deep breaths. Remind yourself that you are studying/working for your own future, step by step.");
  }
  if (triggers.includes("Financial concerns")) {
    suggestions.push("Try: List down your basic fixed expenses this month, and highlight one area you can easily adjust to feel more in control.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Try taking a 5-minute micro-break. Step outside, drink a glass of water, and stretch your shoulders.");
  }
  return suggestions;
}

function generateNovaMessage(mood: string, triggers: string[], suggestions: string[]): string {
  let reflection = "";
  let encouragement = "";

  switch (mood) {
    case 'Overloaded':
      reflection = "I hear you, and it sounds like you're carrying a massive load right now. 😵 It's completely valid to feel overwhelmed when everything stacks up.";
      encouragement = "Remember, you don't have to carry the whole mountain at once. Just focus on the next small step. You've got this! 🤍";
      break;
    case 'Running on 2%':
      reflection = "Oof, sounds like you are running on empty. 😴 Rest isn't something you have to 'earn'—your battery needs to recharge.";
      encouragement = "Please consider shutting down the screen early tonight. Your brain deserves a break! 🔋";
      break;
    case 'Feeling Low':
      reflection = "I'm so sorry today was rough. 😔 Feeling behind or doubting yourself is really tough, but it doesn't define your capacity.";
      encouragement = "Be gentle with yourself today. Even getting out of bed or writing this entry is a win. 🌱";
      break;
    case 'Locked In':
      reflection = "Love to see it! You're in absolute focus mode right now. 🔥 Riding that productive wave feels amazing.";
      encouragement = "Keep that momentum going, but don't forget to stretch and stay hydrated! 💧";
      break;
    case 'Motivated':
      reflection = "Heck yes! You're feeling energized and ready to take on the world. 🚀 That positive energy is contagious.";
      encouragement = "Channel this vibe into your main goals today. You are doing awesome! ✨";
      break;
    default:
      reflection = "Thanks for checking in today! 🙂 Sounds like you're in a relatively steady or calm space.";
      encouragement = "Enjoy this balanced vibe. Wishing you a peaceful rest of your day! 🌟";
  }

  const triggerText = triggers.length > 0
    ? `\n\nIt looks like **${triggers[0].toLowerCase()}** is playing a major role in how you're feeling.`
    : "";

  const suggestionText = suggestions.length > 0
    ? `\n\nHere's a quick thing we can try:\n👉 *${suggestions[0]}*`
    : "";

  return `${reflection}${triggerText}${suggestionText}\n\n${encouragement}`;
}

function analyzeJournal(journalText: string, role: string) {
  if (!journalText || journalText.trim() === '') {
    return {
      mood: 'Chill',
      vibe: '🙂 Chill',
      confidence: 0.5,
      triggers: [],
      safetyTriggered: false,
      suggestion: "Hey! Looks like you didn't write anything today. That's totally okay. Whenever you're ready, I'm here to listen. 💬",
      novaResponse: "Hey! 🌟 It seems you've left the journal empty. No pressure at all! Whenever you feel like sharing what's on your mind, I'm right here to support you. Have a gentle day ahead!"
    };
  }

  const isSpam = detectSpam(journalText);
  if (isSpam) {
    return {
      mood: 'Chill',
      vibe: '🙂 Chill',
      confidence: 0.2,
      triggers: [],
      safetyTriggered: false,
      suggestion: "Nova needs a bit more context. Try writing a few real sentences about what happened today! 🌱",
      novaResponse: "Hey! 👋 I noticed some random letters there. If you're just testing things out, welcome! If you're feeling a bit lost for words, try writing about one small thing that happened today. I'm here to listen!"
    };
  }

  const safetyTriggered = checkSafetyFilter(journalText);
  if (safetyTriggered) {
    return {
      mood: 'Feeling Low',
      vibe: '😔 Feeling Low',
      confidence: 1.0,
      triggers: ['crisis/self-harm'],
      safetyTriggered: true,
      safetyResources: CRISIS_RESOURCES,
      suggestion: "Please reach out to a trusted person or a crisis hotline immediately.",
      novaResponse: `I'm really concerned about your safety. 💔 Please know that you are not alone and there is support available. Please reach out to someone you trust, or contact one of these crisis lifelines immediately:\n\n` +
        CRISIS_RESOURCES.resources.map(r => `- **${r.name}**: ${r.number} (${r.hours})`).join('\n')
    };
  }

  const lowerText = journalText.toLowerCase();
  const detectedTriggers: string[] = [];
  
  for (const [category, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    const matched = keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
    if (matched) {
      detectedTriggers.push(category);
    }
  }

  let highestScore = 0;
  let primaryVibe = '🙂 Chill';
  let primaryMood = 'Chill';
  
  MOOD_RULES.forEach(rule => {
    let score = 0;
    rule.keywords.forEach(keyword => {
      const matches = lowerText.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
      if (matches) {
        score += matches.length * rule.weight;
      }
    });
    
    if (rule.mood === 'Overloaded' && (detectedTriggers.includes('Academic pressure') || detectedTriggers.includes('Workplace deadlines'))) {
      score += 0.5;
    }
    if (rule.mood === 'Running on 2%' && detectedTriggers.includes('Sleep deprivation')) {
      score += 0.5;
    }
    if (rule.mood === 'Feeling Low' && (detectedTriggers.includes('Comparison with peers') || detectedTriggers.includes('Procrastination guilt') || detectedTriggers.includes('Family expectations'))) {
      score += 1.0;
    }
    
    if (score > highestScore) {
      highestScore = score;
      primaryVibe = rule.vibe;
      primaryMood = rule.mood;
    }
  });

  if (highestScore === 0 && detectedTriggers.length > 0) {
    if (detectedTriggers.includes('Comparison with peers') || detectedTriggers.includes('Procrastination guilt') || detectedTriggers.includes('Family expectations')) {
      primaryMood = 'Feeling Low';
      primaryVibe = '😔 Feeling Low';
      highestScore = 1.0;
    } else if (detectedTriggers.includes('Academic pressure') || detectedTriggers.includes('Workplace deadlines')) {
      primaryMood = 'Overloaded';
      primaryVibe = '😵 Overloaded';
      highestScore = 1.0;
    } else if (detectedTriggers.includes('Sleep deprivation') || detectedTriggers.includes('Burnout')) {
      primaryMood = 'Running on 2%';
      primaryVibe = '😴 Running on 2%';
      highestScore = 1.0;
    }
  }

  let confidence = 0.5;
  if (highestScore > 0) {
    confidence = Math.min(0.5 + (highestScore * 0.1), 0.95);
  }

  const suggestions = getCopingSuggestions(detectedTriggers, role);
  const novaResponse = generateNovaMessage(primaryMood, detectedTriggers, suggestions);

  return {
    mood: primaryMood,
    vibe: primaryVibe,
    confidence: Math.round(confidence * 100) / 100,
    triggers: detectedTriggers,
    safetyTriggered: false,
    suggestion: suggestions[0] || "Take a deep breath and let's check in again soon. 🤍",
    novaResponse
  };
}

// --- PUBLIC DATABASE API EMULATORS ---

export function registerLocalUser(name: string, petName: string, role: string) {
  const db = readDb();
  const id = generateId();
  const newUser: LocalUser = {
    id,
    name,
    focus_xp: 0,
    streak_count: 0,
    pet_stage: 'egg',
    pet_name: petName || 'Nova',
    pet_xp: 0,
    study_aura: 'Balanced'
  };
  
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

export function getLocalUserProfile(userId: string): LocalUser | null {
  const db = readDb();
  return db.users.find((u: any) => u.id === userId) || null;
}

export function renameLocalPet(userId: string, newPetName: string) {
  const db = readDb();
  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx !== -1) {
    db.users[idx].pet_name = newPetName;
    writeDb(db);
    return db.users[idx];
  }
  return null;
}

export function rewardLocalXP(userId: string, xpAmount: number) {
  const db = readDb();
  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx !== -1) {
    const user = db.users[idx];
    const newXP = user.focus_xp + xpAmount;
    user.focus_xp = newXP;
    user.pet_xp = newXP;
    user.pet_stage = getPetStage(newXP);
    
    writeDb(db);
    return user;
  }
  return null;
}

export function logLocalJournalEntry(userId: string, journalText: string, sleepHours: number, studyHours: number, role: string) {
  const db = readDb();
  const userIdx = db.users.findIndex((u: any) => u.id === userId);
  if (userIdx === -1) return null;
  
  const user = db.users[userIdx];
  
  // 1. Analyze journal
  const analysis = analyzeJournal(journalText, role);
  
  // 2. Add journal record if not spam
  let updatedUser = { ...user };
  if (analysis.confidence >= 0.3) {
    const journalId = generateId();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const newJournal: LocalJournal = {
      id: journalId,
      user_id: userId,
      journal_text: journalText,
      sleep_hours: sleepHours,
      study_hours: studyHours,
      mood: analysis.mood,
      vibe: analysis.vibe,
      triggers: JSON.stringify(analysis.triggers),
      nova_response: analysis.novaResponse,
      suggestion: analysis.suggestion,
      entry_date: todayStr
    };
    
    db.journals.push(newJournal);
    
    // 3. Award XP
    const earnedXP = 15;
    user.focus_xp += earnedXP;
    user.pet_xp = user.focus_xp;
    user.pet_stage = getPetStage(user.focus_xp);
    user.streak_count = (user.streak_count || 0) + 1;
    
    // Recalculate study aura
    const userJournals = db.journals.filter((j: any) => j.user_id === userId);
    user.study_aura = getStudyAura(userJournals);
    
    // Add coping suggestions as task checklist
    analysis.triggers.forEach((trig: string) => {
      const tips = getCopingSuggestions([trig], role);
      tips.forEach(tip => {
        const hasSuggestion = db.coping_suggestions.some((s: any) => s.user_id === userId && s.suggestion_text === tip);
        if (!hasSuggestion) {
          db.coping_suggestions.push({
            id: generateId(),
            user_id: userId,
            suggestion_text: tip,
            category: trig,
            completed: 0
          });
        }
      });
    });
    
    updatedUser = { ...user };
    writeDb(db);
  }
  
  return {
    analysis,
    user: updatedUser
  };
}

export function seedLocalUserData(userId: string) {
  const db = readDb();
  const userIdx = db.users.findIndex((u: any) => u.id === userId);
  if (userIdx === -1) return null;
  
  const user = db.users[userIdx];
  
  // 1. Clear old logs for clean demo
  db.journals = db.journals.filter((j: any) => j.user_id !== userId);
  db.coping_suggestions = db.coping_suggestions.filter((s: any) => s.user_id !== userId);
  
  // 2. Prepopulate 6 days of historical logs
  const baseDate = new Date();
  const mockEntries = [
    { daysAgo: 5, sleep: 5.5, study: 8.5, mood: 'Overloaded', vibe: '😵 Overloaded', text: 'Studied for JEE Physics mock test 8 hours today but scores were average. Super anxious and feeling peer pressure.', triggers: ['Academic pressure', 'Comparison with peers'] },
    { daysAgo: 4, sleep: 5,   study: 9.0, mood: 'Overloaded', vibe: '😵 Overloaded', text: 'Another mocks day. Formula sheet was so confusing. Slept late revisioning and felt groggy all day.', triggers: ['Academic pressure', 'Sleep deprivation'] },
    { daysAgo: 3, sleep: 4.5, study: 6.5, mood: 'Running on 2%', vibe: '😴 Running on 2%', text: 'Extremely tired. Slept 4 hours. Wasted 2 hours procrastinating on reels, feeling guilty now.', triggers: ['Sleep deprivation', 'Procrastination guilt'] },
    { daysAgo: 2, sleep: 7.5, study: 4.5, mood: 'Feeling Low', vibe: '😔 Feeling Low', text: 'Parents asked about mock rankings. Feeling like a disappointment compared to my brother.', triggers: ['Family expectations', 'Comparison with peers'] },
    { daysAgo: 1, sleep: 7.0, study: 8.0, mood: 'Locked In', vibe: '🔥 Locked In', text: 'Did high priority chemistry chapters revision today. Fully locked in 8 hours and finished the chapter mock test.', triggers: ['Academic pressure'] },
    { daysAgo: 0, sleep: 8.0, study: 7.0, mood: 'Motivated', vibe: '🚀 Motivated', text: 'Feeling good. Slept well and got +10 marks improvement. Ready to tackle rest of gate revision!', triggers: [] }
  ];
  
  mockEntries.forEach(m => {
    const logDate = new Date(baseDate);
    logDate.setDate(baseDate.getDate() - m.daysAgo);
    const dateStr = logDate.toISOString().split('T')[0];
    
    const analysis = analyzeJournal(m.text, 'student');
    db.journals.push({
      id: generateId(),
      user_id: userId,
      journal_text: m.text,
      sleep_hours: m.sleep,
      study_hours: m.study,
      mood: m.mood,
      vibe: m.vibe,
      triggers: JSON.stringify(m.triggers),
      nova_response: analysis.novaResponse,
      suggestion: analysis.suggestion,
      entry_date: dateStr
    });
  });
  
  // 3. Update stats
  user.focus_xp = 110;
  user.pet_xp = 110;
  user.pet_stage = getPetStage(110);
  user.streak_count = 6;
  
  const userJournals = db.journals.filter((j: any) => j.user_id === userId);
  user.study_aura = getStudyAura(userJournals);
  
  // Seed checklists
  mockEntries.forEach(m => {
    m.triggers.forEach(trig => {
      const tips = getCopingSuggestions([trig], 'student');
      tips.forEach(tip => {
        const hasSuggestion = db.coping_suggestions.some((s: any) => s.user_id === userId && s.suggestion_text === tip);
        if (!hasSuggestion) {
          db.coping_suggestions.push({
            id: generateId(),
            user_id: userId,
            suggestion_text: tip,
            category: trig,
            completed: 0
          });
        }
      });
    });
  });
  
  writeDb(db);
  return user;
}

export function deleteLocalUserProfile(userId: string) {
  const db = readDb();
  db.users = db.users.filter((u: any) => u.id !== userId);
  db.journals = db.journals.filter((j: any) => j.user_id !== userId);
  db.coping_suggestions = db.coping_suggestions.filter((s: any) => s.user_id !== userId);
  writeDb(db);
}

export function getLocalDashboardData(userId: string) {
  const db = readDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return null;
  
  const timeline = db.journals.filter((j: any) => j.user_id === userId);
  const rawSuggestions = db.coping_suggestions.filter((s: any) => s.user_id === userId);
  
  // Aggregate triggers
  const triggers: Record<string, number> = {};
  timeline.forEach((t: any) => {
    try {
      const categories = JSON.parse(t.triggers);
      categories.forEach((cat: string) => {
        triggers[cat] = (triggers[cat] || 0) + 1;
      });
    } catch {}
  });
  
  return {
    user,
    timeline,
    triggers,
    suggestions: rawSuggestions
  };
}
