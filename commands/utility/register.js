const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const GoonBotUser = require('../../classes/user');
const { goon_token } = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register as a new user'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const savePath = path.join(__dirname, '..', '..', 'object_store', 'users', `${userId}.json`);
        
        // Check if user already exists
        if (fs.existsSync(savePath)) {
            return interaction.reply({
                content: "❌ You're already registered!",
                flags: MessageFlags.Ephemeral
            });
        }
        try{
            // Create new user
            const newUser = new GoonBotUser(userId, savePath);
            newUser.balance = 1000; // Starting balance
            newUser.debt = 0;
            newUser.save_user();

            await interaction.reply({
                content: `🎉 Account created! You've been gifted 1,000 Goon Tokens ${goon_token}!`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Registration error:', error);
            await interaction.reply({
                content: "❌ Failed to create account. Please try again later.",
                ephemeral: true
            });
        }
    }
};