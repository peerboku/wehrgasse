import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { strings } from '../lib/strings'
import type { Member } from '../lib/types'
import styles from './Settings.module.css'

type Props = {
  member: Member
  onLogout: () => void
}

// True when opened from the Home Screen icon (not inside Safari).
// navigator.standalone is the older iOS-only way to ask the same thing.
function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone
}

export function Settings({ member, onLogout }: Props) {
  // Prototype: the switch only changes this state. Phase 4 asks for permission and subscribes.
  const [notificationsOn, setNotificationsOn] = useState(false)
  const installed = isInstalled()

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{strings.settings.title}</h1>

      <section className={styles.card}>
        <div className={styles.me}>
          <Avatar member={member} size={44} />
          <p>{strings.settings.loggedInAs(member.name)}</p>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{strings.settings.notificationsTitle}</h2>
        <label className={styles.toggleRow}>
          <span>{strings.settings.notificationsToggle}</span>
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={notificationsOn}
            onChange={(event) => setNotificationsOn(event.target.checked)}
          />
        </label>
        <p className={styles.hint}>{strings.settings.notificationsHint}</p>
        {!installed && <p className={styles.hint}>{strings.settings.notificationsNeedInstall}</p>}
        <p className={styles.prototype}>{strings.settings.prototypeNote}</p>
      </section>

      {!installed && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{strings.settings.installTitle}</h2>
          <ol className={styles.steps}>
            {strings.settings.installSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      <Button variant="secondary" onClick={onLogout}>
        {strings.settings.logout}
      </Button>
    </div>
  )
}
