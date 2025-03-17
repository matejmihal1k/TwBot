/**
 * Discord Bot for Game Automation Control
 * Provides remote command interface for the automation system
 */
const { Client, GatewayIntentBits } = require('discord.js')
const fs = require('fs')
const path = require('path')
const config = require('./config.json')
const taskManager = require('./taskManager')

// Command aliases/shortcuts
const COMMAND_ALIASES = {
  f: 'farm',
  b: 'balance',
  t: 'train',
  s: 'status',
  r: 'resume',
  p: 'pause',
  h: 'help',
}

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

/**
 * Save config to file
 */
const saveConfig = () => {
  try {
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2))
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
    console.log(`Loaded ${commands.size} commands`)
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
 * Handle incoming message
 */
function handleMessage(message) {
  // Ignore irrelevant messages
  if (message.author.bot || !isAuthorized(message.author.id)) return

  const isDM = message.channel.type === 'DM'
  if (!isDM && !message.content.startsWith(config.discord.commandPrefix)) return

  // Parse command
  const content = isDM ? message.content : message.content.slice(config.discord.commandPrefix.length)
  const [commandName, ...args] = content.trim().split(/ +/)

  // Resolve command alias
  const resolvedCommandName = COMMAND_ALIASES[commandName.toLowerCase()] || commandName.toLowerCase()

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

// Export interface
module.exports = {
  isRunning: () => isRunning,
  farm: () => config.features.farm.enabled,
  balance: () => config.features.balance.enabled,
  train: () => config.features.train.enabled,
  setRunning: (value) => {
    isRunning = value
  },
}
