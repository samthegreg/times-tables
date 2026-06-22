# Times Tables Practice

A child-friendly times tables practice app for iPad, built as a web app.

## Purpose

Lets a child choose which times tables to practise (2–12), answer one question at a time, earn points, collect mastery stars, and unlock reward badges. A smart deck ensures wrong answers come back quickly and right answers don't repeat until the full table is done.

---

## How to run it

**Option 1 — open directly in a browser (quickest for testing)**

Double-click `index.html`. Everything works except the "install as app" feature.

**Option 2 — run a local server (needed to test offline / PWA install)**

Open Terminal and run:

```
cd "/Users/samgregory/Library/Mobile Documents/com~apple~CloudDocs/Claude Code/AI Projects/Times Tables"
python3 -m http.server 8000
```

What those commands do:
- `cd` — "change directory" — moves Terminal into the project folder
- `python3 -m http.server 8000` — starts a tiny web server at `http://localhost:8000`

Press `Ctrl + C` in Terminal to stop the server.

---

## File structure

```
index.html        — Page structure (seven screens)
style.css         — Visual design
config.js         — All content settings: tiers, difficulty, points, messages
app.js            — All logic: deck, scoring, name, sessions, rewards
manifest.json     — Lets browsers install this as an app
service-worker.js — Makes the app work offline after first load
rewards/          — Drop reward video files here (see rewards/README.txt)
README.md         — This file
```

**To change point thresholds, reward tiers, difficulty groups, or messages: edit `config.js` only. No need to touch `app.js`.**

---

## Reverting changes with git

Every completed feature is saved as a git snapshot. To see the history:
```
git log --oneline
```

To go back to a previous snapshot:
```
git checkout <snapshot-id>
```

---

## Completed features

- **Name entry** — first-launch prompt; personalises greetings and scoreboard; changeable at any time
- **Scoreboard** — last 10 sessions with date, points, tables practiced, accuracy; best session highlighted
- **Best session** visible on setup screen at all times
- **Tiered reward badges** — Bronze (50 pts), Silver (150 pts), Gold (400 pts); earned once and saved permanently; greyed out until unlocked
- **Gold reward video** — drop `rewards/reward-gold.mp4` into the rewards folder; plays in-app when Gold is unlocked
- **Smart deck system** — wrong answers return within 4 questions; right answers leave the deck
- **Deck completion** — prompts to try new tables rather than looping; awards mastery stars
- **Mastery stars** — each table earns a ★ on first full completion; saved permanently
- **Easy mode** — four multiple-choice buttons; earns ×1 mode bonus
- **Hard mode** — type the answer; earns ×2 mode bonus
- **Points system** — table difficulty (×1/×2/×3) × mode bonus (×1/×2) × mastery penalty (×0.5 once starred)
- **Celebration** — confetti screen after 10 correct in a row, personalised with name
- **Works offline** after first load (Progressive Web App)
- **Version history** via git — every feature checkpoint is a named snapshot

---

## Deploying as a home screen app (in progress)

The app is ready to deploy to Netlify as a proper installable PWA. Resume here next session:

1. Open `make-icons.html` in your browser — click both download buttons
2. Move `icon-192.png` and `icon-512.png` from Downloads into this Times Tables folder
3. Go to **netlify.com**, sign in, drag this whole folder onto the deploy area
4. Open the Netlify URL in Safari on iPad → Share → Add to Home Screen

---

## Sensible next steps

- Add a second child profile (separate name, stats, and progress)
- Add sound effects (ding for correct, buzz for wrong)
- Add per-table accuracy breakdown so weak spots are visible
- Allow custom reward thresholds and tier names from within the app
- Add a parent dashboard showing progress over time
