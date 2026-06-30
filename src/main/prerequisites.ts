import { execFile } from 'child_process'
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { get as httpsGet } from 'https'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { promisify } from 'util'
import os, { tmpdir } from 'os'
import type { InstallProgress, PrerequisiteItem, PrerequisitesReport } from '../shared/types'

const execFileAsync = promisify(execFile)

const VC_REDIST_URL = 'https://aka.ms/vs/17/release/vc_redist.x64.exe'
const VC_REDIST_FILE = 'vc_redist.x64.exe'

const VC_REGISTRY_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64'
]

const MIN_WINDOWS_BUILD = 14393

export function prerequisitesDir(appRoot: string): string {
  return join(appRoot, 'prerequisites')
}

async function regQueryDword(key: string, valueName: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('reg', ['query', key, '/v', valueName], { windowsHide: true })
    const hexMatch = stdout.match(new RegExp(`${valueName}\\s+REG_DWORD\\s+0x([0-9a-fA-F]+)`, 'i'))
    if (hexMatch) {
      return Number.parseInt(hexMatch[1], 16)
    }

    const decMatch = stdout.match(new RegExp(`${valueName}\\s+REG_DWORD\\s+(\\d+)`, 'i'))
    if (decMatch) {
      return Number.parseInt(decMatch[1], 10)
    }

    return null
  } catch {
    return null
  }
}

async function isVcRedistInstalled(): Promise<boolean> {
  for (const key of VC_REGISTRY_KEYS) {
    const installed = await regQueryDword(key, 'Installed')
    const major = await regQueryDword(key, 'Major')

    if (installed === 1 && major !== null && major >= 14) {
      return true
    }
  }

  return false
}

function getWindowsBuild(): number {
  const parts = os.release().split('.')
  return Number.parseInt(parts[2] ?? '0', 10)
}

function isWindowsVersionSupported(): boolean {
  if (process.platform !== 'win32') {
    return false
  }

  return getWindowsBuild() >= MIN_WINDOWS_BUILD
}

async function downloadFile(
  url: string,
  destination: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = httpsGet(url, { headers: { 'User-Agent': 'ASF-Easy' } }, (response) => {
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
        if (total > 0 && onProgress) {
          onProgress(Math.min(99, Math.round((downloaded / total) * 100)))
        }
      })

      pipeline(response, file)
        .then(() => {
          onProgress?.(100)
          resolve()
        })
        .catch(reject)
    })

    request.on('error', reject)
  })
}

function isSuccessfulInstallerExit(exitCode: number): boolean {
  return exitCode === 0 || exitCode === 1638 || exitCode === 3010
}

async function runElevatedSilentInstaller(
  installerPath: string,
  args: string[]
): Promise<{ exitCode: number; cancelled: boolean; detail: string | null }> {
  const argLiteral = args.map((arg) => `'${arg.replace(/'/g, "''")}'`).join(',')
  const scriptPath = join(tmpdir(), `asf-easy-prereq-${Date.now()}.ps1`)
  const script = `
$ErrorActionPreference = 'Stop'
$installer = '${installerPath.replace(/'/g, "''")}'
if (-not (Test-Path -LiteralPath $installer)) {
  Write-Error "Installer not found: $installer"
  exit 2
}
$proc = Start-Process -FilePath $installer -ArgumentList @(${argLiteral}) -Verb RunAs -Wait -PassThru -WindowStyle Hidden
if ($null -eq $proc) { exit 1223 }
exit $proc.ExitCode
`.trim()

  writeFileSync(scriptPath, script, 'utf8')

  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true }
    )
    return { exitCode: 0, cancelled: false, detail: null }
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { status?: number; stderr?: string; message?: string }
    const exitCode = typeof execError.status === 'number' ? execError.status : 1
    const detail = typeof execError.stderr === 'string' && execError.stderr.trim()
      ? execError.stderr.trim()
      : execError.message ?? null
    return { exitCode, cancelled: exitCode === 1223, detail }
  } finally {
    rmSync(scriptPath, { force: true })
  }
}

export async function getPrerequisitesReport(): Promise<PrerequisitesReport> {
  const [vcInstalled, windowsOk] = await Promise.all([isVcRedistInstalled(), Promise.resolve(isWindowsVersionSupported())])

  const items: PrerequisiteItem[] = [
    {
      id: 'windows-version',
      name: 'Windows 10/11 (64-bit)',
      description: `Requires Windows 10 version 1607 or newer (build ${MIN_WINDOWS_BUILD}+). Install Windows Update if below this.`,
      installed: windowsOk,
      required: true,
      canAutoInstall: false
    },
    {
      id: 'vc-redist-x64',
      name: 'Microsoft Visual C++ Redistributable (x64)',
      description: 'Required by ArchiSteamFarm win-x64. Bundled .NET runtime is included in the ASF download; VC++ is not.',
      installed: vcInstalled,
      required: true,
      canAutoInstall: true
    }
  ]

  return {
    allSatisfied: items.every((item) => !item.required || item.installed),
    items
  }
}

async function installVcRedist(appRoot: string, onProgress: (progress: InstallProgress) => void): Promise<void> {
  if (await isVcRedistInstalled()) {
    return
  }

  const dir = prerequisitesDir(appRoot)
  mkdirSync(dir, { recursive: true })
  const installerPath = join(dir, VC_REDIST_FILE)

  onProgress({
    phase: 'prerequisites-download',
    percent: 0,
    message: 'Downloading Visual C++ Redistributable…'
  })

  await downloadFile(VC_REDIST_URL, installerPath, (percent) => {
    onProgress({
      phase: 'prerequisites-download',
      percent,
      message: 'Downloading Visual C++ Redistributable…'
    })
  })

  onProgress({
    phase: 'prerequisites-install',
    percent: 0,
    message: 'Installing Visual C++ Redistributable (UAC prompt may appear)…'
  })

  const result = await runElevatedSilentInstaller(installerPath, ['/install', '/quiet', '/norestart'])

  if (result.cancelled) {
    throw new Error('Prerequisite install cancelled at the UAC prompt.')
  }

  if (await isVcRedistInstalled()) {
    onProgress({
      phase: 'prerequisites-install',
      percent: 100,
      message: 'Visual C++ Redistributable is installed'
    })
    return
  }

  if (!isSuccessfulInstallerExit(result.exitCode)) {
    const detail = result.detail ? ` ${result.detail}` : ''
    throw new Error(`Visual C++ install failed (exit code ${result.exitCode}).${detail}`)
  }

  if (!(await isVcRedistInstalled())) {
    throw new Error('Visual C++ Redistributable did not register after install. Reboot and try again.')
  }

  onProgress({
    phase: 'prerequisites-install',
    percent: 100,
    message: 'Visual C++ Redistributable installed'
  })
}

export async function ensurePrerequisites(
  appRoot: string,
  onProgress: (progress: InstallProgress) => void
): Promise<PrerequisitesReport> {
  onProgress({
    phase: 'prerequisites-check',
    percent: 0,
    message: 'Checking Windows prerequisites…'
  })

  const initial = await getPrerequisitesReport()

  if (!initial.items.find((item) => item.id === 'windows-version')?.installed) {
    throw new Error(
      `Windows ${MIN_WINDOWS_BUILD}+ is required. Open Settings → Windows Update and install all available updates.`
    )
  }

  const vcItem = initial.items.find((item) => item.id === 'vc-redist-x64')
  if (vcItem && !vcItem.installed) {
    await installVcRedist(appRoot, onProgress)
  }

  const finalReport = await getPrerequisitesReport()

  onProgress({
    phase: 'prerequisites-check',
    percent: 100,
    message: finalReport.allSatisfied ? 'All prerequisites satisfied' : 'Prerequisite check finished'
  })

  if (!finalReport.allSatisfied) {
    throw new Error('Required prerequisites are still missing after installation.')
  }

  return finalReport
}

export async function installPrerequisitesOnly(
  appRoot: string,
  onProgress: (progress: InstallProgress) => void
): Promise<PrerequisitesReport> {
  return ensurePrerequisites(appRoot, onProgress)
}
