import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { byId } from '../lib/data'
import { strings } from '../lib/strings'
import type { Assignment, Chore, Member } from '../lib/types'
import { daysAgo, daysOverdue, viennaWeekdayIndex } from '../lib/week'
import styles from './Overview.module.css'

type Props = {
  me: Member
  currentWeek: string
  assignments: Assignment[]
  lastDone: Assignment[]
  members: Member[]
  chores: Chore[]
  onTakeOver: (assignment: Assignment) => void
}

// Everyone's chores this week. Only the owner can mark done (in "Meine Woche"),
// but anyone can take over someone else's open chore of this week ("Ich übernehm das").
export function Overview({ me, currentWeek, assignments, lastDone, members, chores, onTakeOver }: Props) {
  const [confirming, setConfirming] = useState<Assignment | null>(null)

  const byChoreOrder = (a: Assignment, b: Assignment) =>
    byId(chores, a.chore_id).sort_order - byId(chores, b.chore_id).sort_order
  const overdue = assignments.filter((a) => a.week_start < currentWeek && a.done_at === null).sort(byChoreOrder)
  const thisWeek = assignments.filter((a) => a.week_start === currentWeek).sort(byChoreOrder)

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{strings.overview.title}</h1>
      <div className={styles.weekBox}>
        <p className={styles.week}>{strings.weekRange(currentWeek)}</p>
        <p className={styles.deadline}>{strings.deadline(currentWeek)}</p>
      </div>

      {overdue.length > 0 && (
        <section>
          <h2 className={styles.overdueTitle}>{strings.overview.overdueTitle}</h2>
          <ul className={styles.list}>
            {overdue.map((assignment) => (
              <Row key={assignment.id} assignment={assignment} me={me} members={members} chores={chores} overdue />
            ))}
          </ul>
        </section>
      )}

      <ul className={styles.list}>
        {thisWeek.map((assignment) => (
          <Row
            key={assignment.id}
            assignment={assignment}
            me={me}
            members={members}
            chores={chores}
            lastDoneAt={lastDone.find((a) => a.chore_id === assignment.chore_id)?.done_at ?? null}
            onTap={
              !assignment.done_at && assignment.member_id !== me.id ? () => setConfirming(assignment) : undefined
            }
          />
        ))}
      </ul>

      {confirming && (
        <ConfirmSheet
          question={strings.takeOver.question(byId(chores, confirming.chore_id).name)}
          hint={strings.takeOver.hint(byId(members, confirming.member_id).name)}
          yesLabel={strings.takeOver.yes}
          onConfirm={() => {
            onTakeOver(confirming)
            setConfirming(null)
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  )
}

type RowProps = {
  assignment: Assignment
  me: Member
  members: Member[]
  chores: Chore[]
  overdue?: boolean
  lastDoneAt?: string | null // shown under the name while this week's chore is still open
  onTap?: () => void // only set for rows you can take over
}

function Row({ assignment, me, members, chores, overdue = false, lastDoneAt = null, onTap }: RowProps) {
  const member = byId(members, assignment.member_id)
  const chore = byId(chores, assignment.chore_id)
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

  const rowClass = `${styles.row} ${isMe ? styles.rowMe : ''} ${overdue ? styles.rowOverdue : ''}`
  // spans, not p: a <button> may only contain inline elements
  const content = (
    <>
      <Avatar member={member} />
      <span className={styles.text}>
        <span className={styles.chore}>
          <span aria-hidden="true">{chore.icon}</span> {chore.name}
        </span>
        <span className={styles.member}>
          {member.name}
          {isMe && ` (${strings.overview.you})`}
        </span>
        {!assignment.done_at && lastDoneAt && (
          <span className={styles.lastDone}>{strings.overview.lastDone(strings.daysAgo(daysAgo(lastDoneAt)))}</span>
        )}
      </span>
      <span className={`${styles.status} ${statusClass}`}>
        {status}
        {onTap && ' ›'}
      </span>
    </>
  )

  return (
    <li>
      {onTap ? (
        <button type="button" className={`${rowClass} ${styles.rowButton}`} onClick={onTap}>
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  )
}
