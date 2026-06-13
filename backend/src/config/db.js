const isPostgres = false;

// Pure In-Memory JavaScript Database Store
let dbMemoryStore = { users: [], journals: [], coping_suggestions: [] };

// Helper to read DB
function readJsonDb() {
  if (!dbMemoryStore.users) dbMemoryStore.users = [];
  if (!dbMemoryStore.journals) dbMemoryStore.journals = [];
  if (!dbMemoryStore.coping_suggestions) dbMemoryStore.coping_suggestions = [];
  return dbMemoryStore;
}

// Helper to write DB
function writeJsonDb(data) {
  dbMemoryStore = data;
}

console.log('Using Pure In-Memory Database Engine.');
readJsonDb(); // Ensure initialized

/**
 * Executes a SQL query. Falls back to a pure JS JSON engine for local development.
 * @param {string} text 
 * @param {any[]} params 
 * @returns {Promise<{rows: any[]}>}
 */
async function query(text, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(text, params);
    return { rows: res.rows };
  }

  // Pure JavaScript SQL query parsing for JSON DB fallback
  return new Promise((resolve, reject) => {
    const dbData = readJsonDb();
    const sqlLower = text.toLowerCase().trim();

    try {
      // 1. DDL: CREATE TABLE IF NOT EXISTS
      if (sqlLower.startsWith('create table')) {
        return resolve({ rows: [] });
      }

      // 2. INSERT INTO users
      if (sqlLower.startsWith('insert into users')) {
        const userObj = {
          id: params[0],
          name: params[1],
          focus_xp: params[2] !== undefined ? params[2] : 0,
          streak_count: params[3] !== undefined ? params[3] : 0,
          pet_stage: params[4] || 'egg',
          pet_name: params[5] || 'Nova',
          pet_xp: params[6] !== undefined ? params[6] : 0,
          study_aura: params[7] || 'Balanced',
          last_check_in: params[8] || null,
          created_at: new Date().toISOString()
        };
        
        // Remove existing if any (IGNORE equivalent)
        dbData.users = dbData.users.filter(u => u.id !== userObj.id);
        dbData.users.push(userObj);
        writeJsonDb(dbData);
        return resolve({ rows: [], changes: 1 });
      }

      // 3. INSERT OR IGNORE INTO users (used in tests)
      if (sqlLower.startsWith('insert or ignore into users')) {
        const userId = params[0];
        const exists = dbData.users.some(u => u.id === userId);
        if (!exists) {
          const userObj = {
            id: userId,
            name: params[1],
            focus_xp: params[2] || 0,
            streak_count: params[3] || 0,
            last_check_in: null,
            pet_stage: params[4] || 'egg',
            pet_name: params[5] || 'Nova',
            pet_xp: params[6] || 0,
            study_aura: 'Balanced',
            created_at: new Date().toISOString()
          };
          dbData.users.push(userObj);
          writeJsonDb(dbData);
        }
        return resolve({ rows: [], changes: exists ? 0 : 1 });
      }

      // 4. INSERT INTO journals
      if (sqlLower.startsWith('insert into journals')) {
        // Params: id, user_id, mood, confidence, triggers, sleep_hours, study_hours, entry_date, encrypted_content
        let rawTriggers = params[4];
        if (typeof rawTriggers === 'string') {
          try {
            rawTriggers = JSON.parse(rawTriggers);
          } catch(e) {
            rawTriggers = rawTriggers.split(',').filter(Boolean);
          }
        }

        const journalObj = {
          id: params[0],
          user_id: params[1],
          mood: params[2],
          confidence: params[3],
          triggers: rawTriggers || [],
          sleep_hours: parseFloat(params[5] || 0),
          study_hours: parseFloat(params[6] || 0),
          entry_date: params[7],
          encrypted_content: params[8],
          created_at: new Date().toISOString()
        };
        dbData.journals.push(journalObj);
        writeJsonDb(dbData);
        return resolve({ rows: [], changes: 1 });
      }

      // 5. INSERT INTO coping_suggestions
      if (sqlLower.startsWith('insert into coping_suggestions')) {
        // Params: id, user_id, category, trigger_name, prompt, completed
        const suggestionObj = {
          id: params[0],
          user_id: params[1],
          category: params[2],
          trigger_name: params[3],
          prompt: params[4],
          completed: params[5] || false,
          created_at: new Date().toISOString()
        };
        dbData.coping_suggestions.push(suggestionObj);
        writeJsonDb(dbData);
        return resolve({ rows: [], changes: 1 });
      }

      // 6. SELECT FROM users
      if (sqlLower.startsWith('select * from users where id =')) {
        const userId = params[0];
        const user = dbData.users.find(u => u.id === userId);
        return resolve({ rows: user ? [user] : [] });
      }

      // 7. SELECT FROM journals BY user_id
      if (sqlLower.startsWith('select * from journals where user_id =')) {
        const userId = params[0];
        const userJournals = dbData.journals
          .filter(j => j.user_id === userId)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return resolve({ rows: userJournals });
      }

      // 8. SELECT triggers FROM journals
      if (sqlLower.includes('select triggers from journals where user_id =')) {
        const userId = params[0];
        const userJournals = dbData.journals.filter(j => j.user_id === userId);
        const rows = userJournals.map(j => ({ triggers: j.triggers }));
        return resolve({ rows });
      }

      // 9. SELECT timeline FROM journals
      if (sqlLower.includes('select entry_date, mood, sleep_hours, study_hours, created_at')) {
        const userId = params[0];
        const limit = params[1] || 7;
        const userJournals = dbData.journals
          .filter(j => j.user_id === userId)
          .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
          .slice(0, limit);
        return resolve({ rows: userJournals });
      }

      // 10. UPDATE users
      if (sqlLower.startsWith('update users')) {
        // Update user XP, pet status, or pet name
        const userId = params[params.length - 1]; // user ID is always last
        const userIndex = dbData.users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
          const user = dbData.users[userIndex];
          
          if (sqlLower.includes('streak_count') && sqlLower.includes('focus_xp')) {
            // update streak, check_in, xp, pet stage, pet xp, study aura
            // params: streak_count, focus_xp, pet_stage, pet_xp, study_aura, userId
            user.streak_count = params[0];
            user.last_check_in = new Date().toISOString();
            user.focus_xp = params[1];
            user.pet_stage = params[2];
            user.pet_xp = params[3];
            user.study_aura = params[4];
          } else if (sqlLower.includes('focus_xp') && sqlLower.includes('pet_stage')) {
            // params: focus_xp, pet_stage, pet_xp, userId
            user.focus_xp = params[0];
            user.pet_stage = params[1];
            user.pet_xp = params[2];
          } else if (sqlLower.includes('pet_name =')) {
            // params: pet_name, userId
            user.pet_name = params[0];
          }
          
          dbData.users[userIndex] = user;
          writeJsonDb(dbData);
          return resolve({ rows: [user], changes: 1 });
        }
        return resolve({ rows: [], changes: 0 });
      }

      // 11. DELETE FROM users
      if (sqlLower.startsWith('delete from users where id =')) {
        const userId = params[0];
        dbData.users = dbData.users.filter(u => u.id !== userId);
        dbData.journals = dbData.journals.filter(j => j.user_id !== userId);
        dbData.coping_suggestions = dbData.coping_suggestions.filter(s => s.user_id !== userId);
        writeJsonDb(dbData);
        return resolve({ rows: [], changes: 1 });
      }

      // 12. DELETE FROM journals
      if (sqlLower.startsWith('delete from journals where user_id =')) {
        const userId = params[0];
        dbData.journals = dbData.journals.filter(j => j.user_id !== userId);
        writeJsonDb(dbData);
        return resolve({ rows: [], changes: 1 });
      }

      // 13. DELETE FROM coping_suggestions
      if (sqlLower.startsWith('delete from coping_suggestions where user_id =')) {
        const userId = params[0];
        dbData.coping_suggestions = dbData.coping_suggestions.filter(s => s.user_id !== userId);
        writeJsonDb(dbData);
        return resolve({ rows: [], changes: 1 });
      }

      // Default: empty/no match query
      return resolve({ rows: [] });
    } catch (err) {
      console.error("JSON DB Error:", err);
      reject(err);
    }
  });
}

/**
 * Initializes database schemas (in-memory reset).
 */
async function initDb() {
  console.log(`Using Pure In-Memory database engine: initialized.`);
  dbMemoryStore = { users: [], journals: [], coping_suggestions: [] };
}

module.exports = {
  query,
  initDb,
  isPostgres
};
