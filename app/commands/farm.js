const taskManager = require('../taskManager')
const { createCommand } = require('./baseCommand')

module.exports = createCommand({
  name: 'farm',
  description: 'Controls the troops farming feature',
  extDescription:
    'Manages the automatic troops farming feature. You can enable or disable farming, and restart the farming process.',
  usage: '!farm [on|off|restart]',
  options: [
    { name: 'on', description: 'Enable farming' },
    { name: 'off', description: 'Disable farming' },
    { name: 'restart', description: 'Restart troops farming', args: ['<minutes>'] },
  ],
  examples: [
    '!farm on - Enable farming',
    '!farm off - Disable farming',
    '!farm restart 30 - Set troops to return in 30 minutes',
    '!f on - Enable farming (using command alias)',
    '!f o - Enable farming (using subcommand alias)',
    '!f r 45 - Set troops to return in 45 minutes (using subcommand alias)',
  ],
  helpExamples: ['!farm on', '!f off', '!f r 30'],

  handlers: {
    on: (message) => {
      taskManager.setTaskEnabled('farm', true)
      message.reply('Farming enabled.')
    },

    off: (message) => {
      taskManager.setTaskEnabled('farm', false)
      message.reply('Farming disabled.')
    },

    restart: (message, args) => {
      if (args[1] && !isNaN(args[1])) {
        const returnMinutes = parseInt(args[1])
        taskManager.setTaskNextRun('farm', returnMinutes)
        message.reply(`Farming next run set to ${returnMinutes} minutes from now.`)
      } else {
        message.reply('Please provide a valid return time in minutes. Usage: !farm restart <minutes>')
      }
    },
  },
})
