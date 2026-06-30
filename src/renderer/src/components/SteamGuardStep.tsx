interface SteamGuardStepProps {
  onContinue: () => void
  onOpenGuide: (url: string) => void
}

export function SteamGuardStep({ onContinue, onOpenGuide }: SteamGuardStepProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Steam Guard and 2FA</h2>
      <p className="lead">
        On first login, ASF handles Steam Guard the same way the Steam client would. Use this checklist so you are not
        caught off guard.
      </p>

      <div className="guide-grid">
        <article className="guide-card">
          <span className="guide-step">1</span>
          <h3>Start ASF and open the dashboard</h3>
          <p>
            From the Dashboard step, click <strong>Start ASF</strong>, then <strong>Open dashboard</strong>. Watch the
            bot status for your account.
          </p>
        </article>

        <article className="guide-card">
          <span className="guide-step">2</span>
          <h3>Email Steam Guard code</h3>
          <p>
            If Steam emails you a code, open the dashboard, select your bot, and enter the code when ASF prompts for it.
          </p>
        </article>

        <article className="guide-card">
          <span className="guide-step">3</span>
          <h3>Mobile authenticator (recommended long-term)</h3>
          <p>
            For accounts with the Steam mobile app, ASF can import your authenticator as ASF 2FA so codes are generated
            automatically. This is optional but makes farming much smoother.
          </p>
        </article>

        <article className="guide-card">
          <span className="guide-step">4</span>
          <h3>Check bot status</h3>
          <p>
            A connected bot shows as logged in inside ASF-ui. If login fails, verify your password and complete any Steam
            Guard step shown in the dashboard logs.
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
        <button
          type="button"
          className="secondary"
          onClick={() => onOpenGuide('https://github.com/JustArchiNET/ArchiSteamFarm/wiki/Two-factor-authentication')}
        >
          ASF 2FA wiki
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onOpenGuide('https://github.com/JustArchiNET/ArchiSteamFarm/wiki/Setting-up')}
        >
          ASF setup guide
        </button>
      </div>
    </section>
  )
}
