import { Avatar } from '../components/Avatar'
import { choreById, memberById } from '../lib/mockData'
import { strings } from '../lib/strings'
import type { Assignment, Member } from '../lib/types'
import { daysOverdue, viennaWeekdayIndex } from '../lib/week'
import styles from './Overview.module.css'

type Props = {
  me: Member
  currentWeek: string
  assignments: Assignment[]
}

const byChoreOrder = (a: Assignment, b: Assignment) =>
  choreById(a.chore_id).sort_order - choreById(b.chore_id).sort_order

// Read-only: everyone's chores this week. Only the owner can mark done (in "Meine Woche").
export function Overview({ me, currentWeek, assignments }: Props) {
  const overdue = assignments.filter((a) => a.week_start < currentWeek && a.done_at === null).sort(byChoreOrder)
  const thisWeek = assignments.filter((a) => a.week_start === currentWeek).sort(byChoreOrder)

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{strings.overview.title}</h1>
      <p className={styles.week}>{strings.weekRange(currentWeek)}</p>

      {overdue.length > 0 && (
        <section>
          <h2 className={styles.overdueTitle}>{strings.overview.overdueTitle}</h2>
          <ul className={styles.list}>
            {overdue.map((assignment) => (
              <Row key={assignment.id} assignment={assignment} me={me} overdue />
            ))}
          </ul>
        </section>
      )}

      <ul className={styles.list}>
        {thisWeek.map((assignment) => (
          <Row key={assignment.id} assignment={assignment} me={me} />
        ))}
      </ul>
    </div>
  )
}

type RowProps = {
  assignment: Assignment
  me: Member
  overdue?: boolean
}

function Row({ assignment, me, overdue = false }: RowProps) {
  const member = memberById(assignment.member_id)
  const isMe = member.id === me.id

  let status = strings.overview.open
  let statusClass = styles.statusOpen
  if (overdue) {
    status = strings.overdueSince(daysOverdue(assignment.week_start))
    statusClass = styles.statusOverdue
  } else if (assignment.done_at) {
    status = strings.overview.doneOn(strings.weekday(viennaWeekdayIndex(assignment.done_at)))
    statusClass = styles.statusDone
  }

  return (
    <li className={`${styles.row} ${isMe ? styles.rowMe : ''} ${overdue ? styles.rowOverdue : ''}`}>
      <Avatar member={member} />
      <div className={styles.text}>
        <p className={styles.chore}>{choreById(assignment.chore_id).name}</p>
        <p className={styles.member}>
          {member.name}
          {isMe && ` (${strings.overview.you})`}
        </p>
      </div>
      <span className={`${styles.status} ${statusClass}`}>{status}</span>
    </li>
  )
}
