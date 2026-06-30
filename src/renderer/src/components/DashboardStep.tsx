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
  onOpenConfigFolder,
  onUpdateSettings
}: DashboardStepProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Dashboard</h2>
      <p className="lead">Start ASF, open the built-in ASF-ui dashboard, and adjust background behavior below.</p>

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
