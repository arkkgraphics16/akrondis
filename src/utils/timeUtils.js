/* src/utils/timeUtils.js */

// Keep the old exports for compatibility
export function toUTCDate(localISOString) {
  // already UTC ISO; return as-is
  return localISOString;
}

export function toISOStringUTC(date) {
  return date.toISOString();
}

// UPDATED: Enhanced to handle both ISO strings AND Firestore Timestamps
export function msLeft(deadlineValue) {
  try {
    if (!deadlineValue) return -1; // No deadline = expired
    
    let targetTime;
    
    // Handle Firestore Timestamp
    if (deadlineValue.toMillis && typeof deadlineValue.toMillis === 'function') {
      targetTime = deadlineValue.toMillis();
    }
    // Handle ISO string
    else if (typeof deadlineValue === 'string') {
      targetTime = new Date(deadlineValue).getTime();
    }
    // Handle Date object
    else if (deadlineValue instanceof Date) {
      targetTime = deadlineValue.getTime();
    }
    // Handle raw milliseconds
    else if (typeof deadlineValue === 'number') {
      targetTime = deadlineValue;
    }
    else {
      console.warn('msLeft: Unknown deadline format', deadlineValue);
      return -1;
    }
    
    // Return countdown in milliseconds
    return targetTime - Date.now();
  } catch (error) {
    console.error('msLeft error:', error, deadlineValue);
    return -1; // Treat errors as expired
  }
}
