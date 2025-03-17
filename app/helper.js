/**
 * Helper functions for the game automation bot
 */

/**
 * Formats milliseconds into a time format that includes hours when needed
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time string (HH:MM:SS or MM:SS depending on duration)
 */
function formatTimeRemaining(milliseconds) {
  // Return "00:00" if milliseconds is negative or zero
  if (milliseconds <= 0) {
    return '00:00'
  }

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  // Include hours in format if duration is 1 hour or more
  if (hours > 0) {
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}

/**
 * Formats a Date object into a consistent time format (HH:MM)
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} Formatted time string in HH:MM format
 */
function formatTime(date) {
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

module.exports = {
  formatTimeRemaining,
  formatTime,
}
