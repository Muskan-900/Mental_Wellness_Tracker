const { encrypt } = require('../utils/crypto');

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
const TRIGGER_KEYWORDS = {
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

/**
 * Analyzes journal entry using rules-based heuristics or OpenAI if key is present.
 * @param {string} journalText 
 * @param {string} role 'student' or 'professional'
 * @returns {Promise<object>}
 */
async function analyzeJournal(journalText, role = 'student') {
  // Edge Case: Empty journal
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

  // Edge Case: Spam input detection (e.g. "asdfasdfasdf")
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

  // Edge Case: Very long journal
  let processedText = journalText;
  if (journalText.length > 15000) {
    // Truncate to avoid payload issues but keep safety triggers active
    processedText = journalText.substring(0, 15000);
  }

  // Safety filter check
  const safetyTriggered = checkSafetyFilter(processedText);
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

  // Check if OpenAI API is configured
  if (process.env.OPENAI_API_KEY) {
    try {
      return await analyzeWithOpenAI(processedText, role);
    } catch (error) {
      console.warn("OpenAI analysis failed, falling back to local heuristics:", error.message);
    }
  }

  // Local Heuristics Fallback
  return analyzeLocally(processedText, role);
}

/**
 * Checks for self-harm and crisis keywords.
 * @param {string} text 
 * @returns {boolean}
 */
function checkSafetyFilter(text) {
  const safetyKeywords = [
    'suicide', 'kill myself', 'kill myself', 'want to die', 'wish i was dead', 'want to end my life',
    'hurt myself', 'harm myself', 'cut myself', 'ending my life', 'self-harm', 'hang myself', 'take my life'
  ];
  const lowerText = text.toLowerCase();
  return safetyKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detects spam/gibberish input.
 * @param {string} text 
 * @returns {boolean}
 */
function detectSpam(text) {
  const trimmed = text.trim();
  if (trimmed.length < 5) return false; // Too short to label spam
  
  // Check if string consists of repeated sequences or lacks spaces
  if (!trimmed.includes(' ') && trimmed.length > 10) return true;
  
  // Check for gibberish sequences (e.g. asdfasdf, qwerqwer)
  const gibberishRegex = /(asdf|qwerty|zxcv|ghjk|hjkl|jkl;|abcd)/i;
  if (gibberishRegex.test(trimmed)) {
    // Make sure it's not a short query containing one word
    const words = trimmed.split(/\s+/);
    if (words.length <= 2) return true;
  }
  
  return false;
}

/**
 * Performs local pattern-matching analysis.
 * @param {string} text 
 * @param {string} role 
 * @returns {object}
 */
function analyzeLocally(text, role) {
  const lowerText = text.toLowerCase();

  // 1. Trigger extraction
  const detectedTriggers = [];
  for (const [category, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    const matched = keywords.some(keyword => {
      // Use boundary-like checks to avoid partial word match (e.g. 'rest' in 'interest')
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
    if (matched) {
      detectedTriggers.push(category);
    }
  }

  // 2. Mood scoring
  let highestScore = 0;
  let primaryVibe = '🙂 Chill';
  let primaryMood = 'Chill';
  
  // Scoring weights based on frequency
  MOOD_RULES.forEach(rule => {
    let score = 0;
    rule.keywords.forEach(keyword => {
      // Find count of keyword occurrences
      const matches = lowerText.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
      if (matches) {
        score += matches.length * rule.weight;
      }
    });
    
    // Add bonus if triggers match certain states
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

  // Assign default moods based on triggers if no direct mood keywords matched
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

  // Default confidence logic
  let confidence = 0.5;
  if (highestScore > 0) {
    confidence = Math.min(0.5 + (highestScore * 0.1), 0.95);
  }

  // 3. Suggestion generation based on triggers & role
  const suggestions = getCopingSuggestions(detectedTriggers, role);

  // 4. Nova conversational response
  const novaResponse = generateNovaMessage(primaryMood, detectedTriggers, suggestions, role);

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

/**
 * Returns coping recommendations based on detected triggers and role.
 * @param {string[]} triggers 
 * @param {string} role 
 * @returns {string[]}
 */
function getCopingSuggestions(triggers, role) {
  const suggestions = [];

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

  // Fallback if no triggers detected
  if (suggestions.length === 0) {
    suggestions.push("Try taking a 5-minute micro-break. Step outside, drink a glass of water, and stretch your shoulders.");
  }

  return suggestions;
}

/**
 * Generates Nova's reply using developer system prompt guidelines.
 */
function generateNovaMessage(mood, triggers, suggestions, role) {
  let reflection = "";
  let encouragement = "";

  // Emojis and responses adjusted for Gen-Z tone
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

/**
 * Optional OpenAI Client.
 */
async function analyzeWithOpenAI(text, role) {
  const { Configuration, OpenAIApi } = require('openai'); // Optional dependency if installed
  // We can write a dynamic fetch call to OpenAI/Gemini to keep it simple without heavy SDK dependencies
  const apiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are Nova, a supportive AI wellness companion.
          Personality: Warm, encouraging, non-judgmental, Gen-Z friendly, conversational, positive but realistic.
          Goals: Help users identify emotional patterns, suggest small practical actions, encourage self-reflection, never diagnose conditions, never shame users, prioritize emotional safety.
          
          Respond in JSON format only matching this schema:
          {
            "mood": "Anxious" | "Running on 2%" | "Feeling Low" | "Locked In" | "Motivated" | "Chill",
            "vibe": "🔥 Locked In" | "🙂 Chill" | "😵 Overloaded" | "😴 Running on 2%" | "😔 Feeling Low" | "🚀 Motivated",
            "confidence": 0.85,
            "triggers": ["Academic pressure", "Comparison with peers", "Sleep deprivation", "Procrastination guilt", "Family expectations", "Workplace deadlines", "Burnout", "Financial concerns"],
            "safetyTriggered": false,
            "suggestion": "Detailed short suggestion text",
            "novaResponse": "Nova's conversational message matching system guidelines"
          }`
        },
        {
          role: 'user',
          content: `Analyze this journal entry written by a ${role}: "${text}"`
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

module.exports = {
  analyzeJournal,
  checkSafetyFilter,
  detectSpam,
  CRISIS_RESOURCES
};
