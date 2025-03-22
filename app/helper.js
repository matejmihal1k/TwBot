/**
 * Helper functions for the Discord bot and task manager
 * Provides utilities for formatting, emoji display, command execution, and response creation
 */
const { EmbedBuilder } = require('discord.js')
const config = require('../config.json')

// ===================================
// Emoji & Formatting Helpers
// ===================================

/**
 * Get appropriate emoji for different task states
 * @param {string} status - The status to get emoji for
 * @returns {string} - The emoji for the status
 */
function getStatusEmoji(status) {
  switch (status.toLowerCase()) {
    // Status indicators
    case 'enabled':
    case 'on':
    case 'active':
    case 'running':
      return '✅'
    case 'disabled':
    case 'off':
    case 'paused':
      return '❌'
    case 'pending':
    case 'waiting':
      return '⏳'
    case 'warning':
      return '⚠️'
    case 'error':
      return '🔴'
    case 'success':
      return '🟢'

    // Features
    case 'farm':
      return '🌾'
    case 'balance':
      return '⚖️'
    case 'train':
      return '⚔️'

    // Actions
    case 'restart':
      return '🔄'
    case 'interval':
    case 'time':
    case 'schedule':
      return '⏱️'

    // System - only adding essential ones
    case 'system':
      return '🤖'
    case 'help':
      return '📚'

    // Default case
    default:
      return ''
  }
}

/**
 * Formats milliseconds into a MM:SS time format
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time string in MM:SS format
 */
function formatTimeRemaining(milliseconds) {
  // Return "00:00" if milliseconds is negative or zero
  if (milliseconds <= 0) {
    return '00:00'
  }

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Formats a timestamp to HH:MM format
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats a timestamp for Discord's special timestamp format
 * @param {number} timestamp - Timestamp in milliseconds
 * @param {string} format - Discord timestamp format (R = relative, F = full date/time, etc.)
 * @returns {string} Formatted Discord timestamp
 */
function formatDiscordTimestamp(timestamp, format = 'R') {
  return `<t:${Math.floor(timestamp / 1000)}:${format}>`
}

/**
 * Creates a display mapping of commands to their aliases
 * @param {Object} subcommandAliases - Object with alias-to-command mappings
 * @returns {Object} Object with command-to-aliases mappings
 */
function createAliasDisplayMap(subcommandAliases) {
  return Object.entries(subcommandAliases).reduce((acc, [alias, cmd]) => {
    acc[cmd] = acc[cmd] ? acc[cmd] + `, ${alias}` : alias
    return acc
  }, {})
}

// ===================================
// Command Response Helpers
// ===================================

/**
 * Creates a standard response embed for commands
 * @param {Object} options - Options for the embed
 * @returns {EmbedBuilder} - Created embed
 */
function createCommandResponse(options) {
  const { commandName, action, result, taskStatus, color = '#0099ff', error = false } = options

  // Get emoji for command and action
  const commandEmoji = getStatusEmoji(commandName)
  const actionEmoji = getStatusEmoji(action)

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(error ? '#ff3333' : color)
    .setTitle(`${commandEmoji} ${commandName.charAt(0).toUpperCase() + commandName.slice(1)}`)

  // Add description (action result)
  if (result) {
    embed.setDescription(`${actionEmoji} **${action.charAt(0).toUpperCase() + action.slice(1)}:** ${result}`)
  }

  // Add task status details if available
  if (taskStatus) {
    // Status field
    const statusEmoji = getStatusEmoji(taskStatus.enabled ? 'enabled' : 'disabled')
    embed.addFields({
      name: '**Status**',
      value: `${statusEmoji} ${taskStatus.enabled ? 'Enabled' : 'Disabled'}`,
      inline: true,
    })

    // Interval field (if available)
    if (taskStatus.interval) {
      embed.addFields({
        name: '**Interval**',
        value: `⏱️ ${taskStatus.interval} minutes`,
        inline: true,
      })
    }

    // Next run information
    if (taskStatus.nextRun) {
      embed.addFields({
        name: '**Next Run**',
        value: `⏱️ ${formatDiscordTimestamp(taskStatus.nextRun)}`,
        inline: true,
      })
    }

    // Last run information (if available)
    if (taskStatus.lastRun) {
      embed.addFields({
        name: '**Last Run**',
        value: `🕒 ${formatDiscordTimestamp(taskStatus.lastRun)}`,
        inline: true,
      })
    }
  }

  return embed
}

/**
 * Creates an error response embed
 * @param {Object} options - Error options
 * @returns {EmbedBuilder} - Error embed
 */
function createErrorResponse(options) {
  const { title, message, suggestion, command } = options

  const embed = new EmbedBuilder().setColor('#ff3333').setTitle(`❌ ${title}`).setDescription(message)

  if (command) {
    const commandEmoji = getStatusEmoji(command)
    embed.addFields({
      name: 'Related Command',
      value: `${commandEmoji} !${command}`,
    })
  }

  if (suggestion) {
    embed.addFields({
      name: '💡 Suggestion',
      value: suggestion,
    })
  }

  return embed
}

/**
 * Create a standardized status embed for responses
 * @param {Object} options - Options for the embed
 * @returns {EmbedBuilder} - The created embed
 */
function createStatusEmbed(options) {
  const { title, description, color = '#0099ff', fields = [], task = null, footer = null } = options

  const embed = new EmbedBuilder().setColor(color).setTitle(title)

  if (description) {
    embed.setDescription(description)
  }

  // Add task-specific details if provided
  if (task) {
    // Status field
    const statusEmoji = getStatusEmoji(task.enabled ? 'enabled' : 'disabled')
    embed.addFields({
      name: '**Status**',
      value: `${statusEmoji} ${task.enabled ? 'Enabled' : 'Disabled'}`,
      inline: true,
    })

    // Task-specific details
    if (task.interval) {
      const intervalEmoji = getStatusEmoji('interval')
      embed.addFields({
        name: '**Interval**',
        value: `${intervalEmoji} ${task.interval} minutes`,
        inline: true,
      })
    }

    // Next run information
    if (task.nextRun) {
      const nextRunTime = formatTime(task.nextRun)
      const timeUntil = formatTimeRemaining(Math.max(0, task.nextRun - Date.now()))
      embed.addFields({
        name: '**Next Run**',
        value: `⏱️ ${formatDiscordTimestamp(task.nextRun)}\n(${nextRunTime}, ${timeUntil} remaining)`,
        inline: true,
      })
    } else if (task.enabled) {
      embed.addFields({
        name: '**Next Run**',
        value: '⏳ Not scheduled',
        inline: true,
      })
    }

    // Last run information
    if (task.lastRun) {
      embed.addFields({
        name: '**Last Run**',
        value: `🕒 ${formatDiscordTimestamp(task.lastRun)}`,
        inline: true,
      })
    } else {
      embed.addFields({
        name: '**Last Run**',
        value: '🕒 Never run',
        inline: true,
      })
    }
  }

  // Add custom fields
  if (fields.length > 0) {
    fields.forEach((field) => {
      embed.addFields(field)
    })
  }

  // Add footer if provided
  if (footer) {
    embed.setFooter(footer)
  }

  return embed
}

/**
 * Format a task status item for display in status embed
 * @param {Object} task - The task status object
 * @param {string} taskId - The task ID
 * @returns {Object} - Formatted field for embed
 */
function formatTaskStatusField(task, taskId) {
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
}

// ===================================
// Task Action Helpers
// ===================================

/**
 * Enables a task and sends a response
 * @param {Object} message - Discord message
 * @param {string} taskId - Task ID to enable
 */
function enableTask(message, taskId) {
  const { taskManager } = message.client.botUtils

  // Enable the task
  taskManager.setTaskEnabled(taskId, true)

  // Get updated task status for embed
  const taskStatus = taskManager.getTaskStatus(taskId)

  // Create and send response
  const embed = createCommandResponse({
    commandName: taskId,
    action: 'on',
    result: `${taskStatus.name} has been enabled`,
    taskStatus,
  })

  message.reply({ embeds: [embed] })
}

/**
 * Disables a task and sends a response
 * @param {Object} message - Discord message object
 * @param {string} taskId - The task ID
 * @param {Object} options - Additional options
 */
function disableTask(message, taskId, options = {}) {
  const { force = false } = options
  const { taskManager } = message.client.botUtils

  // Disable the task
  taskManager.setTaskEnabled(taskId, false)

  // Get updated task status for embed
  const taskStatus = taskManager.getTaskStatus(taskId)

  // Create result message based on force option
  const result = force ? `${taskStatus.name} has been forcefully stopped` : `${taskStatus.name} has been disabled`

  // Create and send response
  const embed = createCommandResponse({
    commandName: taskId,
    action: 'off',
    result,
    taskStatus,
  })

  message.reply({ embeds: [embed] })
}

/**
 * Sets a task's next run time and sends a response
 * @param {Object} message - Discord message
 * @param {string} taskId - Task ID
 * @param {number} minutes - Minutes until next run
 * @param {string} resultTemplate - Template for result message
 */
function setTaskNextRun(message, taskId, minutes, resultTemplate = 'Next run scheduled in ${minutes} minutes') {
  const { taskManager } = message.client.botUtils

  // Set next run time
  taskManager.setTaskNextRun(taskId, minutes)

  // Get updated task status for embed
  const taskStatus = taskManager.getTaskStatus(taskId)

  // Create result text with variable substitution
  const result = resultTemplate.replace('${minutes}', minutes)

  // Create and send response
  const embed = createCommandResponse({
    commandName: taskId,
    action: 'schedule',
    result,
    taskStatus,
  })

  message.reply({ embeds: [embed] })
}

/**
 * Handles interval setting for tasks
 * Validates input and calls setTaskInterval
 * @param {Object} message - Discord message
 * @param {string} taskId - Task ID
 * @param {Array} args - Command arguments
 * @param {Object} customMessages - Custom messages
 */
function handleInterval(message, taskId, args, customMessages = {}) {
  const {
    errorMessage = `Please provide a valid interval in minutes. Usage: !${taskId} interval <minutes>`,
    successTemplate = `Interval set to ${'{minutes}'} minutes`,
  } = customMessages

  if (args[1] && !isNaN(args[1])) {
    const intervalMinutes = parseInt(args[1])
    setTaskInterval(message, taskId, intervalMinutes, successTemplate)
  } else {
    message.reply(errorMessage)
  }
}

/**
 * Sets a task's interval and sends a response
 * @param {Object} message - Discord message
 * @param {string} taskId - Task ID
 * @param {number} minutes - Interval in minutes
 * @param {string} resultTemplate - Template for result message
 */
function setTaskInterval(message, taskId, minutes, resultTemplate = 'Interval set to ${minutes} minutes') {
  const { taskManager } = message.client.botUtils

  // Set interval
  taskManager.setTaskInterval(taskId, minutes)

  // Get updated task status for embed
  const taskStatus = taskManager.getTaskStatus(taskId)

  // Create result text with variable substitution
  const result = resultTemplate.replace('${minutes}', minutes)

  // Create and send response
  const embed = createCommandResponse({
    commandName: taskId,
    action: 'interval',
    result,
    taskStatus,
  })

  message.reply({ embeds: [embed] })
}

/**
 * Restarts a task immediately (disable then enable)
 * @param {Object} message - Discord message object
 * @param {string} taskId - The task ID
 * @param {Object} options - Additional options
 */
function restartTask(message, taskId, options = {}) {
  const { force = false, resultMessage = `${taskId} has been restarted` } = options

  const { taskManager } = message.client.botUtils

  // Check current status
  const taskStatus = taskManager.getTaskStatus(taskId)

  // If task doesn't exist, show error
  if (!taskStatus) {
    return message.reply(`${taskId} task not found.`)
  }

  // If already enabled, disable first
  if (taskStatus.enabled) {
    taskManager.setTaskEnabled(taskId, false)
  }

  // Use setTimeout to ensure the disable has time to take effect
  setTimeout(() => {
    taskManager.setTaskEnabled(taskId, true)

    // Get updated task status for embed
    const updatedStatus = taskManager.getTaskStatus(taskId)

    // Add force info if specified
    const result = force ? `${resultMessage} (force mode)` : resultMessage

    // Create and send response
    const embed = createCommandResponse({
      commandName: taskId,
      action: 'restart',
      result,
      taskStatus: updatedStatus,
    })

    message.reply({ embeds: [embed] })
  }, 100)
}

// ===================================
// Command Help Helpers
// ===================================

/**
 * Creates a help embed for a command
 * @param {Object} command - Command object
 * @param {string} invalidOption - Optional invalid option
 * @returns {EmbedBuilder} - Help embed
 */
function createCommandHelp(command, invalidOption = null) {
  // Get emoji for this command
  const emoji = getStatusEmoji(command.name)

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Command: !${command.name}`)
    .setColor(invalidOption ? '#ff3333' : '#0099ff')

  // If an invalid option was provided, add a note about it
  if (invalidOption) {
    embed.setDescription(`❌ Invalid option: "${invalidOption}"\n\n${command.description}`)
  } else {
    embed.setDescription(command.description)
  }

  // Add usage information
  embed.addFields({
    name: '📝 Usage',
    value: command.usage || `!${command.name}`,
  })

  return embed
}

/**
 * Generates and sends a help message for unknown commands
 * @param {Object} message - Discord message object
 * @param {String} unknownCommand - The unknown command that was entered
 * @param {Map} commandsMap - Map of available commands
 */
function handleUnknownCommand(message, unknownCommand, commandsMap) {
  // Create embed with error styling
  const embed = new EmbedBuilder()
    .setTitle('Unknown Command')
    .setColor('#ff3333')
    .setDescription(`The command \`!${unknownCommand}\` was not recognized.`)

  // Add available commands section
  const availableCommands = Array.from(commandsMap.keys())
    .map((cmd) => {
      const emoji = getStatusEmoji(cmd)
      return `${emoji} \`!${cmd}\``
    })
    .join(', ')

  embed.addFields({
    name: 'Available Commands',
    value: availableCommands,
  })

  // Add help instruction
  embed.addFields({
    name: 'Need Help?',
    value:
      'Type `!help` for a list of commands with descriptions, or `!help <command>` for detailed information about a specific command.',
  })

  message.reply({ embeds: [embed] })
}

/**
 * Load all command modules from a directory
 * @param {string} commandsPath - Path to commands directory
 * @returns {Map} - Map of command name to command object
 */
function loadCommands(commandsPath) {
  const fs = require('fs')
  const path = require('path')
  const commands = new Map()

  try {
    // Get all JS files in the directory
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

    // Load each command
    for (const file of commandFiles) {
      try {
        const command = require(path.join(commandsPath, file))
        commands.set(command.name, command)
      } catch (error) {
        console.error(`Error loading command file ${file}:`, error)
      }
    }

    console.log(`Loaded ${commands.size} commands`)
  } catch (error) {
    console.error('Error loading commands:', error)
  }

  return commands
}

/**
 * Find the appropriate command based on input, resolving aliases
 * @param {Map} commands - Map of available commands
 * @param {string} input - The command name or alias input by user
 * @returns {Object|null} - The found command or null
 */
function resolveCommand(commands, input) {
  const commandAliases = config.discord.commandAliases || {}

  // First check if it's a direct command name
  if (commands.has(input)) {
    return commands.get(input)
  }

  // Then check if it's an alias
  const resolvedName = commandAliases[input]
  if (resolvedName && commands.has(resolvedName)) {
    return commands.get(resolvedName)
  }

  return null
}

// ===================================
// Command Processing Helpers
// ===================================

/**
 * Process command with standard pattern
 * @param {Object} message - Discord message
 * @param {Array} args - Command arguments
 * @param {Object} options - Command options
 */
function processCommand(message, args, options) {
  const { name, handlers, description } = options

  // Handle no arguments
  if (args.length === 0) {
    return handlers.showHelp
      ? handlers.showHelp(message)
      : message.reply(`${description}\nUse !help ${name} for more information.`)
  }

  // Get subcommand and resolve aliases
  const subcommand = args[0].toLowerCase()
  const { subcommandAliases } = config.discord
  const resolvedSubcommand = subcommandAliases[subcommand] || subcommand

  // Execute handler if it exists
  if (handlers[resolvedSubcommand]) {
    return handlers[resolvedSubcommand](message, args)
  }

  // Unknown subcommand
  return handlers.showHelp
    ? handlers.showHelp(message, `Unknown option: "${subcommand}"`)
    : message.reply(`Unknown option: "${subcommand}"\nUse !help ${name} for more information.`)
}

/**
 * Create standard handler functions for a task command
 * @param {string} taskId - Task ID
 * @returns {Object} - Standard handlers
 */
function createStandardHandlers(taskId) {
  return {
    on: (message) => enableTask(message, taskId),

    off: (message, args) => {
      const forceOff = args[1]?.toLowerCase() === 'f' || args[1]?.toLowerCase() === 'force'
      disableTask(message, taskId, { force: forceOff })
    },

    restart: (message, args) => {
      const forceRestart = args[1]?.toLowerCase() === 'f' || args[1]?.toLowerCase() === 'force'
      restartTask(message, taskId, {
        force: forceRestart,
        resultMessage: `${taskId} has been restarted`,
      })
    },

    schedule: (message, args) => {
      if (args[1] && !isNaN(args[1])) {
        const minutes = parseInt(args[1])
        setTaskNextRun(message, taskId, minutes)
      } else {
        message.reply(`Please provide a valid time in minutes. Usage: !${taskId} schedule <minutes>`)
      }
    },

    interval: (message, args) => {
      handleInterval(message, taskId, args)
    },
  }
}

// Export all helper functions
module.exports = {
  // Emoji & formatting helpers
  getStatusEmoji,
  formatTimeRemaining,
  formatTime,
  formatDiscordTimestamp,
  createAliasDisplayMap,

  // Response creation
  createCommandResponse,
  createErrorResponse,
  createStatusEmbed,
  formatTaskStatusField,
  createCommandHelp,

  // Task actions
  enableTask,
  disableTask,
  setTaskNextRun,
  setTaskInterval,
  handleInterval,
  restartTask,

  // Command processing
  processCommand,
  createStandardHandlers,

  // Command management
  handleUnknownCommand,
  loadCommands,
  resolveCommand,
}
