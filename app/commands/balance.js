const taskManager = require('../taskManager')
const { createCommand } = require('./baseCommand')

module.exports = createCommand({
  name: 'balance',
  description: 'Controls the warehouse balancer feature',
  extDescription:
    'Manages the automatic warehouse balancing feature. You can enable, disable, restart the balancer, or set its interval time.',
  usage: '!balance [on|off|restart|interval <minutes>]',
  options: [
    { name: 'on', description: 'Enable warehouse balancer' },
    { name: 'off', description: 'Disable warehouse balancer' },
    { name: 'restart', description: 'Restart warehouse balancer' },
    { name: 'interval', description: 'Set balancer interval time (in minutes)', args: ['<minutes>'] },
  ],
  examples: [
    '!balance on - Enable warehouse balancer',
    '!balance off - Disable warehouse balancer',
    '!balance restart - Restart warehouse balancer',
    '!balance interval 30 - Set balancer interval to 30 minutes',
    '!b on - Enable warehouse balancer (using command alias)',
    '!b o - Enable warehouse balancer (using subcommand alias)',
    '!b i 45 - Set balancer interval to 45 minutes (using subcommand alias)',
  ],
  helpExamples: ['!balance on', '!b off', '!b r', '!b i 30'],

  handlers: {
    on: (message) => {
      taskManager.setTaskEnabled('balance', true)
      message.reply('Warehouse balancer enabled.')
    },

    off: (message) => {
      taskManager.setTaskEnabled('balance', false)
      message.reply('Warehouse balancer disabled.')
    },

    restart: (message) => {
      // Check current status
      const taskStatus = taskManager.getTaskStatus('balance')

      // If task doesn't exist, show error
      if (!taskStatus) {
        return message.reply('Balance task not found.')
      }

      // If already enabled, disable first, then enable
      if (taskStatus.enabled) {
        taskManager.setTaskEnabled('balance', false)
      }

      // Use setTimeout to ensure the disable has time to take effect
      setTimeout(() => {
        taskManager.setTaskEnabled('balance', true)
        message.reply('Warehouse balancer restarted.')
      }, 100)
    },

    interval: (message, args) => {
      if (args[1] && !isNaN(args[1])) {
        const intervalMinutes = parseInt(args[1])
        taskManager.setTaskInterval('balance', intervalMinutes)
        message.reply(`Warehouse balancer interval set to ${intervalMinutes} minutes.`)
      } else {
        message.reply('Please provide a valid interval in minutes. Usage: !balance interval <minutes>')
      }
    },
  },
})
