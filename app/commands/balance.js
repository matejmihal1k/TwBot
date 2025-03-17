const taskManager = require('../taskManager')

module.exports = {
  name: 'balancer',
  description: 'Controls the warehouse balancer feature',
  execute(message, args) {
    if (args[0] === 'on') {
      taskManager.setTaskEnabled('balancer', true)
      message.reply('Warehouse balancer enabled.')
    } else if (args[0] === 'off') {
      taskManager.setTaskEnabled('balancer', false)
      message.reply('Warehouse balancer disabled.')
    } else if (args[0] === 'interval') {
      if (args[1] && !isNaN(args[1])) {
        const intervalMinutes = parseInt(args[1])
        taskManager.setTaskInterval('balancer', intervalMinutes)
        message.reply(`Warehouse balancer interval set to ${intervalMinutes} minutes.`)
      } else {
        message.reply('Please provide a valid interval in minutes.')
      }
    } else {
      message.reply('Usage: !balancer [on|off|interval <minutes>]')
    }
  },
}
