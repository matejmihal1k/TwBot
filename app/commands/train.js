/**
 * Train Command
 * Controls the paladin training feature
 */
const {
  processCommand,
  createStandardHandlers,
  createCommandHelp,
  getStatusEmoji,
  setTaskNextRun,
  restartTask,
} = require('../helper')

module.exports = {
  name: 'train',
  description: 'Controls the paladin training feature',
  usage: '!train [on|off|off f|restart|restart f|schedule <minutes>]',
  // Command-specific text for help
  optionsText: `• ${getStatusEmoji('on')} \`on\` - Enable paladin training
• ${getStatusEmoji('off')} \`off\` - Disable paladin training
• ${getStatusEmoji('off')} \`off f\` - Forcefully stop paladin training
• ${getStatusEmoji('restart')} \`restart\` - Restart paladin training immediately
• ${getStatusEmoji('restart')} \`restart f\` - Forcefully restart paladin training
• ${getStatusEmoji('time')} \`schedule <minutes>\` - Schedule training with cooldown time`,

  examplesText: `• \`!train on\` - Enable paladin training
• \`!train off\` - Disable paladin training
• \`!train off f\` - Forcefully stop paladin training
• \`!train restart\` - Restart paladin training immediately
• \`!train schedule 30\` - Schedule training with 30 minute cooldown`,

  execute(message, args) {
    return processCommand(message, args, {
      name: 'train',
      description: this.description,
      handlers: {
        ...createStandardHandlers('train'),

        // Custom restart handler with train-specific messaging
        restart: (message, args) => {
          const forceRestart = args[1]?.toLowerCase() === 'f' || args[1]?.toLowerCase() === 'force'
          restartTask(message, 'train', {
            force: forceRestart,
            resultMessage: 'Paladin training has been restarted',
          })
        },

        // Custom schedule handler with train-specific messaging
        schedule: (message, args) => {
          if (args[1] && !isNaN(args[1])) {
            const minutes = parseInt(args[1])
            setTaskNextRun(message, 'train', minutes, 'Next training scheduled in ${minutes} minutes')
          } else {
            message.reply('Please provide a valid cooldown in minutes. Usage: !train schedule <minutes>')
          }
        },

        // Custom help display
        showHelp: (message, errorMessage = null) => {
          const embed = createCommandHelp(this, errorMessage)

          embed.addFields({
            name: '⚙️ Options',
            value: this.optionsText,
          })

          embed.addFields({
            name: '📋 Examples',
            value: this.examplesText,
          })

          message.reply({ embeds: [embed] })
        },
      },
    })
  },
}
