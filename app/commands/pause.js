const { formatTimeRemaining } = require('../helper')

module.exports = {
  name: 'pause',
  description: 'Pauses the bot for a specified amount of time',
  execute(message, args, { setRunning }) {
    let pauseMinutes = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : 10
    const pauseMs = pauseMinutes * 60 * 1000

    // Calculate and store end time
    const endTime = new Date(Date.now() + pauseMs)
    const endTimeFormatted = endTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    setRunning(false)
    message.reply(
      `Bot paused for ${pauseMinutes} minute${pauseMinutes !== 1 ? 's' : ''}. Will resume at ${endTimeFormatted}.`,
    )

    // Set global variables
    global.pauseEndTime = endTime

    // Auto-resume after pause time
    setTimeout(() => {
      setRunning(true)
      global.pauseEndTime = null

      try {
        message.channel.send(`Bot automatically resumed at ${endTimeFormatted}.`)
      } catch (error) {
        console.log('Could not send resume message')
      }
    }, pauseMs)
  },
}
