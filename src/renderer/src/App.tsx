import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, AsfStatus, BotSummary, InstallProgress, PrerequisitesReport, WizardStep } from '../../shared/types'
import { AccountsStep } from './components/AccountsStep'
import { DashboardStep } from './components/DashboardStep'
import { PrerequisitesPanel } from './components/PrerequisitesPanel'
import { SteamGuardStep } from './components/SteamGuardStep'

const STEPS: WizardStep[] = ['welcome', 'install', 'accounts', 'steamguard', 'dashboard']

const STEP_LABELS: Record<WizardStep, string> = {
  welcome: 'Welcome',
  install: 'Install',
  accounts: 'Accounts',
  steamguard: 'Steam Guard',
  dashboard: 'Dashboard'
}

function App(): JSX.Element {
  const [step, setStep] = useState<WizardStep>('welcome')
  const [status, setStatus] = useState<AsfStatus | null>(null)
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [prerequisites, setPrerequisites] = useState<PrerequisitesReport | null>(null)
  const [prerequisitesBusy, setPrerequisitesBusy] = useState(false)
  const [starting, setStarting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [bots, setBots] = useState<BotSummary[]>([])

  const [botName, setBotName] = useState('Main')
  const [steamLogin, setSteamLogin] = useState('')
  const [steamPassword, setSteamPassword] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  const refreshStatus = useCallback(async () => {
    const next = await window.asfEasy.getStatus()
    setStatus(next)
    if (next.installed) {
      setBots(await window.asfEasy.getBotSummaries())
    }
    return next
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshStatus()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [refreshStatus])

  const stepIndex = STEPS.indexOf(step)

  const suggestedStep = useMemo((): WizardStep => {
    if (!status) {
      return 'welcome'
    }
    if (!status.installed) {
      return 'install'
    }
    if (!status.settings.setupComplete) {
      return 'accounts'
    }
    return 'dashboard'
  }, [status])

  useEffect(() => {
    if (status && step === 'welcome') {
      setStep(suggestedStep)
    }
  }, [status, suggestedStep, step])

  const refreshPrerequisites = useCallback(async () => {
    const report = await window.asfEasy.getPrerequisites()
    setPrerequisites(report)
    return report
  }, [])

  useEffect(() => {
    if (step === 'install') {
      void refreshPrerequisites()
    }
  }, [step, refreshPrerequisites])

  async function handleInstallPrerequisites(): Promise<void> {
    setPrerequisitesBusy(true)
    setInstallError(null)
    setInstallProgress({ phase: 'prerequisites-check', percent: 0, message: 'Checking prerequisites…' })

    const unsubscribe = window.asfEasy.onInstallProgress((progress) => {
      setInstallProgress(progress)
    })

    try {
      const report = await window.asfEasy.installPrerequisites()
      setPrerequisites(report)
      setInstallProgress(null)
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : 'Prerequisite installation failed')
    } finally {
      unsubscribe()
      setPrerequisitesBusy(false)
    }
  }

  async function handleInstall(): Promise<void> {
    setInstalling(true)
    setInstallError(null)
    setInstallProgress({ phase: 'checking', percent: 0, message: 'Starting…' })

    const unsubscribe = window.asfEasy.onInstallProgress((progress) => {
      setInstallProgress(progress)
    })

    try {
      await window.asfEasy.install()
      await refreshStatus()
      await refreshPrerequisites()
      setStep('accounts')
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : 'Installation failed')
    } finally {
      unsubscribe()
      setInstalling(false)
    }
  }

  async function handleSaveConfig(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setConfigError(null)

    if (!botName.trim() || !steamLogin.trim() || !steamPassword) {
      setConfigError('Fill in bot name, Steam login, and password.')
      return
    }

    setSavingConfig(true)
    try {
      await window.asfEasy.saveBotConfig({
        botName: botName.trim(),
        steamLogin: steamLogin.trim(),
        steamPassword
      })
      setSteamLogin('')
      setSteamPassword('')
      const summaries = await window.asfEasy.getBotSummaries()
      setBotName(summaries.length === 0 ? 'Main' : `Bot${summaries.length + 1}`)
      await refreshStatus()
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Could not save config')
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleDeleteBot(name: string): Promise<void> {
    if (!window.confirm(`Remove bot "${name}"? This deletes its config file.`)) {
      return
    }

    try {
      await window.asfEasy.deleteBot(name)
      await refreshStatus()
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Could not remove bot')
    }
  }

  async function handleUpdateSettings(patch: Partial<AppSettings>): Promise<void> {
    const next = await window.asfEasy.updateSettings(patch)
    setStatus((current) => (current ? { ...current, settings: next } : current))
  }

  async function handleStart(): Promise<void> {
    setStarting(true)
    setActionMessage(null)
    try {
      const result = await window.asfEasy.start()
      await refreshStatus()
      setActionMessage(result.ready ? 'ASF is running.' : 'ASF started, but the dashboard is not ready yet.')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to start ASF')
    } finally {
      setStarting(false)
    }
  }

  async function handleStop(): Promise<void> {
    await window.asfEasy.stop()
    await refreshStatus()
    setActionMessage('ASF stopped.')
  }

  async function handlePauseBots(): Promise<void> {
    const paused = await window.asfEasy.pauseAllBotsForLogin()
    await refreshStatus()
    setActionMessage(
      paused.length
        ? `Paused login for: ${paused.join(', ')}. Wait at least 25 minutes if Steam rate-limited you.`
        : 'All bots were already paused.'
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>ASF Easy</h1>
            <p>ArchiSteamFarm made simple</p>
          </div>
        </div>

        <nav className="steps">
          {STEPS.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`step ${step === item ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
              onClick={() => setStep(item)}
            >
              <span className="step-number">{index + 1}</span>
              <span>{STEP_LABELS[item]}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {status?.installed ? <p>ASF {status.version ?? 'installed'}</p> : <p>Not installed yet</p>}
        </div>
      </aside>

      <main className="content">
        {step === 'welcome' && (
          <section className="panel">
            <h2>Welcome</h2>
            <p className="lead">
              ASF Easy downloads ArchiSteamFarm, helps you add Steam accounts, explains Steam Guard setup, and keeps ASF
              running from the system tray.
            </p>
            <ul className="feature-list">
              <li>One-click download of the latest Windows build</li>
              <li>Add multiple Steam accounts without editing JSON</li>
              <li>Steam Guard checklist and built-in dashboard launcher</li>
              <li>System tray controls and optional start with Windows</li>
            </ul>
            <div className="actions">
              <button type="button" className="primary" onClick={() => setStep(suggestedStep)}>
                Get started
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => window.asfEasy.openExternal('https://github.com/JustArchiNET/ArchiSteamFarm/wiki/Setting-up')}
              >
                ASF setup guide
              </button>
            </div>
          </section>
        )}

        {step === 'install' && (
          <section className="panel">
            <h2>Install ArchiSteamFarm</h2>
            <p className="lead">
              ASF Easy installs required Windows components first, then downloads the official ASF win-x64 build. Reinstalling
              keeps your existing bot configs.
            </p>

            {prerequisites && (
              <PrerequisitesPanel
                items={prerequisites.items}
                allSatisfied={prerequisites.allSatisfied}
                busy={prerequisitesBusy || installing}
                onInstallMissing={() => void handleInstallPrerequisites()}
                onRefresh={() => void refreshPrerequisites()}
              />
            )}

            {status?.installed ? (
              <div className="status-card success">
                <strong>Already installed</strong>
                <p>
                  Version {status.version} at {status.installPath}
                </p>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => setStep('accounts')}>
                    Continue to accounts
                  </button>
                  <button type="button" className="secondary" onClick={() => void handleInstall()} disabled={installing || prerequisitesBusy}>
                    Reinstall latest
                  </button>
                </div>
              </div>
            ) : (
              <div className="status-card">
                <strong>Ready to install</strong>
                <p>Downloads ASF-win-x64.zip from GitHub releases.</p>
                <button type="button" className="primary" onClick={() => void handleInstall()} disabled={installing || prerequisitesBusy}>
                  {installing ? 'Installing…' : 'Download and install ASF'}
                </button>
              </div>
            )}

            {installProgress && (
              <div className="progress-block">
                <div className="progress-label">
                  <span>{installProgress.message}</span>
                  <span>{installProgress.percent}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${installProgress.percent}%` }} />
                </div>
              </div>
            )}

            {installError && <p className="error">{installError}</p>}
          </section>
        )}

        {step === 'accounts' && (
          <AccountsStep
            bots={bots}
            botName={botName}
            steamLogin={steamLogin}
            steamPassword={steamPassword}
            configError={configError}
            savingConfig={savingConfig}
            onBotNameChange={setBotName}
            onSteamLoginChange={setSteamLogin}
            onSteamPasswordChange={setSteamPassword}
            onSave={(event) => void handleSaveConfig(event)}
            onDelete={(name) => void handleDeleteBot(name)}
            onContinue={() => setStep('steamguard')}
            onOpenConfigFolder={() => void window.asfEasy.openConfigFolder()}
          />
        )}

        {step === 'steamguard' && (
          <SteamGuardStep
            botName={bots[0]?.name ?? (botName.trim() || 'Main')}
            onContinue={() => setStep('dashboard')}
            onOpenGuide={(url) => void window.asfEasy.openExternal(url)}
            onOpenBotInput={(name) => void window.asfEasy.openDashboardBotInput(name)}
          />
        )}

        {step === 'dashboard' && (
          <DashboardStep
            status={status}
            bots={bots}
            settings={status?.settings ?? {
              setupComplete: false,
              launchAtLogin: false,
              minimizeToTray: true,
              startAsfOnLaunch: false,
              closeToTray: true
            }}
            starting={starting}
            actionMessage={actionMessage}
            onStart={() => void handleStart()}
            onStop={() => void handleStop()}
            onOpenDashboard={() => void window.asfEasy.openDashboard()}
            onOpenBotInput={(name) => void window.asfEasy.openDashboardBotInput(name)}
            onPauseBots={() => void handlePauseBots()}
            onOpenConfigFolder={() => void window.asfEasy.openConfigFolder()}
            onUpdateSettings={(patch) => void handleUpdateSettings(patch)}
          />
        )}
      </main>
    </div>
  )
}

export default App
