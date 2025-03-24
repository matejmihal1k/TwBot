// ==UserScript==
// @name         Tribal Wars Battle Report Formatter
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Automatically formats and saves battle reports to village notes.
// @author       C-3P0
// @match        */game.php?*screen=report*view=*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  /**
   * Configuration settings for the script
   * @type {Object}
   */
  const CONFIG = {
    // Keyboard shortcuts for different report types
    keys: {
      enemyAttack: 'u', // Key for enemy offensive villages (save to attacker village)
      enemyDefense: 'i', // Key for enemy defensive villages (save to attacker village)
      allyAttack: 'o', // Key for ally reports on enemy offensive villages (save to defender village)
      allyDefense: 'p', // Key for ally reports on enemy defensive villages (save to defender village)
    },

    // Colors for report headers
    colors: {
      off: '#ff0000', // Color for offensive reports (red)
      def: '#0000ff', // Color for defensive reports (blue)
    },

    // Text labels used in formatted reports
    labels: {
      off: 'OFF', // Label for offensive reports
      def: 'DEF', // Label for defensive reports
      sent: 'Sent', // Label for units sent
      survived: 'Survived', // Label for units that survived
      away: 'Away', // Label for units away from village
      wood: 'Wood', // Label for wood resource
      clay: 'Clay', // Label for clay resource
      iron: 'Iron', // Label for iron resource
      details: 'Details', // Label for the details spoiler
    },

    // Language specific configuration for finding elements in the game UI
    gameText: {
      upgradesLabel: 'Vylepšení', // The word for "Upgrades" in report (Czech: "Vylepšení")
      excludedHeader: 'Kořist:', // The word for "Loot:" in report will be excluded from note (Czech: "Kořist:")
    },

    // UI settings
    showGuide: true, // Whether to show the keyboard shortcut guide
    guidePosition: 'right', // Position of the guide ('right' or 'left')

    // Debug settings
    debug: false, // Enable/disable debug logging
  }

  // Pre-compile regular expressions for better performance
  const NOTE_REGEX = /<textarea[^>]*id="message"[^>]*>([\s\S]*?)<\/textarea>/
  const UNIT_CLASS_REGEX = /unit-item-(\w+)/
  const NUMBER_REGEX = /[\d.,]+/
  const COORDS_REGEX = /\((\d+\|\d+)\)/

  // Unit type mappings - defined once to avoid redundancy
  const ATTACKER_UNITS = [
    'spear',
    'sword',
    'axe',
    'archer',
    'spy',
    'light',
    'marcher',
    'heavy',
    'ram',
    'catapult',
    'knight',
    'snob',
  ]
  const DEFENDER_UNITS = [...ATTACKER_UNITS, 'militia']

  // Initialize only essential components immediately
  document.addEventListener('keydown', handleKeyPress)

  // Lazy-load guide only when needed
  if (CONFIG.showGuide && localStorage.getItem('battleReportGuideHidden') !== 'true') {
    // Using requestIdleCallback for non-critical UI element
    ;(window.requestIdleCallback || setTimeout)(() => addShortcutGuide())
  }

  /**
   * Debug logging helper - only logs if debug is enabled
   * @param {string} message - The message to log
   */
  function debugLog(message) {
    if (CONFIG.debug) console.log('[Battle Report Formatter] ' + message)
  }

  /**
   * Handles keyboard shortcuts and triggers report formatting
   * @param {KeyboardEvent} event - The keyboard event
   */
  function handleKeyPress(event) {
    // Skip if typing in input fields
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return
    }

    const key = event.key.toLowerCase()
    let reportType = null

    // Determine report type based on key pressed
    switch (key) {
      case CONFIG.keys.enemyAttack:
        reportType = 'enemy_attack'
        break
      case CONFIG.keys.enemyDefense:
        reportType = 'enemy_defense'
        break
      case CONFIG.keys.allyAttack:
        reportType = 'ally_attack'
        break
      case CONFIG.keys.allyDefense:
        reportType = 'ally_defense'
        break
      default:
        return // Not a shortcut key, exit early
    }

    event.preventDefault()
    formatAndSaveReport(reportType)
  }

  /**
   * Adds a keyboard shortcut guide to the UI
   */
  function addShortcutGuide() {
    const guideDiv = document.createElement('div')
    guideDiv.style.cssText =
      'position:fixed;top:10px;padding:10px;background:#f5f5f5;border:1px solid #c0c0c0;border-radius:5px;z-index:9999;font-size:12px;box-shadow:0 0 5px rgba(0,0,0,0.2);'
    guideDiv.style[CONFIG.guidePosition] = '10px'

    guideDiv.innerHTML = `
            <div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #c0c0c0;padding-bottom:3px;">Report Formatter Shortcuts</div>
            <div style="margin-bottom:3px;"><b>${CONFIG.keys.enemyAttack.toUpperCase()}</b> - Enemy attack (${CONFIG.labels.off}) → First village</div>
            <div style="margin-bottom:3px;"><b>${CONFIG.keys.enemyDefense.toUpperCase()}</b> - Enemy attack (${CONFIG.labels.def}) → First village</div>
            <div style="margin-bottom:3px;"><b>${CONFIG.keys.allyAttack.toUpperCase()}</b> - Ally attack (${CONFIG.labels.off}) → Second village</div>
            <div style="margin-bottom:3px;"><b>${CONFIG.keys.allyDefense.toUpperCase()}</b> - Ally attack (${CONFIG.labels.def}) → Second village</div>
        `

    // Add close button
    const closeButton = document.createElement('div')
    closeButton.style.cssText = 'position:absolute;top:3px;right:5px;cursor:pointer;font-weight:bold;'
    closeButton.innerHTML = 'X'
    closeButton.onclick = function () {
      guideDiv.style.display = 'none'
      localStorage.setItem('battleReportGuideHidden', 'true')
    }

    guideDiv.appendChild(closeButton)
    document.body.appendChild(guideDiv)

    debugLog('Shortcut guide added to UI')
  }

  /**
   * Main function to format and save a battle report
   * @param {string} type - The type of report ('enemy_attack', 'enemy_defense', 'ally_attack', 'ally_defense')
   */
  function formatAndSaveReport(type) {
    try {
      // Extract report data first - do this before any API calls
      const reportData = getReportData(type)
      if (!reportData) {
        UI.InfoMessage('Error: Could not extract report data', 2000, 'error')
        return
      }

      debugLog(`Report data extracted, type: ${type}, target village: ${reportData.villageId}`)

      // Now make API call to get the existing note and then update it
      $.ajax({
        url: TribalWars.buildURL('GET', 'info_village', { id: reportData.villageId }),
        type: 'GET',
        success: function (data) {
          // Extract existing note more efficiently with regex
          const noteMatch = data.match(NOTE_REGEX)
          const existingNote = noteMatch ? noteMatch[1] : ''

          // Combine notes
          const newNote = existingNote.length > 0 ? reportData.text + existingNote : reportData.text

          // Save the combined note
          saveNote(reportData.villageId, newNote)
        },
        error: function () {
          UI.InfoMessage('Error retrieving village info', 2000, 'error')
        },
      })
    } catch (e) {
      UI.InfoMessage('Error processing report', 2000, 'error')
      debugLog('Error: ' + e.message)
    }
  }

  /**
   * Saves a note to a village with a single API call
   * @param {string} villageId - The ID of the village to save the note to
   * @param {string} noteText - The text of the note to save
   */
  function saveNote(villageId, noteText) {
    $.ajax({
      url: TribalWars.buildURL('POST', 'info_village', {
        ajaxaction: 'edit_notes',
        id: villageId,
        h: window.csrf_token,
      }),
      type: 'POST',
      data: { note: noteText },
      success: function () {
        UI.InfoMessage('Note added', 2000, 'success')
        debugLog('Note successfully saved to village ' + villageId)
      },
      error: function () {
        UI.InfoMessage('Error saving note', 2000, 'error')
      },
    })
  }

  /**
   * Extracts coordinates from a village text
   * @param {string} villageText - The village text that contains coordinates
   * @returns {string|null} - The coordinates or null if not found
   */
  function extractCoords(villageText) {
    const match = villageText.match(COORDS_REGEX)
    return match ? match[1] : null
  }

  /**
   * Extracts and formats all report data based on type
   * @param {string} type - The type of report ('enemy_attack', 'enemy_defense', 'ally_attack', 'ally_defense')
   * @returns {Object|null} - An object containing the formatted text and target village ID, or null if extraction failed
   */
  function getReportData(type) {
    // Cache DOM elements for better performance
    const attackInfoTable = document.getElementById('attack_info_att')
    const defenseInfoTable = document.getElementById('attack_info_def')

    if (!attackInfoTable || !defenseInfoTable) {
      debugLog('Could not find attack or defense info tables')
      return null
    }

    // Get report date
    const reportDateElement = document.querySelector('table.vis tr:nth-child(2) td:nth-child(2)')
    if (!reportDateElement) {
      debugLog('Could not find report date')
      return null
    }
    const reportDate = reportDateElement.textContent.trim().split(/\s+/)[0]

    // Get attacker info
    const attackerNameElement = attackInfoTable.querySelector('tr:first-child th:nth-child(2) a')
    if (!attackerNameElement) {
      debugLog('Could not find attacker name')
      return null
    }
    const attackerName = attackerNameElement.textContent.trim()

    // Get defender info
    const defenderNameElement = defenseInfoTable.querySelector('tr:first-child th:nth-child(2) a')
    if (!defenderNameElement) {
      debugLog('Could not find defender name')
      return null
    }
    const defenderName = defenderNameElement.textContent.trim()

    // Get village IDs and coordinates
    const attackerVillageElement = attackInfoTable.querySelector('tr:nth-child(2) td:nth-child(2)')
    const defenderVillageElement = defenseInfoTable.querySelector('tr:nth-child(2) td:nth-child(2)')
    if (!attackerVillageElement || !defenderVillageElement) {
      debugLog('Could not find attacker or defender village')
      return null
    }

    const attackerVillageId = attackerVillageElement.querySelector('span').getAttribute('data-id')
    const defenderVillageId = defenderVillageElement.querySelector('span').getAttribute('data-id')

    // Extract village coordinates
    const attackerVillageText = attackerVillageElement.textContent.trim()
    const defenderVillageText = defenderVillageElement.textContent.trim()

    const attackerCoords = extractCoords(attackerVillageText)
    const defenderCoords = extractCoords(defenderVillageText)

    // Select which village ID to use based on report type
    const villageId = type === 'enemy_attack' || type === 'enemy_defense' ? attackerVillageId : defenderVillageId

    // Format header based on type and with enhanced information
    const header = formatHeader(type, reportDate, attackerName, defenderName, attackerCoords, defenderCoords)

    // Start spoiler for details
    let text = header + '\n[spoiler=' + CONFIG.labels.details + ']'

    // Format unit info based on report type
    if (type === 'enemy_attack' || type === 'enemy_defense') {
      // For enemy reports, only include attacker unit info
      text += formatUnitInfo('attack_info_att_units', ATTACKER_UNITS)
    } else {
      // For ally reports, include both attacker and defender info plus upgrades
      text += formatUnitInfo('attack_info_att_units', ATTACKER_UNITS)
      text += '\n' // Simple line break
      text += formatUnitInfo('attack_info_def_units', DEFENDER_UNITS)

      // Add defender upgrades if available (only for ally reports)
      const upgradesText = formatDefenderUpgrades()
      if (upgradesText) {
        text += upgradesText
      }

      // Add troops away information
      text += formatTroopsAway()

      // Add spy info for ally reports
      text += formatSpyInfo()
    }

    // Close spoiler
    text += '[/spoiler]'

    return { text, villageId }
  }

  /**
   * Formats defender upgrade information
   * @returns {string} - The formatted upgrades text or empty string if not found
   */
  function formatDefenderUpgrades() {
    // Find the upgrades row in the defender table
    const defenseInfoTable = document.getElementById('attack_info_def')
    if (!defenseInfoTable) return ''

    // Look for the row with "Vylepšení:" (Upgrades) label using the configurable term
    const upgradesRow = Array.from(defenseInfoTable.querySelectorAll('tr')).find((row) => {
      const firstCell = row.querySelector('td')
      return firstCell && firstCell.textContent.trim().includes(CONFIG.gameText.upgradesLabel)
    })

    if (!upgradesRow) return '' // No upgrades found

    const upgradesCell = upgradesRow.querySelector('td:nth-child(2)')
    if (!upgradesCell) return ''

    // Extract and format upgrades
    const upgradesText = upgradesCell.innerHTML
      .replace(/<br>/gi, '\n') // Replace <br> with newlines
      .split('\n')
      .map((upgrade) => upgrade.trim())
      .filter((upgrade) => upgrade) // Remove empty lines
      .join('\n')

    if (!upgradesText) return ''

    // Return upgrades text without a label - just add newlines for separation
    return '\n\n' + upgradesText
  }

  /**
   * Formats the report header with enhanced information
   * @param {string} type - The type of report
   * @param {string} date - The report date
   * @param {string} attackerName - The attacker's name
   * @param {string} defenderName - The defender's name
   * @param {string} attackerCoords - The coordinates of the attacker's village
   * @param {string} defenderCoords - The coordinates of the defender's village
   * @returns {string} - The formatted header
   */
  function formatHeader(type, date, attackerName, defenderName, attackerCoords, defenderCoords) {
    const isOff = type === 'enemy_attack' || type === 'ally_attack'
    const color = isOff ? CONFIG.colors.off : CONFIG.colors.def
    const label = isOff ? CONFIG.labels.off : CONFIG.labels.def

    // Format based on report type
    if (type === 'enemy_attack' || type === 'enemy_defense') {
      // For enemy reports: [DEF/OFF] [time] [attacker name] -> [defender name]: [defender village coords]
      return `[b][color=${color}]${label}[/color][/b] ${date} [player]${attackerName}[/player] -> [player]${defenderName}[/player]: [coord]${defenderCoords}[/coord]`
    } else {
      // For ally reports: [DEF/OFF] [time] [attacker name] [attacker village coords] -> [defender name]
      return `[b][color=${color}]${label}[/color][/b] ${date} [player]${attackerName}[/player] [coord]${attackerCoords}[/coord] -> [player]${defenderName}[/player]`
    }
  }

  /**
   * Formats unit information for a given table
   * @param {string} tableId - The ID of the unit table
   * @param {string[]} unitTypes - Array of unit types to process
   * @returns {string} - The formatted unit information
   */
  function formatUnitInfo(tableId, unitTypes) {
    const unitTable = document.getElementById(tableId)
    if (!unitTable) return '\nNo unit information available'

    const unitRows = unitTable.querySelectorAll('tr')
    if (unitRows.length < 3) return '\nIncomplete unit information'

    const sentRow = unitRows[1]
    const lostRow = unitRows[2]

    // Get all unit values at once using array methods
    const unitData = unitTypes.reduce((result, unitType, index) => {
      const cellIndex = index + 1
      if (!sentRow.cells[cellIndex]) return result

      const sent = parseInt(sentRow.cells[cellIndex].textContent) || 0
      if (sent === 0) return result

      const lost = parseInt(lostRow.cells[cellIndex].textContent) || 0

      result.push({
        type: unitType,
        sent: sent,
        survived: sent - lost,
      })

      return result
    }, [])

    // Early exit if no units found
    if (unitData.length === 0) return '\nNo units in report'

    // Build strings more efficiently with map
    const sentText = CONFIG.labels.sent + ': ' + unitData.map((u) => `[unit]${u.type}[/unit]${u.sent}`).join(' ')

    const survivedText =
      '\n' + CONFIG.labels.survived + ': ' + unitData.map((u) => `[unit]${u.type}[/unit]${u.survived}`).join(' ')

    return sentText + survivedText
  }

  /**
   * Formats troops away information
   * @returns {string} - The formatted troops away section or empty string
   */
  function formatTroopsAway() {
    const troopsAwayTable = document.getElementById('attack_spy_away')
    if (!troopsAwayTable) return ''

    const troopsRows = troopsAwayTable.querySelectorAll('tr')
    if (troopsRows.length <= 1) return ''

    // Use array methods for better performance
    const troopCells = Array.from(troopsRows[1].querySelectorAll('td[data-unit-count]'))

    // Filter and map in one step
    const troopTexts = troopCells
      .filter((cell) => cell.className.includes('unit-item-'))
      .map((cell) => {
        const unitMatch = cell.className.match(UNIT_CLASS_REGEX)
        if (!unitMatch) return null

        const unitType = unitMatch[1]
        const count = parseInt(cell.getAttribute('data-unit-count')) || 0

        return count > 0 ? `[unit]${unitType}[/unit]${count}` : null
      })
      .filter(Boolean) // Remove nulls

    return troopTexts.length > 0 ? '\n' + CONFIG.labels.away + ': ' + troopTexts.join(' ') : ''
  }

  /**
   * Formats spy information (resources, buildings, etc.)
   * @returns {string} - The formatted spy info section or empty string
   */
  function formatSpyInfo() {
    let text = ''

    // Add resources information using Map for better organization
    const resourcesTable = document.getElementById('attack_spy_resources')
    if (resourcesTable) {
      // Create a Map for resources with defaults
      const resourceMap = new Map([
        ['wood', { class: 'wood', value: '0' }],
        ['clay', { class: 'stone', value: '0' }],
        ['iron', { class: 'iron', value: '0' }],
      ])

      // Extract resources more efficiently
      resourcesTable.querySelectorAll('.icon').forEach((icon) => {
        const value = icon.parentNode.textContent.match(NUMBER_REGEX)

        // Find which resource this is
        for (const [key, resource] of resourceMap.entries()) {
          if (icon.classList.contains(resource.class)) {
            resource.value = value ? value[0] : '0'
            break
          }
        }
      })

      text += `\n\n${CONFIG.labels.wood}: ${resourceMap.get('wood').value} ${CONFIG.labels.clay}: ${resourceMap.get('clay').value} ${CONFIG.labels.iron}: ${resourceMap.get('iron').value}`
    }

    // Add buildings information (directly from JSON data if available)
    const buildingsData = document.getElementById('attack_spy_building_data')
    if (buildingsData) {
      try {
        const buildings = JSON.parse(buildingsData.value)
        if (buildings && buildings.length > 0) {
          text += '\n\n' + buildings.map((b) => `[building]${b.id}[/building]${b.level}`).join(' ')
        }
      } catch (e) {
        debugLog('Error parsing buildings data: ' + e.message)
      }
    }

    // Add other results without labels
    const resultsTable = document.getElementById('attack_results')
    if (resultsTable) {
      // Extract result texts with filtering
      const resultTexts = Array.from(resultsTable.querySelectorAll('tr'))
        .filter((row) => {
          const header = row.querySelector('th')
          return header && header.innerText.trim() !== CONFIG.gameText.excludedHeader
        })
        .map((row) => {
          const content = row.querySelector('td')
          return content && content.innerText.trim()
        })
        .filter(Boolean) // Remove empty/null results

      if (resultTexts.length > 0) {
        text += '\n\n' + resultTexts.join('\n')
      }
    }

    return text
  }

  // Log initialization
  debugLog('Battle Report Formatter initialized')
})()
