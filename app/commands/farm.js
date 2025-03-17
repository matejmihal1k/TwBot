const taskManager = require('../taskManager')

module.exports = {
  name: 'farming',
  description: 'Controls the farming feature',
  execute(message, args) {
    if (args[0] === 'on') {
      taskManager.setTaskEnabled('farming', true)
      message.reply('Farming enabled.')
    } else if (args[0] === 'off') {
      taskManager.setTaskEnabled('farming', false)
      message.reply('Farming disabled.')
    } else if (args[0] === 'return') {
      // Set the next run time based on when troops will return
      if (args[1] && !isNaN(args[1])) {
        const returnMinutes = parseInt(args[1])
        taskManager.setFarmingNextRun(returnMinutes)
        message.reply(`Farming next run set to ${returnMinutes} minutes from now.`)
      } else {
        message.reply('Please provide a valid return time in minutes.')
      }
    } else {
      message.reply('Usage: !farming [on|off|return <minutes>]')
    }
  },
}
