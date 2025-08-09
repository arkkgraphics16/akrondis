/* src/utils/timeUtils.js */

// Keep the old exports for ListsPage (unchanged)
export function toUTCDate(localISOString) {
  // already UTC ISO; return as-is
  return localISOString;
}
export function toISOStringUTC(date) {
  return date.toISOString();
}

// New helper for local-time countdown
export function msLeft(localISO) {
  return new Date(localISO) - Date.now();
}
