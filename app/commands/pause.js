/**
 * Pause Command
 * Pauses the bot for a specified amount of time
 */
const { EmbedBuilder } = require('discord.js')
const { createErrorResponse, createCommandHelp, processCommand } = require('../helper')

module.exports = {
  name: 'pause',
  description: 'Pauses the bot for a specified amount of time',
  usage: '!pause [minutes]',

  // Command-specific text for help
  optionsText: `• No parameter - Pause for 10 minutes (default)
• \`[minutes]\` - Pause for specified number of minutes`,

  examplesText: `• \`!pause\` - Pause for 10 minutes
• \`!pause 5\` - Pause for 5 minutes
• \`!pause 30\` - Pause for 30 minutes`,

  execute(message, args) {
    // Create custom handlers
    const handlers = {
      // Main handler for the pause command
      default: (message, args) => this.handlePause(message, args),

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
      name: 'pause',
      description: this.description,
      handlers,
      defaultAction: 'default', // specify which handler to use for empty args
    })
  },

  // Handle pause command
  handlePause(message, args) {
    // Get setRunning function from botUtils
    const { setRunning } = message.client.botUtils

    // Validate setRunning is available
    if (!setRunning) {
      const errorEmbed = createErrorResponse({
        title: 'System Error',
        message: 'Bot utils not properly initialized',
        suggestion: 'Please notify the bot administrator',
      })

      return message.reply({ embeds: [errorEmbed] })
    }

    // Validate minutes argument if provided
    if (args[0] && isNaN(args[0])) {
      const errorEmbed = createErrorResponse({
        title: 'Invalid Parameter',
        message: 'The minutes value must be a number.',
        suggestion: 'Try !pause [number] where [number] is the minutes to pause',
      })

      return message.reply({ embeds: [errorEmbed] })
    }

    // Get pause minutes (default to 10 if not specified)
    let pauseMinutes = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : 10
    const pauseMs = pauseMinutes * 60 * 1000

    // Calculate and store end time
    const endTime = new Date(Date.now() + pauseMs)
    const endTimeFormatted = endTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Set bot to paused state
    setRunning(false)

    // Create response embed
    const embed = new EmbedBuilder()
      .setTitle('⏸️ Pause')
      .setColor('#FFA500') // Orange for pause
      .setDescription(`❌ **Paused:** Bot paused for ${pauseMinutes} minute${pauseMinutes !== 1 ? 's' : ''}`)
      .addFields({
        name: '**Status**',
        value: '❌ Disabled',
        inline: true,
      })
      .addFields({
        name: '**Next Run**',
        value: `⏱️ <t:${Math.floor(endTime.getTime() / 1000)}:R>\n(${endTimeFormatted})`,
        inline: true,
      })

    message.reply({ embeds: [embed] })

    // Set global variables
    global.pauseEndTime = endTime

    // Auto-resume after pause time
    setTimeout(() => {
      setRunning(true)
      global.pauseEndTime = null

      try {
        // Create auto-resume embed
        const resumeEmbed = new EmbedBuilder()
          .setTitle('▶️ Resume')
          .setColor('#00FF00') // Green for resume
          .setDescription(`✅ **Resumed:** Bot automatically resumed at ${endTimeFormatted}`)
          .addFields({
            name: '**Status**',
            value: '✅ Enabled',
            inline: true,
          })

        message.channel.send({ embeds: [resumeEmbed] })
      } catch (error) {
        console.log('Could not send resume message')
      }
    }, pauseMs)
  },
}
