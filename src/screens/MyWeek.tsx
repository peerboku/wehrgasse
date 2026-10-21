import { useCallback, useState } from 'react'
import { Button } from '../components/Button'
import { Celebration } from '../components/Celebration'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { choreById } from '../lib/mockData'
import { strings } from '../lib/strings'
import type { Assignment, Member } from '../lib/types'
import { daysOverdue, viennaWeekdayIndex } from '../lib/week'
import styles from './MyWeek.module.css'

type Props = {
  member: Member
  currentWeek: string
  assignments: Assignment[]
  onMarkDone: (assignmentId: string) => void
}

export function MyWeek({ member, currentWeek, assignments, onMarkDone }: Props) {
  const [confirming, setConfirming] = useState<Assignment | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  // useCallback keeps the same function between renders, so the celebration timer isn't restarted
  const finishCelebration = useCallback(() => setCelebrating(false), [])

  const mine = assignments.filter((a) => a.member_id === member.id)
  const overdue = mine.filter((a) => a.week_start < currentWeek && a.done_at === null)
  const thisWeek = mine.find((a) => a.week_start === currentWeek)

  function confirmDone() {
    if (!confirming) return
    onMarkDone(confirming.id)
    setConfirming(null)
    setCelebrating(true)
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.greeting}>{strings.myWeek.greeting(member.name)}</h1>

      {overdue.length > 0 && (
        <section className={styles.overdueSection}>
          <h2 className={styles.sectionTitle}>{strings.myWeek.overdueTitle}</h2>
          {overdue.map((assignment) => (
            <div key={assignment.id} className={styles.overdueCard}>
              <div>
                <p className={styles.overdueName}>{choreById(assignment.chore_id).name}</p>
                <p className={styles.overdueSince}>{strings.overdueSince(daysOverdue(assignment.week_start))}</p>
              </div>
              <Button variant="danger" className={styles.smallButton} onClick={() => setConfirming(assignment)}>
                {strings.myWeek.doneButton}
              </Button>
            </div>
          ))}
        </section>
      )}

      {thisWeek && (
        <section className={`${styles.mainCard} ${thisWeek.done_at ? styles.mainCardDone : ''}`}>
          <p className={styles.week}>{strings.weekRange(currentWeek)}</p>
          <p className={styles.yourChore}>{strings.myWeek.yourChore}</p>
          <p className={styles.choreName}>{choreById(thisWeek.chore_id).name}</p>
          {thisWeek.done_at ? (
            <>
              <p className={styles.doneOn}>
                {strings.myWeek.doneOn(strings.weekday(viennaWeekdayIndex(thisWeek.done_at)))}
              </p>
              <p className={styles.free}>{strings.myWeek.freeUntilMonday}</p>
            </>
          ) : (
            <Button className={styles.doneButton} onClick={() => setConfirming(thisWeek)}>
              {strings.myWeek.doneButton}
            </Button>
          )}
        </section>
      )}

      {confirming && (
        <ConfirmSheet
          choreName={choreById(confirming.chore_id).name}
          onConfirm={confirmDone}
          onCancel={() => setConfirming(null)}
        />
      )}
      {celebrating && <Celebration onFinished={finishCelebration} />}
    </div>
  )
}
