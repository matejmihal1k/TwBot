/**
 * Farm Command
 * Controls the troops farming feature
 */
const {
  processCommand,
  createStandardHandlers,
  createCommandHelp,
  getStatusEmoji,
  setTaskNextRun,
  handleInterval,
} = require('../helper')

module.exports = {
  name: 'farm',
  description: 'Controls the troops farming feature',
  usage: '!farm [on|off|off f|restart|restart f|schedule <minutes>|interval <minutes>]',

  // Command-specific text for help
  optionsText: `• ${getStatusEmoji('on')} \`on\` - Enable farming
• ${getStatusEmoji('off')} \`off\` - Disable farming
• ${getStatusEmoji('off')} \`off f\` - Forcefully stop farming
• ${getStatusEmoji('restart')} \`restart\` - Restart farming immediately
• ${getStatusEmoji('restart')} \`restart f\` - Forcefully restart farming
• ${getStatusEmoji('time')} \`schedule <minutes>\` - Set troops to return in specified minutes
• ${getStatusEmoji('interval')} \`interval <minutes>\` - Set minimum farming interval`,

  examplesText: `• \`!farm on\` - Enable farming
• \`!farm off\` - Disable farming
• \`!farm off f\` - Forcefully stop farming
• \`!farm restart\` - Restart farming immediately
• \`!farm schedule 30\` - Set troops to return in 30 minutes
• \`!farm interval 45\` - Set minimum farming interval to 45 minutes`,

  execute(message, args) {
    return processCommand(message, args, {
      name: 'farm',
      description: this.description,
      handlers: {
        ...createStandardHandlers('farm'),

        // Custom schedule handler with farm-specific messaging
        schedule: (message, args) => {
          if (args[1] && !isNaN(args[1])) {
            const minutes = parseInt(args[1])
            setTaskNextRun(message, 'farm', minutes, 'Troops will return in ${minutes} minutes')
          } else {
            message.reply('Please provide a valid time in minutes. Usage: !farm schedule <minutes>')
          }
        },

        // Custom interval handler with farm-specific messaging
        interval: (message, args) => {
          handleInterval(message, 'farm', args, {
            errorMessage: 'Please provide a valid interval in minutes. Usage: !farm interval <minutes>',
            successTemplate: 'Minimum farm interval set to ${minutes} minutes',
          })
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
