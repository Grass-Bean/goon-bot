const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bark')
		.setDescription('Barks!'),
	async execute(interaction) {
		await interaction.reply('GRR ARF BARK WOOF ARF BARK GRR SNARL RUFF WOOF BARK WOOF SNARL GRR ARF ARF WOOF BARK RUFF GRR ARF BARK WOOF ARF BARK GRR SNARL RUFF WOOF BARK WOOF SHART GRR ARF ARF WOOF BARK RUFF GRR ARF BARK WOOF ARF BARK GRR SNARL RUFF WOOF BARK WOOF SNARL GRR ARF ARF WOOF BARK RUFF GRR ARF');
	},
};