'use strict';

// ═══════════════════════════════════════════════════════
// CONFIG.JS
//
// All the "what" lives here — thresholds, labels, content.
// The "how" lives in app.js.
//
// To change a point threshold, a reward, or difficulty
// groupings, edit this file only.
// ═══════════════════════════════════════════════════════

const CONFIG = {

  // ── TABLE DIFFICULTY GROUPS ───────────────────────────
  // Determines the point multiplier awarded per correct answer.
  difficulties: [
    { name: 'easy',   tables: [2, 5, 10],        multiplier: 1 },
    { name: 'medium', tables: [3, 4, 6, 11, 12], multiplier: 2 },
    { name: 'hard',   tables: [7, 8, 9],          multiplier: 3 },
  ],

  // ── MODE SETTINGS ─────────────────────────────────────
  modes: {
    easy: { multiplier: 1, tag: 'tap to pick',  badge: 'Easy mode · ×1 point'  },
    hard: { multiplier: 2, tag: 'type it in',   badge: 'Hard mode · ×2 points' },
  },

  // ── TEST MODE ─────────────────────────────────────────
  // Number of questions per school-style test.
  testQuestionsCount: 25,

  // ── SCORING RULES ─────────────────────────────────────
  // Once a table has a ★ star, correct answers earn half points.
  // This discourages grinding easy, already-mastered tables.
  masteryPenalty: 0.5,

  // Wrong answers re-enter the deck this many positions ahead.
  wrongAnswerInsertAt: 4,

  // Maximum number of past sessions kept in the leaderboard.
  sessionHistoryLimit: 100,


  // ── REWARD TIERS ──────────────────────────────────────
  // Add or edit tiers here. They are checked in order.
  // Set videoFile to a path (relative to the app folder) for the
  // gold tier video reward — e.g. 'rewards/reward-gold.mp4'.
  // Leave as null if no video is ready yet.
  rewardTiers: [
    {
      id:             'bronze',
      name:           'Times Tables Explorer',
      emoji:          '🥉',
      pointsRequired: 50,
      description:    "Amazing work — you've earned a music video reward! 🎵",
      gradient:       'linear-gradient(135deg, #92400e 0%, #fbbf24 100%)',
      videoUrl:       'https://www.youtube.com/embed/QGJuMBdaqIw?rel=0&modestbranding=1',
    },
    {
      id:             'silver',
      name:           'Maths Champion',
      emoji:          '🥈',
      pointsRequired: 150,
      description:    "You're getting really good at this — here's your reward! 🎵",
      gradient:       'linear-gradient(135deg, #374151 0%, #d1d5db 100%)',
      videoUrl:       'https://www.youtube.com/embed/7yaU0qXlgbo?rel=0&modestbranding=1',
    },
    {
      id:             'gold',
      name:           'Grand Master',
      emoji:          '🏆',
      pointsRequired: 400,
      description:    "You've mastered times tables — enjoy your ultimate reward! 🏆🎵",
      gradient:       'linear-gradient(135deg, #78350f 0%, #fef08a 100%)',
      videoUrl:       null,
    },
  ],


  // ── CORRECT ANSWER MESSAGES ───────────────────────────
  correctMessages: [
    '✅ Correct!',   '🌟 Brilliant!', '🎉 Well done!',
    '✅ Spot on!',   '⭐ Great work!', '🚀 Superstar!',
    '✅ Nailed it!', '💫 Amazing!',
  ],

};
