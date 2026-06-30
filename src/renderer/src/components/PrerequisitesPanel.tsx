import type { PrerequisiteItem } from '../../../shared/types'

interface PrerequisitesPanelProps {
  items: PrerequisiteItem[]
  allSatisfied: boolean
  busy: boolean
  onInstallMissing: () => void
  onRefresh: () => void
}

export function PrerequisitesPanel({
  items,
  allSatisfied,
  busy,
  onInstallMissing,
  onRefresh
}: PrerequisitesPanelProps): JSX.Element {
  return (
    <div className="prerequisites-panel">
      <div className="bot-list-header">
        <strong>Windows prerequisites</strong>
        <span className={`badge ${allSatisfied ? 'badge-on' : 'badge-off'}`}>
          {allSatisfied ? 'Ready' : 'Action needed'}
        </span>
      </div>

      {items.map((item) => (
        <div key={item.id} className="prerequisite-row">
          <div>
            <strong>{item.name}</strong>
            <span>{item.description}</span>
          </div>
          <span className={`badge ${item.installed ? 'badge-on' : 'badge-off'}`}>
            {item.installed ? 'Installed' : item.canAutoInstall ? 'Missing' : 'Check manually'}
          </span>
        </div>
      ))}

      <div className="notice compact">
        ASF win-x64 includes its own .NET runtime. ASF Easy installs Visual C++ silently with admin approval (UAC). .NET
        SDK is not required.
      </div>

      <div className="actions compact">
        {!allSatisfied && (
          <button type="button" className="primary" onClick={onInstallMissing} disabled={busy}>
            {busy ? 'Installing prerequisites…' : 'Install missing prerequisites'}
          </button>
        )}
        <button type="button" className="secondary" onClick={onRefresh} disabled={busy}>
          Recheck
        </button>
      </div>
    </div>
  )
}
