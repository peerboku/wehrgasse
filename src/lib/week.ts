// Week logic. A week is Monday–Sunday in Europe/Vienna (see CLAUDE.md).
// Trick: convert a moment in time to its Vienna calendar date ONCE, then only
// do math on plain dates ('YYYY-MM-DD', no time of day). Plain dates have no
// daylight saving time, so a week can never be shifted by an hour.

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

/** The calendar date in Vienna at this moment, e.g. '2026-10-21'. */
export function viennaDate(instant: Date): string {
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

/** Days left in the week, today included: Monday = 7, Sunday = 1 ("nur noch heute"). */
export function daysLeft(weekStartDate: string, now: Date = new Date()): number {
  const sunday = addDays(weekStartDate, 6)
  return daysBetween(viennaDate(now), sunday) + 1
}

/** Days since the week's Sunday. The Monday after counts as 1 ("seit gestern"). */
export function daysOverdue(weekStartDate: string, now: Date = new Date()): number {
  const sunday = addDays(weekStartDate, 6)
  return daysBetween(sunday, viennaDate(now))
}
