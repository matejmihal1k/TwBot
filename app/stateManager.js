/**
 * stateManager.js
 * Central state management for the application
 */
const fs = require('fs')
const path = require('path')

// Config file path
const CONFIG_PATH = path.join(__dirname, '..', 'config.json')

// Runtime state (values that don't persist to config)
const runtime = {
  isRunning: false,
  pauseEndTime: null,
  commands: new Map(),
  currentlyExecuting: false,
}

/**
 * Load config from file
 * @returns {Object} The config object
 */
function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(configData)
  } catch (error) {
    console.error('Error loading config:', error)
    process.exit(1)
  }
}

/**
 * Save config to file
 * @param {Object} [configToSave] - Optional config object to save, otherwise uses current config
 * @returns {boolean} Success or failure
 */
function saveConfig(configToSave) {
  try {
    const config = configToSave || loadConfig()
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
    return true
  } catch (error) {
    console.error('Error saving config:', error)
    return false
  }
}

/**
 * Load commands from directory
 * @param {string} commandsPath - Path to commands directory
 * @returns {Map} Map of commands
 */
function loadCommands(commandsPath) {
  try {
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

    for (const file of commandFiles) {
      try {
        const command = require(path.join(commandsPath, file))
        runtime.commands.set(command.name, command)
      } catch (error) {
        console.error(`Error loading command file ${file}:`, error)
      }
    }

    console.log(`Loaded ${runtime.commands.size} commands`)
    return runtime.commands
  } catch (error) {
    console.error('Error loading commands:', error)
    process.exit(1)
  }
}

// Bot state management
function isRunning() {
  return runtime.isRunning
}
function setRunning(value) {
  runtime.isRunning = value
}

// Pause management
function getPauseEndTime() {
  return runtime.pauseEndTime
}
function setPauseEndTime(time) {
  runtime.pauseEndTime = time
}

// Command management
function getCommands() {
  return runtime.commands
}
function getCommand(name) {
  return runtime.commands.get(name)
}

/**
 * Resolve command alias to command name
 * @param {string} alias - Command alias to resolve
 * @returns {string} Resolved command name
 */
function resolveCommandAlias(alias) {
  const config = loadConfig()
  const aliases = config.discord.commandAliases || {}
  return aliases[alias] || alias
}

/**
 * Set a task's enabled state
 * @param {string} taskId - The task ID
 * @param {boolean} enabled - Enabled state
 * @returns {boolean} Success
 */
function setTaskEnabled(taskId, enabled) {
  const config = loadConfig()
  if (!config.features[taskId]) return false

  config.features[taskId].enabled = enabled
  saveConfig(config)
  return true
}

/**
 * Set a task's interval
 * @param {string} taskId - The task ID
 * @param {number} minutes - Interval in minutes
 * @returns {boolean} Success
 */
function setTaskInterval(taskId, minutes) {
  const config = loadConfig()
  if (!config.features[taskId]) return false

  config.features[taskId].interval = minutes
  saveConfig(config)
  return true
}

/**
 * Update task timing (nextRun, lastRun)
 * @param {string} taskId - The task ID
 * @param {Object} timing - Timing data to update
 * @returns {boolean} Success
 */
function updateTaskTiming(taskId, timing) {
  const config = loadConfig()
  if (!config.features[taskId]) return false

  if (timing.nextRun !== undefined) {
    config.features[taskId].nextRun = timing.nextRun
  }

  if (timing.lastRun !== undefined) {
    config.features[taskId].lastRun = timing.lastRun
  }

  saveConfig(config)
  return true
}

module.exports = {
  loadConfig,
  saveConfig,
  loadCommands,
  isRunning,
  setRunning,
  getPauseEndTime,
  setPauseEndTime,
  getCommands,
  getCommand,
  resolveCommandAlias,
  setTaskEnabled,
  setTaskInterval,
  updateTaskTiming,
}
