const db = require('../config/db');

/**
 * Calculates percentage breakdown of user's emotional triggers.
 */
async function getTriggerAnalysis(req, res) {
  const { userId } = req.params;

  try {
    const journalResult = await db.query(
      'SELECT triggers FROM journals WHERE user_id = $1',
      [userId]
    );

    const triggerCounts = {};
    let totalTriggersCount = 0;

    journalResult.rows.forEach(row => {
      // triggers is already parsed by our db helper in SQLite, and is an array in Postgres
      const triggers = row.triggers || [];
      triggers.forEach(t => {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        totalTriggersCount++;
      });
    });

    const triggerBreakdown = Object.entries(triggerCounts).map(([name, count]) => {
      const percentage = totalTriggersCount > 0 ? Math.round((count / totalTriggersCount) * 100) : 0;
      return { name, count, percentage };
    }).sort((a, b) => b.count - a.count);

    return res.json({
      totalTriggers: totalTriggersCount,
      breakdown: triggerBreakdown
    });
  } catch (error) {
    console.error('Failed to calculate trigger analysis:', error);
    return res.status(500).json({ error: 'Database error calculating triggers' });
  }
}

/**
 * Returns timeline data correlating mood with sleep and study hours.
 */
async function getMoodTimeline(req, res) {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  try {
    // Return last N journal entries
    const limit = parseInt(days);
    const timelineResult = await db.query(
      `SELECT entry_date, mood, sleep_hours, study_hours, created_at 
       FROM journals 
       WHERE user_id = $1 
       ORDER BY entry_date ASC 
       LIMIT $2`,
      [userId, limit]
    );

    const mappedTimeline = timelineResult.rows.map(row => {
      // Map mood strings to numerical scores for charts
      let score = 3; // Neutral
      if (row.mood === 'Motivated' || row.mood === 'Locked In') score = 5;
      else if (row.mood === 'Chill') score = 4;
      else if (row.mood === 'Overloaded') score = 2;
      else if (row.mood === 'Feeling Low' || row.mood === 'Running on 2%') score = 1;

      return {
        date: row.entry_date,
        mood: row.mood,
        moodScore: score,
        sleepHours: row.sleep_hours,
        studyHours: row.study_hours
      };
    });

    return res.json({ timeline: mappedTimeline });
  } catch (error) {
    console.error('Failed to fetch mood timeline:', error);
    return res.status(500).json({ error: 'Database error fetching timeline' });
  }
}

/**
 * Generates Spotify-like wrapped recap metrics for a user.
 */
async function getWrappedRecap(req, res) {
  const { userId } = req.params;

  try {
    // Fetch user details for XP and streak
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const user = userResult.rows[0];

    // Fetch all journals
    const journalResult = await db.query(
      'SELECT mood, triggers, entry_date FROM journals WHERE user_id = $1 ORDER BY entry_date DESC',
      [userId]
    );

    const totalCheckins = journalResult.rows.length;

    if (totalCheckins === 0) {
      return res.json({
        totalCheckins: 0,
        message: 'Keep journaling to unlock your MindPulse Wrapped recap! 🐣'
      });
    }

    // 1. Calculate most common mood
    const moodCounts = {};
    journalResult.rows.forEach(j => {
      moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
    });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];

    // 2. Calculate top trigger
    const triggerCounts = {};
    let topTrigger = 'None detected yet';
    journalResult.rows.forEach(j => {
      const triggers = j.triggers || [];
      triggers.forEach(t => {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      });
    });
    const sortedTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]);
    if (sortedTriggers.length > 0) {
      topTrigger = sortedTriggers[0][0];
    }

    // 3. Find strongest week (mocked based on high score checkins or simple calculation)
    const strongestWeek = "Week 1"; // Default mockup

    // 4. Calculate best day of the week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const moodScoresByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    journalResult.rows.forEach(j => {
      const date = new Date(j.entry_date);
      const day = date.getDay();
      let score = 3;
      if (j.mood === 'Motivated' || j.mood === 'Locked In') score = 5;
      else if (j.mood === 'Chill') score = 4;
      else if (j.mood === 'Overloaded') score = 2;
      else if (j.mood === 'Feeling Low' || j.mood === 'Running on 2%') score = 1;

      moodScoresByDay[day].push(score);
    });

    let bestDayIdx = 3; // Wednesday default
    let highestAvgScore = 0;
    Object.entries(moodScoresByDay).forEach(([dayIdx, scores]) => {
      if (scores.length > 0) {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        if (avg > highestAvgScore) {
          highestAvgScore = avg;
          bestDayIdx = parseInt(dayIdx);
        }
      }
    });

    const bestDay = daysOfWeek[bestDayIdx];

    // 5. Aura recap
    const aura = user.study_aura || 'Balanced';

    return res.json({
      totalCheckins,
      topMood,
      topTrigger,
      bestDay,
      strongestWeek,
      aura,
      xpEarned: user.focus_xp,
      maxStreak: user.streak_count,
      petStage: user.pet_stage
    });
  } catch (error) {
    console.error('Failed to generate wrapped recap:', error);
    return res.status(500).json({ error: 'Database error generating recap' });
  }
}

module.exports = {
  getTriggerAnalysis,
  getMoodTimeline,
  getWrappedRecap
};
