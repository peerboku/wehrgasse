// Data shapes. Field names match the database columns
// (supabase/migrations/20261024100000_schema.sql), so rows fit in without renaming.

export type Member = {
  id: string
  name: string
  emoji: string
  color: string
}

export type Chore = {
  id: string
  name: string
  icon: string // emoji
  sort_order: number
}

export type RotationRow = {
  cycle_week: number
  chore_id: string
  member_id: string
}

export type Assignment = {
  id: string
  week_start: string // 'YYYY-MM-DD', always a Monday
  chore_id: string
  member_id: string
  done_at: string | null // ISO timestamp
  done_by: string | null
}
