// ---------- State ----------
let tasks = [];
let selectedTaskId = null;
let timerSeconds = 25 * 60;
let totalSeconds = 25 * 60;
let timerInterval = null;
let elapsedForTask = 0; // seconds actually spent on the currently selected task

const RING_CIRCUMFERENCE = 327;

// ---------- Elements ----------
const timerLabel = document.getElementById("timer-label");
const ringProgress = document.getElementById("ring-progress");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const modeSelect = document.getElementById("mode-select");
const activeTaskEl = document.getElementById("active-task");
const taskListEl = document.getElementById("task-list");

const doneModal = document.getElementById("done-modal");
const addModal = document.getElementById("add-modal");
const catEl = document.getElementById("pet-cat");

const pageTimer = document.getElementById("page-timer");
const pageTasks = document.getElementById("page-tasks");
const tasksNavBtn = document.getElementById("tasks-nav-btn");
const backToTimerBtn = document.getElementById("back-to-timer-btn");

// ---------- Pages ----------
function showPage(page) {
  pageTimer.classList.toggle("active", page === "timer");
  pageTasks.classList.toggle("active", page === "tasks");
}

tasksNavBtn.addEventListener("click", () => showPage("tasks"));
backToTimerBtn.addEventListener("click", () => showPage("timer"));

showPage("timer");

// ---------- Cat ----------
function setCatBaseState(running) {
  catEl.classList.remove("idle", "sleeping");
  catEl.classList.add(running ? "idle" : "sleeping");
}

function triggerCatPounce() {
  catEl.classList.remove("pounce");
  void catEl.offsetWidth; // restart animation if already mid-pounce
  catEl.classList.add("pounce");
}

function triggerCatWave() {
  catEl.classList.remove("wave");
  void catEl.offsetWidth;
  catEl.classList.add("wave");
}

catEl.addEventListener("animationend", (e) => {
  if (e.animationName === "cat-pounce") catEl.classList.remove("pounce");
  if (e.animationName === "cat-wave") catEl.classList.remove("wave");
});

setCatBaseState(false);

// ---------- Timer ----------
function renderTimer() {
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const s = (timerSeconds % 60).toString().padStart(2, "0");
  timerLabel.textContent = `${m}:${s}`;
  const fraction = timerSeconds / totalSeconds;
  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);
}

function startTimer() {
  if (timerInterval) return;
  startBtn.textContent = "⏸";
  startBtn.title = "Pause";
  setCatBaseState(true);
  timerInterval = setInterval(() => {
    timerSeconds--;
    elapsedForTask++;
    renderTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      startBtn.textContent = "▶";
      startBtn.title = "Start";
      setCatBaseState(false);
      new Notification("Time's up! 🌸", { body: "Session complete — take a breath." });
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  startBtn.textContent = "▶";
  startBtn.title = "Start";
  setCatBaseState(false);
}

startBtn.addEventListener("click", () => {
  if (timerInterval) pauseTimer();
  else startTimer();
});

resetBtn.addEventListener("click", () => {
  pauseTimer();
  timerSeconds = totalSeconds;
  renderTimer();
});

modeSelect.addEventListener("change", () => {
  pauseTimer();
  totalSeconds = parseInt(modeSelect.value, 10) * 60;
  timerSeconds = totalSeconds;
  renderTimer();
});

// ---------- Tasks ----------
async function loadTasks() {
  try {
    tasks = await window.api.getTasks();
  } catch (err) {
    activeTaskEl.textContent = "couldn't reach Notion — check .env config";
    console.error(err);
    return;
  }
  renderTasks();
}

function renderTasks() {
  taskListEl.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = task.id === selectedTaskId ? "selected" : "";
    li.innerHTML = `<span class="check"></span><span class="label">${task.action}</span><span class="cat">${task.topic || ""}</span>`;

    // click the row = select it as the active timer task
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("check")) return;
      selectedTaskId = task.id;
      elapsedForTask = 0;
      activeTaskEl.textContent = `focusing on: ${task.action}`;
      renderTasks();
      showPage("timer");
    });

    // click the checkbox = mark done -> open log modal
    li.querySelector(".check").addEventListener("click", () => openDoneModal(task));

    taskListEl.appendChild(li);
  });
}

document.getElementById("add-task-btn").addEventListener("click", () => {
  addModal.classList.add("open");
});
document.getElementById("add-cancel").addEventListener("click", () => addModal.classList.remove("open"));
document.getElementById("add-save").addEventListener("click", async () => {
  const action = document.getElementById("new-task-action").value.trim();
  const topic = document.getElementById("new-task-topic").value;
  if (!action) return;
  await window.api.createTask({ action, priority: "Today", topic });
  document.getElementById("new-task-action").value = "";
  addModal.classList.remove("open");
  triggerCatWave();
  loadTasks();
});

// ---------- Done / log flow ----------
let pendingTask = null;

function openDoneModal(task) {
  pendingTask = task;
  document.getElementById("modal-title").textContent = `nice work! log "${task.action}"`;
  const minutesSpent = Math.max(1, Math.round(elapsedForTask / 60));
  document.getElementById("log-minutes").textContent = minutesSpent;
  doneModal.classList.add("open");
}

document.getElementById("modal-cancel").addEventListener("click", () => doneModal.classList.remove("open"));

document.getElementById("modal-save").addEventListener("click", async () => {
  const type = document.getElementById("log-type").value;
  const difficulty = document.getElementById("log-difficulty").value;
  const topics = document
    .getElementById("log-topics")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const minutes = parseInt(document.getElementById("log-minutes").textContent, 10);

  if (type === "leetcode") {
    await window.api.logLeetcode({ question: pendingTask.action, difficulty, topics, minutes });
  } else if (type === "development") {
    await window.api.logDevelopment({ concept: pendingTask.action, difficulty, techStack: topics, minutes });
  }

  await window.api.completeTask(pendingTask.id);
  doneModal.classList.remove("open");
  triggerCatPounce();
  selectedTaskId = null;
  activeTaskEl.textContent = "no task selected — pick one below";
  loadTasks();
});

// ---------- Misc ----------
document.getElementById("quit-btn").addEventListener("click", () => window.close());
window.api.onTasksRefresh(() => loadTasks());

renderTimer();
loadTasks();
