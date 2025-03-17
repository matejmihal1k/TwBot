const { EmbedBuilder } = require('discord.js')
const fs = require('fs')
const path = require('path')
const config = require('../../config.json')
const { generateCommandHelp } = require('../helper')

module.exports = {
  name: 'help',
  description: 'Shows the list of available commands',
  extDescription:
    'Displays information about available commands. Use `!help <command>` to get detailed information about a specific command.',
  usage: '!help, !help <command>',
  options: [{ name: '<command>', description: 'Get detailed help for a specific command' }],
  helpExamples: ['!help', '!help farm', '!help balance', '!h status'],

  execute(message, args) {
    // Get command aliases directly from config
    const commandAliases = config.discord.commandAliases

    // Get all command files directly from the filesystem
    const commandsPath = path.join(__dirname)
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

    // If no specific command was requested, show general help
    if (args.length === 0) {
      return showGeneralHelp(message, commandFiles, commandAliases)
    }

    // If a specific command was requested
    const requestedCommandOrAlias = args[0].toLowerCase()

    // Resolve the command name if it's an alias
    const resolvedCommandName = commandAliases?.[requestedCommandOrAlias] || requestedCommandOrAlias

    // Try to find the command file matching the resolved name
    const commandFile = commandFiles.find((file) => {
      try {
        const cmd = require(path.join(commandsPath, file))
        return cmd.name === resolvedCommandName
      } catch (err) {
        return false
      }
    })

    // If command found, show its help
    if (commandFile) {
      const command = require(path.join(commandsPath, commandFile))
      return generateCommandHelp(command, message)
    }

    // Command not found - show error message with general help
    return showGeneralHelp(message, commandFiles, commandAliases)
  },
}

/**
 * Shows the general help with a list of all commands
 * @param {Object} message - Discord message object
 * @param {Array} commandFiles - Array of command file names
 * @param {Object} commandAliases - Command aliases map
 */
function showGeneralHelp(message, commandFiles, commandAliases) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('Bot Commands')
    .setColor('#0099ff')
    .setDescription('Here are the available commands:')

  // Load each command and add to the help embed
  commandFiles.forEach((file) => {
    try {
      const command = require(path.join(__dirname, file))
      let commandName = `!${command.name}`

      // Find aliases for this command
      const aliases = Object.entries(commandAliases || {})
        .filter(([_, cmd]) => cmd === command.name)
        .map(([alias]) => alias)

      if (aliases.length > 0) {
        commandName += ` (Aliases: ${aliases.map((a) => `!${a}`).join(', ')})`
      }

      helpEmbed.addFields({
        name: commandName,
        value: command.description || 'No description available',
      })
    } catch (error) {
      console.error(`Error loading command file ${file}:`, error)
    }
  })

  // Add usage example for help command itself
  helpEmbed.addFields({
    name: 'Getting Detailed Help',
    value: 'Use `!help <command>` to get detailed information about a specific command, e.g., `!help farm`',
  })

  message.reply({ embeds: [helpEmbed] })
}
