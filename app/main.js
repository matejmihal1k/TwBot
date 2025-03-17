const discordBot = require('./discordBot')
const taskManager = require('./taskManager')
const { formatTimeRemaining } = require('./helper')
const config = require('./config.json')

// Constants
const HIDE_CURSOR = '\u001B[?25l'
const SHOW_CURSOR = '\u001B[?25h'
const UPDATE_INTERVAL_MS = 10000 // Extract magic number to named constant

// Setup terminal handling
function setupTerminal() {
  process.stdout.write(HIDE_CURSOR)
  process.on('exit', () => process.stdout.write(SHOW_CURSOR))
  ;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => {
      process.stdout.write(SHOW_CURSOR)
      process.exit(0)
    })
  })
}

// Display functions
function displayBotStatus(status) {
  console.log('\n--- Bot Status ---')
  console.log(`Running: ${discordBot.isRunning() ? '✅ Active' : '❌ Paused'}`)
  console.log(`Currently Executing: ${status.currentlyExecuting ? 'Yes' : 'No'}\n`)
}

function displayTaskStatus(tasks) {
  console.log('--- Tasks ---')
  Object.entries(tasks).forEach(([taskId, task]) => {
    const nextRunText = task.nextRun ? `(Next: ${formatTimeRemaining(Math.max(0, task.nextRun - Date.now()))})` : ''
    const lastRunText = task.lastRun ? `Last: ${new Date(task.lastRun).toLocaleTimeString()}` : 'Never run'

    console.log(`${task.name}: ${task.enabled ? '✅ Enabled' : '❌ Disabled'} ${nextRunText} ${lastRunText}`)
  })
}

function displayPauseStatus() {
  if (!discordBot.isRunning() && global.pauseEndTime) {
    const timeRemaining = global.pauseEndTime - Date.now()
    if (timeRemaining > 0) {
      const endTimeFormatted = new Date(global.pauseEndTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      console.log(`\nBot is paused until: ${endTimeFormatted} (${formatTimeRemaining(timeRemaining)} remaining)`)
    }
  }
}

// Register task functions with error handling
function registerTasks() {
  try {
    // Farm task (formerly farming)
    taskManager.registerTask(
      'farm',
      async () => {
        console.log('Performing farming actions...')
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Get actual return time from game data
        const returnTimeMinutes = 30 // Replace with actual game data
        taskManager.setTaskNextRun('farm', returnTimeMinutes)

        console.log(`Farming complete. Next run in ${returnTimeMinutes} minutes.`)
      },
      null,
    )

    // Balance task (formerly balancer)
    taskManager.registerTask(
      'balance',
      async () => {
        console.log('Performing warehouse balancing...')
        await new Promise((resolve) => setTimeout(resolve, 2000))
        console.log('Warehouse balancing complete.')
      },
      config.features.balance.interval,
    )

    // Train task (formerly paladin)
    taskManager.registerTask(
      'train',
      async () => {
        console.log('Training paladin...')
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Get actual cooldown from game data
        const cooldownMinutes = 150 // Replace with actual game data
        taskManager.setTaskNextRun('train', cooldownMinutes)

        console.log('Paladin training complete.')
      },
      null,
    )
  } catch (error) {
    console.error('Error registering tasks:', error)
    process.exit(1)
  }
}

// Main loop
async function mainLoop() {
  while (true) {
    try {
      console.clear()
      const status = taskManager.getStatus()

      // Display components
      displayBotStatus(status)
      displayTaskStatus(status.tasks)
      displayPauseStatus()

      // Execute due tasks
      if (discordBot.isRunning() && !status.currentlyExecuting) {
        const dueTasks = taskManager.getDueTasks()
        if (dueTasks.length > 0) {
          console.log(`\nDue tasks: ${dueTasks.join(', ')}`)
          await taskManager.executeDueTasks()
        }
      }

      // Wait before next update
      await new Promise((resolve) => setTimeout(resolve, UPDATE_INTERVAL_MS))
    } catch (error) {
      console.error('Error in main loop iteration:', error)
      // Continue loop instead of crashing completely
      await new Promise((resolve) => setTimeout(resolve, UPDATE_INTERVAL_MS))
    }
  }
}

// Initialize and start
function initialize() {
  setupTerminal()
  registerTasks()

  // Initialize tasks from config
  Object.entries(config.features).forEach(([taskId, feature]) => {
    taskManager.setTaskEnabled(taskId, feature.enabled)
  })

  taskManager.start()

  // Start main loop with error handling
  mainLoop().catch((error) => {
    process.stdout.write(SHOW_CURSOR)
    console.error('Fatal error in main loop:', error)
    process.exit(1)
  })
}

// Start everything
initialize()

module.exports = { taskManager }
