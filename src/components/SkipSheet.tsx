import { byId } from '../lib/data'
import { strings } from '../lib/strings'
import type { Assignment, Chore, Member, SkipReason } from '../lib/types'
import { cleanedSince, daysAgo } from '../lib/week'
import { ConfirmSheet } from './ConfirmSheet'

type Props = {
  assignment: Assignment
  me: Member
  currentWeek: string
  members: Member[]
  chores: Chore[]
  lastDone: Assignment[]
  late?: Member | null // who cleaned too late, only for your own chore of this week
  onConfirm: (reason: SkipReason, lateMemberId?: string) => void
  onCancel: () => void
}

// "Überspringen?" for the three cases of docs/decisions/0017. The database
// function skip_week() checks again who may skip what.
export function SkipSheet({ assignment, me, currentWeek, members, chores, lastDone, late, onConfirm, onCancel }: Props) {
  const chore = byId(chores, assignment.chore_id)
  const owner = byId(members, assignment.member_id)

  let reason: SkipReason
  let question: string
  let hint: string
  if (assignment.week_start < currentWeek) {
    // Overdue: any time, with a warning if nobody has cleaned it since
    reason = 'overdue'
    question = strings.skip.questionOverdue(chore.name, assignment.week_start)
    const cleaned = cleanedSince(assignment, lastDone)
    if (cleaned?.done_at && cleaned.done_by) {
      const who = cleaned.done_by === me.id ? strings.myWeek.lastDoneByYou : byId(members, cleaned.done_by).name
      hint = strings.skip.hintCleaned(strings.daysAgo(daysAgo(cleaned.done_at)), who)
    } else {
      hint = strings.skip.hintNotCleaned(chore.name)
    }
  } else if (owner.id !== me.id) {
    // Peer skips someone else's chore of this week
    reason = 'for_other'
    question = strings.skip.questionFor(chore.name, owner.name)
    hint = strings.skip.hintFor(owner.name)
  } else {
    // Your own chore of this week, because someone cleaned too late
    reason = 'late_cleaning'
    question = strings.skip.question(chore.name)
    hint = strings.skip.hint(late?.name ?? '')
  }

  return (
    <ConfirmSheet
      icon={chore.icon}
      question={question}
      hint={hint}
      yesLabel={strings.skip.yes}
      onConfirm={() => onConfirm(reason, reason === 'late_cleaning' ? late?.id : undefined)}
      onCancel={onCancel}
    />
  )
}
