import type { AppSettings, AsfStatus, BotSummary } from '../../../shared/types'
import { SettingsPanel } from './SettingsPanel'

interface DashboardStepProps {
  status: AsfStatus | null
  bots: BotSummary[]
  settings: AppSettings
  starting: boolean
  actionMessage: string | null
  onStart: () => void
  onStop: () => void
  onOpenDashboard: () => void
  onOpenBotInput: (botName: string) => void
  onPauseBots: () => void
  onOpenConfigFolder: () => void
  onUpdateSettings: (patch: Partial<AppSettings>) => void
}

export function DashboardStep({
  status,
  bots,
  settings,
  starting,
  actionMessage,
  onStart,
  onStop,
  onOpenDashboard,
  onOpenBotInput,
  onPauseBots,
  onOpenConfigFolder,
  onUpdateSettings
}: DashboardStepProps): JSX.Element {
  const primaryBot = bots[0]?.name

  return (
    <section className="panel">
      <h2>Dashboard</h2>
      <p className="lead">Start ASF, complete Steam Guard through the Input page, then enable your bot in the dashboard.</p>

      <div className="notice">
        New bots start with <strong>Enabled: false</strong> to avoid login loops. If Steam rate-limited you, click{' '}
        <strong>Pause all bot logins</strong>, stop ASF, and wait at least 25 minutes before trying again.
      </div>

      <div className="status-grid">
        <div className="metric">
          <span>Status</span>
          <strong>{status?.running ? 'Running' : 'Stopped'}</strong>
        </div>
        <div className="metric">
          <span>Dashboard</span>
          <strong>{status?.ipcReady ? 'Ready' : 'Not ready'}</strong>
        </div>
        <div className="metric">
          <span>Bots</span>
          <strong>{bots.length ? bots.map((bot) => bot.name).join(', ') : 'None yet'}</strong>
        </div>
      </div>

      <div className="actions">
        {!status?.running ? (
          <button type="button" className="primary" onClick={onStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start ASF'}
          </button>
        ) : (
          <button type="button" className="secondary" onClick={onStop}>
            Stop ASF
          </button>
        )}
        <button type="button" className="primary" onClick={onOpenDashboard}>
          Open dashboard
        </button>
        {primaryBot && (
          <button type="button" className="secondary" onClick={() => onOpenBotInput(primaryBot)}>
            Steam Guard input
          </button>
        )}
        {bots.some((bot) => bot.enabled) && (
          <button type="button" className="secondary" onClick={onPauseBots}>
            Pause all bot logins
          </button>
        )}
        <button type="button" className="secondary" onClick={onOpenConfigFolder}>
          Open config folder
        </button>
      </div>

      {actionMessage && <p className="info">{actionMessage}</p>}

      <SettingsPanel settings={settings} onUpdateSettings={onUpdateSettings} />

      <div className="notice">
        Closing this window hides ASF Easy to the system tray when enabled below. Right-click the tray icon for quick
        controls.
      </div>
    </section>
  )
}
