interface SteamGuardStepProps {
  botName: string
  onContinue: () => void
  onOpenGuide: (url: string) => void
  onOpenBotInput: (botName: string) => void
}

export function SteamGuardStep({
  botName,
  onContinue,
  onOpenGuide,
  onOpenBotInput
}: SteamGuardStepProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Steam Guard and 2FA</h2>
      <p className="lead">
        Your bot is saved with <strong>login paused</strong> so ASF does not hammer Steam while you complete Steam Guard.
        Follow these steps in order.
      </p>

      <div className="notice">
        <strong>Important:</strong> If Steam shows a rate limit, stop ASF and wait at least <strong>25 minutes</strong>{' '}
        before trying again. Repeated failed logins make the cooldown longer.
      </div>

      <div className="guide-grid">
        <article className="guide-card">
          <span className="guide-step">1</span>
          <h3>Start ASF and open Input</h3>
          <p>
            From the Dashboard, click <strong>Start ASF</strong>, then open the Steam Guard input page for your bot.
            That is where you approve mobile login or paste an email code — not the bot config screen.
          </p>
        </article>

        <article className="guide-card">
          <span className="guide-step">2</span>
          <h3>Complete Steam Guard</h3>
          <p>
            Mobile approval: type <strong>Y</strong> after approving in the Steam app, or <strong>N</strong> then enter the
            code. Email Guard: paste the code from your inbox when prompted.
          </p>
        </article>

        <article className="guide-card">
          <span className="guide-step">3</span>
          <h3>Enable the bot</h3>
          <p>
            After login succeeds, open your bot in the dashboard, set <strong>Enabled</strong> to true, and save. Until
            then the bot will not try to connect.
          </p>
        </article>

        <article className="guide-card">
          <span className="guide-step">4</span>
          <h3>Optional: ASF 2FA (recommended)</h3>
          <p>
            Importing the mobile authenticator as ASF 2FA avoids manual codes on future logins. See the ASF wiki for
            details.
          </p>
        </article>
      </div>

      <div className="notice">
        ASF Easy stores credentials locally in JSON config files, identical to a manual ASF install. Never share your config
        folder or bot files with anyone.
      </div>

      <div className="actions">
        <button type="button" className="primary" onClick={onContinue}>
          Go to dashboard
        </button>
        <button type="button" className="secondary" onClick={() => onOpenBotInput(botName)}>
          Open Steam Guard input
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onOpenGuide('https://github.com/JustArchiNET/ArchiSteamFarm/wiki/Two-factor-authentication')}
        >
          ASF 2FA wiki
        </button>
      </div>
    </section>
  )
}
