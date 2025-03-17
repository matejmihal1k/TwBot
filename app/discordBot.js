/**
 * Discord Bot for Game Automation Control
 * Provides remote command interface for the automation system
 */
const { Client, GatewayIntentBits } = require('discord.js')
const fs = require('fs')
const path = require('path')
const config = require('../config.json')
const taskManager = require('./taskManager')

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
})

// Global state
let isRunning = false
const commands = new Map()
let defaultChannel = null // Cache for default channel

/**
 * Save config to file
 */
function saveConfig() {
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'config.json'), JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Error saving config:', error)
  }
}

/**
 * Load commands from directory
 */
function loadCommands() {
  try {
    const commandsDir = path.join(__dirname, 'commands')
    fs.readdirSync(commandsDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => {
        const command = require(path.join(commandsDir, file))
        commands.set(command.name, command)
      })
    console.log(`Loaded ${commands.size} Discord commands`)
  } catch (error) {
    console.error('Error loading commands:', error)
    process.exit(1)
  }
}

/**
 * Check if user is authorized
 */
function isAuthorized(userId) {
  return config.discord.allowedUserIds.includes(userId)
}

/**
 * Resolve command name using aliases
 * @param {string} commandName - The command name to resolve
 * @returns {string} - The resolved command name
 */
function resolveCommandAlias(commandName) {
  // Get command aliases from config
  const aliases = config.discord.commandAliases || {}
  return aliases[commandName] || commandName
}

/**
 * Handle incoming message
 */
function handleMessage(message) {
  // Ignore messages from bot
  if (message.author.bot) return

  // For non-DM messages, check for command prefix
  const isDM = message.channel.type === 'DM'
  if (!isDM && !message.content.startsWith(config.discord.commandPrefix)) return

  // Check authorization
  if (!isAuthorized(message.author.id)) return

  // Parse command
  const content = isDM ? message.content : message.content.slice(config.discord.commandPrefix.length)
  const [commandName, ...args] = content.trim().split(/ +/)

  // Resolve command alias
  const resolvedCommandName = resolveCommandAlias(commandName.toLowerCase())

  // Handle paused state - only allow resume and status when paused
  if (!isRunning && !['resume', 'status'].includes(resolvedCommandName)) {
    return message.reply('Bot is paused. Use !resume or !r to resume or !status (!s) to check status.')
  }

  // Execute command
  const command = commands.get(resolvedCommandName)
  if (!command) return message.reply('Unknown command. Type !help or !h for a list of commands.')

  try {
    command.execute(message, args, {
      client,
      isRunning,
      config,
      taskManager,

      // State control
      setRunning: (value) => {
        isRunning = value
      },

      // Feature control with config persistence
      setFeatureEnabled: (feature, value) => {
        if (!config.features[feature]) return false

        config.features[feature].enabled = value
        saveConfig()
        taskManager.setTaskEnabled(feature, value)
        return true
      },

      setBalanceInterval: (minutes) => {
        config.features.balance.interval = minutes
        saveConfig()
        taskManager.setBalanceInterval(minutes)
        return true
      },
    })
  } catch (error) {
    console.error('Command error:', error)
    message.reply('Error executing command!')
  }
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
 * Initialize and start the bot
 */
function startBot() {
  // Load commands
  loadCommands()

  // Setup event handlers
  client.once('ready', () => {
    console.log(`Discord bot logged in as ${client.user.tag}`)
    isRunning = true
  })

  client.on('messageCreate', handleMessage)

  // Handle connection errors
  client.on('error', (error) => {
    console.error('Discord client error:', error)
  })

  client.on('disconnect', (event) => {
    console.warn('Discord bot disconnected:', event)
    // Try to reconnect if it was a network issue
    if (event.code !== 1000) {
      setTimeout(() => client.login(config.discord.token), 5000)
    }
  })

  // Start bot
  client.login(config.discord.token).catch((err) => {
    console.error('Discord login failed:', err)
    process.exit(1)
  })
}

// Start the bot
startBot()

// Export interface - include everything needed by other modules
module.exports = {
  isRunning: () => isRunning,
  setRunning: (value) => {
    isRunning = value
  },
  getClient: () => client,
  getDefaultChannel,
  getCommands: () => commands,
  resolveCommandAlias,
}
