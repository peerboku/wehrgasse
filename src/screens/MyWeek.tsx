import { useCallback, useState, type CSSProperties } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Celebration } from '../components/Celebration'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { CheckIcon, ChevronIcon, ClockIcon, RotateIcon } from '../components/Icons'
import { byId } from '../lib/data'
import { strings } from '../lib/strings'
import type { Assignment, Chore, Member, RotationRow } from '../lib/types'
import { daysAgo, daysLeft, daysOverdue, viennaWeekdayIndex, weekStart } from '../lib/week'
import styles from './MyWeek.module.css'

type Props = {
  member: Member
  currentWeek: string
  assignments: Assignment[]
  lastDone: Assignment[]
  members: Member[]
  chores: Chore[]
  nextWeek: RotationRow[] // empty = unknown, then the "Ab Montag" row is hidden
  onMarkDone: (assignmentId: string) => void
  onOpenWG: () => void
  onOpenSettings: () => void
}

export function MyWeek({
  member,
  currentWeek,
  assignments,
  lastDone,
  members,
  chores,
  nextWeek,
  onMarkDone,
  onOpenWG,
  onOpenSettings,
}: Props) {
  const [confirming, setConfirming] = useState<Assignment | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  // useCallback keeps the same function between renders, so the celebration timer isn't restarted
  const finishCelebration = useCallback(() => setCelebrating(false), [])

  const byChoreOrder = (a: Assignment, b: Assignment) =>
    byId(chores, a.chore_id).sort_order - byId(chores, b.chore_id).sort_order
  const everyoneThisWeek = assignments.filter((a) => a.week_start === currentWeek).sort(byChoreOrder)
  const doneCount = everyoneThisWeek.filter((a) => a.done_at).length
  const mine = assignments.filter((a) => a.member_id === member.id)
  const overdue = mine.filter((a) => a.week_start < currentWeek && a.done_at === null)
  // Usually one, two if you took over someone else's chore
  const thisWeek = everyoneThisWeek.filter((a) => a.member_id === member.id)
  const openThisWeek = thisWeek.filter((a) => !a.done_at)
  // The fixed Erledigt button is for the first open one; with two open it says which
  const nextToDo = openThisWeek[0]
  const myNextChore = nextWeek.find((row) => row.member_id === member.id)
  // Before launch the app already shows the first week (see App.tsx)
  const startsNextWeek = currentWeek > weekStart()
  const left = daysLeft(currentWeek)

  // 'Zuletzt erledigt vor 8 Tagen von Carla', or a cheer if nobody has done it yet
  function lastDoneText(assignment: Assignment) {
    const last = lastDone.find((a) => a.chore_id === assignment.chore_id)
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
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{strings.myWeek.greeting(member.name)}</h1>
          <p className={styles.week}>{strings.weekRange(currentWeek)}</p>
        </div>
        <button type="button" className={styles.avatarLink} onClick={onOpenSettings} aria-label={strings.myWeek.openSettings}>
          <Avatar member={member} size={40} tint={false} />
        </button>
      </header>

      {thisWeek.map((assignment) => {
        const chore = byId(chores, assignment.chore_id)
        return assignment.done_at ? (
          <section key={assignment.id} className={styles.hero}>
            <div className={styles.doneTile} aria-hidden="true">
              <CheckIcon size={38} strokeWidth={3} />
            </div>
            <p className={styles.eyebrow}>{chore.name}</p>
            <h2 className={styles.choreName}>
              {strings.myWeek.doneOn(strings.weekday(viennaWeekdayIndex(assignment.done_at)))}
            </h2>
            <p className={styles.free}>{strings.myWeek.freeUntilMonday}</p>
          </section>
        ) : (
          <section key={assignment.id} className={styles.hero}>
            <div className={styles.choreTile} aria-hidden="true">
              {chore.icon}
            </div>
            <p className={styles.eyebrow}>
              {startsNextWeek ? strings.myWeek.yourChoreFromMonday : strings.myWeek.yourChore}
            </p>
            <h2 className={styles.choreName}>{chore.name}</h2>
            {/* No countdown before launch week, it would show more than 7 days */}
            {!startsNextWeek && (
              <p className={`${styles.chip} ${left === 1 ? styles.chipUrgent : ''}`}>
                <ClockIcon size={14} strokeWidth={2.6} />
                {strings.myWeek.daysLeft(left)}
              </p>
            )}
            <p className={styles.lastDone}>{lastDoneText(assignment)}</p>
          </section>
        )
      })}

      {/* Below this week's card on purpose: an old open chore on top confused Noa (hallway test) */}
      {overdue.length > 0 && (
        <section className={styles.overdueSection}>
          <h2 className={styles.sectionTitle}>{strings.myWeek.overdueTitle}</h2>
          {overdue.map((assignment) => {
            const chore = byId(chores, assignment.chore_id)
            return (
              <div key={assignment.id} className={styles.overdueCard}>
                <div className={styles.overdueIcon} aria-hidden="true">
                  {chore.icon}
                </div>
                <div className={styles.overdueText}>
                  <p className={styles.overdueName}>{chore.name}</p>
                  <p className={styles.overdueWeek}>{strings.myWeek.fromWeek(assignment.week_start)}</p>
                  <p className={styles.overdueSince}>{strings.overdueSince(daysOverdue(assignment.week_start))}</p>
                </div>
                <Button className={styles.smallButton} onClick={() => setConfirming(assignment)}>
                  {strings.myWeek.doneButton}
                </Button>
              </div>
            )
          })}
        </section>
      )}

      <button
        type="button"
        className={styles.crew}
        onClick={onOpenWG}
        aria-label={`${strings.myWeek.crewTitle}, ${strings.myWeek.crewProgress(doneCount, everyoneThisWeek.length)}`}
      >
        <span className={styles.crewHeader}>
          <span className={styles.crewTitle}>{strings.myWeek.crewTitle}</span>
          <span className={styles.crewCount}>
            {strings.myWeek.crewProgress(doneCount, everyoneThisWeek.length)}
            <ChevronIcon size={16} strokeWidth={2.6} />
          </span>
        </span>
        {/* One avatar per chore, so someone who took over a chore shows up twice */}
        <span className={styles.crewGrid}>
          {everyoneThisWeek.map((assignment) => {
            const owner = byId(members, assignment.member_id)
            return (
              <span key={assignment.id} className={styles.member}>
                <span
                  className={`${styles.avatar} ${assignment.done_at ? styles.avatarDone : ''}`}
                  style={{ '--member': owner.color } as CSSProperties}
                >
                  <Avatar member={owner} size={40} tint={false} />
                  <span className={styles.choreBadge} aria-hidden="true">
                    {byId(chores, assignment.chore_id).icon}
                  </span>
                  {assignment.done_at && (
                    <span className={styles.doneBadge} aria-hidden="true">
                      <CheckIcon size={10} strokeWidth={4} />
                    </span>
                  )}
                </span>
                <span className={styles.memberName}>{owner.name}</span>
              </span>
            )
          })}
        </span>
      </button>

      {myNextChore && (
        <p className={styles.next}>
          <span className={styles.nextIcon} aria-hidden="true">
            <RotateIcon size={16} strokeWidth={2.4} />
          </span>
          <span>
            {strings.myWeek.nextWeek} <span className={styles.nextChore}>{byId(chores, myNextChore.chore_id).name}</span>
          </span>
        </p>
      )}

      {/* Fixed above the tab bar. While celebrating, the cheer shows in this slot instead */}
      {nextToDo && !celebrating && (
        <div className={styles.actionBar}>
          <Button onClick={() => setConfirming(nextToDo)}>
            <CheckIcon size={22} strokeWidth={3} />
            {openThisWeek.length > 1
              ? strings.myWeek.doneButtonFor(byId(chores, nextToDo.chore_id).name)
              : strings.myWeek.doneButton}
          </Button>
        </div>
      )}

      {confirming && (
        <ConfirmSheet
          icon={byId(chores, confirming.chore_id).icon}
          question={strings.confirm.question(byId(chores, confirming.chore_id).name)}
          hint={strings.confirm.hint}
          yesLabel={strings.confirm.yes}
          yesVariant="done"
          onConfirm={confirmDone}
          onCancel={() => setConfirming(null)}
        />
      )}
      {celebrating && <Celebration onFinished={finishCelebration} />}
    </div>
  )
}
