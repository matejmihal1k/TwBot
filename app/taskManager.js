/**
 * Task Manager for game automation
 * Handles scheduling, execution, and state persistence for game tasks
 */
const { formatTimeRemaining } = require('./helper')
const fs = require('fs')
const path = require('path')

class TaskManager {
  /**
   * Initialize the task manager
   */
  constructor() {
    // Load config
    this.configPath = path.join(__dirname, 'config.json')
    this.config = require(this.configPath)

    this.tasks = {
      farm: {
        // Changed from farming
        name: this.config.features.farm.name,
        enabled: this.config.features.farm.enabled,
        interval: 0, // No default interval for farming
        lastRun: this.config.features.farm.lastRun,
        nextRun: this.config.features.farm.nextRun,
      },
      balance: {
        // Changed from balancer
        name: this.config.features.balance.name,
        enabled: this.config.features.balance.enabled,
        interval: this.config.features.balance.interval * 60 * 1000, // Convert minutes to milliseconds
        lastRun: this.config.features.balance.lastRun,
        nextRun: this.config.features.balance.nextRun,
      },
      train: {
        // Changed from paladin
        name: this.config.features.train.name,
        enabled: this.config.features.train.enabled,
        interval: 0, // No fixed interval for paladin training
        lastRun: this.config.features.train.lastRun,
        nextRun: this.config.features.train.nextRun,
      },
    }

    this.taskFunctions = {}
    this.isRunning = false
    this.currentlyExecuting = false
  }

  // ============================
  // Configuration Management
  // ============================

  /**
   * Save current state to config file
   */
  saveConfig() {
    try {
      // Update config object with current task settings
      this.config.features.farm.enabled = this.tasks.farm.enabled
      this.config.features.farm.lastRun = this.tasks.farm.lastRun
      this.config.features.farm.nextRun = this.tasks.farm.nextRun

      this.config.features.balance.enabled = this.tasks.balance.enabled
      this.config.features.balance.interval = this.tasks.balance.interval / (60 * 1000) // Convert ms to minutes
      this.config.features.balance.lastRun = this.tasks.balance.lastRun
      this.config.features.balance.nextRun = this.tasks.balance.nextRun

      this.config.features.train.enabled = this.tasks.train.enabled
      this.config.features.train.lastRun = this.tasks.train.lastRun
      this.config.features.train.nextRun = this.tasks.train.nextRun

      // Write to file
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      console.log('Config saved to file')
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  // ============================
  // Task Registration
  // ============================

  /**
   * Register a task function
   * @param {string} taskId - The ID of the task
   * @param {Function} executeFn - The function to execute
   * @param {number|null} intervalMinutes - Interval in minutes (null for dynamic tasks)
   * @returns {boolean} - Success or failure
   */
  registerTask(taskId, executeFn, intervalMinutes = null) {
    if (!this.tasks[taskId]) {
      console.error(`Cannot register unknown task: ${taskId}`)
      return false
    }

    this.taskFunctions[taskId] = executeFn

    // Only set interval if provided and it's the balance task
    if (intervalMinutes !== null && taskId === 'balance') {
      this.tasks[taskId].interval = intervalMinutes * 60 * 1000 // Convert minutes to milliseconds
    }

    return true
  }

  // ============================
  // Task Control Methods
  // ============================

  /**
   * Enable or disable a task
   * @param {string} taskId - The ID of the task
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {boolean} - Success or failure
   */
  setTaskEnabled(taskId, enabled) {
    if (!this.tasks[taskId]) {
      console.error(`Unknown task: ${taskId}`)
      return false
    }

    this.tasks[taskId].enabled = enabled

    // If enabling, schedule next run if not already set
    if (enabled && !this.tasks[taskId].nextRun) {
      // For initial run, set all tasks to run immediately
      this.tasks[taskId].nextRun = Date.now()
    }

    // If disabling, clear next run time
    if (!enabled) {
      this.tasks[taskId].nextRun = null
    }

    // Save changes to config
    this.saveConfig()

    return true
  }

  /**
   * Set the next run time for a task
   * @param {string} taskId - The ID of the task
   * @param {number} minutesUntilNextRun - Minutes until next run
   * @returns {boolean} - Success or failure
   */
  setTaskNextRun(taskId, minutesUntilNextRun) {
    if (!this.tasks[taskId] || !this.tasks[taskId].enabled) {
      console.error(`Cannot set next run: Task ${taskId} is disabled or doesn't exist`)
      return false
    }

    const nextRunTimeMs = minutesUntilNextRun * 60 * 1000
    this.tasks[taskId].nextRun = Date.now() + nextRunTimeMs

    // Update config with the new nextRun value
    if (this.config.features[taskId]) {
      this.config.features[taskId].nextRun = this.tasks[taskId].nextRun
      this.saveConfig()
    }

    console.log(
      `${this.tasks[taskId].name} next run set to ${new Date(this.tasks[taskId].nextRun).toLocaleTimeString()} (in ${minutesUntilNextRun} minutes)`,
    )

    return true
  }

  /**
   * Set the interval for balance task in minutes
   * @param {number} intervalMinutes - Interval in minutes
   * @returns {boolean} - Success or failure
   */
  setBalanceInterval(intervalMinutes) {
    // Changed from setBalancerInterval
    this.tasks.balance.interval = intervalMinutes * 60 * 1000 // Convert minutes to milliseconds

    // Update next run time if task is enabled
    if (this.tasks.balance.enabled && this.tasks.balance.lastRun) {
      this.tasks.balance.nextRun = this.tasks.balance.lastRun + this.tasks.balance.interval
    }

    // Save changes to config
    this.saveConfig()

    return true
  }

  /**
   * Set the interval for any task that supports it
   * @param {string} taskId - The ID of the task
   * @param {number} intervalMinutes - Interval in minutes
   * @returns {boolean} - Success or failure
   */
  setTaskInterval(taskId, intervalMinutes) {
    // Currently only balance supports interval changes
    if (taskId === 'balance') {
      // Changed from balancer
      return this.setBalanceInterval(intervalMinutes)
    } else {
      console.warn(`Task ${taskId} does not support interval changes`)
      return false
    }
  }

  // ============================
  // Execution Control
  // ============================

  /**
   * Start the task manager
   * @returns {boolean} - Success
   */
  start() {
    this.isRunning = true
    return true
  }

  /**
   * Stop the task manager
   * @returns {boolean} - Success
   */
  stop() {
    this.isRunning = false
    return true
  }

  /**
   * Check which tasks are due to run
   * @returns {string[]} - Array of task IDs
   */
  getDueTasks() {
    if (!this.isRunning || this.currentlyExecuting) return []

    const now = Date.now()
    const dueTasks = []

    for (const [taskId, task] of Object.entries(this.tasks)) {
      if (task.enabled && task.nextRun && task.nextRun <= now) {
        dueTasks.push(taskId)
      }
    }

    return dueTasks
  }

  /**
   * Execute all due tasks
   * @returns {boolean} - Success or failure
   */
  async executeDueTasks() {
    const dueTasks = this.getDueTasks()

    if (dueTasks.length === 0) return false

    this.currentlyExecuting = true
    console.log(`Executing ${dueTasks.length} tasks: ${dueTasks.join(', ')}`)

    try {
      // Simulate logging in
      console.log('Logging in to game...')
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Execute each task
      for (const taskId of dueTasks) {
        if (this.taskFunctions[taskId]) {
          console.log(`Executing task: ${this.tasks[taskId].name}`)

          try {
            await this.taskFunctions[taskId]()

            // Update last run time
            this.tasks[taskId].lastRun = Date.now()

            // Update config with the new lastRun value
            if (this.config.features[taskId]) {
              this.config.features[taskId].lastRun = this.tasks[taskId].lastRun
            }

            // Update next run time only for balance
            // (farm and train next runs are set by their own functions)
            if (taskId === 'balance' && this.tasks[taskId].interval > 0) {
              // Changed from balancer
              this.tasks[taskId].nextRun = Date.now() + this.tasks[taskId].interval

              // Update config with the new nextRun value for balance
              if (this.config.features[taskId]) {
                this.config.features[taskId].nextRun = this.tasks[taskId].nextRun
              }
            }

            // Save the updated config
            this.saveConfig()

            console.log(`Task ${this.tasks[taskId].name} completed`)
          } catch (error) {
            console.error(`Error executing task ${taskId}:`, error)
          }
        }
      }

      // Simulate logging out
      console.log('Logging out of game...')
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error executing tasks:', error)
    } finally {
      this.currentlyExecuting = false
    }

    return true
  }

  // ============================
  // Status Reporting
  // ============================

  /**
   * Get status of all tasks
   * @returns {Object} - Status object
   */
  getStatus() {
    const status = {}

    for (const [taskId, task] of Object.entries(this.tasks)) {
      status[taskId] = {
        name: task.name,
        enabled: task.enabled,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        interval: taskId === 'balance' ? task.interval / (60 * 1000) : null, // Only show interval for balance
      }
    }

    return {
      isRunning: this.isRunning,
      currentlyExecuting: this.currentlyExecuting,
      tasks: status,
    }
  }

  /**
   * Get detailed status of a specific task
   * @param {string} taskId - The ID of the task
   * @returns {Object|null} - Task status or null if not found
   */
  getTaskStatus(taskId) {
    if (!this.tasks[taskId]) return null

    const task = this.tasks[taskId]

    return {
      name: task.name,
      enabled: task.enabled,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      interval: taskId === 'balance' ? task.interval / (60 * 1000) : null, // Only show interval for balance
      timeUntilNextRun: task.nextRun ? formatTimeRemaining(Math.max(0, task.nextRun - Date.now())) : 'N/A',
    }
  }
}

module.exports = new TaskManager()
