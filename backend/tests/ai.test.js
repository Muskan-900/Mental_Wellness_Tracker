process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite'; // triggers JSON DB in test

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const db = require('../src/config/db');
const aiService = require('../src/services/aiService');

let testUserId = 'test-user-1234';

beforeAll(async () => {
  // Clean up any stale test database before starting
  const dbPath = path.resolve(__dirname, '../test_mindpulse_db.json');
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {}
  }

  // Initialize test database
  await db.initDb();
  
  // Seed a test user
  await db.query(
    `INSERT OR IGNORE INTO users (id, name, focus_xp, streak_count, pet_stage, pet_name, pet_xp)
     VALUES ($1, 'Test User', 0, 0, 'egg', 'Nova', 0)`,
    [testUserId]
  );
});

afterAll(async () => {
  // Delete the test database file
  const dbPath = path.resolve(__dirname, '../test_mindpulse_db.json');
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {
      console.warn("Failed to delete test db file:", e.message);
    }
  }
});

describe('AI Heuristics Unit Tests', () => {
  test('Spam detection should flag random letter patterns', () => {
    expect(aiService.detectSpam('asdfasdfasdf')).toBe(true);
    expect(aiService.detectSpam('qwertyuiop')).toBe(true);
    expect(aiService.detectSpam('Today was a good day.')).toBe(false);
  });

  test('Safety filter should detect self-harm keywords', () => {
    expect(aiService.checkSafetyFilter('I want to hurt myself')).toBe(true);
    expect(aiService.checkSafetyFilter('I feel like ending my life')).toBe(true);
    expect(aiService.checkSafetyFilter('I want to study for my test')).toBe(false);
  });

  test('Mood and Trigger extraction - Student Academic Stress', async () => {
    const analysis = await aiService.analyzeJournal(
      'Feeling anxious before Physics test. Mock test score dropped and I am stressed.',
      'student'
    );
    expect(analysis.mood).toBe('Overloaded');
    expect(analysis.triggers).toContain('Academic pressure');
    expect(analysis.safetyTriggered).toBe(false);
  });

  test('Mood and Trigger extraction - Sleep Deprivation', async () => {
    const analysis = await aiService.analyzeJournal(
      'Could not sleep at all. Feeling extremely tired and groggy.',
      'student'
    );
    expect(analysis.mood).toBe('Running on 2%');
    expect(analysis.triggers).toContain('Sleep deprivation');
  });

  test('Mood and Trigger extraction - Peer Comparison', async () => {
    const analysis = await aiService.analyzeJournal(
      'Everyone is ahead of me and smarter than me. Their scores are better.',
      'student'
    );
    expect(analysis.mood).toBe('Feeling Low');
    expect(analysis.triggers).toContain('Comparison with peers');
  });
});

describe('API Endpoints Tests', () => {
  test('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('POST /api/users/register - successful registration', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'Rohit' });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe('Rohit');
  });

  test('POST /api/journals - log entry & award XP', async () => {
    const res = await request(app)
      .post('/api/journals')
      .send({
        userId: testUserId,
        journalText: 'I finished my exam prep today and resolved the syllabus questions. Feeling focused!',
        sleepHours: 8,
        studyHours: 9,
        role: 'student'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.analysis.mood).toBe('Locked In');
    expect(res.body.user.focusXP).toBe(15); // +15 XP
    expect(res.body.user.studyAura).toBe('Focused');
  });

  test('POST /api/journals - safety validation returns resources', async () => {
    const res = await request(app)
      .post('/api/journals')
      .send({
        userId: testUserId,
        journalText: 'I want to hurt myself, nothing is working',
        sleepHours: 7,
        studyHours: 0
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.analysis.safetyTriggered).toBe(true);
    expect(res.body.analysis.safetyResources).toBeDefined();
    expect(res.body.analysis.safetyResources.resources.length).toBeGreaterThan(0);
  });

  test('POST /api/journals - empty text validation', async () => {
    const res = await request(app)
      .post('/api/journals')
      .send({
        userId: testUserId,
        journalText: ''
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.analysis.triggers.length).toBe(0);
  });

  test('POST /api/journals - spam input validation', async () => {
    const res = await request(app)
      .post('/api/journals')
      .send({
        userId: testUserId,
        journalText: 'asdfasdfasdf'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.analysis.vibe).toBe('🙂 Chill');
    expect(res.body.analysis.confidence).toBeLessThan(0.5);
  });
});
