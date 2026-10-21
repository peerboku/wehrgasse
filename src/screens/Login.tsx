import { useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { logEvent } from '../lib/events'
import { members } from '../lib/mockData'
import { strings } from '../lib/strings'
import type { Member } from '../lib/types'
import styles from './Login.module.css'

type Props = {
  onLogin: (memberId: string) => void
}

// Step 1: tap your name. Step 2: enter your password.
// Prototype: any non-empty password works. Phase 3 checks it with Supabase Auth.
export function Login({ onLogin }: Props) {
  const [selected, setSelected] = useState<Member | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser from reloading the page
    if (!selected) return
    if (password.trim() === '') {
      setError(strings.login.errorEmpty)
      return
    }
    logEvent('login', { member_id: selected.id })
    onLogin(selected.id)
  }

  if (!selected) {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>{strings.login.title}</h1>
        <p className={styles.subtitle}>{strings.login.subtitle}</p>
        <div className={styles.tiles}>
          {members.map((member) => (
            <button key={member.id} className={styles.tile} onClick={() => setSelected(member)}>
              <Avatar member={member} size={64} />
              <span className={styles.tileName}>{member.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Avatar member={selected} size={88} />
        <label className={styles.label} htmlFor="password">
          {strings.login.passwordLabel(selected.name)}
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
        <Button type="submit">{strings.login.submit}</Button>
        <button
          type="button"
          className={styles.switch}
          onClick={() => {
            setSelected(null)
            setPassword('')
            setError('')
          }}
        >
          {strings.login.switchPerson}
        </button>
      </form>
    </div>
  )
}
