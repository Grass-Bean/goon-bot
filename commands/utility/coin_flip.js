const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {goon_coin_heads, goon_coin_tails} = require("../../config.json");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Flips a coin!'),
    async execute(interaction) {
        const faces = ['Heads', 'Tails'];
        const emotes = {
            'Heads': `${goon_coin_heads}`,
            'Tails': `${goon_coin_tails}`
        };
        const result = faces[Math.floor(Math.random() * faces.length)];
        const emoteString = emotes[result];
        const emoteId = emoteString.match(/\d+/)[0];

        const embed = new EmbedBuilder()
            .setColor(0xFFD700) // Gold color
            .setAuthor({
                name: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL(),
            })	
            .setDescription(`Flipped a coin and got **${result}**`)
            .setThumbnail(`https://cdn.discordapp.com/emojis/${emoteId}.png`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};