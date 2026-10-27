import { useCallback, useState } from 'react'
import { Button } from '../components/Button'
import { Celebration } from '../components/Celebration'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { byId } from '../lib/data'
import { strings } from '../lib/strings'
import type { Assignment, Chore, Member } from '../lib/types'
import { daysAgo, daysLeft, daysOverdue, viennaWeekdayIndex, weekStart } from '../lib/week'
import styles from './MyWeek.module.css'

type Props = {
  member: Member
  currentWeek: string
  assignments: Assignment[]
  lastDone: Assignment[]
  members: Member[]
  chores: Chore[]
  onMarkDone: (assignmentId: string) => void
}

export function MyWeek({ member, currentWeek, assignments, lastDone, members, chores, onMarkDone }: Props) {
  const [confirming, setConfirming] = useState<Assignment | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  // useCallback keeps the same function between renders, so the celebration timer isn't restarted
  const finishCelebration = useCallback(() => setCelebrating(false), [])

  const mine = assignments.filter((a) => a.member_id === member.id)
  const overdue = mine.filter((a) => a.week_start < currentWeek && a.done_at === null)
  const thisWeek = mine.find((a) => a.week_start === currentWeek)
  // Before launch the app already shows the first week (see App.tsx)
  const startsNextWeek = currentWeek > weekStart()
  const left = daysLeft(currentWeek)
  const last = thisWeek && lastDone.find((a) => a.chore_id === thisWeek.chore_id)

  // 'Zuletzt erledigt vor 8 Tagen von Carla', or a cheer if nobody has done it yet
  function lastDoneText() {
    if (!last?.done_at || !last.done_by) return strings.myWeek.neverDone
    const who = last.done_by === member.id ? strings.myWeek.lastDoneByYou : byId(members, last.done_by).name
    return strings.myWeek.lastDone(strings.daysAgo(daysAgo(last.done_at)), who)
  }

  function confirmDone() {
    if (!confirming) return
    onMarkDone(confirming.id)
    setConfirming(null)
    setCelebrating(true)
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.greeting}>{strings.myWeek.greeting(member.name)}</h1>

      {thisWeek && (
        <section className={`${styles.mainCard} ${thisWeek.done_at ? styles.mainCardDone : ''}`}>
          <p className={styles.week}>{strings.weekRange(currentWeek)}</p>
          <p className={styles.yourChore}>
            {startsNextWeek ? strings.myWeek.yourChoreFromMonday : strings.myWeek.yourChore}
          </p>
          <p className={styles.choreIcon} aria-hidden="true">
            {byId(chores, thisWeek.chore_id).icon}
          </p>
          <p className={styles.choreName}>{byId(chores, thisWeek.chore_id).name}</p>
          {thisWeek.done_at ? (
            <>
              <p className={styles.doneOn}>
                {strings.myWeek.doneOn(strings.weekday(viennaWeekdayIndex(thisWeek.done_at)))}
              </p>
              <p className={styles.free}>{strings.myWeek.freeUntilMonday}</p>
            </>
          ) : (
            <>
              <p className={styles.lastDone}>{lastDoneText()}</p>
              {/* No countdown before launch week, it would show more than 7 days */}
              {!startsNextWeek && (
                <p className={`${styles.daysLeft} ${left === 1 ? styles.daysLeftLastDay : ''}`}>
                  {strings.myWeek.daysLeft(left)}
                </p>
              )}
              <Button className={styles.doneButton} onClick={() => setConfirming(thisWeek)}>
                {strings.myWeek.doneButton}
              </Button>
            </>
          )}
        </section>
      )}

      {overdue.length > 0 && (
        <section className={styles.overdueSection}>
          <h2 className={styles.sectionTitle}>{strings.myWeek.overdueTitle}</h2>
          {overdue.map((assignment) => (
            <div key={assignment.id} className={styles.overdueCard}>
              <div>
                <p className={styles.overdueName}>
                  {byId(chores, assignment.chore_id).icon} {byId(chores, assignment.chore_id).name}
                </p>
                <p className={styles.overdueWeek}>{strings.myWeek.fromWeek(assignment.week_start)}</p>
                <p className={styles.overdueSince}>{strings.overdueSince(daysOverdue(assignment.week_start))}</p>
              </div>
              <Button variant="danger" className={styles.smallButton} onClick={() => setConfirming(assignment)}>
                {strings.myWeek.doneButton}
              </Button>
            </div>
          ))}
        </section>
      )}

      {confirming && (
        <ConfirmSheet
          choreName={byId(chores, confirming.chore_id).name}
          onConfirm={confirmDone}
          onCancel={() => setConfirming(null)}
        />
      )}
      {celebrating && <Celebration onFinished={finishCelebration} />}
    </div>
  )
}
