const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const journalController = require('../controllers/journalController');
const analyticsController = require('../controllers/analyticsController');
const aiService = require('../services/aiService');
const db = require('../config/db');
const cryptoHelper = require('../utils/crypto');
const { v4: uuidv4 } = require('uuid');

// User Profile Routes
router.post('/users/register', userController.registerAnonymousUser);
router.get('/users/:userId', userController.getUserProfile);
router.delete('/users/:userId', userController.deleteUserProfile);
router.post('/users/:userId/xp', userController.rewardXP);
router.post('/users/:userId/rename-pet', userController.renamePet);

// Journal Entry Routes
router.post('/journals', journalController.submitJournalEntry);
router.get('/journals/:userId', journalController.getJournalHistory);

// Analytics & Recap Routes
router.get('/analytics/:userId/triggers', analyticsController.getTriggerAnalysis);
router.get('/analytics/:userId/timeline', analyticsController.getMoodTimeline);
router.get('/analytics/:userId/wrapped', analyticsController.getWrappedRecap);

// Safety Resources Endpoint
router.get('/safety/crisis-helplines', (req, res) => {
  return res.json(aiService.CRISIS_RESOURCES);
});

// Developer Seeding Route
router.post('/users/:userId/seed', async (req, res) => {
  const { userId } = req.params;
  const name = 'Muskan';

  try {
    // 1. Check if user exists, if not create them, otherwise update stats
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await db.query(
        `INSERT INTO users (id, name, focus_xp, streak_count, pet_stage, pet_name, pet_xp, study_aura, last_check_in)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, name, 90, 6, 'hatchling', 'Nova', 90, 'Balanced', new Date().toISOString()]
      );
    } else {
      await db.query(
        `UPDATE users
         SET focus_xp = 90, streak_count = 6, pet_stage = 'hatchling', pet_xp = 90, study_aura = 'Balanced', last_check_in = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );
      // Clean existing entries to prevent duplication errors
      await db.query('DELETE FROM journals WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM coping_suggestions WHERE user_id = $1', [userId]);
    }

    // 2. Define 6 days of journal logs (recreating the user prompt examples)
    const seedData = [
      {
        daysAgo: 5,
        text: "Feeling anxious before Physics test. Studied so hard but mock test score dropped. Everyone else is doing so well.",
        mood: "Overloaded",
        confidence: 0.88,
        triggers: ["Academic pressure", "Comparison with peers"],
        sleepHours: 5.0,
        studyHours: 8.0
      },
      {
        daysAgo: 4,
        text: "Couldn't sleep before mock exam. Heavy eyelids today but kept studying. My mock test score dropped and it sucks.",
        mood: "Running on 2%",
        confidence: 0.92,
        triggers: ["Sleep deprivation", "Academic pressure"],
        sleepHours: 3.5,
        studyHours: 6.0
      },
      {
        daysAgo: 3,
        text: "Spent the afternoon scrolling Instagram. Wasted time is making me feel so lazy. I should have studied.",
        mood: "Feeling Low",
        confidence: 0.85,
        triggers: ["Procrastination guilt"],
        sleepHours: 7.5,
        studyHours: 1.5
      },
      {
        daysAgo: 2,
        text: "My parents called and asked about JEE preparation. Family expectations are weighing down on me. Stressed about disappointed relatives.",
        mood: "Feeling Low",
        confidence: 0.8,
        triggers: ["Family expectations", "Academic pressure"],
        sleepHours: 6.0,
        studyHours: 5.0
      },
      {
        daysAgo: 1,
        text: "Finished a major physics chapter and revised mechanics syllabus today! Feeling locked in and highly focused.",
        mood: "Locked In",
        confidence: 0.95,
        triggers: ["Academic pressure"],
        sleepHours: 7.0,
        studyHours: 9.0
      },
      {
        daysAgo: 0,
        text: "Had a great mock test review session, my chemistry scores improved. Motivation is back, feeling excited!",
        mood: "Motivated",
        confidence: 0.9,
        triggers: ["Academic pressure"],
        sleepHours: 8.0,
        studyHours: 7.0
      }
    ];

    const today = new Date();

    for (const entry of seedData) {
      const entryDate = new Date(today);
      entryDate.setDate(today.getDate() - entry.daysAgo);
      const dateString = entryDate.toISOString().split('T')[0];
      const encryptedText = cryptoHelper.encrypt(entry.text);
      const journalId = uuidv4();

      let triggersParam = entry.triggers;
      if (!db.isPostgres) {
        triggersParam = JSON.stringify(entry.triggers);
      }

      await db.query(
        `INSERT INTO journals (id, user_id, mood, confidence, triggers, sleep_hours, study_hours, entry_date, encrypted_content)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          journalId,
          userId,
          entry.mood,
          entry.confidence,
          triggersParam,
          entry.sleepHours,
          entry.studyHours,
          dateString,
          encryptedText
        ]
      );

      // Add Coping Suggestions for seeds
      for (const trigger of entry.triggers) {
        const suggestionId = uuidv4();
        await db.query(
          `INSERT INTO coping_suggestions (id, user_id, category, trigger_name, prompt, completed)
           VALUES ($1, $2, 'Coping Tip', $3, 'Solve one easy question, take a 5-minute break, then return to study.', FALSE)`,
          [suggestionId, userId, trigger]
        );
      }
    }

    // Fetch seed user details
    const seededUserResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

    return res.status(201).json({
      message: 'Demo profile and 6 days of wellness entries seeded successfully!',
      user: seededUserResult.rows[0]
    });
  } catch (error) {
    console.error('Failed to seed demo data:', error);
    return res.status(500).json({ error: 'Database seeding failed' });
  }
});

module.exports = router;
