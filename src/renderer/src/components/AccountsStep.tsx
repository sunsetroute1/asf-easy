import type { BotSummary } from '../../../shared/types'

interface AccountsStepProps {
  bots: BotSummary[]
  botName: string
  steamLogin: string
  steamPassword: string
  configError: string | null
  savingConfig: boolean
  onBotNameChange: (value: string) => void
  onSteamLoginChange: (value: string) => void
  onSteamPasswordChange: (value: string) => void
  onSave: (event: React.FormEvent) => void
  onDelete: (botName: string) => void
  onContinue: () => void
  onOpenConfigFolder: () => void
}

export function AccountsStep({
  bots,
  botName,
  steamLogin,
  steamPassword,
  configError,
  savingConfig,
  onBotNameChange,
  onSteamLoginChange,
  onSteamPasswordChange,
  onSave,
  onDelete,
  onContinue,
  onOpenConfigFolder
}: AccountsStepProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Steam accounts</h2>
      <p className="lead">
        Add one or more Steam accounts as ASF bots. Each bot gets its own config file in ASF&apos;s config folder.
      </p>

      {bots.length > 0 && (
        <div className="bot-list">
          <div className="bot-list-header">
            <strong>{bots.length} bot{bots.length === 1 ? '' : 's'} configured</strong>
          </div>
          {bots.map((bot) => (
            <div key={bot.name} className="bot-row">
              <div>
                <strong>{bot.name}</strong>
                <span>{bot.steamLogin || 'No login saved'}</span>
              </div>
              <div className="bot-row-actions">
                <span className={`badge ${bot.enabled ? 'badge-on' : 'badge-off'}`}>
                  {bot.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button type="button" className="danger" onClick={() => onDelete(bot.name)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form className="form" onSubmit={onSave}>
        <h3>{bots.length > 0 ? 'Add another account' : 'Add your first account'}</h3>

        <label>
          Bot name
          <input value={botName} onChange={(event) => onBotNameChange(event.target.value)} placeholder="Main" />
          <small>Letters, numbers, and underscores only. Example: Main, Alt1, Smurf_account</small>
        </label>

        <label>
          Steam login
          <input
            value={steamLogin}
            onChange={(event) => onSteamLoginChange(event.target.value)}
            placeholder="your_steam_username"
            autoComplete="username"
          />
        </label>

        <label>
          Steam password
          <input
            type="password"
            value={steamPassword}
            onChange={(event) => onSteamPasswordChange(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        {configError && <p className="error">{configError}</p>}

        <div className="actions">
          <button type="submit" className="primary" disabled={savingConfig}>
            {savingConfig ? 'Saving…' : bots.length > 0 ? 'Add bot' : 'Save bot'}
          </button>
          {bots.length > 0 && (
            <button type="button" className="secondary" onClick={onContinue}>
              Continue
            </button>
          )}
          <button type="button" className="secondary" onClick={onOpenConfigFolder}>
            Open config folder
          </button>
        </div>
      </form>
    </section>
  )
}
