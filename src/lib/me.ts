// Which flatmate is using this phone. Everyone shares the WG login, so the app
// remembers the picked name here (on the phone, not in the database).
// try/catch: storage can be blocked, e.g. in a private Safari window.

const KEY = 'wg.memberId'

export function getMyMemberId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setMyMemberId(memberId: string): void {
  try {
    localStorage.setItem(KEY, memberId)
  } catch {
    // not saved: the name has to be picked again next time, nothing breaks
  }
}

export function clearMyMemberId(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
