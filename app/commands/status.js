/**
 * Status Command
 * Shows the current status of the bot and its features
 */
const { EmbedBuilder } = require('discord.js')
const config = require('../../config.json')
const {
  getStatusEmoji,
  formatTimeRemaining,
  formatTime,
  formatDiscordTimestamp,
  processCommand,
  createCommandHelp,
} = require('../helper')

module.exports = {
  name: 'status',
  description: 'Shows the current status of the bot and its features',
  usage: '!status [feature]',

  // Command-specific text for help
  optionsText: `• ${getStatusEmoji('farm')} \`farm\` - Show detailed farming status
• ${getStatusEmoji('balance')} \`balance\` - Show detailed warehouse balancer status
• ${getStatusEmoji('train')} \`train\` - Show detailed paladin training status`,

  examplesText: `• \`!status\` - Show overall bot status
• \`!status farm\` - Show detailed farming status
• \`!status balance\` - Show detailed warehouse balancer status
• \`!status train\` - Show detailed paladin training status`,

  execute(message, args) {
    // Reference to botUtils for consistency
    const { taskManager, isRunning } = message.client.botUtils

    // Create custom handlers
    const handlers = {
      farm: (message) => this.showFeatureStatus(message, 'farm', taskManager),
      balance: (message) => this.showFeatureStatus(message, 'balance', taskManager),
      train: (message) => this.showFeatureStatus(message, 'train', taskManager),

      // Default handler shows overall status when no arguments
      default: (message) => this.showOverallStatus(message, isRunning, taskManager),

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
      name: 'status',
      description: this.description,
      handlers,
      defaultAction: 'default', // specify which handler to use for empty args
    })
  },

  // Show status of a specific feature
  showFeatureStatus(message, taskId, taskManager) {
    const taskStatus = taskManager.getTaskStatus(taskId)

    if (!taskStatus) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Task Not Found')
        .setColor('#ff3333')
        .setDescription(`${taskId} task not found.`)
        .addFields({
          name: '💡 Suggestion',
          value: 'Please check if the task is properly configured',
        })

      return message.reply({ embeds: [errorEmbed] })
    }

    // Get feature name and emoji
    const featureEmoji = getStatusEmoji(taskId)
    const featureName = taskStatus.name

    // Create feature-specific embed
    const embed = this.createStatusEmbed(featureName, featureEmoji, taskStatus)

    message.reply({ embeds: [embed] })
  },

  // Show overall status
  showOverallStatus(message, isRunning, taskManager) {
    const status = taskManager.getStatus()

    // Bot running status with emoji
    const botStatusEmoji = isRunning ? getStatusEmoji('active') : getStatusEmoji('paused')
    let description = `**Bot Status:** ${botStatusEmoji} ${isRunning ? 'Active' : 'Paused'}`

    // Handle pause state
    if (!isRunning && global.pauseEndTime) {
      const timeRemaining = global.pauseEndTime - Date.now()
      if (timeRemaining > 0) {
        const endTimeFormatted = new Date(global.pauseEndTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        description = `**Bot Status:** ${botStatusEmoji} Paused Until: ${endTimeFormatted} (${formatTimeRemaining(timeRemaining)} remaining)`
      }
    }

    // Create the embed
    const statusEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🤖 Bot Status Overview')
      .setDescription(description)

    // Add feature fields
    Object.entries(status.tasks).forEach(([taskId, task]) => {
      statusEmbed.addFields(this.formatTaskStatusField(task, taskId))
    })

    // Add footer with help info
    statusEmbed.setFooter({
      text: 'Use !status farm, !status balance, or !status train for detailed information',
    })

    message.reply({ embeds: [statusEmbed] })
  },

  // Create status embed for a task
  createStatusEmbed(featureName, featureEmoji, taskStatus) {
    const embed = new EmbedBuilder().setColor('#0099ff').setTitle(`${featureEmoji} ${featureName} Status`)

    // Status field
    const statusEmoji = getStatusEmoji(taskStatus.enabled ? 'enabled' : 'disabled')
    embed.addFields({
      name: '**Status**',
      value: `${statusEmoji} ${taskStatus.enabled ? 'Enabled' : 'Disabled'}`,
      inline: true,
    })

    // Interval (if applicable)
    if (taskStatus.interval) {
      embed.addFields({
        name: '**Interval**',
        value: `⏱️ ${taskStatus.interval} minutes`,
        inline: true,
      })
    }

    // Next run information
    if (taskStatus.nextRun) {
      const nextRunTime = formatTime(taskStatus.nextRun)
      const timeUntil = formatTimeRemaining(Math.max(0, taskStatus.nextRun - Date.now()))
      embed.addFields({
        name: '**Next Run**',
        value: `⏱️ ${formatDiscordTimestamp(taskStatus.nextRun)}\n(${nextRunTime}, ${timeUntil} remaining)`,
        inline: true,
      })
    } else if (taskStatus.enabled) {
      embed.addFields({
        name: '**Next Run**',
        value: '⏳ Not scheduled',
        inline: true,
      })
    }

    // Last run information
    if (taskStatus.lastRun) {
      embed.addFields({
        name: '**Last Run**',
        value: `🕒 ${formatDiscordTimestamp(taskStatus.lastRun)}`,
        inline: true,
      })
    } else {
      embed.addFields({
        name: '**Last Run**',
        value: '🕒 Never run',
        inline: true,
      })
    }

    return embed
  },

  // Format task status for display in status embed
  formatTaskStatusField(task, taskId) {
    const taskEmoji = getStatusEmoji(taskId)
    const statusEmoji = task.enabled ? getStatusEmoji('enabled') : getStatusEmoji('disabled')

    let fieldValue = `${statusEmoji} ${task.enabled ? 'Enabled' : 'Disabled'}`

    // Add next run info if available
    if (task.nextRun) {
      const timeRemaining = Math.max(0, task.nextRun - Date.now())
      fieldValue += `\n⏱️ Next: ${formatDiscordTimestamp(task.nextRun)} (${formatTimeRemaining(timeRemaining)})`
    }

    // Add last run info if available
    if (task.lastRun) {
      fieldValue += `\n🕒 Last: ${formatDiscordTimestamp(task.lastRun)}`
    }

    // Add interval info if available (particularly for balance)
    if (task.interval) {
      fieldValue += `\n⌛ Interval: ${task.interval} minutes`
    }

    return {
      name: `${taskEmoji} ${task.name}`,
      value: fieldValue,
      inline: true,
    }
  },
}
