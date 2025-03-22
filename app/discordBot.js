/**
 * Discord Bot for Game Automation Control
 * Provides remote command interface for the automation system
 */
const { Client, GatewayIntentBits } = require('discord.js')
const path = require('path')
const stateManager = require('./stateManager')
const taskManager = require('./taskManager')
const { handleUnknownCommand, createErrorResponse, createCommandResponse, getStatusEmoji } = require('./helper')

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
})

// Cache for default channel
let defaultChannel = null

// Create a botUtils object that exposes state management functionality
const botUtils = {
  get isRunning() {
    return stateManager.isRunning()
  },
  taskManager,
  setRunning: (value) => {
    stateManager.setRunning(value)
  },

  // Feature control with config persistence
  setFeatureEnabled: (feature, value) => {
    const result = stateManager.setTaskEnabled(feature, value)
    if (result) {
      taskManager.setTaskEnabled(feature, value)
    }
    return result
  },

  setBalanceInterval: (minutes) => {
    const result = stateManager.setTaskInterval('balance', minutes)
    if (result) {
      taskManager.setTaskInterval('balance', minutes)
    }
    return result
  },
}

/**
 * Handle incoming message
 */
function handleMessage(message) {
  // Ignore messages from bot
  if (message.author.bot) return

  // For non-DM messages, check for command prefix
  const config = stateManager.loadConfig()
  const isDM = message.channel.type === 'DM'
  if (!isDM && !message.content.startsWith(config.discord.commandPrefix)) return

  // Check authorization
  if (!isAuthorized(message.author.id)) {
    console.log(`Unauthorized user ${message.author.tag} (${message.author.id}) attempted to use command`)
    return
  }

  // Parse command
  const content = isDM ? message.content : message.content.slice(config.discord.commandPrefix.length)
  const [commandName, ...args] = content.trim().split(/ +/)

  // Resolve command alias
  const resolvedCommandName = stateManager.resolveCommandAlias(commandName.toLowerCase())

  // Handle paused state - only allow resume and status when paused
  if (!stateManager.isRunning() && !['resume', 'status', 'help'].includes(resolvedCommandName)) {
    const pauseErrorEmbed = createErrorResponse({
      title: 'Bot Paused',
      message: 'Bot is currently paused and not accepting commands.',
      suggestion: 'Use !resume or !r to resume or !status (!s) to check status.',
    })
    return message.reply({ embeds: [pauseErrorEmbed] })
  }

  // Execute command
  const commands = stateManager.getCommands()
  const command = commands.get(resolvedCommandName)
  if (!command) {
    return handleUnknownCommand(message, commandName, commands)
  }

  try {
    // Attach botUtils to message.client
    message.client.botUtils = botUtils

    // Execute the command with context
    command.execute(message, args)
  } catch (error) {
    console.error('Command error:', error)
    const errorEmbed = createErrorResponse({
      title: 'Command Error',
      message: 'An error occurred while executing this command.',
      command: resolvedCommandName,
      suggestion: 'Please try again or contact an administrator if the issue persists.',
    })
    message.reply({ embeds: [errorEmbed] })
  }
}

/**
 * Check if user is authorized
 */
function isAuthorized(userId) {
  const config = stateManager.loadConfig()
  return config.discord.allowedUserIds.includes(userId)
}

/**
 * Get default notification channel (with caching)
 */
function getDefaultChannel() {
  // Return cached channel if available and valid
  if (defaultChannel && client.channels.cache.has(defaultChannel.id)) {
    return defaultChannel
  }

  if (!client || !client.channels || client.channels.cache.size === 0) {
    return null
  }

  // Try to find an appropriate channel
  defaultChannel =
    client.channels.cache.find((c) => c.type === 0 && (c.name.includes('bot') || c.name.includes('command'))) ||
    client.channels.cache.find((c) => c.type === 0)

  return defaultChannel
}

/**
 * Send a notification to the default channel
 * @param {string} message - The message to send
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} - Success or failure
 */
async function sendNotification(message, options = {}) {
  const { title = 'Notification', emoji = 'success', color = '#0099ff' } = options
  const channel = getDefaultChannel()

  if (!channel) {
    console.error('No channel available for notification')
    return false
  }

  try {
    const embed = createCommandResponse({
      commandName: 'system',
      action: emoji,
      result: message,
      color,
    })

    await channel.send({ embeds: [embed] })
    return true
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

/**
 * Initialize and start the bot
 */
async function startBot() {
  // Load commands
  const commandsPath = path.join(__dirname, 'commands')
  stateManager.loadCommands(commandsPath)

  // Setup event handlers
  client.once('ready', () => {
    console.log(`Discord bot logged in as ${client.user.tag}`)
    stateManager.setRunning(true)

    // Send startup notification
    const startTime = new Date().toLocaleTimeString()
    sendNotification(`Bot started at ${startTime}`, {
      title: 'Bot Started',
      emoji: 'success',
    })
  })

  client.on('messageCreate', handleMessage)

  // Handle connection errors
  client.on('error', (error) => {
    console.error('Discord client error:', error)
    sendNotification(`Discord client error: ${error.message}`, {
      title: 'Connection Error',
      emoji: 'error',
      color: '#ff3333',
    })
  })

  client.on('disconnect', (event) => {
    console.warn('Discord bot disconnected:', event)

    // Try to reconnect if it was a network issue
    if (event.code !== 1000) {
      sendNotification('Bot disconnected, attempting to reconnect...', {
        title: 'Disconnected',
        emoji: 'warning',
        color: '#FFA500',
      })

      setTimeout(() => {
        const config = stateManager.loadConfig()
        client.login(config.discord.token)
      }, 5000)
    }
  })

  // Start bot
  try {
    const config = stateManager.loadConfig()
    await client.login(config.discord.token)
    console.log('Login successful')
  } catch (err) {
    console.error('Discord login failed:', err)
    process.exit(1)
  }
}

// Start the bot
startBot().catch((err) => {
  console.error('Fatal error starting bot:', err)
  process.exit(1)
})

// Export interface - include everything needed by other modules
module.exports = {
  isRunning: stateManager.isRunning,
  setRunning: stateManager.setRunning,
  getClient: () => client,
  getDefaultChannel,
  getCommands: stateManager.getCommands,
  resolveCommandAlias: stateManager.resolveCommandAlias,
  sendNotification,
  botUtils,
}
