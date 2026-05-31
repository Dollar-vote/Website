# DollarVote

> Every dollar is a vote. A conscious-commerce app connecting shoppers with verified local businesses, and giving business owners a public "DollarVote score."

This started as a wireframe designed in Claude chat and is now a runnable React app. Right now it's an **interactive prototype** — all screens are real and clickable, using sample Detroit data. There's no backend or real accounts yet (that's a future milestone).

## How to run it

You need [Node.js](https://nodejs.org) installed (you already have it).

1. Open Terminal and go to this folder:
   ```bash
   cd ~/Desktop/DollarVote
   ```
2. The first time only, install dependencies:
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. It will open `http://localhost:5173/` in your browser. Leave the Terminal window open while you use it. Press `Ctrl + C` in Terminal to stop.

Any change you save to the code shows up in the browser instantly.

## What you can do in it

- **Interactive Prototype** (default view) — one phone you can tap through:
  - Choose **Shopper** or **Business Owner** on the welcome screen
  - Shopper flow: Home feed → Map → Categories → Business profile → My Impact
  - Business flow: Why-subscribe → Pricing tiers → Dashboard
  - Use **← Back** and **🏠 Restart** above the phone to move around
- **All Screens** — the original design gallery showing all 9 screens at once, with a filter for Consumer / Business flows.

## Project layout

```
DollarVote/
├── index.html            # Page shell the browser loads
├── package.json          # Project dependencies + scripts
├── vite.config.js        # Build tool config
├── public/favicon.svg    # Browser tab icon
├── src/
│   ├── main.jsx          # App entry point
│   ├── index.css         # Base page styles
│   └── App.jsx           # The entire app: theme, screens, navigation
├── wireframe-source.jsx  # Original wireframe from Claude chat (kept for reference)
└── extracted/            # Original zip contents (wireframe + business plan)
```

Everything lives in `src/App.jsx` today. As the app grows, screens can be split into their own files.

## Ideas for what's next

- Make a single screen feel like a real installed app (full-screen phone mode)
- Real business data instead of the sample Detroit list
- User accounts and saved businesses
- The actual scoring system (Locality / Sustainability / Transparency)
- Business owner sign-up + payments
```
