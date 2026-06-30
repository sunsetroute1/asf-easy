import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { get as httpGet } from 'http'
import { get as httpsGet } from 'https'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import AdmZip from 'adm-zip'
import { app } from 'electron'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type AsfStatus,
  type BotConfigInput,
  type BotSummary,
  type InstallProgress,
  type PrerequisitesReport
} from '../shared/types'
import { ensurePrerequisites, getPrerequisitesReport } from './prerequisites'

export type { AppSettings, AsfStatus, BotConfigInput, BotSummary, InstallProgress, PrerequisitesReport }

const GITHUB_API = 'https://api.github.com/repos/JustArchiNET/ArchiSteamFarm/releases/latest'
const IPC_URL = 'http://127.0.0.1:1242'
const WINDOWS_ASSET = 'ASF-win-x64.zip'

let asfProcess: ChildProcessWithoutNullStreams | null = null

function appRoot(): string {
  return app.getPath('userData')
}

export function getAppRoot(): string {
  return appRoot()
}

function asfInstallPath(): string {
  return join(appRoot(), 'asf')
}

function settingsPath(): string {
  return join(appRoot(), 'settings.json')
}

function configDir(): string {
  return join(asfInstallPath(), 'config')
}

function asfExecutable(): string {
  return join(asfInstallPath(), 'ArchiSteamFarm.exe')
}

function botConfigPath(botName: string): string {
  return join(configDir(), `${botName}.json`)
}

function ensureAppRoot(): void {
  mkdirSync(appRoot(), { recursive: true })
}

function mergeSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  return { ...DEFAULT_SETTINGS, ...raw }
}

export function readSettings(): AppSettings {
  ensureAppRoot()
  if (!existsSync(settingsPath())) {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    return mergeSettings(JSON.parse(readFileSync(settingsPath(), 'utf8')) as Partial<AppSettings>)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  ensureAppRoot()
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...readSettings(), ...patch }
  saveSettings(next)
  return next
}

function readInstalledVersion(): string | null {
  const versionFile = join(asfInstallPath(), 'version.txt')
  if (!existsSync(versionFile)) {
    return null
  }

  return readFileSync(versionFile, 'utf8').trim() || null
}

function writeInstalledVersion(version: string): void {
  writeFileSync(join(asfInstallPath(), 'version.txt'), version, 'utf8')
}

function isInstalled(): boolean {
  return existsSync(asfExecutable())
}

function isReservedConfigFile(fileName: string): boolean {
  return fileName === 'ASF.json' || fileName === 'IPC.config'
}

function readBotJson(botName: string): Record<string, unknown> | null {
  const path = botConfigPath(botName)
  if (!existsSync(path)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https') ? httpsGet : httpGet
    const request = getter(url, { headers: { 'User-Agent': 'ASF-Easy' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchJson<T>(response.headers.location).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Request failed (${response.statusCode})`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T)
        } catch (error) {
          reject(error)
        }
      })
    })

    request.on('error', reject)
  })
}

async function downloadFile(url: string, destination: string, onProgress: (percent: number) => void): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const getter = url.startsWith('https') ? httpsGet : httpGet
    const request = getter(url, { headers: { 'User-Agent': 'ASF-Easy' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, destination, onProgress).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed (${response.statusCode})`))
        return
      }

      const total = Number(response.headers['content-length'] ?? 0)
      let downloaded = 0
      const file = createWriteStream(destination)

      response.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (total > 0) {
          onProgress(Math.min(99, Math.round((downloaded / total) * 100)))
        }
      })

      pipeline(response, file)
        .then(() => {
          onProgress(100)
          resolve()
        })
        .catch(reject)
    })

    request.on('error', reject)
  })
}

interface GitHubRelease {
  tag_name: string
  assets: Array<{ name: string; browser_download_url: string }>
}

export async function installAsf(onProgress: (progress: InstallProgress) => void): Promise<{ version: string }> {
  ensureAppRoot()

  await ensurePrerequisites(appRoot(), onProgress)

  onProgress({ phase: 'checking', percent: 0, message: 'Checking latest ASF release…' })
  const release = await fetchJson<GitHubRelease>(GITHUB_API)
  const asset = release.assets.find((item) => item.name === WINDOWS_ASSET)

  if (!asset) {
    throw new Error(`Could not find ${WINDOWS_ASSET} in the latest release`)
  }

  const zipPath = join(appRoot(), WINDOWS_ASSET)
  onProgress({ phase: 'downloading', percent: 0, message: `Downloading ASF ${release.tag_name}…` })

  await downloadFile(asset.browser_download_url, zipPath, (percent) => {
    onProgress({ phase: 'downloading', percent, message: `Downloading ASF ${release.tag_name}…` })
  })

  onProgress({ phase: 'extracting', percent: 0, message: 'Extracting files…' })

  const configBackup = existsSync(configDir()) ? readdirSync(configDir()) : []
  const backedUpConfigs = new Map<string, Buffer>()
  for (const file of configBackup) {
    backedUpConfigs.set(file, readFileSync(join(configDir(), file)))
  }

  if (existsSync(asfInstallPath())) {
    rmSync(asfInstallPath(), { recursive: true, force: true })
  }

  mkdirSync(asfInstallPath(), { recursive: true })
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(asfInstallPath(), true)
  rmSync(zipPath, { force: true })

  mkdirSync(configDir(), { recursive: true })
  for (const [file, content] of backedUpConfigs) {
    writeFileSync(join(configDir(), file), content)
  }

  writeInstalledVersion(release.tag_name.replace(/^v/i, ''))

  if (!existsSync(join(configDir(), 'ASF.json'))) {
    writeFileSync(
      join(configDir(), 'ASF.json'),
      JSON.stringify(
        {
          IPC: true,
          AutoRestart: true,
          Headless: false
        },
        null,
        2
      ),
      'utf8'
    )
  }

  onProgress({ phase: 'done', percent: 100, message: `ASF ${release.tag_name} installed` })
  return { version: release.tag_name.replace(/^v/i, '') }
}

export function saveBotConfig(input: BotConfigInput): void {
  if (!/^[A-Za-z0-9_]+$/.test(input.botName)) {
    throw new Error('Bot name may only contain letters, numbers, and underscores')
  }

  mkdirSync(configDir(), { recursive: true })

  const existing = readBotJson(input.botName)
  const botConfig = {
    Enabled: existing?.Enabled ?? true,
    SteamLogin: input.steamLogin,
    SteamPassword: input.steamPassword,
    SteamUserPermissions: existing?.SteamUserPermissions ?? 0,
    OnlineStatus: existing?.OnlineStatus ?? 1,
    FarmingPreferences: existing?.FarmingPreferences ?? 1
  }

  writeFileSync(botConfigPath(input.botName), JSON.stringify(botConfig, null, 2), 'utf8')

  const settings = readSettings()
  settings.setupComplete = listBots().length > 0
  settings.lastBotName = input.botName
  saveSettings(settings)
}

export function deleteBot(botName: string): void {
  const path = botConfigPath(botName)
  if (!existsSync(path)) {
    throw new Error(`Bot "${botName}" was not found`)
  }

  unlinkSync(path)

  const settings = readSettings()
  const remaining = listBots()
  settings.setupComplete = remaining.length > 0
  if (settings.lastBotName === botName) {
    settings.lastBotName = remaining[0]
  }
  saveSettings(settings)
}

export function getBotSummaries(): BotSummary[] {
  return listBots().map((name) => {
    const config = readBotJson(name)
    return {
      name,
      steamLogin: typeof config?.SteamLogin === 'string' ? config.SteamLogin : '',
      enabled: config?.Enabled !== false
    }
  })
}

export async function getStatus(): Promise<AsfStatus> {
  const ipcReady = await checkIpcReady()

  return {
    installed: isInstalled(),
    version: readInstalledVersion(),
    running: isAsfRunning(),
    ipcReady,
    installPath: asfInstallPath(),
    settings: readSettings()
  }
}

export function isAsfRunning(): boolean {
  return asfProcess !== null && !asfProcess.killed
}

export async function checkIpcReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const request = httpGet(IPC_URL, (response) => {
      resolve(response.statusCode !== undefined && response.statusCode < 500)
      response.resume()
    })

    request.on('error', () => resolve(false))
    request.setTimeout(1500, () => {
      request.destroy()
      resolve(false)
    })
  })
}

export async function waitForIpc(timeoutMs = 45000): Promise<boolean> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await checkIpcReady()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

export function startAsf(): void {
  if (!isInstalled()) {
    throw new Error('ASF is not installed yet')
  }

  if (isAsfRunning()) {
    return
  }

  asfProcess = spawn(asfExecutable(), [], {
    cwd: asfInstallPath(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  asfProcess.on('exit', () => {
    asfProcess = null
  })
}

export function stopAsf(): void {
  if (asfProcess && !asfProcess.killed) {
    asfProcess.kill()
    asfProcess = null
  }
}

export function getDashboardUrl(): string {
  return IPC_URL
}

export function openConfigFolder(): string {
  return configDir()
}

export function listBots(): string[] {
  if (!existsSync(configDir())) {
    return []
  }

  return readdirSync(configDir())
    .filter((file) => file.endsWith('.json') && !isReservedConfigFile(file))
    .map((file) => file.replace(/\.json$/, ''))
    .sort((a, b) => a.localeCompare(b))
}

export function applyLaunchAtLogin(settings: AppSettings): void {
  app.setLoginItemSettings({
    openAtLogin: settings.launchAtLogin,
    openAsHidden: settings.launchAtLogin && settings.startAsfOnLaunch,
    path: process.execPath,
    args: settings.launchAtLogin && settings.startAsfOnLaunch ? ['--background'] : []
  })
}

export function shouldLaunchInBackground(): boolean {
  return process.argv.includes('--background')
}

export { getPrerequisitesReport }
