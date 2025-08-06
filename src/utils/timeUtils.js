// src/utils/timeUtils.js

/**
 * Convert a local ISO datetime string (e.g. "2025-08-06T15:00")
 * into a UTC Date object.
 */
export function toUTCDate(localISOString) {
  const local = new Date(localISOString);
  return new Date(local.getTime() + local.getTimezoneOffset() * 60000);
}

/**
 * Format a UTC Date into ISO string for storing/display.
 */
export function toISOStringUTC(date) {
  return date.toISOString();
}
