const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper to calculate pet stage based on XP.
 */
function getPetStage(xp) {
  if (xp >= 300) return 'guardian';
  if (xp >= 150) return 'sprite';
  if (xp >= 50) return 'hatchling';
  return 'egg';
}

/**
 * Creates an anonymous user profile.
 */
async function registerAnonymousUser(req, res) {
  const { name, petName = 'Nova' } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const userId = uuidv4();
  const insertSql = `
    INSERT INTO users (id, name, focus_xp, streak_count, pet_stage, pet_name, pet_xp, study_aura)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  try {
    await db.query(insertSql, [userId, name.trim(), 0, 0, 'egg', petName.trim() || 'Nova', 0, 'Balanced']);
    
    // Fetch newly created user
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    return res.status(201).json({
      message: 'Anonymous profile created successfully',
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Failed to create anonymous profile:', error);
    return res.status(500).json({ error: 'Database error creating profile' });
  }
}

/**
 * Fetches user profile details.
 */
async function getUserProfile(req, res) {
  const { userId } = req.params;

  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    return res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return res.status(500).json({ error: 'Database error fetching profile' });
  }
}

/**
 * Deletes user data permanently (Privacy Safeguard).
 */
async function deleteUserProfile(req, res) {
  const { userId } = req.params;

  try {
    // SQLite/PostgreSQL cascade constraints will automatically delete journals and suggestions
    const deleteResult = await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    // In SQLite, deleteResult will contain changes count
    return res.json({
      message: 'Your profile and all associated data have been permanently deleted.'
    });
  } catch (error) {
    console.error('Failed to delete user profile:', error);
    return res.status(500).json({ error: 'Database error deleting profile' });
  }
}

/**
 * Manually updates User XP or triggers custom rewards (e.g. mindfulness completion).
 */
async function rewardXP(req, res) {
  const { userId } = req.params;
  const { xpAmount, reason } = req.body; // e.g. +15 for mindfulness

  if (!xpAmount || typeof xpAmount !== 'number' || xpAmount <= 0) {
    return res.status(400).json({ error: 'Invalid XP amount' });
  }

  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const user = userResult.rows[0];
    const newXP = user.focus_xp + xpAmount;
    const newPetStage = getPetStage(newXP);

    await db.query(
      `UPDATE users 
       SET focus_xp = $1, pet_stage = $2, pet_xp = $3 
       WHERE id = $4`,
      [newXP, newPetStage, newXP, userId]
    );

    return res.json({
      message: `Earned +${xpAmount} XP for ${reason || 'activity'}!`,
      focusXP: newXP,
      petStage: newPetStage,
      petEvolved: newPetStage !== user.pet_stage
    });
  } catch (error) {
    console.error('Failed to award XP:', error);
    return res.status(500).json({ error: 'Database error awarding XP' });
  }
}

/**
 * Updates pet name.
 */
async function renamePet(req, res) {
  const { userId } = req.params;
  const { petName } = req.body;

  if (!petName || petName.trim() === '') {
    return res.status(400).json({ error: 'Pet name cannot be empty' });
  }

  try {
    const updateResult = await db.query(
      'UPDATE users SET pet_name = $1 WHERE id = $2',
      [petName.trim(), userId]
    );
    return res.json({ message: 'Pet renamed successfully', petName: petName.trim() });
  } catch (error) {
    console.error('Failed to rename pet:', error);
    return res.status(500).json({ error: 'Database error renaming pet' });
  }
}

module.exports = {
  registerAnonymousUser,
  getUserProfile,
  deleteUserProfile,
  rewardXP,
  renamePet,
  getPetStage
};
