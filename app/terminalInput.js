/**
 * Terminal Input Handler
 * Provides command line interface for the Discord bot
 */
const readline = require('readline')
const discordBot = require('./discordBot')

// ANSI control sequences
const ANSI = {
  SAVE_CURSOR: '\x1B[s',
  RESTORE_CURSOR: '\x1B[u',
  CLEAR_LINE: '\x1B[2K',
}

/**
 * Setup terminal input handling with readline
 * @param {Function} handleMessageFunction - Discord message handler function
 * @returns {readline.Interface} - The readline interface
 */
function setupTerminalInput(handleMessageFunction) {
  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Command> ',
  })

  // Initial instructions
  console.log('\n--------------------------------------------------')
  console.log('Type commands with or without the ! prefix (e.g., "status" or "!status")')
  rl.prompt()

  // Handle command input
  rl.on('line', (input) => {
    const command = input.trim()

    // Skip empty commands
    if (!command) {
      rl.prompt()
      return
    }

    try {
      // Clear the current line for cleaner output
      process.stdout.write(ANSI.SAVE_CURSOR + ANSI.CLEAR_LINE)

      // Ensure command has prefix
      const prefixedCommand = command.startsWith('!') ? command : `!${command}`

      console.log(`Executing: ${command}`)

      // Create a mock message object for Discord handler
      const mockMessage = createMockMessage(prefixedCommand)

      // Process the command
      handleMessageFunction(mockMessage)
    } catch (error) {
      console.error('Error processing command:', error)
    }

    // Restore prompt
    process.stdout.write(ANSI.RESTORE_CURSOR)
    rl.prompt()
  })

  // Handle CTRL+C and other termination
  rl.on('close', () => {
    console.log('\nTerminal session ended')
    process.exit(0)
  })

  return rl
}

/**
 * Create a mock Discord message object from terminal input
 * @param {string} command - The command text (with prefix)
 * @returns {Object} A mock Discord message object
 */
/**
 * Create a mock Discord message object from terminal input
 * @param {string} command - The command text (with prefix)
 * @returns {Object} A mock Discord message object
 */
function createMockMessage(command) {
  return {
    author: {
      id: 'TERMINAL_USER',
      bot: false,
      username: 'Terminal',
    },
    channel: {
      type: 'DM',
      send: (content) => {
        console.log(`\n[Bot]: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
        return Promise.resolve({ content })
      },
    },
    // CRITICAL FIX: Make sure botUtils is correctly attached to client
    client: {
      botUtils: discordBot.botUtils,
    },
    content: command,
    reply: (content) => {
      if (typeof content === 'string') {
        console.log(`\n[Response]: ${content}`)
      } else if (content.embeds) {
        const embed = content.embeds[0]?.data
        console.log(`\n[Response]: ${embed?.title || 'Command executed'}`)

        if (embed?.description) {
          console.log(embed.description)
        }

        if (embed?.fields?.length) {
          embed.fields.forEach((field) => {
            console.log(`${field.name}: ${field.value}`)
          })
        }
      }
      return Promise.resolve({ content })
    },
  }
}

module.exports = { setupTerminalInput }
