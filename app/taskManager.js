/**
 * Helper functions for the Discord bot and task manager
 * Provides utilities for formatting, emoji display, command execution, and response creation
 */
const { EmbedBuilder } = require('discord.js')
const stateManager = require('./stateManager')

// [Keep all the existing emoji & formatting helpers]

// [Keep all the existing command response helpers]

// [Keep all the existing task action helpers with minor modifications]

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
 * Find the appropriate command based on input, resolving aliases
 * @param {Map} commands - Map of available commands
 * @param {string} input - The command name or alias input by user
 * @returns {Object|null} - The found command or null
 */
function resolveCommand(commands, input) {
  // Use stateManager to resolve the command
  const resolvedName = stateManager.resolveCommandAlias(input)
  return commands.get(resolvedName) || null
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
  const config = stateManager.loadConfig()
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

// Export all helper functions - remove loadCommands from the exports
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
  resolveCommand,
}
