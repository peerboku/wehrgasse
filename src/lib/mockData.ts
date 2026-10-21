// Fake data for the Phase 1 prototype. Replaced by Supabase in Phase 3.
// rotationTemplate mirrors the future `rotation_template` table row by row.

import type { Assignment, Chore, Member, RotationRow } from './types'
import { addDays, cycleWeek, weekStart } from './week'

export const members: Member[] = [
  { id: 'peer', name: 'Peer', emoji: '🦊', color: '#e8833a' },
  { id: 'carla', name: 'Carla', emoji: '🐼', color: '#7a6ff0' },
  { id: 'noa', name: 'Noa', emoji: '🦉', color: '#2fa36b' },
  { id: 'manu', name: 'Manu', emoji: '🐻', color: '#d9534f' },
]

export const chores: Chore[] = [
  { id: 'trash', name: 'Müll rausbringen', sort_order: 1 },
  { id: 'bath-nm', name: 'Bad Noa & Manu', sort_order: 2 },
  { id: 'bath-cp', name: 'Bad Carla & Peer', sort_order: 3 },
  { id: 'kitchen', name: 'Küche & Staubsaugen', sort_order: 4 },
]

export const rotationTemplate: RotationRow[] = [
  { cycle_week: 0, member_id: 'peer', chore_id: 'trash' },
  { cycle_week: 0, member_id: 'carla', chore_id: 'bath-cp' },
  { cycle_week: 0, member_id: 'noa', chore_id: 'bath-nm' },
  { cycle_week: 0, member_id: 'manu', chore_id: 'kitchen' },

  { cycle_week: 1, member_id: 'peer', chore_id: 'bath-cp' },
  { cycle_week: 1, member_id: 'carla', chore_id: 'trash' },
  { cycle_week: 1, member_id: 'noa', chore_id: 'kitchen' },
  { cycle_week: 1, member_id: 'manu', chore_id: 'bath-nm' },

  { cycle_week: 2, member_id: 'peer', chore_id: 'kitchen' },
  { cycle_week: 2, member_id: 'carla', chore_id: 'bath-cp' },
  { cycle_week: 2, member_id: 'noa', chore_id: 'bath-nm' },
  { cycle_week: 2, member_id: 'manu', chore_id: 'trash' },

  { cycle_week: 3, member_id: 'peer', chore_id: 'bath-cp' },
  { cycle_week: 3, member_id: 'carla', chore_id: 'kitchen' },
  { cycle_week: 3, member_id: 'noa', chore_id: 'trash' },
  { cycle_week: 3, member_id: 'manu', chore_id: 'bath-nm' },
]

/** One open assignment per chore for this week, like ensure_current_week() will do. */
export function assignmentsForWeek(weekStartDate: string): Assignment[] {
  return rotationTemplate
    .filter((row) => row.cycle_week === cycleWeek(weekStartDate))
    .map((row) => ({
      id: `${weekStartDate}-${row.chore_id}`,
      week_start: weekStartDate,
      chore_id: row.chore_id,
      member_id: row.member_id,
      done_at: null,
      done_by: null,
    }))
}

/** This week all open; last week Carla + Manu done, Peer + Noa overdue (to show both states). */
export function buildMockAssignments(now: Date = new Date()): Assignment[] {
  const thisWeek = weekStart(now)
  const lastWeek = addDays(thisWeek, -7)
  const lastThursdayEvening = `${addDays(lastWeek, 3)}T17:00:00Z`

  const previous = assignmentsForWeek(lastWeek).map((assignment) =>
    assignment.member_id === 'carla' || assignment.member_id === 'manu'
      ? { ...assignment, done_at: lastThursdayEvening, done_by: assignment.member_id }
      : assignment,
  )
  return [...previous, ...assignmentsForWeek(thisWeek)]
}

export function memberById(id: string): Member {
  return members.find((member) => member.id === id)!
}

export function choreById(id: string): Chore {
  return chores.find((chore) => chore.id === id)!
}
