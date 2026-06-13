const db = require('../config/db');
const cryptoHelper = require('../utils/crypto');
const aiService = require('../services/aiService');
const { v4: uuidv4 } = require('uuid');
const userController = require('./userController');

// Map mood vibe to study aura
const MOOD_TO_AURA = {
  'Locked In': 'Focused',
  'Chill': 'Calm',
  'Overloaded': 'Stressed',
  'Running on 2%': 'Tired',
  'Feeling Low': 'Overwhelmed',
  'Motivated': 'Balanced'
};

/**
 * Submits a new mood journal entry and performs AI analysis.
 */
async function submitJournalEntry(req, res) {
  const { userId, journalText, sleepHours = 7.0, studyHours = 0.0, role = 'student' } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // 1. Fetch user to verify they exist
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const user = userResult.rows[0];

    // 2. Perform AI Analysis on the journal text
    const aiAnalysis = await aiService.analyzeJournal(journalText, role);

    // 3. Encrypt the journal text for storage
    const encryptedContent = cryptoHelper.encrypt(journalText);
    const journalId = uuidv4();
    const todayStr = new Date().toISOString().split('T')[0];

    // 4. Save journal entry to database
    // SQLite uses JSON string for arrays, Postgres uses TEXT[]
    let triggersParam = aiAnalysis.triggers;
    if (!db.isPostgres) {
      triggersParam = JSON.stringify(aiAnalysis.triggers);
    }

    const insertJournalSql = `
      INSERT INTO journals (id, user_id, mood, confidence, triggers, sleep_hours, study_hours, entry_date, encrypted_content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await db.query(insertJournalSql, [
      journalId,
      userId,
      aiAnalysis.mood,
      aiAnalysis.confidence,
      triggersParam,
      parseFloat(sleepHours),
      parseFloat(studyHours),
      todayStr,
      encryptedContent
    ]);

    // 5. Update Streak and XP
    let newStreak = user.streak_count;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (user.last_check_in) {
      const lastCheckInDate = new Date(user.last_check_in);
      const lastCheckInDay = new Date(lastCheckInDate.getFullYear(), lastCheckInDate.getMonth(), lastCheckInDate.getDate());
      
      const diffTime = today - lastCheckInDay;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // Reset streak
      }
      // If diffDays === 0, user already checked in today, keep current streak
    } else {
      newStreak = 1; // First check in
    }

    // Award +15 XP (Journal Entry: +10 XP, Mood Check: +5 XP)
    const earnedXP = 15;
    const newXP = user.focus_xp + earnedXP;
    const newPetStage = userController.getPetStage(newXP);
    const newAura = MOOD_TO_AURA[aiAnalysis.mood] || 'Balanced';

    await db.query(
      `UPDATE users 
       SET streak_count = $1, last_check_in = CURRENT_TIMESTAMP, focus_xp = $2, pet_stage = $3, pet_xp = $4, study_aura = $5 
       WHERE id = $6`,
      [newStreak, newXP, newPetStage, newXP, newAura, userId]
    );

    // 6. Save Coping Suggestions to database (if triggers are found)
    if (aiAnalysis.triggers.length > 0 && !aiAnalysis.safetyTriggered) {
      for (const trigger of aiAnalysis.triggers) {
        const suggestionPrompt = aiAnalysis.suggestion;
        const suggestionId = uuidv4();
        await db.query(
          `INSERT INTO coping_suggestions (id, user_id, category, trigger_name, prompt, completed)
           VALUES ($1, $2, $3, $4, $5, FALSE)`,
          [suggestionId, userId, 'Coping Tip', trigger, suggestionPrompt]
        );
      }
    }

    // Return the response
    return res.status(201).json({
      message: 'Journal entry logged successfully',
      journalId,
      analysis: {
        mood: aiAnalysis.mood,
        vibe: aiAnalysis.vibe,
        confidence: aiAnalysis.confidence,
        triggers: aiAnalysis.triggers,
        safetyTriggered: aiAnalysis.safetyTriggered,
        safetyResources: aiAnalysis.safetyResources || null,
        suggestion: aiAnalysis.suggestion,
        novaResponse: aiAnalysis.novaResponse
      },
      user: {
        focusXP: newXP,
        streakCount: newStreak,
        petStage: newPetStage,
        studyAura: newAura,
        petEvolved: newPetStage !== user.pet_stage
      }
    });
  } catch (error) {
    console.error('Failed to log journal entry:', error);
    return res.status(500).json({ error: 'Database error logging journal' });
  }
}

/**
 * Fetches user's journal entries history, decrypting them.
 */
async function getJournalHistory(req, res) {
  const { userId } = req.params;

  try {
    const journalResult = await db.query(
      'SELECT * FROM journals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const decryptedJournals = journalResult.rows.map(journal => {
      let decryptedText = '';
      try {
        decryptedText = cryptoHelper.decrypt(journal.encrypted_content);
      } catch (err) {
        console.error(`Failed to decrypt journal ${journal.id}`);
        decryptedText = '[Decryption Failed]';
      }

      return {
        id: journal.id,
        mood: journal.mood,
        confidence: journal.confidence,
        triggers: journal.triggers,
        sleepHours: journal.sleep_hours,
        studyHours: journal.study_hours,
        entryDate: journal.entry_date,
        createdAt: journal.created_at,
        journalText: decryptedText
      };
    });

    return res.json({ journals: decryptedJournals });
  } catch (error) {
    console.error('Failed to fetch journal history:', error);
    return res.status(500).json({ error: 'Database error fetching history' });
  }
}

module.exports = {
  submitJournalEntry,
  getJournalHistory
};
