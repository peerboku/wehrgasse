// Test fixture: the same members, chores and rotation as in
// supabase/migrations/20261024100100_seed.sql, used only by week.test.ts.
// The app itself loads everything from Supabase (src/lib/data.ts).

import type { Assignment, Chore, Member, RotationRow } from './types'
import { cycleWeek } from './week'

export const members: Member[] = [
  { id: 'peer', name: 'Peer', emoji: '🦊', color: '#e8833a' },
  { id: 'carla', name: 'Carla', emoji: '🐼', color: '#7a6ff0' },
  { id: 'noa', name: 'Noa', emoji: '🦉', color: '#2fa36b' },
  { id: 'manu', name: 'Manu', emoji: '🐻', color: '#d9534f' },
]

export const chores: Chore[] = [
  { id: 'trash', name: 'Müll rausbringen', icon: '🗑️', sort_order: 1 },
  { id: 'bath-nm', name: 'Bad Noa & Manu', icon: '🛁', sort_order: 2 },
  { id: 'bath-cp', name: 'Bad Carla & Peer', icon: '🛁', sort_order: 3 },
  { id: 'kitchen', name: 'Küche & Staubsaugen', icon: '🍳', sort_order: 4 },
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

/** One open assignment per chore for this week, like ensure_week() in the database does. */
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

export function memberById(id: string): Member {
  return members.find((member) => member.id === id)!
}

export function choreById(id: string): Chore {
  return chores.find((chore) => chore.id === id)!
}
