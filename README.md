# Pawganizer

A tiny always-on-top pomodoro + to-do widget (with a cat) that reads and writes to your
"The Placement Plan Nethra" Notion workspace.

- Pulls today's tasks from **Planner (Nethra)** (`Priority = Today`, `Done? = false`)
- Add/edit tasks in the app → writes to Planner, so Notion stays current
- Edit a task directly in Notion → app picks it up on its next poll (every 2 min)
- Tick a task done → quick popup for difficulty/topics → logs a new row to
  **Leetcode** or **Development** with time taken pulled straight from the timer,
  and checks the task off in Planner

## Setup

```bash
cd pomodoro-app
npm install
cp .env.example .env
```

Open `.env` and paste your Notion integration token (steps are in the comments
in `.env.example`). The three database IDs are already filled in — they were
pulled from your workspace.

Then, in Notion, share each of the three databases (Planner, Leetcode,
Development) with your integration: open the database → `...` menu →
"Connect to" → pick your integration.

```bash
npm start
```

The widget opens pinned to the top-right of your screen, above other windows.

## Notes / known limits (v1)

- Sync is polling-based (every 2 minutes), not instant push — a true realtime
  webhook needs a public HTTPS endpoint, which isn't practical for a personal
  desktop app.
- Timer notifications use the OS notification system; the in-app ring is the
  main visual cue.
- "Time taken" is measured from when you select a task as active in the app,
  not from when the Notion page was created.
- No packaged installer yet — this runs via `npm start` for now. Once you're
  happy with it, `electron-builder` can package it into a real .app/.exe.
