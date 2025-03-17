const { EmbedBuilder } = require('discord.js')
const fs = require('fs')
const path = require('path')

module.exports = {
  name: 'help',
  description: 'Shows the list of available commands',
  execute(message, args) {
    // Get all command files
    const commandsPath = path.join(__dirname)
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))

    // Create embed with command information
    const helpEmbed = new EmbedBuilder()
      .setTitle('Bot Commands')
      .setColor('#0099ff')
      .setDescription('Here are the available commands:')
      .addFields(
        // Map command files to field objects
        commandFiles.map((file) => {
          const command = require(path.join(commandsPath, file))
          return {
            name: `!${command.name}`,
            value: command.description || 'No description available',
          }
        }),
        // Add usage examples
        {
          name: 'Examples',
          value: '!pause 15 - Pause for 15 minutes\n!status balancer - Show detailed balancer status',
        },
      )
      .setTimestamp()

    message.reply({ embeds: [helpEmbed] })
  },
}
