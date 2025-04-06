const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all available commands with descriptions'),
    
    async execute(interaction) {
        // Defer the reply first
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Get all commands
        const commandsPath = path.join(__dirname, '.');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = [];
        
        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if (!command.data || command.hidden) continue;
            
            commands.push({
                name: `/${command.data.name}`,
                description: command.data.description || 'No description available'
            });
        }

        // Pagination setup
        const itemsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(commands.length / itemsPerPage);

        // Create embed function
        const createEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentCommands = commands.slice(start, end);

            const commandList = currentCommands.map(cmd => 
                `**${cmd.name}**\n${cmd.description}\n`
            ).join('\n');

            return new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Command Help Menu')
                .setDescription(`**Page ${page + 1}/${totalPages}**\n\n${commandList}`)
                .setFooter({ text: `${commands.length} total commands available` })
                .setTimestamp();
        };

        // Create buttons
        const getButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        // Send initial response
        const message = await interaction.editReply({
            embeds: [createEmbed(currentPage)],
            components: [getButtons(currentPage)],
            flags: MessageFlags.Ephemeral
        });

        // Only create collector if multiple pages exist
        if (totalPages > 1) {
            const collector = message.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) return;

                currentPage = i.customId === 'next' ? currentPage + 1 : currentPage - 1;

                await i.update({
                    embeds: [createEmbed(currentPage)],
                    components: [getButtons(currentPage)],
                    flags: MessageFlags.Ephemeral
                });
            });

            collector.on('end', () => {
                message.edit({
                  components: [],
                  flags: MessageFlags.Ephemeral
                }).catch((error) => {
                  // Ignore "Unknown Message" errors (ephemeral message was closed)
                  if (error.code !== 10008) {
                    console.error('Failed to remove buttons:', error);
                  }
                });
              });
        }
    }
};  