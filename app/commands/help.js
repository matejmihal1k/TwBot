/**
 * Help Command
 * Shows the list of available commands
 */
const { EmbedBuilder } = require('discord.js')
const fs = require('fs')
const path = require('path')
const config = require('../../config.json')
const { getStatusEmoji, processCommand } = require('../helper')

module.exports = {
  name: 'help',
  description: 'Shows the list of available commands',
  usage: '!help [command]',

  // Command-specific text for help
  optionsText: `• No options - Show all available commands
• \`<command>\` - Get detailed help for a specific command`,

  examplesText: `• \`!help\` - Show all available commands
• \`!help farm\` - Get detailed help for the farm command
• \`!help balance\` - Get detailed help for the balance command
• \`!help status\` - Get detailed help for the status command`,

  execute(message, args) {
    // Create custom handlers
    const handlers = {
      // Default handler when no arguments given (show all commands)
      default: (message) => this.showGeneralHelp(message),

      // Custom handler for showing specific command help
      showHelp: (message, errorMessage = null) => {
        if (errorMessage) {
          message.reply(`${errorMessage} Here are the available commands:`)
          return this.showGeneralHelp(message)
        }

        const embed = new EmbedBuilder()
          .setTitle('📚 Help Command')
          .setColor('#0099ff')
          .setDescription('Shows information about available commands')
          .addFields({
            name: '📝 Usage',
            value: this.usage,
          })
          .addFields({
            name: '⚙️ Options',
            value: this.optionsText,
          })
          .addFields({
            name: '📋 Examples',
            value: this.examplesText,
          })

        message.reply({ embeds: [embed] })
      },
    }

    // If we have a command name, show specific help
    if (args.length > 0) {
      const commandName = args[0].toLowerCase()
      return this.handleSpecificCommand(message, commandName)
    }

    // Otherwise use processCommand with our custom handlers
    return processCommand(message, args, {
      name: 'help',
      description: this.description,
      handlers,
      defaultAction: 'default', // specify which handler to use for empty args
    })
  },

  // Handle specific command help request
  handleSpecificCommand(message, requestedCommandOrAlias) {
    // Get command aliases from config
    const commandAliases = config.discord.commandAliases || {}

    // Get commands path and files
    const commandsPath = path.join(__dirname)
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

    // Resolve the command name if it's an alias
    const resolvedCommandName = commandAliases[requestedCommandOrAlias] || requestedCommandOrAlias

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
      return this.showCommandHelp(message, command)
    }

    // Command not found - show error message with general help
    message.reply(`Command "${requestedCommandOrAlias}" not found. Here are the available commands:`)
    return this.showGeneralHelp(message)
  },

  // Show general help with list of all commands
  showGeneralHelp(message) {
    // Get command aliases from config
    const commandAliases = config.discord.commandAliases || {}

    // Get commands path and files
    const commandsPath = path.join(__dirname)
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

    const helpEmbed = new EmbedBuilder()
      .setTitle('🤖 Bot Commands')
      .setColor('#0099ff')
      .setDescription('Here are the available commands:')

    // Load each command and add to the help embed
    commandFiles.forEach((file) => {
      try {
        const command = require(path.join(commandsPath, file))

        // Get emoji for this command
        const emoji = getStatusEmoji(command.name)

        let commandName = `${emoji} !${command.name}`

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
      name: '📚 Getting Detailed Help',
      value: 'Use `!help <command>` to get detailed information about a specific command, e.g., `!help farm`',
    })

    message.reply({ embeds: [helpEmbed] })
  },

  // Show help for a specific command
  showCommandHelp(message, command) {
    // If command has a showHelp method, use it
    if (command.showHelp) {
      return command.showHelp(message)
    }

    // Otherwise fallback to standard help display
    const emoji = getStatusEmoji(command.name)

    const commandHelpEmbed = new EmbedBuilder()
      .setTitle(`${emoji} Command: !${command.name}`)
      .setColor('#0099ff')
      .setDescription(command.description)

    // Add usage information
    commandHelpEmbed.addFields({
      name: '📝 Usage',
      value: command.usage || `!${command.name}`,
    })

    // Add options if available (new format)
    if (command.optionsText) {
      commandHelpEmbed.addFields({
        name: '⚙️ Options',
        value: command.optionsText,
      })
    }

    // Add examples if available (new format)
    if (command.examplesText) {
      commandHelpEmbed.addFields({
        name: '📋 Examples',
        value: command.examplesText,
      })
    }

    message.reply({ embeds: [commandHelpEmbed] })
  },
}
