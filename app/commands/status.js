const { EmbedBuilder } = require('discord.js')
const { formatTimeRemaining } = require('../helper')

module.exports = {
  name: 'status',
  description: 'Shows the current status of the bot and its features',
  execute(message, args, { isRunning, taskManager, config }) {
    // Check if a specific feature status was requested
    const feature = args[0]?.toLowerCase()

    // Handle specific feature status requests
    if (['balance', 'balancer', 'farming', 'farm', 'paladin'].includes(feature)) {
      const taskId = feature === 'balance' ? 'balancer' : feature === 'farm' ? 'farming' : feature

      const taskStatus = taskManager.getTaskStatus(taskId)
      if (!taskStatus) {
        return message.reply(`${taskId} task not found.`)
      }

      // Create feature-specific embed
      const featureEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${taskStatus.name} Status`)
        .setDescription(`**Status:** ${taskStatus.enabled ? '✅ Enabled' : '❌ Disabled'}`)
        .addFields([
          // Only show interval for balancer
          ...(taskId === 'balancer'
            ? [
                {
                  name: 'Interval',
                  value: `${taskStatus.interval || 'N/A'} minutes`,
                },
              ]
            : []),

          // Next run information
          {
            name: 'Next Run',
            value: taskStatus.nextRun
              ? `<t:${Math.floor(taskStatus.nextRun / 1000)}:R> (${taskStatus.timeUntilNextRun})`
              : 'Not scheduled',
          },

          // Last run information
          {
            name: 'Last Run',
            value: taskStatus.lastRun ? `<t:${Math.floor(taskStatus.lastRun / 1000)}:R>` : 'Never',
          },
        ])

      return message.reply({ embeds: [featureEmbed] })
    }

    // Default status display if no specific feature was requested
    const status = taskManager.getStatus()
    let statusText = ''

    // Bot running status
    if (!isRunning && global.pauseEndTime) {
      const timeRemaining = global.pauseEndTime - Date.now()
      if (timeRemaining > 0) {
        const endTimeFormatted = new Date(global.pauseEndTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        statusText += `**Bot Running:** ❌ Paused Until: ${endTimeFormatted} (${formatTimeRemaining(timeRemaining)} remaining)\n\n`
      }
    } else {
      statusText += `**Bot Running:** ${isRunning ? '✅ Active' : '❌ Paused'}\n\n`
    }

    // Feature statuses in a code block for perfect alignment
    statusText += '```\n'
    Object.entries(status.tasks).forEach(([taskId, task]) => {
      const nextRunText = task.nextRun ? `Next: ${formatTimeRemaining(Math.max(0, task.nextRun - Date.now()))}` : ''

      statusText += `${task.name.padEnd(20)}: ${task.enabled ? '✅ Enabled' : '❌ Disabled'}`
      if (nextRunText) statusText += ` (${nextRunText})`
      statusText += '\n'
    })
    statusText += '```'

    statusText += '\n*Use `!status balancer`, `!status farming`, or `!status paladin` for detailed information.*'

    const statusEmbed = new EmbedBuilder().setColor('#0099ff').setDescription(statusText)

    message.reply({ embeds: [statusEmbed] })
  },
}
