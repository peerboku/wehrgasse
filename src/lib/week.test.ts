import { describe, expect, it } from 'vitest'
import { assignmentsForWeek, choreById, members, chores, memberById, rotationTemplate } from './mockData'
import { ANCHOR_WEEK, addDays, cycleWeek, daysOverdue, viennaDate, weekStart } from './week'

describe('weekStart (Europe/Vienna)', () => {
  it('a normal Wednesday belongs to the Monday before', () => {
    expect(weekStart(new Date('2026-10-21T10:00:00Z'))).toBe('2026-10-19')
  })

  it('Sunday 23:59 on the night DST ends (25.10.2026) is still the old week', () => {
    // After 03:00 on 25.10. Vienna is UTC+1, so 23:59 Vienna = 22:59 UTC
    expect(weekStart(new Date('2026-10-25T22:59:00Z'))).toBe('2026-10-19')
  })

  it('Monday 00:30 in Vienna is a new week, although it is still Sunday in UTC', () => {
    const instant = new Date('2026-10-25T23:30:00Z')
    expect(instant.getUTCDay()).toBe(0) // Sunday in UTC
    expect(viennaDate(instant)).toBe('2026-10-26')
    expect(weekStart(instant)).toBe('2026-10-26')
  })

  it('Sunday 23:59 on the night DST starts (28.03.2027) is still the old week', () => {
    // From 02:00 on 28.03. Vienna is UTC+2, so 23:59 Vienna = 21:59 UTC
    expect(weekStart(new Date('2027-03-28T21:59:00Z'))).toBe('2027-03-22')
  })

  it('Monday 29.03.2027 00:00 in Vienna starts the new week', () => {
    expect(weekStart(new Date('2027-03-28T22:00:00Z'))).toBe('2027-03-29')
  })
})

describe('cycleWeek', () => {
  it('anchor week is 0, then 1, 2, 3, and back to 0', () => {
    const cycles = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => cycleWeek(addDays(ANCHOR_WEEK, 7 * i)))
    expect(cycles).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
  })

  it('the week before the anchor is 3, not -1', () => {
    expect(cycleWeek('2026-10-19')).toBe(3)
  })

  it('the DST week in March 2027 is not shifted', () => {
    // 22 weeks after the anchor -> 22 mod 4 = 2
    expect(cycleWeek('2027-03-29')).toBe(2)
  })
})

describe('daysOverdue', () => {
  it('the Monday after the week is 1 day overdue', () => {
    expect(daysOverdue('2026-10-19', new Date('2026-10-26T09:00:00Z'))).toBe(1)
  })

  it('Wednesday after the week is 3 days overdue', () => {
    expect(daysOverdue('2026-10-19', new Date('2026-10-28T09:00:00Z'))).toBe(3)
  })
})

describe('rotation (matches the table in CLAUDE.md)', () => {
  const table = [
    { Peer: 'Müll rausbringen', Carla: 'Bad Carla & Peer', Noa: 'Bad Noa & Manu', Manu: 'Küche & Staubsaugen' },
    { Peer: 'Bad Carla & Peer', Carla: 'Müll rausbringen', Noa: 'Küche & Staubsaugen', Manu: 'Bad Noa & Manu' },
    { Peer: 'Küche & Staubsaugen', Carla: 'Bad Carla & Peer', Noa: 'Bad Noa & Manu', Manu: 'Müll rausbringen' },
    { Peer: 'Bad Carla & Peer', Carla: 'Küche & Staubsaugen', Noa: 'Müll rausbringen', Manu: 'Bad Noa & Manu' },
  ]

  it('gives the right chore to everyone for 8 weeks from 26.10.2026', () => {
    for (let i = 0; i < 8; i++) {
      const week = addDays(ANCHOR_WEEK, 7 * i)
      const actual = Object.fromEntries(
        assignmentsForWeek(week).map((a) => [memberById(a.member_id).name, choreById(a.chore_id).name]),
      )
      expect(actual, `week ${week}`).toEqual(table[i % 4])
    }
  })

  it('every cycle week: each member has exactly 1 chore and each chore exactly 1 member', () => {
    for (let cycle = 0; cycle < 4; cycle++) {
      const rows = rotationTemplate.filter((row) => row.cycle_week === cycle)
      expect(rows.map((row) => row.member_id).sort()).toEqual(members.map((m) => m.id).sort())
      expect(rows.map((row) => row.chore_id).sort()).toEqual(chores.map((c) => c.id).sort())
    }
  })
})
