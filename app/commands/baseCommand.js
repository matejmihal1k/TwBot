/**
 * Base command factory for creating commands with common structure
 */
const config = require('../../config.json')
const { generateCommandHelp } = require('../helper')

/**
 * Creates a command with standardized handling for subcommands
 * @param {Object} commandData - Command metadata and handlers
 * @returns {Object} - A command object
 */
function createCommand(commandData) {
  const {
    name,
    description,
    extDescription,
    usage,
    options,
    examples,
    helpExamples,
    handlers, // Map of subcommand names to handler functions
    defaultHandler, // Optional custom default handler
  } = commandData

  return {
    name,
    description,
    extDescription,
    usage,
    options,
    examples,
    helpExamples,

    execute(message, args) {
      // Get universal subcommand aliases from config
      const subcommandAliases = config.discord.subcommandAliases

      // If no arguments, show help
      if (args.length === 0) {
        return generateCommandHelp(this, message)
      }

      const userSubcommand = args[0].toLowerCase()
      const subcommand = subcommandAliases?.[userSubcommand] || userSubcommand

      // If we have a handler for this subcommand, call it
      if (handlers[subcommand]) {
        return handlers[subcommand](message, args, {
          commandName: name,
          subcommand,
          userSubcommand,
        })
      }

      // If a custom default handler was provided, use it
      if (defaultHandler) {
        return defaultHandler(message, args, {
          commandName: name,
          subcommand,
          userSubcommand,
        })
      }

      // Default behavior: show help with invalid option
      generateCommandHelp(this, message, userSubcommand)
    },
  }
}

module.exports = { createCommand }
