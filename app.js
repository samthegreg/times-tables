'use strict';

// ═══════════════════════════════════════
// HELPERS — derived from CONFIG
// ═══════════════════════════════════════

function getDifficulty(table) {
  return CONFIG.difficulties.find(d => d.tables.includes(table)) || CONFIG.difficulties[0];
}


// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
const state = {
  selectedTables:  [],
  mode:            'hard',       // 'easy' | 'hard'

  deck:            [],           // questions yet to be answered correctly
  masteredSet:     new Set(),    // question keys answered correctly this session

  currentQuestion: null,
  sessionTotal:    0,
  sessionCorrect:  0,
  sessionStreak:   0,
  sessionPoints:   0,            // points earned in the current session
  sessionSaved:    false,        // guard against saving the same session twice
  sessionTables:   new Set(),    // which tables were actually answered this session

  locked:          false,        // prevents double-submission during feedback
  pendingReward:   null,         // a CONFIG.rewardTiers entry waiting to be shown

  // Test mode
  inTestMode:      false,
  testTimer:       null,
  testTimeLeft:    0,            // ticks remaining (each tick = 100ms)
  testCorrect:     0,
  testTotal:       0,
  testTimedOut:    false,        // true when the timer expired (not a typed wrong answer)
};


// ═══════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════
const KEYS = {
  name:     'tt_name',
  total:    'tt_total',
  correct:  'tt_correct',
  best:     'tt_best',
  points:   'tt_points',
  mastery:  'tt_mastery',   // JSON array of mastered table numbers
  sessions: 'tt_sessions',  // JSON array of past session objects
  rewards:  'tt_rewards',   // JSON array of unlocked tier IDs
};

function loadLifetime() {
  return {
    total:    parseInt(localStorage.getItem(KEYS.total)   || '0', 10),
    correct:  parseInt(localStorage.getItem(KEYS.correct) || '0', 10),
    best:     parseInt(localStorage.getItem(KEYS.best)    || '0', 10),
    points:   parseInt(localStorage.getItem(KEYS.points)  || '0', 10),
    mastery:  JSON.parse(localStorage.getItem(KEYS.mastery)  || '[]'),
    sessions: JSON.parse(localStorage.getItem(KEYS.sessions) || '[]'),
    rewards:  JSON.parse(localStorage.getItem(KEYS.rewards)  || '[]'),
  };
}

function saveLifetime(data) {
  localStorage.setItem(KEYS.total,    data.total);
  localStorage.setItem(KEYS.correct,  data.correct);
  localStorage.setItem(KEYS.best,     data.best);
  localStorage.setItem(KEYS.points,   data.points);
  localStorage.setItem(KEYS.mastery,  JSON.stringify(data.mastery));
  localStorage.setItem(KEYS.sessions, JSON.stringify(data.sessions));
  localStorage.setItem(KEYS.rewards,  JSON.stringify(data.rewards));
}

function getPlayerName() {
  return localStorage.getItem(KEYS.name) || '';
}

function savePlayerName(name) {
  localStorage.setItem(KEYS.name, name.trim());
}


// ═══════════════════════════════════════
// SESSION SAVING
// Called when a session ends (back button or deck complete).
// Saves to history only if at least one question was answered.
// ═══════════════════════════════════════
function saveSession() {
  if (state.sessionSaved || state.sessionTotal === 0) return;
  state.sessionSaved = true;

  const lifetime = loadLifetime();
  const session  = {
    date:     new Date().toISOString().slice(0, 10),
    points:   state.sessionPoints,
    tables:   [...state.sessionTables].sort((a, b) => a - b),
    answered: state.sessionTotal,
    correct:  state.sessionCorrect,
  };

  // Keep only the most recent N sessions
  lifetime.sessions.unshift(session);
  if (lifetime.sessions.length > CONFIG.sessionHistoryLimit) {
    lifetime.sessions = lifetime.sessions.slice(0, CONFIG.sessionHistoryLimit);
  }

  saveLifetime(lifetime);
}


// ═══════════════════════════════════════
// REWARD TIER CHECKING
// Returns the first tier that was just crossed (previous < threshold <= new).
// Returns null if no new tier was crossed.
// ═══════════════════════════════════════
function checkNewReward(previousPoints, newPoints) {
  const { rewards } = loadLifetime();
  for (const tier of CONFIG.rewardTiers) {
    if (!rewards.includes(tier.id) && previousPoints < tier.pointsRequired && newPoints >= tier.pointsRequired) {
      return tier;
    }
  }
  return null;
}

function unlockReward(tier) {
  const lifetime = loadLifetime();
  if (!lifetime.rewards.includes(tier.id)) {
    lifetime.rewards.push(tier.id);
    saveLifetime(lifetime);
  }
}


// ═══════════════════════════════════════
// REWARD PROGRESS
// ═══════════════════════════════════════
function getNextRewardProgress() {
  const { points, rewards } = loadLifetime();
  const nextTier = CONFIG.rewardTiers.find(t => !rewards.includes(t.id));
  if (!nextTier) return null;
  return {
    tier: nextTier,
    points,
    pct: Math.min(100, Math.round((points / nextTier.pointsRequired) * 100)),
  };
}


// ═══════════════════════════════════════
// SCREEN SWITCHING
// ═══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


// ═══════════════════════════════════════
// NAME SCREEN
// ═══════════════════════════════════════
function initNameScreen() {
  const input = document.getElementById('name-input');
  const btn   = document.getElementById('name-btn');

  input.addEventListener('input', () => {
    btn.disabled = input.value.trim().length === 0;
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btn.disabled) submitName();
  });

  btn.addEventListener('click', submitName);

  // Pre-fill if returning to change name
  const existing = getPlayerName();
  if (existing) {
    input.value  = existing;
    btn.disabled = false;
  }
}

function submitName() {
  const name = document.getElementById('name-input').value.trim();
  if (!name) return;
  savePlayerName(name);
  showGreeting(name);
  showScreen('screen-setup');
  refreshSetup();
}


// ═══════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════
function showGreeting(name) {
  document.getElementById('greeting').textContent = name ? `Hi ${name}!` : '';
}

function refreshSetup() {
  refreshLifetimeDisplay();
  buildBadgeRow();
  buildTablePicker();
}

function buildTablePicker() {
  const picker  = document.getElementById('table-picker');
  picker.innerHTML = '';
  const { mastery } = loadLifetime();

  for (let n = 2; n <= 12; n++) {
    const btn        = document.createElement('button');
    const isSelected = state.selectedTables.includes(n);
    const isMastered = mastery.includes(n);
    const diff       = getDifficulty(n);

    btn.className = [
      'table-btn',
      `difficulty-${diff.name}`,
      isSelected ? 'selected' : '',
      isMastered ? 'mastered' : '',
    ].join(' ').trim();

    btn.innerHTML = isMastered
      ? `${n}<span class="star" aria-hidden="true">★</span>`
      : `${n}`;

    btn.setAttribute('aria-label',
      `${n} times table, ${diff.name}${isMastered ? ', mastered' : ''}`);

    btn.addEventListener('click', () => {
      const idx = state.selectedTables.indexOf(n);
      if (idx === -1) {
        state.selectedTables.push(n);
        btn.classList.add('selected');
      } else {
        state.selectedTables.splice(idx, 1);
        btn.classList.remove('selected');
      }
      const none = state.selectedTables.length === 0;
      document.getElementById('start-btn').disabled = none;
      document.getElementById('test-btn').disabled  = none;
    });

    picker.appendChild(btn);
  }

  const none = state.selectedTables.length === 0;
  document.getElementById('start-btn').disabled = none;
  document.getElementById('test-btn').disabled  = none;
}

function refreshLifetimeDisplay() {
  const { total, correct, best, points, sessions } = loadLifetime();
  document.getElementById('ls-points').textContent  = points;
  document.getElementById('ls-total').textContent   = total;
  document.getElementById('ls-correct').textContent = correct;
  document.getElementById('ls-best').textContent    = best;

  const bestSession = sessions.length
    ? Math.max(...sessions.map(s => s.points))
    : null;
  document.getElementById('ls-best-session').textContent =
    bestSession !== null ? `${bestSession} pts` : '—';

  const progress    = getNextRewardProgress();
  const progressEl  = document.getElementById('reward-progress');
  if (progress) {
    document.getElementById('reward-progress-label').textContent =
      `${progress.tier.emoji} Next reward: ${progress.tier.name} — ${progress.points} / ${progress.tier.pointsRequired} pts`;
    document.getElementById('reward-progress-fill').style.width = progress.pct + '%';
    progressEl.classList.remove('hidden');
  } else {
    progressEl.classList.add('hidden');
  }
}

function buildBadgeRow() {
  const row     = document.getElementById('badge-row');
  row.innerHTML = '';
  const { rewards } = loadLifetime();

  CONFIG.rewardTiers.forEach(tier => {
    const span = document.createElement('span');
    span.className  = 'badge-item' + (rewards.includes(tier.id) ? ' earned' : '');
    span.textContent = tier.emoji;
    span.setAttribute('aria-label', rewards.includes(tier.id) ? tier.name : `${tier.name} (locked)`);
    span.title      = rewards.includes(tier.id) ? tier.name : `🔒 ${tier.name} — ${tier.pointsRequired} pts`;
    row.appendChild(span);
  });
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
// POINTS CALCULATION
// ═══════════════════════════════════════
function calculatePoints(table) {
  const diff           = getDifficulty(table);
  const modeMultiplier = CONFIG.modes[state.mode].multiplier;
  const { mastery }    = loadLifetime();
  const masteryFactor  = mastery.includes(table) ? CONFIG.masteryPenalty : 1;
  return Math.max(1, Math.round(diff.multiplier * modeMultiplier * masteryFactor));
}


// ═══════════════════════════════════════
// DECK BUILDING & SHUFFLING
// ═══════════════════════════════════════
function buildDeck() {
  const questions = [];
  for (const table of state.selectedTables) {
    for (let mult = 1; mult <= 12; mult++) {
      questions.push({ a: table, b: mult, answer: table * mult, key: `${table}x${mult}` });
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
// QUESTION DISPLAY
// ═══════════════════════════════════════
function showQuestion() {
  // Check for a pending reward first (e.g. unlocked during a 10-in-a-row celebration)
  if (state.pendingReward) {
    const tier = state.pendingReward;
    state.pendingReward = null;
    showReward(tier);
    return;
  }

  if (state.deck.length === 0) {
    if (state.inTestMode) showTestResults();
    else handleDeckComplete();
    return;
  }

  const q = state.deck[0];
  state.currentQuestion = q;
  state.locked = false;
  state.testTimedOut = false;

  document.getElementById('question-text').textContent = `${q.a} × ${q.b} = ?`;
  hideFeedback();

  if (state.inTestMode) {
    showHardMode();
    startTestTimer();
  } else if (state.mode === 'easy') {
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

function handleChoiceTap(tappedBtn, chosen, correctAnswer) {
  if (state.locked) return;
  document.querySelectorAll('.choice-btn').forEach(b => (b.disabled = true));
  tappedBtn.classList.add(chosen === correctAnswer ? 'correct-choice' : 'wrong-choice');
  if (chosen !== correctAnswer) {
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (parseInt(b.textContent, 10) === correctAnswer) b.classList.add('correct-choice');
    });
  }
  processAnswer(chosen === correctAnswer);
}

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

function processAnswer(isCorrect) {
  state.locked = true;
  clearTestTimer();
  const q = state.currentQuestion;

  // Track which tables were practiced
  state.sessionTables.add(q.a);

  // Remove from front of deck
  state.deck.shift();

  state.sessionTotal++;

  // ── Test mode: no points, no streak, no re-insertion ──
  if (state.inTestMode) {
    if (isCorrect) {
      state.testCorrect++;
      state.sessionCorrect++;
      showFeedback('correct', pickCorrectMessage());
    } else {
      const msg = state.testTimedOut
        ? `⏱ Time's up! The answer was ${q.answer}`
        : `Not quite — the answer is ${q.answer}`;
      showFeedback('wrong', msg);
    }
    updateSessionStats(loadLifetime().points);
    const delay = isCorrect ? 600 : 1500;
    setTimeout(() => {
      if (state.deck.length === 0) showTestResults();
      else showQuestion();
    }, delay);
    return;
  }

  const lifetime      = loadLifetime();
  const pointsBefore  = lifetime.points;
  lifetime.total++;

  if (isCorrect) {
    state.sessionCorrect++;
    state.sessionStreak++;
    state.masteredSet.add(q.key);

    const pts = calculatePoints(q.a);
    state.sessionPoints += pts;
    lifetime.correct++;
    lifetime.points += pts;
    if (state.sessionStreak > lifetime.best) lifetime.best = state.sessionStreak;

    showFeedback('correct', pickCorrectMessage());

    // Check if a reward tier was just crossed
    const newTier = checkNewReward(pointsBefore, lifetime.points);
    if (newTier) {
      unlockReward(newTier);
      state.pendingReward = newTier;
    }
  } else {
    state.sessionStreak = 0;
    state.masteredSet.delete(q.key);

    // Re-insert question a few positions ahead
    const insertAt = Math.min(CONFIG.wrongAnswerInsertAt, state.deck.length);
    state.deck.splice(insertAt, 0, q);

    showFeedback('wrong', `Not quite — the answer is ${q.answer}`);
  }

  saveLifetime(lifetime);
  updateSessionStats(lifetime.points);

  const hitCelebration = isCorrect && state.sessionStreak % 10 === 0;
  const delay = hitCelebration ? 900 : (isCorrect ? 1000 : 1900);

  setTimeout(() => {
    if (hitCelebration) {
      showCelebration();
      // pendingReward (if any) will be shown when "Keep Going!" is tapped
    } else {
      showQuestion(); // handles pendingReward and empty deck automatically
    }
  }, delay);
}


// ═══════════════════════════════════════
// DECK COMPLETE
// ═══════════════════════════════════════
function handleDeckComplete() {
  saveSession();

  const lifetime      = loadLifetime();
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
    const plural   = newlyMastered.length > 1;
    title.textContent    = `Table${plural ? 's' : ''} Mastered!`;
    subtitle.textContent = `${newlyMastered.join(', ')} × — ★ New star${plural ? 's' : ''} earned!`;
    detail.textContent   = 'Time to try something harder — pick a new table!';
  } else {
    title.textContent    = 'Deck Complete!';
    subtitle.textContent = 'Great practice session!';
    detail.textContent   = 'Try a different table to keep improving.';
  }

  showScreen('screen-mastered');
}


// ═══════════════════════════════════════
// STATS DISPLAY
// ═══════════════════════════════════════
function updateSessionStats(lifetimePoints) {
  document.getElementById('stat-total').textContent   = state.sessionTotal;
  document.getElementById('stat-correct').textContent = state.sessionCorrect;
  document.getElementById('stat-streak').textContent  = state.sessionStreak;
  document.getElementById('stat-points').textContent  = lifetimePoints;
}


// ═══════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════
function pickCorrectMessage() {
  const msgs = CONFIG.correctMessages;
  return msgs[Math.floor(Math.random() * msgs.length)];
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
  const name = getPlayerName();
  document.getElementById('celebration-name-line').textContent =
    name ? `You're a Maths Superstar, ${name}!` : 'You are a Maths Superstar!';
  showScreen('screen-celebration');
  spawnConfetti();
}

function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const COLOURS = ['#7c3aed','#f97316','#22c55e','#fbbf24','#ef4444','#3b82f6','#ec4899','#06b6d4'];
  const SHAPES  = ['3px', '50%'];
  for (let i = 0; i < 70; i++) {
    const el = document.createElement('div');
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
// REWARD SCREEN
// ═══════════════════════════════════════
function showReward(tier) {
  document.getElementById('screen-reward').style.background = tier.gradient;
  document.getElementById('reward-emoji-display').textContent = tier.emoji;
  document.getElementById('reward-name').textContent         = tier.name;
  document.getElementById('reward-description').textContent  = tier.description;

  const videoWrapper = document.getElementById('reward-video-wrapper');
  if (tier.videoFile) {
    // Probe whether the file exists before showing the player
    fetch(tier.videoFile, { method: 'HEAD' })
      .then(r => {
        if (r.ok) {
          document.getElementById('reward-video-src').src = tier.videoFile;
          document.getElementById('reward-video').load();
          videoWrapper.classList.remove('hidden');
        } else {
          videoWrapper.classList.add('hidden');
        }
      })
      .catch(() => videoWrapper.classList.add('hidden'));
  } else {
    videoWrapper.classList.add('hidden');
  }

  showScreen('screen-reward');
}


// ═══════════════════════════════════════
// SCOREBOARD SCREEN
// ═══════════════════════════════════════
function buildScoreboard() {
  const name = getPlayerName();
  document.getElementById('scoreboard-name-line').textContent =
    name ? `${name}'s score history` : 'Your score history';

  const { sessions } = loadLifetime();
  const list  = document.getElementById('scoreboard-list');
  const empty = document.getElementById('scoreboard-empty');
  list.innerHTML = '';

  if (sessions.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  // Find the best session by points
  const bestPts = Math.max(...sessions.map(s => s.points));

  sessions.forEach(session => {
    const isBest   = session.points === bestPts;
    const accuracy = session.answered > 0
      ? Math.round((session.correct / session.answered) * 100)
      : 0;

    const row = document.createElement('div');
    row.className = 'session-row' + (isBest ? ' best' : '');

    const tablesStr = session.tables.length ? `×${session.tables.join(', ')}` : '';

    row.innerHTML = `
      <div>
        <div class="session-date">${formatDate(session.date)}</div>
        <div class="session-tables">${tablesStr}</div>
      </div>
      <div class="session-detail">
        ${session.answered} answered · ${accuracy}% correct
        ${isBest ? '<span class="session-best-badge">Best</span>' : ''}
      </div>
      <div class="session-points">${session.points} pts</div>
    `;

    list.appendChild(row);
  });
}

function formatDate(dateStr) {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00'); // force local time
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}


// ═══════════════════════════════════════
// TEST MODE TIMER
// ═══════════════════════════════════════
function startTestTimer() {
  clearTestTimer();
  state.testTimeLeft = 60; // 60 × 100ms = 6 seconds
  updateTimerBar(60);
  state.testTimer = setInterval(() => {
    state.testTimeLeft--;
    updateTimerBar(state.testTimeLeft);
    if (state.testTimeLeft <= 0) {
      clearTestTimer();
      if (!state.locked) {
        state.testTimedOut = true;
        processAnswer(false);
      }
    }
  }, 100);
}

function clearTestTimer() {
  if (state.testTimer) {
    clearInterval(state.testTimer);
    state.testTimer = null;
  }
}

function updateTimerBar(ticks) {
  const fill = document.getElementById('test-timer-fill');
  fill.style.width = (ticks / 60 * 100) + '%';
  if      (ticks > 30) fill.style.background = '#16a34a';
  else if (ticks > 15) fill.style.background = '#f97316';
  else                 fill.style.background = '#dc2626';
}


// ═══════════════════════════════════════
// START TEST SESSION
// ═══════════════════════════════════════
function startTest() {
  state.inTestMode     = true;
  state.testCorrect    = 0;
  state.testTimedOut   = false;
  state.sessionTotal   = 0;
  state.sessionCorrect = 0;
  state.sessionStreak  = 0;
  state.sessionPoints  = 0;
  state.sessionSaved   = false;
  state.masteredSet    = new Set();
  state.sessionTables  = new Set();
  state.pendingReward  = null;

  const fullDeck   = buildDeck();
  state.deck       = fullDeck.slice(0, CONFIG.testQuestionsCount);
  state.testTotal  = state.deck.length;

  document.getElementById('mode-badge').textContent =
    `🏫 School Test · ${state.testTotal} questions · 6 secs each`;
  document.getElementById('test-timer-bar').classList.remove('hidden');

  updateSessionStats(loadLifetime().points);
  showScreen('screen-practice');
  showQuestion();
}


// ═══════════════════════════════════════
// TEST RESULTS
// ═══════════════════════════════════════
function showTestResults() {
  clearTestTimer();
  document.getElementById('test-timer-bar').classList.add('hidden');
  state.inTestMode = false;

  const score = state.testCorrect;
  const total = state.testTotal;
  const pct   = total > 0 ? Math.round((score / total) * 100) : 0;

  document.getElementById('test-score').textContent = `${score} / ${total}`;
  document.getElementById('test-pct').textContent   = `${pct}%`;

  let message;
  if      (pct >= 90) message = '🌟 Outstanding! Your teacher will be so impressed!';
  else if (pct >= 75) message = '🎉 Really good work! Keep practising!';
  else if (pct >= 50) message = '💪 Good effort! A bit more practice and you\'ll smash it!';
  else                message = '😊 Keep practising — you\'ll get there!';

  document.getElementById('test-message').textContent = message;
  showScreen('screen-test-result');
}


// ═══════════════════════════════════════
// START PRACTICE SESSION
// ═══════════════════════════════════════
function startPractice() {
  state.sessionTotal   = 0;
  state.sessionCorrect = 0;
  state.sessionStreak  = 0;
  state.sessionPoints  = 0;
  state.sessionSaved   = false;
  state.deck           = buildDeck();
  state.masteredSet    = new Set();
  state.sessionTables  = new Set();
  state.pendingReward  = null;

  document.getElementById('mode-badge').textContent =
    CONFIG.modes[state.mode].badge;

  updateSessionStats(loadLifetime().points);
  showScreen('screen-practice');
  showQuestion();
}


// ═══════════════════════════════════════
// BACK TO SETUP (save session first)
// ═══════════════════════════════════════
function goToSetup() {
  clearTestTimer();
  state.inTestMode = false;
  document.getElementById('test-timer-bar').classList.add('hidden');
  saveSession();
  state.selectedTables = [];
  showScreen('screen-setup');
  refreshSetup();
}


// ═══════════════════════════════════════
// INITIALISE
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  initNameScreen();

  // Decide which screen to start on
  const name = getPlayerName();
  if (name) {
    showGreeting(name);
    showScreen('screen-setup');
    refreshSetup();
  } else {
    showScreen('screen-name');
  }

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  setMode('hard');

  // Setup screen
  document.getElementById('start-btn').addEventListener('click', startPractice);
  document.getElementById('test-btn').addEventListener('click', startTest);

  document.getElementById('change-name-btn').addEventListener('click', () => {
    showScreen('screen-name');
  });

  document.getElementById('scores-btn').addEventListener('click', () => {
    buildScoreboard();
    showScreen('screen-scoreboard');
  });

  // Practice screen
  document.getElementById('submit-btn').addEventListener('click', checkAnswer);
  document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkAnswer();
  });
  document.getElementById('back-btn').addEventListener('click', goToSetup);

  // Celebration screen
  document.getElementById('continue-btn').addEventListener('click', () => {
    showScreen('screen-practice');
    showQuestion(); // will show pending reward or next question
  });

  // Mastered screen
  document.getElementById('mastered-btn').addEventListener('click', goToSetup);

  // Scoreboard screen
  document.getElementById('scoreboard-back-btn').addEventListener('click', () => {
    showScreen('screen-setup');
    refreshSetup();
  });

  // Test results screen
  document.getElementById('test-again-btn').addEventListener('click', startTest);
  document.getElementById('test-back-btn').addEventListener('click', () => {
    state.selectedTables = [];
    showScreen('screen-setup');
    refreshSetup();
  });

  // Reward screen
  document.getElementById('reward-continue-btn').addEventListener('click', () => {
    // Stop any playing video
    const video = document.getElementById('reward-video');
    video.pause();
    showScreen('screen-practice');
    showQuestion();
  });

});
