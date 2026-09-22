const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: false },
  });
  await win.loadFile(path.join(__dirname, "icon.html"));
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, "..", "src", "icon.png"), image.toPNG());
  app.quit();
});
