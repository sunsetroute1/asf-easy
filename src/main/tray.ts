import { Menu, Tray, nativeImage, type BrowserWindow } from 'electron'
import {
  getStatus,
  isAsfRunning,
  startAsf,
  stopAsf,
  waitForIpc
} from './asf-service'

export interface TrayHandlers {
  showMainWindow: () => void
  openDashboard: () => Promise<void>
  quitApp: () => void
}

let tray: Tray | null = null

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#1b6aa5"/>
      <text x="16" y="22" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">A</text>
    </svg>
  `.trim()

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
}

async function refreshTrayMenu(handlers: TrayHandlers): Promise<void> {
  if (!tray) {
    return
  }

  const status = await getStatus()
  const running = isAsfRunning()

  tray.setToolTip(running ? 'ASF Easy — ASF running' : 'ASF Easy — ASF stopped')

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show ASF Easy', click: handlers.showMainWindow },
      { type: 'separator' },
      {
        label: running ? 'ASF is running' : 'ASF is stopped',
        enabled: false
      },
      {
        label: 'Start ASF',
        enabled: status.installed && !running,
        click: async () => {
          startAsf()
          await waitForIpc()
          await refreshTrayMenu(handlers)
        }
      },
      {
        label: 'Stop ASF',
        enabled: running,
        click: () => {
          stopAsf()
          void refreshTrayMenu(handlers)
        }
      },
      {
        label: 'Open dashboard',
        enabled: status.installed,
        click: () => {
          void handlers.openDashboard()
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: handlers.quitApp }
    ])
  )
}

export function setupTray(handlers: TrayHandlers): Tray {
  if (tray) {
    return tray
  }

  tray = new Tray(createTrayIcon())
  tray.setTitle('ASF Easy')
  tray.on('double-click', handlers.showMainWindow)
  void refreshTrayMenu(handlers)

  return tray
}

export function refreshTray(handlers: TrayHandlers): void {
  void refreshTrayMenu(handlers)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

export function updateTrayForWindow(
  mainWindow: BrowserWindow | null,
  closeToTray: boolean,
  isQuitting: () => boolean
): void {
  if (!mainWindow) {
    return
  }

  mainWindow.on('close', (event) => {
    if (closeToTray && !isQuitting()) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}
