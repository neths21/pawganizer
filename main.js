require("dotenv").config();
const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require("electron");
const path = require("path");
const notion = require("./notion");

let win;
let tray;
let pollTimer;

const PAGE_SIZES = {
  timer: { width: 300, height: 248 },
  tasks: { width: 300, height: 480 },
};

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: PAGE_SIZES.timer.width,
    height: PAGE_SIZES.timer.height,
    x: sw - 340,
    y: 40,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    transparent: true,
    icon: path.join(__dirname, "src", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver"); // stays above fullscreen apps too
  win.loadFile(path.join(__dirname, "src", "index.html"));
}

function createTray() {
  tray = new Tray(path.join(__dirname, "src", "icon.png"));
  tray.setToolTip("Pawganizer");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show/Hide", click: () => win.setVisible(!win.isVisible()) },
      { label: "Quit", click: () => app.quit() },
    ])
  );
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Poll Notion every 2 minutes so edits made directly in Notion
  // (renaming a task, changing priority, etc.) show up in the app.
  pollTimer = setInterval(() => {
    win.webContents.send("tasks:refresh");
  }, 2 * 60 * 1000);
});

app.on("window-all-closed", () => {
  clearInterval(pollTimer);
  if (process.platform !== "darwin") app.quit();
});

// IPC bridge to notion.js

ipcMain.handle("window:minimize", () => win.minimize());
ipcMain.handle("window:setPage", (_e, page) => {
  const size = PAGE_SIZES[page] || PAGE_SIZES.timer;
  // On Windows, setSize() can silently no-op on a resizable:false window
  // (it's pinned to whatever size it had when that flag was last set),
  // so toggle resizable on around the resize to force it through.
  win.setResizable(true);
  win.setSize(size.width, size.height);
  win.setResizable(false);
});

ipcMain.handle("notion:getTasks", async () => notion.getTodayTasks());
ipcMain.handle("notion:createTask", async (_e, task) => notion.createTask(task));
ipcMain.handle("notion:updateTask", async (_e, id, updates) => notion.updateTask(id, updates));
ipcMain.handle("notion:completeTask", async (_e, id) => notion.completeTask(id));
ipcMain.handle("notion:logLeetcode", async (_e, entry) => notion.logLeetcode(entry));
ipcMain.handle("notion:logDevelopment", async (_e, entry) => notion.logDevelopment(entry));
