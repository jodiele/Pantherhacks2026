/** Once set, the main app shell is allowed without forcing `/auth` first. */
export const FIRST_VISIT_STORAGE_KEY = 'suntology_visited_v1'

export function hasCompletedFirstVisit(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(FIRST_VISIT_STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

export function markFirstVisitComplete(): void {
  try {
    localStorage.setItem(FIRST_VISIT_STORAGE_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}
