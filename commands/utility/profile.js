const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GoonBotUser = require('../../classes/user');
const GOON_TOKEN = '<:GoonToken:1357389504952139826>'
module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Provides information about the user.'),
	async execute(interaction) {
		const userId = interaction.user.id;
		let balance = 'NA';
		let debt = 'NA';
		let creation_date = 'NA';
		const user = GoonBotUser.load_user(userId);
		if (user) {
			balance = `**${user.balance}** Goon Token(s) ${GOON_TOKEN}`;
			debt = `**${user.debt}** Goon Token(s) ${GOON_TOKEN}`;
			creation_date = `<t:${Math.floor(user.date_created.getTime() / 1000)}:F>`;
		}
		const embed = new EmbedBuilder()
		.setColor(0xFFD700)
		.setAuthor({
			name: interaction.user.username,
			iconURL: interaction.user.displayAvatarURL(),
		})	
		.addFields(
			{ name: 'ID', value: userId, inline: true },
			{ name: 'Display Name', value: interaction.member.displayName, inline: true },
			{ name: 'Account Created',  value: `<t:${Math.floor(interaction.user.createdAt.getTime() / 1000)}:F>`},
			{ name: 'Joined', value: `<t:${Math.floor(interaction.member.joinedAt.getTime() / 1000)}:F>` },
			{ name: 'GoonBot Account Created', value: creation_date},
			{ name: 'Balance', value: balance },
			{ name: 'Debt', value: debt}
		)
		.setThumbnail(interaction.user.displayAvatarURL())
		.setTimestamp();
		
		await interaction.reply({ embeds: [embed] });
	},
};