# Times Tables Practice

A child-friendly times tables practice app for iPad, built as a web app.

## Purpose

Lets a child choose which times tables to practise (2–12), answer one question at a time, get instant right/wrong feedback, and earn points and stars. Questions are managed as a smart deck — wrong answers come back quickly, right answers don't repeat until the table is complete. When a full table is mastered, the app prompts her to try a new one.

---

## How to run it

**Option 1 — open directly in a browser (quickest for testing)**

Double-click `index.html`. It will open in your default browser. Everything works except the "install as app" feature.

**Option 2 — run a local server (needed to test offline / PWA install)**

Open Terminal and run:

```
cd "/Users/samgregory/Library/Mobile Documents/com~apple~CloudDocs/Claude Code/AI Projects/Times Tables"
python3 -m http.server 8000
```

What those commands do:
- `cd` — "change directory" — moves Terminal into the project folder
- `python3 -m http.server 8000` — starts a tiny web server on your computer at `http://localhost:8000`

Then open `http://localhost:8000` in Safari or Chrome. Press `Ctrl + C` in Terminal to stop the server.

---

## File structure

```
index.html        — The page structure (four screens)
style.css         — Visual design (colours, layout, animations)
app.js            — All logic (deck, scoring, modes, saving)
manifest.json     — Lets browsers install this as an app
service-worker.js — Makes the app work offline after first load
README.md         — This file
```

---

## Completed features

- Choose which tables to practise (2–12) with difficulty colour-coding
- **Smart deck system** — wrong answers return within 4 questions; right answers don't repeat until the deck is done
- **Deck completion** — when all questions answered correctly, prompts to try a new table instead of looping
- **Mastery stars** — each table earns a ★ the first time its full deck is completed; saved on device
- **Easy mode** — four tap buttons (multiple choice); no typing needed
- **Hard mode** — type the answer; earns double points
- **Points system** with three multipliers:
  - Table difficulty: Easy tables (2, 5, 10) = ×1 · Medium (3, 4, 6, 11, 12) = ×2 · Hard (7, 8, 9) = ×3
  - Mode: Easy = ×1 · Hard = ×2
  - Already mastered: ×0.5 (encourages moving to new tables)
- Session stats: total answered, correct, current streak, points
- Lifetime stats saved on device: total, correct, best streak, total points, mastery stars
- Celebration screen with confetti after 10 correct in a row
- Child-friendly design, large touch targets, iPad-ready

---

## Sensible next steps

- Add proper app icons (192×192 and 512×512 PNG files) for iPad home screen shortcut
- Tie points to a tangible reward (e.g. unlock a sticker, unlock a Spotify playlist)
- Show a per-table stats breakdown (accuracy %, best streak per table)
- Add sound effects (ding for correct, buzz for wrong)
- Allow child to enter their name to personalise the experience
- Add a parent dashboard showing progress over time
