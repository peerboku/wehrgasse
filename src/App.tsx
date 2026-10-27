import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './components/Button'
import { TabBar, type Tab } from './components/TabBar'
import { loadAssignments, loadChores, loadLastDone, loadMembers, markDone, onAssignmentsChange } from './lib/data'
import { logEvent } from './lib/events'
import { clearMyMemberId, getMyMemberId, setMyMemberId } from './lib/me'
import { disablePush } from './lib/push'
import { strings } from './lib/strings'
import { supabase } from './lib/supabaseClient'
import type { Assignment, Chore, Member } from './lib/types'
import { ANCHOR_WEEK, weekStart } from './lib/week'
import { Login, PickMember } from './screens/Login'
import { MyWeek } from './screens/MyWeek'
import { Overview } from './screens/Overview'
import { Settings } from './screens/Settings'
import styles from './App.module.css'

type Data = {
  members: Member[]
  chores: Chore[]
  assignments: Assignment[]
  lastDone: Assignment[] // newest done row per chore
}

// No router: the active tab is just a piece of state (see docs/decisions/0002).
// Order of screens: WG password -> pick your name -> the app.
function App() {
  // undefined = still asking Supabase, null = not logged in
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [memberId, setMemberId] = useState(getMyMemberId)
  const [data, setData] = useState<Data | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [tab, setTab] = useState<Tab>('myWeek')
  const appOpenLogged = useRef(false)

  // Before the launch week, already show the launch week (so we can install and test on the weekend)
  const today = weekStart()
  const currentWeek = today < ANCHOR_WEEK ? ANCHOR_WEEK : today
  const loggedIn = Boolean(session)

  // Supabase remembers the login on the phone and tells us about it here
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const reloadAll = useCallback(async () => {
    try {
      const [members, chores, assignments, lastDone] = await Promise.all([
        loadMembers(),
        loadChores(),
        loadAssignments(currentWeek),
        loadLastDone(),
      ])
      setData({ members, chores, assignments, lastDone })
      setLoadFailed(false)
    } catch (error) {
      console.warn(error)
      setLoadFailed(true)
    }
  }, [currentWeek])

  const reloadAssignments = useCallback(async () => {
    try {
      const [assignments, lastDone] = await Promise.all([loadAssignments(currentWeek), loadLastDone()])
      setData((previous) => previous && { ...previous, assignments, lastDone })
    } catch (error) {
      console.warn(error)
    }
  }, [currentWeek])

  // After login: load everything, then listen for changes from the other phones.
  // The iPhone pauses the live connection in the background, so reload when the app comes back.
  useEffect(() => {
    if (!loggedIn) return
    // Loading data from the server is what effects are for; state is set only after the fetch
    // oxlint-disable-next-line react/set-state-in-effect
    reloadAll()
    const stopListening = onAssignmentsChange(reloadAssignments)
    const onVisible = () => {
      if (document.visibilityState === 'visible') reloadAssignments()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopListening()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loggedIn, reloadAll, reloadAssignments])

  // Once per start, as soon as we know who is using the app
  useEffect(() => {
    if (loggedIn && memberId && !appOpenLogged.current) {
      appOpenLogged.current = true
      logEvent('app_open')
    }
  }, [loggedIn, memberId])

  if (session === undefined) {
    return <p className={styles.center}>{strings.app.loading}</p>
  }

  if (session === null) {
    return <Login />
  }

  if (!data) {
    return loadFailed ? (
      <div className={styles.center}>
        <p>{strings.app.loadError}</p>
        <Button onClick={reloadAll}>{strings.app.retry}</Button>
      </div>
    ) : (
      <p className={styles.center}>{strings.app.loading}</p>
    )
  }

  const me = data.members.find((member) => member.id === memberId)

  if (!me) {
    return (
      <PickMember
        members={data.members}
        onPick={(pickedId) => {
          setMyMemberId(pickedId)
          setMemberId(pickedId)
          logEvent('login')
        }}
      />
    )
  }

  const myId = me.id

  async function handleMarkDone(assignmentId: string) {
    const doneAt = new Date().toISOString()
    const doneBy = myId
    // Show it as done right away, the database catches up in the background
    setData(
      (previous) =>
        previous && {
          ...previous,
          assignments: previous.assignments.map((a) =>
            a.id === assignmentId ? { ...a, done_at: doneAt, done_by: doneBy } : a,
          ),
        },
    )
    try {
      await markDone(assignmentId, doneBy, doneAt)
      logEvent('chore_done', { assignment_id: assignmentId })
    } catch (error) {
      console.warn(error)
      alert(strings.myWeek.doneError)
      reloadAssignments()
    }
  }

  async function logout() {
    // Otherwise this phone keeps getting pushes for the name that was picked before
    await disablePush()
    clearMyMemberId()
    setMemberId(null)
    setTab('myWeek')
    setData(null)
    await supabase.auth.signOut()
  }

  return (
    <div className={styles.app}>
      <main className={styles.content}>
        {tab === 'myWeek' && (
          <MyWeek
            member={me}
            currentWeek={currentWeek}
            assignments={data.assignments}
            lastDone={data.lastDone}
            members={data.members}
            chores={data.chores}
            onMarkDone={handleMarkDone}
          />
        )}
        {tab === 'overview' && (
          <Overview
            me={me}
            currentWeek={currentWeek}
            assignments={data.assignments}
            lastDone={data.lastDone}
            members={data.members}
            chores={data.chores}
          />
        )}
        {tab === 'settings' && <Settings member={me} onLogout={logout} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

export default App
