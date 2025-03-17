const taskManager = require('../taskManager')

module.exports = {
  name: 'paladin',
  description: 'Controls the paladin training feature',
  execute(message, args) {
    if (args[0] === 'on') {
      taskManager.setTaskEnabled('paladin', true)
      message.reply('Paladin training enabled.')
    } else if (args[0] === 'off') {
      taskManager.setTaskEnabled('paladin', false)
      message.reply('Paladin training disabled.')
    } else if (args[0] === 'interval') {
      if (args[1] && !isNaN(args[1])) {
        const intervalMinutes = parseInt(args[1])
        taskManager.setTaskInterval('paladin', intervalMinutes)
        message.reply(`Paladin training interval set to ${intervalMinutes} minutes.`)
      } else {
        message.reply('Please provide a valid interval in minutes.')
      }
    } else {
      message.reply('Usage: !paladin [on|off|interval <minutes>]')
    }
  },
}
