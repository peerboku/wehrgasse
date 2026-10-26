import { useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { strings } from '../lib/strings'
import { WG_EMAIL, supabase } from '../lib/supabaseClient'
import type { Member } from '../lib/types'
import styles from './Login.module.css'

// Step 1: the shared WG password (once per phone, docs/decisions/0007).
// On success Supabase stores the session and App.tsx moves on to step 2.
export function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser from reloading the page
    if (password.trim() === '') {
      setError(strings.login.errorEmpty)
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: WG_EMAIL, password })
    setBusy(false)
    if (error) {
      // 400 = wrong password; no status at all = no connection
      setError(error.status === 400 ? strings.login.errorWrong : strings.login.errorOffline)
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{strings.login.welcome}</h1>
        <label className={styles.label} htmlFor="password">
          {strings.login.passwordLabel}
        </label>
        <input
          id="password"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          placeholder={strings.login.passwordPlaceholder}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setError('')
          }}
          autoFocus
        />
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" disabled={busy}>
          {strings.login.submit}
        </Button>
      </form>
    </div>
  )
}

type PickMemberProps = {
  members: Member[]
  onPick: (memberId: string) => void
}

// Step 2: tap your name. The app remembers it on this phone (src/lib/me.ts).
export function PickMember({ members, onPick }: PickMemberProps) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{strings.login.pickTitle}</h1>
      <p className={styles.subtitle}>{strings.login.pickSubtitle}</p>
      <div className={styles.tiles}>
        {members.map((member) => (
          <button key={member.id} className={styles.tile} onClick={() => onPick(member.id)}>
            <Avatar member={member} size={64} />
            <span className={styles.tileName}>{member.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
