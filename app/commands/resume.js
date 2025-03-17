module.exports = {
  name: 'resume',
  description: 'Resumes the bot if it was paused',
  execute(message, args, { setRunning }) {
    setRunning(true)
    global.pauseEndTime = null
    message.reply('Bot resumed.')
  },
}
