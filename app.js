'use strict';

// ═══════════════════════════════════════
// DIFFICULTY GROUPS
// Controls the point multiplier per table.
// ═══════════════════════════════════════
const DIFFICULTY = {
  easy:   { tables: [2, 5, 10], multiplier: 1 },
  medium: { tables: [3, 4, 6, 11, 12], multiplier: 2 },
  hard:   { tables: [7, 8, 9], multiplier: 3 },
};

function getTableMultiplier(table) {
  for (const d of Object.values(DIFFICULTY)) {
    if (d.tables.includes(table)) return d.multiplier;
  }
  return 1;
}

function getTableDifficultyName(table) {
  for (const [name, d] of Object.entries(DIFFICULTY)) {
    if (d.tables.includes(table)) return name;
  }
  return 'easy';
}


// ═══════════════════════════════════════
// STATE
// Everything the app needs while running.
// Wiped when the page refreshes — long-term
// data lives in localStorage instead.
// ═══════════════════════════════════════
const state = {
  selectedTables: [],
  mode: 'hard',             // 'easy' or 'hard'

  deck: [],                 // questions still to be answered correctly
  masteredSet: new Set(),   // question keys answered correctly this session

  currentQuestion: null,
  sessionTotal:    0,
  sessionCorrect:  0,
  sessionStreak:   0,
  locked:          false,   // prevents double-submission while feedback shows
};


// ═══════════════════════════════════════
// PERSISTENCE  (saved on the device)
// ═══════════════════════════════════════
const KEYS = {
  total:   'tt_total',
  correct: 'tt_correct',
  best:    'tt_best',
  points:  'tt_points',
  mastery: 'tt_mastery',  // JSON array of mastered table numbers
};

function loadLifetime() {
  return {
    total:   parseInt(localStorage.getItem(KEYS.total)   || '0', 10),
    correct: parseInt(localStorage.getItem(KEYS.correct) || '0', 10),
    best:    parseInt(localStorage.getItem(KEYS.best)    || '0', 10),
    points:  parseInt(localStorage.getItem(KEYS.points)  || '0', 10),
    mastery: JSON.parse(localStorage.getItem(KEYS.mastery) || '[]'),
  };
}

function saveLifetime(data) {
  localStorage.setItem(KEYS.total,   data.total);
  localStorage.setItem(KEYS.correct, data.correct);
  localStorage.setItem(KEYS.best,    data.best);
  localStorage.setItem(KEYS.points,  data.points);
  localStorage.setItem(KEYS.mastery, JSON.stringify(data.mastery));
}


// ═══════════════════════════════════════
// POINTS CALCULATION
//
// Each correct answer earns:
//   table difficulty (1/2/3)
//   × mode bonus (Hard=2, Easy=1)
//   × mastery penalty (already has star = 0.5)
//
// Example maximums:
//   7s Hard mode, no star yet  → 3×2×1 = 6 pts
//   2s Easy mode, already done → 1×1×0.5 → 1 pt (minimum)
// ═══════════════════════════════════════
function calculatePoints(table) {
  const diffMultiplier   = getTableMultiplier(table);
  const modeMultiplier   = state.mode === 'hard' ? 2 : 1;
  const { mastery }      = loadLifetime();
  const masteryPenalty   = mastery.includes(table) ? 0.5 : 1;
  return Math.max(1, Math.round(diffMultiplier * modeMultiplier * masteryPenalty));
}


// ═══════════════════════════════════════
// DECK BUILDING
// Creates one question per multiplier (1–12)
// for each selected table, then shuffles.
// ═══════════════════════════════════════
function buildDeck() {
  const questions = [];
  for (const table of state.selectedTables) {
    for (let mult = 1; mult <= 12; mult++) {
      questions.push({
        a:      table,
        b:      mult,
        answer: table * mult,
        key:    `${table}x${mult}`,
      });
    }
  }
  return shuffleArray(questions);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ═══════════════════════════════════════
// SCREEN SWITCHING
// ═══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


// ═══════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════
function buildTablePicker() {
  const picker  = document.getElementById('table-picker');
  picker.innerHTML = '';
  const { mastery } = loadLifetime();

  for (let n = 2; n <= 12; n++) {
    const btn        = document.createElement('button');
    const isSelected = state.selectedTables.includes(n);
    const isMastered = mastery.includes(n);
    const diffName   = getTableDifficultyName(n);

    btn.className = [
      'table-btn',
      `difficulty-${diffName}`,
      isSelected ? 'selected'  : '',
      isMastered ? 'mastered'  : '',
    ].join(' ').trim();

    // Number + optional star badge
    btn.innerHTML = isMastered
      ? `${n}<span class="star" aria-hidden="true">★</span>`
      : `${n}`;

    btn.setAttribute('aria-label',
      `${n} times table, ${diffName}${isMastered ? ', mastered' : ''}`);

    btn.addEventListener('click', () => {
      const idx = state.selectedTables.indexOf(n);
      if (idx === -1) {
        state.selectedTables.push(n);
        btn.classList.add('selected');
      } else {
        state.selectedTables.splice(idx, 1);
        btn.classList.remove('selected');
      }
      document.getElementById('start-btn').disabled = state.selectedTables.length === 0;
    });

    picker.appendChild(btn);
  }

  document.getElementById('start-btn').disabled = state.selectedTables.length === 0;
}

function refreshLifetimeDisplay() {
  const { total, correct, best, points } = loadLifetime();
  document.getElementById('ls-total').textContent   = total;
  document.getElementById('ls-correct').textContent = correct;
  document.getElementById('ls-best').textContent    = best;
  document.getElementById('ls-points').textContent  = points;
}


// ═══════════════════════════════════════
// MODE TOGGLE
// ═══════════════════════════════════════
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}


// ═══════════════════════════════════════
// QUESTION DISPLAY
// ═══════════════════════════════════════
function showQuestion() {
  // Deck empty = all questions answered correctly
  if (state.deck.length === 0) {
    handleDeckComplete();
    return;
  }

  const q = state.deck[0];
  state.currentQuestion = q;
  state.locked = false;

  document.getElementById('question-text').textContent = `${q.a} × ${q.b} = ?`;
  hideFeedback();

  if (state.mode === 'easy') {
    showEasyMode(q.answer);
  } else {
    showHardMode();
  }
}

function showHardMode() {
  document.getElementById('hard-mode-controls').classList.remove('hidden');
  document.getElementById('easy-mode-controls').classList.add('hidden');

  const input = document.getElementById('answer-input');
  input.value    = '';
  input.disabled = false;
  document.getElementById('submit-btn').disabled = false;
  setTimeout(() => input.focus(), 100);
}

function showEasyMode(correctAnswer) {
  document.getElementById('hard-mode-controls').classList.add('hidden');
  document.getElementById('easy-mode-controls').classList.remove('hidden');

  const choices = generateChoices(correctAnswer);
  const grid    = document.getElementById('choice-grid');
  grid.innerHTML = '';

  choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.textContent = value;
    btn.addEventListener('click', () => handleChoiceTap(btn, value, correctAnswer));
    grid.appendChild(btn);
  });
}

// Generates 3 plausible wrong answers close to the correct one
function generateChoices(correct) {
  const wrongs = new Set();
  const candidates = shuffleArray(
    Array.from({ length: 10 }, (_, i) => correct + (i < 5 ? i + 1 : -(i - 4)))
  );
  for (const c of candidates) {
    if (wrongs.size < 3 && c > 0 && c !== correct) wrongs.add(c);
  }
  return shuffleArray([correct, ...wrongs]);
}


// ═══════════════════════════════════════
// ANSWER HANDLING
// ═══════════════════════════════════════

// Easy mode: user tapped a choice button
function handleChoiceTap(tappedBtn, chosen, correctAnswer) {
  if (state.locked) return;

  // Disable all choice buttons immediately
  document.querySelectorAll('.choice-btn').forEach(b => (b.disabled = true));

  // Colour the tapped button and reveal the correct one
  tappedBtn.classList.add(chosen === correctAnswer ? 'correct-choice' : 'wrong-choice');
  if (chosen !== correctAnswer) {
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (parseInt(b.textContent, 10) === correctAnswer) b.classList.add('correct-choice');
    });
  }

  processAnswer(chosen === correctAnswer);
}

// Hard mode: user pressed Check or Enter
function checkAnswer() {
  if (state.locked) return;

  const input = document.getElementById('answer-input');
  const raw   = input.value.trim();
  if (!raw) return;

  const userAnswer = parseInt(raw, 10);
  if (isNaN(userAnswer)) return;

  input.disabled = true;
  document.getElementById('submit-btn').disabled = true;

  processAnswer(userAnswer === state.currentQuestion.answer);
}

// Shared logic for both modes
function processAnswer(isCorrect) {
  state.locked = true;

  const q = state.currentQuestion;

  // Remove this question from the front of the deck
  state.deck.shift();

  state.sessionTotal++;
  const lifetime = loadLifetime();
  lifetime.total++;

  if (isCorrect) {
    state.sessionCorrect++;
    state.sessionStreak++;
    state.masteredSet.add(q.key);

    const pts = calculatePoints(q.a);
    lifetime.correct++;
    lifetime.points += pts;
    if (state.sessionStreak > lifetime.best) lifetime.best = state.sessionStreak;

    showFeedback('correct', pickCorrectMessage());
  } else {
    state.sessionStreak = 0;
    state.masteredSet.delete(q.key); // no longer counts as mastered for this session

    // Put the question back ~4 positions ahead so it comes around again soon
    const insertAt = Math.min(4, state.deck.length);
    state.deck.splice(insertAt, 0, q);

    showFeedback('wrong', `Not quite — the answer is ${q.answer}`);
  }

  saveLifetime(lifetime);
  updateSessionStats();

  const hitCelebration = isCorrect && state.sessionStreak % 10 === 0;
  const delay = hitCelebration ? 900 : (isCorrect ? 1000 : 1900);

  setTimeout(() => {
    if (hitCelebration) {
      showCelebration();
    } else {
      showQuestion(); // will check deck.length === 0 automatically
    }
  }, delay);
}


// ═══════════════════════════════════════
// DECK COMPLETE
// Called when state.deck reaches zero.
// Awards mastery stars for any table where
// all 12 questions were answered correctly.
// ═══════════════════════════════════════
function handleDeckComplete() {
  const lifetime     = loadLifetime();
  const newlyMastered = [];

  for (const table of state.selectedTables) {
    const allDone = Array.from({ length: 12 }, (_, i) => `${table}x${i + 1}`)
                        .every(key => state.masteredSet.has(key));

    if (allDone && !lifetime.mastery.includes(table)) {
      newlyMastered.push(table);
      lifetime.mastery.push(table);
    }
  }

  saveLifetime(lifetime);

  const title    = document.getElementById('mastered-title');
  const subtitle = document.getElementById('mastered-subtitle');
  const detail   = document.getElementById('mastered-detail');

  if (newlyMastered.length > 0) {
    title.textContent    = 'Table' + (newlyMastered.length > 1 ? 's' : '') + ' Mastered!';
    subtitle.textContent = newlyMastered.join(', ') + ' ×  ★ New star' + (newlyMastered.length > 1 ? 's' : '') + ' earned!';
    detail.textContent   = 'Time to try something harder — pick a new table!';
  } else {
    title.textContent    = 'Deck Complete!';
    subtitle.textContent = 'Great practice session!';
    detail.textContent   = 'Try a different table to keep improving.';
  }

  showScreen('screen-mastered');
}


// ═══════════════════════════════════════
// SESSION STATS DISPLAY
// ═══════════════════════════════════════
function updateSessionStats() {
  document.getElementById('stat-total').textContent   = state.sessionTotal;
  document.getElementById('stat-correct').textContent = state.sessionCorrect;
  document.getElementById('stat-streak').textContent  = state.sessionStreak;
  document.getElementById('stat-points').textContent  = loadLifetime().points;
}


// ═══════════════════════════════════════
// FEEDBACK BANNER
// ═══════════════════════════════════════
const CORRECT_MESSAGES = [
  '✅ Correct!', '🌟 Brilliant!', '🎉 Well done!',
  '✅ Spot on!',  '⭐ Great work!', '🚀 Superstar!', '✅ Nailed it!',
];

function pickCorrectMessage() {
  return CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
}

function showFeedback(type, message) {
  const area = document.getElementById('feedback-area');
  area.className   = type;
  area.textContent = message;
}

function hideFeedback() {
  const area = document.getElementById('feedback-area');
  area.className   = 'hidden';
  area.textContent = '';
}


// ═══════════════════════════════════════
// CELEBRATION (10 in a row)
// ═══════════════════════════════════════
function showCelebration() {
  showScreen('screen-celebration');
  spawnConfetti();
}

function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';

  const COLOURS = ['#7c3aed','#f97316','#22c55e','#fbbf24','#ef4444','#3b82f6','#ec4899','#06b6d4'];
  const SHAPES  = ['3px', '50%'];

  for (let i = 0; i < 70; i++) {
    const el   = document.createElement('div');
    el.className = 'confetti-piece';
    const size = 8 + Math.random() * 10;
    el.style.cssText = [
      `left: ${Math.random() * 100}%`,
      `width: ${size}px`,
      `height: ${size * (0.6 + Math.random() * 1.2)}px`,
      `background: ${COLOURS[Math.floor(Math.random() * COLOURS.length)]}`,
      `border-radius: ${SHAPES[Math.floor(Math.random() * SHAPES.length)]}`,
      `animation-duration: ${2.5 + Math.random() * 2.5}s`,
      `animation-delay: ${Math.random() * 1.5}s`,
    ].join(';');
    container.appendChild(el);
  }
}


// ═══════════════════════════════════════
// START SESSION
// ═══════════════════════════════════════
function startPractice() {
  state.sessionTotal   = 0;
  state.sessionCorrect = 0;
  state.sessionStreak  = 0;
  state.deck           = buildDeck();
  state.masteredSet    = new Set();

  // Update mode badge on practice screen
  const modeText = state.mode === 'hard' ? 'Hard mode · ×2 points' : 'Easy mode · ×1 point';
  document.getElementById('mode-badge').textContent = modeText;

  updateSessionStats();
  showScreen('screen-practice');
  showQuestion();
}


// ═══════════════════════════════════════
// INITIALISE
// Runs once when the page finishes loading.
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Register the service worker (enables offline use)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  buildTablePicker();
  refreshLifetimeDisplay();

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  setMode('hard');

  // Setup screen
  document.getElementById('start-btn').addEventListener('click', startPractice);

  // Practice screen
  document.getElementById('submit-btn').addEventListener('click', checkAnswer);
  document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkAnswer();
  });
  document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('screen-setup');
    refreshLifetimeDisplay();
    buildTablePicker();
  });

  // Celebration screen
  document.getElementById('continue-btn').addEventListener('click', () => {
    showScreen('screen-practice');
    showQuestion(); // will detect empty deck if needed
  });

  // Mastered screen
  document.getElementById('mastered-btn').addEventListener('click', () => {
    state.selectedTables = [];   // clear selection so she picks fresh
    showScreen('screen-setup');
    refreshLifetimeDisplay();
    buildTablePicker();
  });

});
