import { BrowserWindow, ipcMain, shell, app } from 'electron'
import { join } from 'path'
import {
  applyLaunchAtLogin,
  deleteBot,
  getAppRoot,
  getBotSummaries,
  getDashboardUrl,
  getPrerequisitesReport,
  getStatus,
  installAsf,
  openConfigFolder,
  readSettings,
  saveBotConfig,
  shouldLaunchInBackground,
  startAsf,
  stopAsf,
  updateSettings,
  waitForIpc,
  type BotConfigInput,
  type InstallProgress
} from './asf-service'
import { ensurePrerequisites } from './prerequisites'
import { destroyTray, refreshTray, setupTray, updateTrayForWindow } from './tray'
import type { AppSettings } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let dashboardWindow: BrowserWindow | null = null
let isQuitting = false

const trayHandlers = {
  showMainWindow: (): void => {
    if (!mainWindow) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  },
  openDashboard: async (): Promise<void> => {
    await openDashboardWindow()
  },
  quitApp: (): void => {
    isQuitting = true
    app.quit()
  }
}

function createWindow(): void {
  const settings = readSettings()
  const launchHidden = shouldLaunchInBackground()

  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 760,
    minHeight: 620,
    show: !launchHidden,
    autoHideMenuBar: true,
    title: 'ASF Easy',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  updateTrayForWindow(mainWindow, settings.closeToTray, () => isQuitting)

  mainWindow.on('ready-to-show', () => {
    if (!launchHidden) {
      mainWindow?.show()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function openDashboardWindow(): Promise<void> {
  if (!(await waitForIpc(3000))) {
    startAsf()
    await waitForIpc()
  }

  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus()
    return
  }

  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    title: 'ASF Dashboard',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  dashboardWindow.loadURL(getDashboardUrl())
  dashboardWindow.on('closed', () => {
    dashboardWindow = null
  })
}

async function syncTrayAndLaunchSettings(settings: AppSettings): Promise<void> {
  applyLaunchAtLogin(settings)
  refreshTray(trayHandlers)
}

app.whenReady().then(async () => {
  const settings = readSettings()
  setupTray(trayHandlers)
  applyLaunchAtLogin(settings)
  createWindow()

  if (settings.startAsfOnLaunch && (await getStatus()).installed) {
    startAsf()
    refreshTray(trayHandlers)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
  stopAsf()
  destroyTray()
})

app.on('window-all-closed', () => {
  const settings = readSettings()
  if (process.platform !== 'darwin' && !settings.minimizeToTray) {
    isQuitting = true
    stopAsf()
    app.quit()
  }
})

ipcMain.handle('asf:getStatus', async () => {
  const status = await getStatus()
  refreshTray(trayHandlers)
  return status
})

ipcMain.handle('asf:getPrerequisites', () => getPrerequisitesReport())

ipcMain.handle('asf:installPrerequisites', async (event) => {
  return ensurePrerequisites(getAppRoot(), (progress: InstallProgress) => {
    event.sender.send('asf:installProgress', progress)
  })
})

ipcMain.handle('asf:install', async (event) => {
  return installAsf((progress: InstallProgress) => {
    event.sender.send('asf:installProgress', progress)
  })
})

ipcMain.handle('asf:saveBotConfig', (_event, input: BotConfigInput) => {
  saveBotConfig(input)
  refreshTray(trayHandlers)
})

ipcMain.handle('asf:deleteBot', (_event, botName: string) => {
  deleteBot(botName)
  refreshTray(trayHandlers)
})

ipcMain.handle('asf:getBotSummaries', () => getBotSummaries())

ipcMain.handle('asf:updateSettings', async (_event, patch: Partial<AppSettings>) => {
  const next = updateSettings(patch)
  await syncTrayAndLaunchSettings(next)
  return next
})

ipcMain.handle('asf:start', async () => {
  startAsf()
  const ready = await waitForIpc()
  refreshTray(trayHandlers)
  return { ready }
})

ipcMain.handle('asf:stop', () => {
  stopAsf()
  refreshTray(trayHandlers)
})

ipcMain.handle('asf:openDashboard', async () => {
  await openDashboardWindow()
})

ipcMain.handle('asf:openConfigFolder', () => {
  shell.openPath(openConfigFolder())
})

ipcMain.handle('asf:listBots', () => getBotSummaries().map((bot) => bot.name))

ipcMain.handle('asf:openExternal', (_event, url: string) => {
  shell.openExternal(url)
})
