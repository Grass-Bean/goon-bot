const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const GoonBotUser = require('../../classes/user');
const { goon_token } = require("../../config.json");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Get broke faster')
        .addSubcommand(subcommand =>
            subcommand
                .setName('loan')
                .setDescription('Get a loan')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to loan (default: 1. min: 1. max: 1000)')
                        .setMinValue(1)
                        .setMaxValue(1000)
                        .setRequired(false)),)
        .addSubcommand(subcommand =>
            subcommand
                .setName('repay')
                .setDescription('Pay back a loan')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to pay back (default: 1. min: 1)')
                        .setMinValue(1)
                        .setRequired(false)),),

    async execute(interaction){
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const goonbotuser = GoonBotUser.load_user(userId);
        const amount = interaction.options.getInteger('amount');
        if (!goonbotuser) {
            return interaction.reply({
                content: '❌ You are not a registered user. Create a new account under /register to begin.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (subcommand === 'loan') {
            try{
            goonbotuser.add_bal(amount);    
            goonbotuser.add_debt(amount);
            } catch(error){
                console.log(`Failed to give loan due to ${error}`)
            }
            return interaction.reply({
                content: `✅ Secured a loan of **${amount}** Goon Token(s) ${goon_token}.\nCurrent balance: **${goonbotuser.balance}** Goon Token(s) ${goon_token}.\nCurrent debt: **${goonbotuser.debt}** Goon Token(s) ${goon_token}.`,
            });
        }
        else if (subcommand === 'repay') {
            if (goonbotuser.debt === 0) {
                return interaction.reply('❌ You have no outstanding debts to repay.')
            }
            try {
                if (goonbotuser.sub_bal(amount)) {
                    goonbotuser.pay_debt(amount);
                    return interaction.reply({
                        content: `✅ Paid **${amount}** Goon Token(s) ${goon_token}.\nCurrent balance: **${goonbotuser.balance}** Goon Token(s) ${goon_token}.\nCurrent debt: **${goonbotuser.debt}** Goon Token(s) ${goon_token}.\nAny excess has been automatically credited to your account.`,
                    });
                }
            
                else{
                    return interaction.reply({
                        content: `❌ Insufficient balance.\nCurrent balance: ${goonbotuser.balance} Goon Token(s) ${goon_token}.`,
                    });
                }
            } catch (error) {
                console.log(`Failed to repay loan due to ${error}`);
            }
        };
    }   
}