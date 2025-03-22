/**
 * Resume Command
 * Resumes the bot if it was paused
 */
const { EmbedBuilder } = require('discord.js')
const { createErrorResponse, createCommandHelp, processCommand } = require('../helper')

module.exports = {
  name: 'resume',
  description: 'Resumes the bot if it was paused',
  usage: '!resume',

  // Command-specific text for help
  optionsText: `• No options - Resume the bot from paused state`,

  examplesText: `• \`!resume\` - Resume bot operations`,

  execute(message, args) {
    // Create custom handlers
    const handlers = {
      // Main handler for the resume command
      default: (message, args) => this.handleResume(message, args),

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
    }

    // Use processCommand with our custom handlers
    return processCommand(message, args, {
      name: 'resume',
      description: this.description,
      handlers,
      defaultAction: 'default', // specify which handler to use for empty args
    })
  },

  // Handle resume command
  handleResume(message, args) {
    // Get setRunning and isRunning functions from botUtils
    const { setRunning, isRunning } = message.client.botUtils

    // Validate setRunning is available
    if (!setRunning) {
      const errorEmbed = createErrorResponse({
        title: 'System Error',
        message: 'Bot utils not properly initialized',
        suggestion: 'Please notify the bot administrator',
      })

      return message.reply({ embeds: [errorEmbed] })
    }

    // Check if bot is already running
    if (isRunning && isRunning()) {
      const errorEmbed = createErrorResponse({
        title: 'Already Running',
        message: 'The bot is already running and not paused.',
        suggestion: 'No action needed',
      })

      return message.reply({ embeds: [errorEmbed] })
    }

    // Calculate how much time was remaining if pauseEndTime was set
    let remainingInfo = ''
    if (global.pauseEndTime) {
      const remaining = global.pauseEndTime - Date.now()
      if (remaining > 0) {
        const remainingMinutes = Math.ceil(remaining / (60 * 1000))
        remainingInfo = ` (${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} early)`
      }
    }

    // Update state
    setRunning(true)
    global.pauseEndTime = null

    // Create response embed
    const embed = new EmbedBuilder()
      .setTitle('▶️ Resume')
      .setColor('#00FF00') // Green for resume
      .setDescription(`✅ **Resumed:** Bot operations resumed${remainingInfo}`)
      .addFields({
        name: '**Status**',
        value: '✅ Enabled',
        inline: true,
      })

    message.reply({ embeds: [embed] })
  },
}
