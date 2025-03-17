const taskManager = require('../taskManager')
const { createCommand } = require('./baseCommand')

module.exports = createCommand({
  name: 'train',
  description: 'Controls the paladin training feature',
  extDescription:
    'Manages the automatic paladin training feature. You can enable, disable, or restart the training process.',
  usage: '!train [on|off|restart]',
  options: [
    { name: 'on', description: 'Enable paladin training' },
    { name: 'off', description: 'Disable paladin training' },
    { name: 'restart', description: 'Restart paladin training' },
  ],
  examples: [
    '!train on - Enable paladin training',
    '!train off - Disable paladin training',
    '!train restart - Restart paladin training',
    '!t on - Enable paladin training (using command alias)',
    '!t off - Enable paladin training',
    '!t r - Restart paladin training (using subcommand alias)',
  ],
  helpExamples: ['!train on', '!t off', '!t r'],

  handlers: {
    on: (message) => {
      taskManager.setTaskEnabled('train', true)
      message.reply('Paladin training enabled.')
    },

    off: (message) => {
      taskManager.setTaskEnabled('train', false)
      message.reply('Paladin training disabled.')
    },

    restart: (message, args) => {
      if (args[1] && !isNaN(args[1])) {
        const cooldownMinutes = parseInt(args[1])
        taskManager.setTaskNextRun('train', cooldownMinutes)
        message.reply(`Paladin training next run set to ${cooldownMinutes} minutes from now.`)
      } else {
        message.reply('Please provide a valid cooldown time in minutes. Usage: !train restart <minutes>')
      }
    },
  },
})
