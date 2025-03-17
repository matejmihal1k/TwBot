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
    this.configPath = path.join(__dirname, '..', 'config.json')
    this.config = require(this.configPath)

    // Task IDs
    this.TASK_IDS = ['farm', 'balance', 'train']

    // Initialize tasks from config
    this.tasks = {}

    // Build tasks object dynamically
    for (const taskId of this.TASK_IDS) {
      this.tasks[taskId] = {
        name: this.config.features[taskId].name,
        enabled: this.config.features[taskId].enabled,
        interval: taskId === 'balance' ? this.config.features[taskId].interval * 60 * 1000 : 0,
        lastRun: this.config.features[taskId].lastRun,
        nextRun: this.config.features[taskId].nextRun,
      }
    }

    this.taskFunctions = {}
    this.isRunning = false
    this.currentlyExecuting = false
  }

  /**
   * Save current state to config file
   */
  saveConfig() {
    try {
      // Update config object with current task settings
      for (const taskId of this.TASK_IDS) {
        this.config.features[taskId].enabled = this.tasks[taskId].enabled
        this.config.features[taskId].lastRun = this.tasks[taskId].lastRun
        this.config.features[taskId].nextRun = this.tasks[taskId].nextRun

        // Special handling for balance interval
        if (taskId === 'balance') {
          this.config.features[taskId].interval = this.tasks[taskId].interval / (60 * 1000)
        }
      }

      // Write to file
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      console.log('Config saved to file')
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

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

    // Set interval if provided
    if (intervalMinutes !== null && taskId === 'balance') {
      this.tasks[taskId].interval = intervalMinutes * 60 * 1000
    }

    return true
  }

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

    // Update config with the new nextRun value and save
    this.saveConfig()

    console.log(
      `${this.tasks[taskId].name} next run set to ${new Date(this.tasks[taskId].nextRun).toLocaleTimeString()} (in ${minutesUntilNextRun} minutes)`,
    )

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
    if (taskId !== 'balance') {
      console.warn(`Task ${taskId} does not support interval changes`)
      return false
    }

    // Set interval in milliseconds
    this.tasks[taskId].interval = intervalMinutes * 60 * 1000

    // Update next run time if task is enabled and has been run before
    if (this.tasks[taskId].enabled && this.tasks[taskId].lastRun) {
      this.tasks[taskId].nextRun = this.tasks[taskId].lastRun + this.tasks[taskId].interval
    }

    // Save changes to config
    this.saveConfig()

    return true
  }

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
    return Object.entries(this.tasks)
      .filter(([, task]) => task.enabled && task.nextRun && task.nextRun <= now)
      .map(([taskId]) => taskId)
  }

  /**
   * Execute all due tasks
   * @returns {Promise<boolean>} - Success or failure
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

            // Update next run time for balance task
            if (taskId === 'balance' && this.tasks[taskId].interval > 0) {
              this.tasks[taskId].nextRun = Date.now() + this.tasks[taskId].interval
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

  /**
   * Get status of all tasks
   * @returns {Object} - Status object
   */
  getStatus() {
    const status = {}

    for (const taskId of this.TASK_IDS) {
      const task = this.tasks[taskId]
      status[taskId] = {
        name: task.name,
        enabled: task.enabled,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        interval: taskId === 'balance' ? task.interval / (60 * 1000) : null,
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
      interval: taskId === 'balance' ? task.interval / (60 * 1000) : null,
      timeUntilNextRun: task.nextRun ? formatTimeRemaining(Math.max(0, task.nextRun - Date.now())) : 'N/A',
    }
  }
}

module.exports = new TaskManager()
