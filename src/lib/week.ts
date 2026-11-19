// Week logic. A week is Monday–Sunday in Europe/Vienna (see CLAUDE.md).
// Trick: convert a moment in time to its Vienna calendar date ONCE, then only
// do math on plain dates ('YYYY-MM-DD', no time of day). Plain dates have no
// daylight saving time, so a week can never be shifted by an hour.

import type { Assignment, RotationRow } from './types'

const TIME_ZONE = 'Europe/Vienna'
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Monday of cycle week 0
export const ANCHOR_WEEK = '2026-10-26'
export const CYCLE_LENGTH = 4

const viennaFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The calendar date in Vienna at this moment, e.g. '2026-10-21'. Without an argument: today. */
export function viennaDate(instant: Date = new Date()): string {
  const parts = viennaFormat.formatToParts(instant)
  const get = (type: string) => parts.find((part) => part.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Plain date <-> whole day number. UTC is used only as a neutral counter here,
// it has nothing to do with the time zone of the week.
function toDayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(toDayNumber(date) + days)
}

export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from)
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(date: string): number {
  const sundayFirst = new Date(toDayNumber(date) * MS_PER_DAY).getUTCDay()
  return (sundayFirst + 6) % 7
}

/** Weekday in Vienna of a timestamp like done_at. 0 = Monday … 6 = Sunday */
export function viennaWeekdayIndex(timestamp: string): number {
  return weekdayIndex(viennaDate(new Date(timestamp)))
}

/** Monday of the Vienna week that contains this moment. */
export function weekStart(instant: Date = new Date()): string {
  const today = viennaDate(instant)
  return addDays(today, -weekdayIndex(today))
}

/** Position in the 4-week rotation: floor(days_since_anchor / 7) mod 4. */
export function cycleWeek(weekStartDate: string): number {
  const weeks = Math.floor(daysBetween(ANCHOR_WEEK, weekStartDate) / 7)
  // JavaScript's % can return negative numbers for weeks before the anchor
  return ((weeks % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH
}

/**
 * Who does what in a week according to rotation_template (one row per chore).
 * One-off take-overs only change this week's assignments, so for next week the template is the truth.
 */
export function rotationForWeek(rotation: RotationRow[], weekStartDate: string): RotationRow[] {
  return rotation.filter((row) => row.cycle_week === cycleWeek(weekStartDate))
}

/** Days left in the week, today included: Monday = 7, Sunday = 1 ("nur noch heute"). */
export function daysLeft(weekStartDate: string, now: Date = new Date()): number {
  const sunday = addDays(weekStartDate, 6)
  return daysBetween(viennaDate(now), sunday) + 1
}

/**
 * Day picked in the "erledigt?" sheet, kept between the chore's Monday and today.
 * Empty (iOS "Löschen" button) = today. iOS doesn't always enforce min/max on the field.
 */
export function clampDoneDate(picked: string, weekStartDate: string, today: string): string {
  if (!picked || picked > today) return today
  if (picked < weekStartDate) return weekStartDate
  return picked
}

const viennaHourFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' })

/**
 * 12:00 in Vienna on this date, as a timestamp for done_at (a backdated "erledigt"
 * means a day, not an exact minute). Vienna is UTC+1 in winter, UTC+2 in summer:
 * start at 11:00 UTC, look which hour that is in Vienna, and correct by the difference.
 */
export function viennaNoon(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, 11))
  const hour = Number(viennaHourFormat.formatToParts(guess).find((part) => part.type === 'hour')!.value)
  return new Date(guess.getTime() + (12 - hour) * 60 * 60 * 1000).toISOString()
}

/** Calendar days in Vienna since a timestamp like done_at: today = 0, yesterday = 1. */
export function daysAgo(timestamp: string, now: Date = new Date()): number {
  return daysBetween(viennaDate(new Date(timestamp)), viennaDate(now))
}

/**
 * Colour of the dot in the "Zuletzt erledigt" card: under 7 days green,
 * 7–13 days yellow, 14 days or more red. Input is daysAgo().
 */
export type Freshness = 'fresh' | 'aging' | 'stale'
export function freshness(days: number): Freshness {
  if (days < 7) return 'fresh'
  if (days < 14) return 'aging'
  return 'stale'
}

/**
 * "Überspringen" rule: an older row of the chore (`late`) was marked done this week,
 * on Wednesday or later in Vienna. Then this week's owner may skip. Same rule as
 * skippable_assignment() in the database (migration 20261101120000).
 */
export function lateEnoughToSkip(late: Pick<Assignment, 'week_start' | 'done_at'>, currentWeek: string): boolean {
  if (!late.done_at || late.week_start >= currentWeek) return false
  const wednesday = addDays(currentWeek, 2)
  return viennaDate(new Date(late.done_at)) >= wednesday
}

/**
 * Skipping an overdue chore: was it cleaned in a later week? Returns that later done row
 * (for "zuletzt gestern von Carla"), or null if nobody has cleaned it since (warning in the sheet).
 * lastDone = newest real done row per chore (loadLastDone(), skips are left out). docs/decisions/0017
 */
export function cleanedSince(
  overdue: Pick<Assignment, 'chore_id' | 'week_start'>,
  lastDone: Assignment[],
): Assignment | null {
  const last = lastDone.find((a) => a.chore_id === overdue.chore_id)
  return last && last.week_start > overdue.week_start ? last : null
}

/** Days since the week's Sunday. The Monday after counts as 1 ("seit gestern"). */
export function daysOverdue(weekStartDate: string, now: Date = new Date()): number {
  const sunday = addDays(weekStartDate, 6)
  return daysBetween(sunday, viennaDate(now))
}
