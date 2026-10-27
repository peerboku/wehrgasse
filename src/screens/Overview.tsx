import { useState, type CSSProperties } from 'react'
import { Avatar } from '../components/Avatar'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { CheckIcon, ChevronIcon, ClockIcon, RotateIcon } from '../components/Icons'
import { byId } from '../lib/data'
import { strings } from '../lib/strings'
import type { Assignment, Chore, Member, RotationRow } from '../lib/types'
import { addDays, daysAgo, daysOverdue } from '../lib/week'
import styles from './Overview.module.css'

type Props = {
  me: Member
  currentWeek: string
  assignments: Assignment[]
  lastDone: Assignment[]
  members: Member[]
  chores: Chore[]
  nextWeek: RotationRow[] // empty = unknown, then the "Ab Montag" card is hidden
  onTakeOver: (assignment: Assignment) => void
}

// Everyone's chores this week as a wheel ("Drehscheibe"). Only the owner can mark done (in "Meine Woche"),
// but anyone can take over someone else's open chore of this week ("Ich übernehm das").
export function Overview({ me, currentWeek, assignments, lastDone, members, chores, nextWeek, onTakeOver }: Props) {
  const [confirming, setConfirming] = useState<Assignment | null>(null)

  const sortOrder = (choreId: string) => byId(chores, choreId).sort_order
  const byChoreOrder = (a: Assignment, b: Assignment) => sortOrder(a.chore_id) - sortOrder(b.chore_id)
  const overdue = assignments.filter((a) => a.week_start < currentWeek && a.done_at === null).sort(byChoreOrder)
  const thisWeek = assignments.filter((a) => a.week_start === currentWeek).sort(byChoreOrder)
  const doneCount = thisWeek.filter((a) => a.done_at).length
  const canTake = (a: Assignment) => !a.done_at && a.member_id !== me.id

  // Turn the wheel so my chore sits at the top, under the orange pointer. Then clockwise in sort order.
  const myIndex = thisWeek.findIndex((a) => a.member_id === me.id)
  const wheel = myIndex > 0 ? [...thisWeek.slice(myIndex), ...thisWeek.slice(0, myIndex)] : thisWeek

  // "Ab Montag": me first, then the others in chore order
  const isMeFirst = (row: RotationRow) => (row.member_id === me.id ? 0 : 1)
  const meFirstThenChoreOrder = (a: RotationRow, b: RotationRow) =>
    isMeFirst(a) - isMeFirst(b) || sortOrder(a.chore_id) - sortOrder(b.chore_id)

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{strings.overview.title}</h1>
      <div className={styles.subline}>
        <p className={styles.week}>{strings.weekRange(currentWeek)}</p>
        <p className={styles.countChip}>{strings.myWeek.crewProgress(doneCount, thisWeek.length)}</p>
      </div>

      {wheel.length > 0 && (
        <Wheel
          slots={wheel}
          me={me}
          members={members}
          chores={chores}
          doneCount={doneCount}
          onTake={(assignment) => setConfirming(assignment)}
        />
      )}
      {thisWeek.some(canTake) && <p className={styles.hint}>{strings.overview.takeHint}</p>}

      {overdue.length > 0 && (
        <section>
          <h2 className={styles.overdueTitle}>{strings.overview.overdueTitle}</h2>
          <ul className={styles.list}>
            {overdue.map((assignment) => {
              const owner = byId(members, assignment.member_id)
              const chore = byId(chores, assignment.chore_id)
              return (
                <li key={assignment.id} className={styles.row}>
                  <Avatar member={owner} size={36} />
                  <span className={styles.rowText}>
                    <span className={styles.rowChore}>
                      <span aria-hidden="true">{chore.icon}</span> {chore.name}
                    </span>
                    <span className={styles.rowMeta}>
                      {strings.overview.slotStatus(
                        owner.id === me.id ? strings.overview.you : owner.name,
                        strings.overdueSince(daysOverdue(assignment.week_start)),
                      )}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <ClockIcon size={18} strokeWidth={2.4} />
          <h2 className={styles.cardTitle}>{strings.overview.activityTitle}</h2>
        </div>
        <ul className={styles.activityList}>
          {chores.map((chore) => {
            const last = lastDone.find((a) => a.chore_id === chore.id)
            const who = last?.done_by && (last.done_by === me.id ? strings.overview.activityByYou : byId(members, last.done_by).name)
            return (
              <li key={chore.id} className={styles.activityItem}>
                <span className={styles.activityIcon} aria-hidden="true">
                  {chore.icon}
                </span>
                <span className={styles.activityChore}>{chore.name}</span>
                <span className={styles.activityWhen}>
                  {last?.done_at && who
                    ? strings.overview.activityWhen(strings.daysAgo(daysAgo(last.done_at)), who)
                    : strings.overview.activityNever}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {nextWeek.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <RotateIcon size={18} strokeWidth={2.4} />
            <h2 className={styles.cardTitle}>{strings.overview.nextTitle}</h2>
            <p className={styles.nextDates}>{strings.weekRange(addDays(currentWeek, 7))}</p>
          </div>
          <ul className={styles.nextGrid}>
            {[...nextWeek].sort(meFirstThenChoreOrder).map((row) => {
              const member = byId(members, row.member_id)
              const isMe = member.id === me.id
              return (
                <li key={row.chore_id} className={`${styles.nextItem} ${isMe ? styles.nextItemMe : ''}`}>
                  <span className={styles.nextAvatar} style={{ '--member': member.color } as CSSProperties}>
                    <Avatar member={member} size={32} tint={false} />
                  </span>
                  <span className={styles.nextText}>
                    <span className={styles.nextName}>{isMe ? strings.overview.nextYou : member.name}</span>
                    <span className={styles.nextChore}>{byId(chores, row.chore_id).name}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {confirming && (
        <ConfirmSheet
          icon={byId(chores, confirming.chore_id).icon}
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

type WheelProps = {
  slots: Assignment[] // slot 0 sits at the top, then clockwise
  me: Member
  members: Member[]
  chores: Chore[]
  doneCount: number
  onTake: (assignment: Assignment) => void
}

// The wheel works for any number of chores n: each one gets a slice of 360/n degrees.
function Wheel({ slots, me, members, chores, doneCount, onTake }: WheelProps) {
  const n = slots.length
  const step = 360 / n
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  // One coloured slice per slot, starting half a slice left of the top so slot 0 is centred
  const slices = slots.map((a, i) => {
    const tint = a.done_at
      ? 'var(--done-tint)'
      : `color-mix(in srgb, ${byId(members, a.member_id).color} var(--tint-pct), transparent)`
    return `${tint} ${i * step}deg ${(i + 1) * step}deg`
  })
  const wheelBg = `conic-gradient(from ${-step / 2}deg, ${slices.join(', ')}), var(--card)`

  // Gaps between slices sit at i*step - step/2 (degrees clockwise from the top). A full-width line
  // covers two opposite gaps, so an even n needs n/2 lines; an odd n needs n half lines from the centre.
  const gapAngles = slots.map((_, i) => i * step - step / 2)
  const dividers = n % 2 === 0 ? gapAngles.slice(0, n / 2) : gapAngles

  return (
    <div className={styles.wheelWrap}>
      <div className={styles.pointer} aria-hidden="true" />
      <div className={styles.wheel} style={{ '--wheel-bg': wheelBg } as CSSProperties} aria-hidden="true" />
      {n > 1 &&
        dividers.map((angle) => (
          <div
            key={angle}
            className={`${styles.divider} ${n % 2 === 1 ? styles.dividerHalf : ''}`}
            style={{ '--angle': `${angle - 90}deg` } as CSSProperties}
            aria-hidden="true"
          />
        ))}

      {slots.map((assignment, i) => {
        const owner = byId(members, assignment.member_id)
        const chore = byId(chores, assignment.chore_id)
        const isMe = owner.id === me.id
        const done = Boolean(assignment.done_at)
        const takeable = !done && !isMe
        const position = {
          '--x': `${50 + 32 * Math.sin(toRadians(i * step))}%`,
          '--y': `${50 - 32 * Math.cos(toRadians(i * step))}%`,
        } as CSSProperties
        const status = strings.overview.slotStatus(
          isMe ? strings.overview.you : owner.name,
          done ? strings.overview.statusDone : strings.overview.statusOpen,
        )

        const content = (
          <>
            <span
              className={`${styles.slotAvatar} ${done ? styles.slotAvatarDone : isMe ? styles.slotAvatarMe : ''}`}
              aria-hidden="true"
            >
              <Avatar member={owner} size={36} tint={false} />
              <span className={styles.choreBadge}>{chore.icon}</span>
              {done && (
                <span className={styles.doneBadge}>
                  <CheckIcon size={9} strokeWidth={4} />
                </span>
              )}
            </span>
            <span className={styles.slotChore}>{chore.name}</span>
            <span className={`${styles.slotStatus} ${done ? styles.slotStatusDone : ''}`}>
              {status}
              {takeable && <ChevronIcon size={12} strokeWidth={3} />}
            </span>
          </>
        )

        return (
          <div key={assignment.id} className={styles.slot} style={position}>
            {takeable ? (
              <button
                type="button"
                className={styles.slotInner}
                onClick={() => onTake(assignment)}
                aria-label={strings.overview.takeAria(chore.name, owner.name)}
              >
                {content}
              </button>
            ) : (
              <div className={styles.slotInner}>{content}</div>
            )}
          </div>
        )
      })}

      <div className={styles.hub}>
        <span className={styles.hubRatio}>{strings.overview.progress(doneCount, n)}</span>
        <span className={styles.hubLabel}>{strings.overview.progressLabel}</span>
      </div>
    </div>
  )
}
