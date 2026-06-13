import {
  registerLocalUser,
  getLocalUserProfile,
  renameLocalPet,
  rewardLocalXP,
  logLocalJournalEntry,
  seedLocalUserData,
  deleteLocalUserProfile,
  getLocalDashboardData,
} from '../utils/localDb';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Reset DB before each test
beforeEach(() => {
  localStorageMock.clear();
});

// ─── Registration ────────────────────────────────────────────────
describe('User Registration', () => {
  test('registers a new user with correct defaults', () => {
    const user = registerLocalUser('Muskan', 'Cosmic Egg', 'student');
    expect(user.name).toBe('Muskan');
    expect(user.pet_name).toBe('Cosmic Egg');
    expect(user.focus_xp).toBe(0);
    expect(user.streak_count).toBe(0);
    expect(user.pet_stage).toBe('egg');
    expect(user.study_aura).toBe('Balanced');
    expect(user.id).toBeDefined();
  });

  test('uses Nova as default pet name when empty', () => {
    const user = registerLocalUser('Test', '', 'professional');
    expect(user.pet_name).toBe('Nova');
  });

  test('multiple users get unique IDs', () => {
    const u1 = registerLocalUser('A', '', 'student');
    const u2 = registerLocalUser('B', '', 'student');
    expect(u1.id).not.toBe(u2.id);
  });
});

// ─── Profile Retrieval ───────────────────────────────────────────
describe('Get User Profile', () => {
  test('returns user after registration', () => {
    const user = registerLocalUser('Test', 'Nova', 'student');
    const profile = getLocalUserProfile(user.id);
    expect(profile).not.toBeNull();
    expect(profile!.name).toBe('Test');
  });

  test('returns null for unknown userId', () => {
    expect(getLocalUserProfile('nonexistent-id')).toBeNull();
  });
});

// ─── Pet Renaming ────────────────────────────────────────────────
describe('Rename Pet', () => {
  test('renames pet successfully', () => {
    const user = registerLocalUser('Test', 'Nova', 'student');
    const updated = renameLocalPet(user.id, 'Sparkle');
    expect(updated).not.toBeNull();
    expect(updated!.pet_name).toBe('Sparkle');
    // Verify persisted
    const profile = getLocalUserProfile(user.id);
    expect(profile!.pet_name).toBe('Sparkle');
  });

  test('returns null for unknown user', () => {
    expect(renameLocalPet('fake-id', 'X')).toBeNull();
  });
});

// ─── XP Rewards ──────────────────────────────────────────────────
describe('XP Rewards', () => {
  test('increases XP and updates pet stage', () => {
    const user = registerLocalUser('Test', '', 'student');
    expect(user.pet_stage).toBe('egg');

    rewardLocalXP(user.id, 35);
    const p1 = getLocalUserProfile(user.id)!;
    expect(p1.focus_xp).toBe(35);
    expect(p1.pet_stage).toBe('cosmic_egg_cracked');

    rewardLocalXP(user.id, 50);
    const p2 = getLocalUserProfile(user.id)!;
    expect(p2.focus_xp).toBe(85);
    expect(p2.pet_stage).toBe('sparkle_puff');

    rewardLocalXP(user.id, 70);
    const p3 = getLocalUserProfile(user.id)!;
    expect(p3.focus_xp).toBe(155);
    expect(p3.pet_stage).toBe('cosmic_guardian');
  });

  test('returns null for unknown user', () => {
    expect(rewardLocalXP('fake', 10)).toBeNull();
  });
});

// ─── Journal Logging & AI Analysis ──────────────────────────────
describe('Journal Logging', () => {
  test('logs an entry and awards 15 XP', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Studied physics for 6 hours, feeling anxious about the mock test.', 6, 8, 'student');
    expect(result).not.toBeNull();
    expect(result!.user.focus_xp).toBe(15);
    expect(result!.analysis.mood).toBeDefined();
    expect(result!.analysis.triggers.length).toBeGreaterThan(0);
  });

  test('detects academic pressure trigger', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'JEE exam is tomorrow and I am so stressed about physics marks.', 5, 10, 'student');
    expect(result!.analysis.triggers).toContain('Academic pressure');
  });

  test('detects sleep deprivation trigger', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'I am so tired, only slept 3 hours and feel exhausted and groggy.', 3, 4, 'student');
    expect(result!.analysis.triggers).toContain('Sleep deprivation');
  });

  test('detects family expectations trigger', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'My parents are disappointed with my results. Dad scolded me.', 7, 5, 'student');
    expect(result!.analysis.triggers).toContain('Family expectations');
  });

  test('detects procrastination guilt trigger', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Wasted time scrolling instagram all day, feeling so guilty now.', 7, 1, 'student');
    expect(result!.analysis.triggers).toContain('Procrastination guilt');
  });

  test('detects comparison with peers trigger', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'My friend scored way better than me in the rank list. Everyone else is ahead of me.', 7, 6, 'student');
    expect(result!.analysis.triggers).toContain('Comparison with peers');
  });

  test('detects workplace deadlines trigger for professionals', () => {
    const user = registerLocalUser('Test', '', 'professional');
    const result = logLocalJournalEntry(user.id, 'Boss wants the project deliverable by tomorrow, meetings all day.', 6, 9, 'professional');
    expect(result!.analysis.triggers).toContain('Workplace deadlines');
  });

  test('handles spam input gracefully', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'asdfasdfasdfasdfasdf', 7, 5, 'student');
    expect(result).not.toBeNull();
    expect(result!.analysis.confidence).toBeLessThanOrEqual(0.2);
  });

  test('returns null for non-existent user', () => {
    expect(logLocalJournalEntry('fake', 'hello', 7, 5, 'student')).toBeNull();
  });

  test('streak count increments per entry', () => {
    const user = registerLocalUser('Test', '', 'student');
    logLocalJournalEntry(user.id, 'Did revision today, feeling good and productive.', 7, 6, 'student');
    logLocalJournalEntry(user.id, 'Completed chemistry chapter, fully prepared for test.', 8, 7, 'student');
    const p = getLocalUserProfile(user.id)!;
    expect(p.streak_count).toBe(2);
    expect(p.focus_xp).toBe(30);
  });
});

// ─── Mood Classification ─────────────────────────────────────────
describe('Mood Classification', () => {
  test('classifies positive mood as Motivated or Locked In', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Feeling so excited and happy, cracked a good score today!', 8, 6, 'student');
    expect(['Motivated', 'Locked In']).toContain(result!.analysis.mood);
  });

  test('classifies stressed mood as Overloaded', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Super stressed and anxious, panicking about the exam tomorrow.', 4, 10, 'student');
    expect(result!.analysis.mood).toBe('Overloaded');
  });

  test('classifies tired mood as Running on 2%', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Extremely tired, drained, exhausted, no sleep and burnout.', 3, 2, 'student');
    expect(result!.analysis.mood).toBe('Running on 2%');
  });

  test('classifies sad mood as Feeling Low', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Feeling so sad and lonely, disappointed and hopeless today.', 6, 3, 'student');
    expect(result!.analysis.mood).toBe('Feeling Low');
  });
});

// ─── Safety Filter ───────────────────────────────────────────────
describe('Safety Filter', () => {
  test('triggers safety alert for crisis keywords', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'I want to hurt myself, everything feels hopeless.', 3, 0, 'student');
    expect(result!.analysis.safetyTriggered).toBe(true);
    expect(result!.analysis.safetyResources).toBeDefined();
    expect(result!.analysis.safetyResources.resources.length).toBeGreaterThan(0);
  });

  test('does not trigger safety for normal entries', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Had a chill day, watched a movie and relaxed.', 8, 2, 'student');
    expect(result!.analysis.safetyTriggered).toBe(false);
  });
});

// ─── Seed Demo Data ──────────────────────────────────────────────
describe('Seed Demo Data', () => {
  test('seeds 6 days of data and updates stats', () => {
    const user = registerLocalUser('Test', '', 'student');
    const seeded = seedLocalUserData(user.id);
    expect(seeded).not.toBeNull();
    expect(seeded!.focus_xp).toBe(110);
    expect(seeded!.streak_count).toBe(6);
    expect(seeded!.pet_stage).toBe('sparkle_puff');

    const dash = getLocalDashboardData(user.id);
    expect(dash).not.toBeNull();
    expect(dash!.timeline.length).toBe(6);
    expect(Object.keys(dash!.triggers).length).toBeGreaterThan(0);
  });

  test('returns null for unknown user', () => {
    expect(seedLocalUserData('fake')).toBeNull();
  });
});

// ─── Dashboard Data ──────────────────────────────────────────────
describe('Dashboard Data', () => {
  test('returns timeline, triggers, suggestions after entries', () => {
    const user = registerLocalUser('Test', '', 'student');
    logLocalJournalEntry(user.id, 'Stressed about JEE exam, studying physics all day.', 5, 10, 'student');
    logLocalJournalEntry(user.id, 'Tired and exhausted, slept only 4 hours.', 4, 6, 'student');

    const dash = getLocalDashboardData(user.id)!;
    expect(dash.timeline.length).toBe(2);
    expect(Object.keys(dash.triggers).length).toBeGreaterThan(0);
    expect(dash.user.focus_xp).toBe(30);
  });

  test('returns null for unknown user', () => {
    expect(getLocalDashboardData('fake')).toBeNull();
  });
});

// ─── Delete Profile ──────────────────────────────────────────────
describe('Delete Profile (GDPR)', () => {
  test('deletes user, journals, and coping suggestions', () => {
    const user = registerLocalUser('Test', '', 'student');
    logLocalJournalEntry(user.id, 'Studied for exam today.', 7, 6, 'student');
    seedLocalUserData(user.id);

    // Verify data exists
    expect(getLocalUserProfile(user.id)).not.toBeNull();
    expect(getLocalDashboardData(user.id)!.timeline.length).toBeGreaterThan(0);

    // Delete
    deleteLocalUserProfile(user.id);

    // Verify all gone
    expect(getLocalUserProfile(user.id)).toBeNull();
    expect(getLocalDashboardData(user.id)).toBeNull();
  });
});

// ─── Nova Response Quality ───────────────────────────────────────
describe('Nova Response Quality', () => {
  test('generates non-empty nova response', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Had a productive day studying chemistry.', 7, 6, 'student');
    expect(result!.analysis.novaResponse).toBeDefined();
    expect(result!.analysis.novaResponse.length).toBeGreaterThan(20);
  });

  test('generates non-empty suggestion', () => {
    const user = registerLocalUser('Test', '', 'student');
    const result = logLocalJournalEntry(user.id, 'Feeling anxious about upcoming test.', 6, 8, 'student');
    expect(result!.analysis.suggestion).toBeDefined();
    expect(result!.analysis.suggestion.length).toBeGreaterThan(10);
  });
});
