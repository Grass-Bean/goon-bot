const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lewd')
		.setDescription(':D'),
	async execute(interaction) {
		await interaction.reply("https://img-9gag-fun.9cache.com/photo/apGyOQ9_460s.jpg");
	},
};