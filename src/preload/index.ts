import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, AsfStatus, BotConfigInput, BotSummary, InstallProgress, PrerequisitesReport } from '../shared/types'

export type { AppSettings, AsfStatus, BotConfigInput, BotSummary, InstallProgress, PrerequisitesReport }

const api = {
  getStatus: (): Promise<AsfStatus> => ipcRenderer.invoke('asf:getStatus'),
  getPrerequisites: (): Promise<PrerequisitesReport> => ipcRenderer.invoke('asf:getPrerequisites'),
  installPrerequisites: (): Promise<PrerequisitesReport> => ipcRenderer.invoke('asf:installPrerequisites'),
  install: (): Promise<{ version: string }> => ipcRenderer.invoke('asf:install'),
  onInstallProgress: (callback: (progress: InstallProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: InstallProgress): void => {
      callback(progress)
    }
    ipcRenderer.on('asf:installProgress', listener)
    return () => ipcRenderer.removeListener('asf:installProgress', listener)
  },
  saveBotConfig: (input: BotConfigInput): Promise<void> => ipcRenderer.invoke('asf:saveBotConfig', input),
  deleteBot: (botName: string): Promise<void> => ipcRenderer.invoke('asf:deleteBot', botName),
  getBotSummaries: (): Promise<BotSummary[]> => ipcRenderer.invoke('asf:getBotSummaries'),
  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('asf:updateSettings', patch),
  start: (): Promise<{ ready: boolean }> => ipcRenderer.invoke('asf:start'),
  stop: (): Promise<void> => ipcRenderer.invoke('asf:stop'),
  openDashboard: (): Promise<void> => ipcRenderer.invoke('asf:openDashboard'),
  openConfigFolder: (): Promise<void> => ipcRenderer.invoke('asf:openConfigFolder'),
  listBots: (): Promise<string[]> => ipcRenderer.invoke('asf:listBots'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('asf:openExternal', url)
}

contextBridge.exposeInMainWorld('asfEasy', api)

export type AsfEasyApi = typeof api
