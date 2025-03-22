/**
 * Balance Command
 * Controls the warehouse balancer feature
 */
const config = require('../../config.json')
const {
  processCommand,
  createStandardHandlers,
  createCommandHelp,
  getStatusEmoji,
  handleInterval,
  restartTask,
} = require('../helper')

module.exports = {
  name: 'balance',
  description: 'Controls the warehouse balancer feature',
  usage: '!balance [on|off|off f|restart|restart f|interval <minutes>]',

  // Command-specific text for help
  optionsText: `• ${getStatusEmoji('on')} \`on\` - Enable warehouse balancer
• ${getStatusEmoji('off')} \`off\` - Disable warehouse balancer
• ${getStatusEmoji('off')} \`off f\` - Forcefully stop warehouse balancer
• ${getStatusEmoji('restart')} \`restart\` - Restart warehouse balancer immediately
• ${getStatusEmoji('restart')} \`restart f\` - Forcefully restart warehouse balancer
• ${getStatusEmoji('interval')} \`interval <minutes>\` - Set balancer interval time`,

  examplesText: `• \`!balance on\` - Enable warehouse balancer
• \`!balance off\` - Disable warehouse balancer
• \`!balance off f\` - Forcefully stop warehouse balancer
• \`!balance restart\` - Restart warehouse balancer immediately
• \`!balance interval 30\` - Set balancer interval to 30 minutes`,

  execute(message, args) {
    return processCommand(message, args, {
      name: 'balance',
      description: this.description,
      handlers: {
        ...createStandardHandlers('balance'),

        // Custom restart handler with balance-specific messaging
        restart: (message, args) => {
          const forceRestart = args[1]?.toLowerCase() === 'f' || args[1]?.toLowerCase() === 'force'
          restartTask(message, 'balance', {
            force: forceRestart,
            resultMessage: 'Warehouse balancer has been restarted',
          })
        },

        // Custom interval handler with balance-specific messaging
        interval: (message, args) => {
          handleInterval(message, 'balance', args, {
            errorMessage: 'Please provide a valid interval in minutes. Usage: !balance interval <minutes>',
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
