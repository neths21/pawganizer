// notion.js — talks to the Notion REST API directly (not the chat connector).
// Runs in the Electron MAIN process so the integration token never touches the renderer.

const NOTION_VERSION = "2022-06-28";
const BASE = "https://api.notion.com/v1";

const DB = {
  planner: process.env.NOTION_PLANNER_DB_ID, // 51bd5ba5-5763-4c2d-b64d-9b481847d5a2
  leetcode: process.env.NOTION_LEETCODE_DB_ID, // d68d4257-f3da-40f4-b262-c936656117b4
  development: process.env.NOTION_DEVELOPMENT_DB_ID, // 220d0583-66de-8047-9094-fbe3c03a7bab
};

function headers() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API ${res.status}: ${body}`);
  }
  return res.json();
}

// Converts a raw minute count from the pomodoro timer into the nearest
// "Time Taken" select option used by both the Leetcode and Development DBs.
function minutesToBucket(minutes) {
  if (minutes < 10) return "<10 minutes";
  if (minutes < 20) return "10-20 minutes";
  if (minutes < 30) return "20-30 minutes";
  if (minutes < 40) return "30-40 minutes";
  if (minutes < 50) return "40-50 minutes";
  if (minutes < 60) return "50-60 minutes";
  return "1 hour+";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Planner (the two-way to-do list)

async function getTodayTasks() {
  const data = await notionFetch(`/databases/${DB.planner}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        and: [
          { property: "Done?", checkbox: { equals: false } },
          { property: "Priority", select: { equals: "Today" } },
        ],
      },
      sorts: [{ property: "Priority", direction: "ascending" }],
    }),
  });

  return data.results.map((page) => ({
    id: page.id,
    action: page.properties["Action"]?.title?.[0]?.plain_text || "(untitled)",
    priority: page.properties["Priority"]?.select?.name || null,
    topic: page.properties["Topic"]?.select?.name || null,
    dueDate: page.properties["Due Date"]?.date?.start || null,
  }));
}

// topic must be exactly ONE of: Backend, AI Engineering, DSA, Research,
// Job Applications, Abroad Search — one topic per row, never a mix.
async function createTask({ action, priority = "Today", topic }) {
  const props = {
    Action: { title: [{ text: { content: action } }] },
    Priority: { select: { name: priority } },
    "Done?": { checkbox: false },
  };
  if (topic) props.Topic = { select: { name: topic } };

  const page = await notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: DB.planner }, properties: props }),
  });
  return page.id;
}

async function updateTask(pageId, { action, priority, topic, dueDate }) {
  const props = {};
  if (action) props.Action = { title: [{ text: { content: action } }] };
  if (priority) props.Priority = { select: { name: priority } };
  if (topic) props.Topic = { select: { name: topic } };
  if (dueDate) props["Due Date"] = { date: { start: dueDate } };

  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: props }),
  });
}

async function completeTask(pageId) {
  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        "Done?": { checkbox: true },
        "Status 1": { status: { name: "Done" } },
      },
    }),
  });
}

// Leetcode log

async function logLeetcode({ question, difficulty, topics = [], minutes, company = [] }) {
  const props = {
    Question: { title: [{ text: { content: question } }] },
    Difficulty: { select: { name: difficulty } },
    Problem: { multi_select: topics.map((name) => ({ name })) },
    "Time Taken": { select: { name: minutesToBucket(minutes) } },
    Finished: { date: { start: todayISO() } },
  };
  if (company.length) props.Company = { multi_select: company.map((name) => ({ name })) };

  await notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: DB.leetcode }, properties: props }),
  });
}

// Development (roadmap.sh) log

async function logDevelopment({ concept, difficulty, techStack = [], minutes, company = [] }) {
  const props = {
    concept: { title: [{ text: { content: concept } }] },
    Difficulty: { select: { name: difficulty } },
    "tech stack": { multi_select: techStack.map((name) => ({ name })) },
    "Time Taken": { select: { name: minutesToBucket(minutes) } },
    Finished: { date: { start: todayISO() } },
  };
  if (company.length) props.Company = { multi_select: company.map((name) => ({ name })) };

  await notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: DB.development }, properties: props }),
  });
}

module.exports = {
  getTodayTasks,
  createTask,
  updateTask,
  completeTask,
  logLeetcode,
  logDevelopment,
};
