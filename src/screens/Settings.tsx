import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { disablePush, enablePush, isPushOn, pushSupported, type EnableResult } from '../lib/push'
import { strings } from '../lib/strings'
import type { Member } from '../lib/types'
import styles from './Settings.module.css'

type Props = {
  member: Member
  hasPhoto: boolean
  onPhotoChange: (file: File | null) => Promise<void>
  onLogout: () => void
}

// True when opened from the Home Screen icon (not inside Safari).
// navigator.standalone is the older iOS-only way to ask the same thing.
function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone
}

export function Settings({ member, hasPhoto, onPhotoChange, onLogout }: Props) {
  const [notificationsOn, setNotificationsOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  // The real file picker is hidden (it can't be styled), our button "clicks" it
  const photoInput = useRef<HTMLInputElement>(null)
  // Result of the last tap, only to show a hint when it went wrong
  const [problem, setProblem] = useState<EnableResult | null>(null)
  const installed = isInstalled()
  const supported = pushSupported()

  // Is this phone already subscribed? (asking the browser, not the database)
  useEffect(() => {
    isPushOn().then(setNotificationsOn)
  }, [])

  async function toggleNotifications(on: boolean) {
    setBusy(true)
    setProblem(null)
    if (on) {
      const result = await enablePush(member.id)
      setNotificationsOn(result === 'on')
      if (result !== 'on') setProblem(result)
    } else {
      await disablePush()
      setNotificationsOn(false)
    }
    setBusy(false)
  }

  async function changePhoto(file: File | null) {
    setPhotoBusy(true)
    await onPhotoChange(file)
    setPhotoBusy(false)
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{strings.settings.title}</h1>

      <section className={styles.card}>
        <div className={styles.me}>
          <Avatar member={member} size={72} />
          <p>{strings.settings.loggedInAs(member.name)}</p>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = '' // so picking the same photo again still counts as a change
            if (file) changePhoto(file)
          }}
        />
        <Button variant="secondary" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
          {photoBusy ? strings.settings.photoBusy : hasPhoto ? strings.settings.photoChange : strings.settings.photoAdd}
        </Button>
        {hasPhoto && !photoBusy && (
          <button className={styles.textButton} onClick={() => changePhoto(null)}>
            {strings.settings.photoRemove}
          </button>
        )}
        <p className={styles.hint}>{strings.settings.photoHint}</p>
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
            disabled={!supported || busy}
            onChange={(event) => toggleNotifications(event.target.checked)}
          />
        </label>
        <p className={styles.hint}>{strings.settings.notificationsHint}</p>
        {!installed && <p className={styles.hint}>{strings.settings.notificationsNeedInstall}</p>}
        {problem === 'denied' && <p className={styles.problem}>{strings.settings.notificationsDenied}</p>}
        {problem === 'error' && <p className={styles.problem}>{strings.settings.notificationsError}</p>}
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
