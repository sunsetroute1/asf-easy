import type { AppSettings } from '../../../shared/types'

interface SettingsPanelProps {
  settings: AppSettings
  onUpdateSettings: (patch: Partial<AppSettings>) => void
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}): JSX.Element {
  return (
    <label className="toggle-row">
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps): JSX.Element {
  return (
    <div className="settings-panel">
      <h3>Background behavior</h3>

      <ToggleRow
        label="Start with Windows"
        description="Launch ASF Easy when you sign in to Windows."
        checked={settings.launchAtLogin}
        onChange={(checked) => onUpdateSettings({ launchAtLogin: checked })}
      />

      <ToggleRow
        label="Start ASF on launch"
        description="Automatically start ArchiSteamFarm when ASF Easy opens (including at Windows login)."
        checked={settings.startAsfOnLaunch}
        onChange={(checked) => onUpdateSettings({ startAsfOnLaunch: checked })}
      />

      <ToggleRow
        label="Minimize to tray"
        description="Keep ASF Easy running in the system tray after closing all windows."
        checked={settings.minimizeToTray}
        onChange={(checked) => onUpdateSettings({ minimizeToTray: checked })}
      />

      <ToggleRow
        label="Close button hides to tray"
        description="Clicking X hides the window instead of quitting the app."
        checked={settings.closeToTray}
        onChange={(checked) => onUpdateSettings({ closeToTray: checked })}
      />
    </div>
  )
}
