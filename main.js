/**
 * Game Automation Terminal UI
 * A clean terminal interface for controlling the discord bot and automation tasks
 */
const discordBot = require('./app/discordBot')
const taskManager = require('./app/taskManager')
const { formatTimeRemaining, formatTime } = require('./app/helper')
const config = require('./config.json')

// ================================
// Constants and Configuration
// ================================

// Update frequency (in milliseconds)
const UPDATE_INTERVAL_MS = 1000

// ANSI escape sequences for terminal control
const ANSI = {
  CLEAR_SCREEN: '\x1B[2J',
  MOVE_TO_TOP: '\x1B[H',
  MOVE_TO_LINE: (line) => `\x1B[${line};0H`,
  CLEAR_LINE: '\x1B[2K',
  HIDE_CURSOR: '\x1B[?25l',
  SHOW_CURSOR: '\x1B[?25h',
}

const SEPARATOR = '--------------------------------------------------'

// ================================
// Global State
// ================================

// Display state
let messageLog = []
let statusHeight = 0
let inputBuffer = ''

// Original console methods (preserved for internal logging)
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
}

// Flag to prevent recursive logging
let isLoggingInternally = false

// ================================
// Logging System
// ================================

/**
 * Override console methods to capture all output to our UI
 */
function setupConsoleCapture() {
  console.log = function () {
    if (isLoggingInternally) return originalConsole.log.apply(console, arguments)
    addToLog(Array.from(arguments).join(' '))
  }

  console.error = function () {
    if (isLoggingInternally) return originalConsole.error.apply(console, arguments)
    addToLog(`ERROR: ${Array.from(arguments).join(' ')}`)
  }

  console.warn = function () {
    if (isLoggingInternally) return originalConsole.warn.apply(console, arguments)
    addToLog(`WARNING: ${Array.from(arguments).join(' ')}`)
  }
}

/**
 * Add a timestamped message to the log
 */
function addToLog(message) {
  const timestamp = new Date().toLocaleTimeString()
  messageLog.unshift(`[${timestamp}] ${message}`)

  // Trim log to fit available space
  const termHeight = getTerminalHeight()
  const maxLines = termHeight - statusHeight - 3 // separators and command line

  if (messageLog.length > maxLines) {
    messageLog = messageLog.slice(0, maxLines)
  }

  // Update display
  updateLogArea()
}

/**
 * Public logging function for other modules
 */
function logMessage(message) {
  addToLog(message)
}

// ================================
// Terminal UI Drawing Functions
// ================================

/**
 * Get current terminal height
 */
function getTerminalHeight() {
  return process.stdout.rows || 24
}

/**
 * Draw text at a specific line
 */
function drawLine(line, text = '') {
  process.stdout.write(ANSI.MOVE_TO_LINE(line))
  process.stdout.write(ANSI.CLEAR_LINE)
  process.stdout.write(text)
}

/**
 * Get formatted status text lines for display
 */
function getStatusText() {
  const status = taskManager.getStatus()
  const lines = []

  // Bot status
  lines.push('--- Bot Status ---')
  const isRunning = typeof discordBot.isRunning === 'function' ? discordBot.isRunning() : false
  lines.push(`Running: ${isRunning ? '✅ Active' : '❌ Paused'}`)

  // Tasks status
  lines.push('--- Tasks ---')

  // Calculate padding for alignment
  const maxNameLength = Math.max(...Object.values(status.tasks).map((task) => task.name.length))

  // Add each task
  Object.values(status.tasks).forEach((task) => {
    let statusText = `${task.name.padEnd(maxNameLength + 2)}: ${task.enabled ? '✅ Enabled' : '❌ Disabled'}`

    // Add next run info if available
    if (task.nextRun) {
      const finishTime = formatTime(task.nextRun)
      const countdown = formatTimeRemaining(Math.max(0, task.nextRun - Date.now()))
      statusText += ` Next: ${finishTime} (${countdown})`
    }

    // Add last run info
    const lastRunText = task.lastRun ? `Last: ${formatTime(task.lastRun)}` : 'Never run'

    lines.push(`${statusText} ${lastRunText}`)
  })

  // Pause status
  if (!isRunning && global.pauseEndTime) {
    const timeRemaining = global.pauseEndTime - Date.now()
    if (timeRemaining > 0) {
      const endTimeFormatted = formatTime(global.pauseEndTime)
      lines.push(`Bot is paused until: ${endTimeFormatted} (${formatTimeRemaining(timeRemaining)} remaining)`)
    }
  }

  return lines
}

/**
 * Draw status area and first separator
 */
function drawStatusArea(statusLines) {
  // Update status lines
  statusLines.forEach((line, index) => {
    drawLine(index + 1, line)
  })

  // Update first separator
  drawLine(statusLines.length + 1, SEPARATOR)
}

/**
 * Update just the status area
 */
function updateStatusArea() {
  const statusLines = getStatusText()

  // Check if status height changed
  if (statusLines.length !== statusHeight) {
    statusHeight = statusLines.length
    redrawFullScreen()
    return
  }

  // Move cursor to top and draw status area
  process.stdout.write(ANSI.MOVE_TO_TOP)
  drawStatusArea(statusLines)
}

/**
 * Update just the log area
 */
function updateLogArea() {
  const termHeight = getTerminalHeight()
  const availableLines = termHeight - statusHeight - 3

  // Draw log messages
  const logToShow = messageLog.slice(0, availableLines)
  logToShow.forEach((msg, index) => {
    drawLine(statusHeight + 2 + index, msg)
  })

  // Clear remaining lines (optimization: only clear lines that had content before)
  for (let i = logToShow.length; i < availableLines; i++) {
    drawLine(statusHeight + 2 + i, '')
  }

  // Draw second separator and command line
  drawLine(termHeight - 1, SEPARATOR)
  drawCommandLine()
}

/**
 * Update the command line with current input
 */
function drawCommandLine() {
  const termHeight = getTerminalHeight()
  drawLine(termHeight, `Command> ${inputBuffer || ''}`)
}

/**
 * Redraw the entire screen
 */
function redrawFullScreen() {
  // Clear screen and move to top
  process.stdout.write(ANSI.CLEAR_SCREEN)
  process.stdout.write(ANSI.MOVE_TO_TOP)

  // Get status and calculate height
  const statusLines = getStatusText()
  statusHeight = statusLines.length

  // Draw status area using shared function
  drawStatusArea(statusLines)

  // Update log area
  updateLogArea()
}

// ================================
// Input Handling
// ================================

/**
 * Setup terminal input handling
 */
function setupTerminalInput() {
  // Hide cursor
  process.stdout.write(ANSI.HIDE_CURSOR)

  // Setup raw mode
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  // Listen for keypress
  process.stdin.on('data', handleKeyPress)

  // Initialize input buffer
  inputBuffer = ''
}

/**
 * Handle terminal key presses
 */
function handleKeyPress(key) {
  const str = String(key)

  // Check for Ctrl+C
  if (str === '\u0003') {
    process.stdout.write(ANSI.SHOW_CURSOR)
    process.exit()
  }

  // Handle backspace
  if (str === '\u007f' || str === '\b') {
    if (inputBuffer.length > 0) {
      inputBuffer = inputBuffer.slice(0, -1)
    }
  }
  // Handle enter
  else if (str === '\r' || str === '\n') {
    const command = inputBuffer.trim()
    inputBuffer = ''

    if (command) {
      handleCommand(command)
    }
  }
  // Handle regular characters
  else if (str.length === 1 && str >= ' ') {
    inputBuffer += str
  }

  // Update command line
  drawCommandLine()
}

/**
 * Handle command execution
 * Uses Discord bot's command handlers directly
 */
function handleCommand(command) {
  logMessage(`Executing: ${command}`)

  try {
    // Ensure command has prefix for parsing
    const prefixedCommand = command.startsWith('!') ? command : `!${command}`

    // Parse the command
    const [commandName, ...args] = prefixedCommand.slice(1).trim().split(/ +/)

    // Use Discord's command system directly
    const commands = discordBot.getCommands()
    if (!commands) {
      return logMessage('Cannot access Discord commands')
    }

    // Resolve command using Discord's aliases
    const resolvedCommandName = discordBot.resolveCommandAlias(commandName.toLowerCase())

    // Get the actual command handler
    const commandHandler = commands.get(resolvedCommandName)

    if (!commandHandler) {
      return logMessage(`Unknown command: ${commandName}`)
    }

    // Create a mock message object with a real Discord channel for replies
    const channel = discordBot.getDefaultChannel()
    if (!channel) {
      return logMessage('No Discord channel available for output')
    }

    const mockMessage = {
      author: {
        id: config.discord.allowedUserIds[0], // Use first allowed user ID
        bot: false,
        username: 'Terminal',
      },
      channel: channel, // This is a real Discord channel
      content: prefixedCommand,
      reply: (content) => channel.send(content),
    }

    // Execute the command directly with our mock message
    commandHandler.execute(mockMessage, args, {
      client: discordBot.getClient(),
      isRunning: discordBot.isRunning(),
      config,
      taskManager,
      setRunning: (value) => {
        discordBot.setRunning(value)
      },
    })

    logMessage(`Command ${resolvedCommandName} executed`)
  } catch (error) {
    logMessage(`Error: ${error.message}`)
  }
}

// ================================
// Setup and Safety
// ================================

/**
 * Setup event handlers to ensure cursor is restored on exit
 */
function setupExitHandlers() {
  // Restore cursor on exit
  process.on('exit', () => {
    process.stdout.write(ANSI.SHOW_CURSOR)
  })

  // Handle common termination signals
  const exitSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT']
  exitSignals.forEach((signal) => {
    process.on(signal, () => {
      process.stdout.write(ANSI.SHOW_CURSOR)
      process.exit(0)
    })
  })
}

// ================================
// Task Management
// ================================

/**
 * Register all task implementations
 */
function registerTasks() {
  try {
    // Farm task
    taskManager.registerTask(
      'farm',
      async () => {
        logMessage('Performing farming actions...')
        await new Promise((resolve) => setTimeout(resolve, 3000))

        const returnTimeMinutes = 30 // Replace with actual game data
        taskManager.setTaskNextRun('farm', returnTimeMinutes)

        logMessage(`Farming complete. Next run in ${returnTimeMinutes} minutes.`)
      },
      null, // Dynamic scheduling
    )

    // Balance task
    taskManager.registerTask(
      'balance',
      async () => {
        logMessage('Performing warehouse balancing...')
        await new Promise((resolve) => setTimeout(resolve, 2000))
        logMessage('Warehouse balancing complete.')
      },
      config.features.balance.interval, // Fixed interval
    )

    // Train task
    taskManager.registerTask(
      'train',
      async () => {
        logMessage('Training paladin...')
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const cooldownMinutes = 150 // Replace with actual game data
        taskManager.setTaskNextRun('train', cooldownMinutes)

        logMessage('Paladin training complete.')
      },
      null, // Dynamic scheduling
    )
  } catch (error) {
    console.error('Error registering tasks:', error)
    process.exit(1)
  }
}

// ================================
// Main Application Loop
// ================================

/**
 * Main application loop
 */
async function mainLoop() {
  try {
    // Setup display
    redrawFullScreen()
    setupTerminalInput()

    // Initial message
    logMessage('Bot started. Type commands with or without the ! prefix (e.g. "status" or "!status")')

    // Main update loop
    while (true) {
      try {
        // Update status
        updateStatusArea()

        // Check for due tasks
        if (discordBot.isRunning && discordBot.isRunning()) {
          const dueTasks = taskManager.getDueTasks()
          if (dueTasks.length > 0) {
            logMessage(`Executing tasks: ${dueTasks.join(', ')}`)
            await taskManager.executeDueTasks()
          }
        }

        // Wait before next update
        await new Promise((resolve) => setTimeout(resolve, UPDATE_INTERVAL_MS))
      } catch (error) {
        logMessage(`Error in update loop: ${error}`)
        await new Promise((resolve) => setTimeout(resolve, UPDATE_INTERVAL_MS))
      }
    }
  } catch (error) {
    // Ensure cursor is restored on fatal error
    process.stdout.write(ANSI.SHOW_CURSOR)

    // Log error (bypassing our overrides)
    isLoggingInternally = true
    originalConsole.error('Fatal error:', error)
    isLoggingInternally = false

    process.exit(1)
  }
}

/**
 * Initialize and start the application
 */
function initialize() {
  // Setup console capture
  setupConsoleCapture()

  // Setup exit handlers
  setupExitHandlers()

  // Initialize tasks from config
  Object.entries(config.features).forEach(([taskId, feature]) => {
    taskManager.setTaskEnabled(taskId, feature.enabled)
  })

  // Register tasks
  registerTasks()

  // Start task manager
  taskManager.start()

  // Start main loop
  mainLoop().catch((error) => {
    process.stdout.write(ANSI.SHOW_CURSOR)
    isLoggingInternally = true
    originalConsole.error('Fatal error in main loop:', error)
    isLoggingInternally = false
    process.exit(1)
  })
}

// Start the application
initialize()

// Export only what's needed
module.exports = {
  taskManager,
}
