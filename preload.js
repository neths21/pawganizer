const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getTasks: () => ipcRenderer.invoke("notion:getTasks"),
  createTask: (task) => ipcRenderer.invoke("notion:createTask", task),
  updateTask: (id, updates) => ipcRenderer.invoke("notion:updateTask", id, updates),
  completeTask: (id) => ipcRenderer.invoke("notion:completeTask", id),
  logLeetcode: (entry) => ipcRenderer.invoke("notion:logLeetcode", entry),
  logDevelopment: (entry) => ipcRenderer.invoke("notion:logDevelopment", entry),
  onTasksRefresh: (cb) => ipcRenderer.on("tasks:refresh", cb),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  setPage: (page) => ipcRenderer.invoke("window:setPage", page),
});
