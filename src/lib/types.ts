// Data shapes. Field names match the database columns
// (supabase/migrations/20261024100000_schema.sql), so rows fit in without renaming.

export type Member = {
  id: string
  name: string
  emoji: string
  color: string
  can_skip_for_others: boolean // Peer: may skip anyone's open chore, see docs/decisions/0017
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
  skipped: boolean // closed with "Überspringen" (done_at/done_by are set too), see docs/decisions/0015 and 0017
}

/** Why a chore was skipped, stored in the chore_skipped event (docs/decisions/0017). */
export type SkipReason = 'late_cleaning' | 'overdue' | 'for_other'
