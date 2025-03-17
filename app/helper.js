/**
 * Helper functions for the Discord bot and task manager
 */
const { EmbedBuilder } = require('discord.js')
const config = require('../config.json')

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

/**
 * Generate help for a command
 * @param {Object} command - The command object
 * @param {Object} message - Discord message object
 * @param {string} [invalidOption] - Optional invalid option to highlight
 */
function generateCommandHelp(command, message, invalidOption = null) {
  // Get subcommand aliases
  const subcommandAliases = config.discord.subcommandAliases || {}
  const aliasDisplay = createAliasDisplayMap(subcommandAliases)

  // Get command aliases
  const commandAliases = config.discord.commandAliases || {}
  const thisCommandAliases = Object.entries(commandAliases)
    .filter(([_, cmdName]) => cmdName === command.name)
    .map(([alias]) => `!${alias}`)
    .join(', ')

  const embed = new EmbedBuilder()
    .setTitle(`${command.name.charAt(0).toUpperCase() + command.name.slice(1)} Command`)
    .setColor(invalidOption ? '#ff3333' : '#0099ff')
    .setDescription(command.extDescription || command.description)

  // Add error message if an invalid option was provided
  if (invalidOption) {
    embed.addFields({
      name: '❌ Error',
      value: `Invalid option: "${invalidOption}"`,
    })
  }

  // Add command aliases if there are any
  if (thisCommandAliases) {
    embed.addFields({
      name: 'Aliases',
      value: thisCommandAliases,
    })
  }

  // Add available options
  if (command.options && command.options.length > 0) {
    embed.addFields({
      name: 'Available Options',
      value: command.options
        .map((opt) => {
          const aliasText = aliasDisplay[opt.name] ? ` (alias: ${aliasDisplay[opt.name]})` : ''
          const argsText = opt.args ? ` ${opt.args.join(' ')}` : ''
          return `**${opt.name}${argsText}**${aliasText} - ${opt.description}`
        })
        .join('\n'),
    })
  }

  // Add usage examples
  if (command.helpExamples && command.helpExamples.length > 0) {
    embed.addFields({
      name: 'Examples',
      value: command.helpExamples.join('\n'),
    })
  }

  message.reply({ embeds: [embed] })
}

module.exports = {
  formatTimeRemaining,
  formatTime,
  createAliasDisplayMap,
  generateCommandHelp,
}
