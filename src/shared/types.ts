export interface AppSettings {
  setupComplete: boolean
  lastBotName?: string
  launchAtLogin: boolean
  minimizeToTray: boolean
  startAsfOnLaunch: boolean
  closeToTray: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  setupComplete: false,
  launchAtLogin: false,
  minimizeToTray: true,
  startAsfOnLaunch: false,
  closeToTray: true
}

export interface InstallProgress {
  phase:
    | 'prerequisites-check'
    | 'prerequisites-download'
    | 'prerequisites-install'
    | 'checking'
    | 'downloading'
    | 'extracting'
    | 'done'
    | 'error'
  percent: number
  message: string
}

export interface PrerequisiteItem {
  id: string
  name: string
  description: string
  installed: boolean
  required: boolean
  canAutoInstall: boolean
}

export interface PrerequisitesReport {
  allSatisfied: boolean
  items: PrerequisiteItem[]
}

export interface AsfStatus {
  installed: boolean
  version: string | null
  running: boolean
  ipcReady: boolean
  installPath: string
  settings: AppSettings
}

export interface BotConfigInput {
  botName: string
  steamLogin: string
  steamPassword: string
}

export interface BotSummary {
  name: string
  steamLogin: string
  enabled: boolean
}

export type WizardStep = 'welcome' | 'install' | 'accounts' | 'steamguard' | 'dashboard'
