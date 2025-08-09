// src/utils/timeUtils.js

// Returns the local ISO string from a <input type="datetime-local"> value
export function toLocalISO(localISOString) {
  // already in local ISO, just return it
  return localISOString;
}

// Returns ms-left from now (in local time)
export function msLeft(localISO) {
  return new Date(localISO) - Date.now();
}
