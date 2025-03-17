/**
 * Formats milliseconds into a MM:SS time format
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time string in MM:SS format
 */
function formatTimeRemaining(milliseconds) {
  // Return "00:00" if milliseconds is negative or zero
  if (milliseconds <= 0) {
    return "00:00";
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

module.exports = {
  formatTimeRemaining
};
