import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { logEvent } from './lib/events'
import { buildMockAssignments, memberById } from './lib/mockData'
import { Login } from './screens/Login'
import { MyWeek } from './screens/MyWeek'
import { Overview } from './screens/Overview'
import { Settings } from './screens/Settings'
import { weekStart } from './lib/week'
import styles from './App.module.css'

// No router: the active tab is just a piece of state (see docs/decisions/0002).
function App() {
  const [memberId, setMemberId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('myWeek')
  // Prototype: fake data in memory, a reload resets it. Phase 3 loads from Supabase.
  const [assignments, setAssignments] = useState(() => buildMockAssignments())
  const currentWeek = weekStart()

  useEffect(() => {
    logEvent('app_open')
  }, [])

  if (memberId === null) {
    return <Login onLogin={setMemberId} />
  }

  const me = memberById(memberId)

  function markDone(assignmentId: string) {
    const now = new Date().toISOString()
    setAssignments((previous) =>
      previous.map((a) => (a.id === assignmentId ? { ...a, done_at: now, done_by: memberId } : a)),
    )
    logEvent('chore_done', { assignment_id: assignmentId })
  }

  function logout() {
    setMemberId(null)
    setTab('myWeek')
  }

  return (
    <div className={styles.app}>
      <main className={styles.content}>
        {tab === 'myWeek' && (
          <MyWeek member={me} currentWeek={currentWeek} assignments={assignments} onMarkDone={markDone} />
        )}
        {tab === 'overview' && <Overview me={me} currentWeek={currentWeek} assignments={assignments} />}
        {tab === 'settings' && <Settings member={me} onLogout={logout} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

export default App
