const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {ollama_endpoint, prompt_cooldown} = require("../../config.json");
const userCooldowns = new Map();
const COOLDOWN_TIME = prompt_cooldown;
module.exports = {
    data: new SlashCommandBuilder()
		.setName('slm')
		.setDescription('Prompt a small language model.')
        .addSubcommand(subcommand=>
            subcommand.setName('qwen')
            .setDescription("Model: Qwen2.5:1.5b")
            .addStringOption(option =>
                option.setName('prompt')
                .setDescription('Your prompt.')
                .setRequired(true))
        ),


    async execute(interaction) {
		const userId = interaction.user.id;
        const currentTime = Date.now();
        const subcommand = interaction.options.getSubcommand();
        let model = '';
        if (subcommand === 'qwen'){
            model = 'qwen2.5:1.5b';
        }
		if (userCooldowns.has(userId)) {
            const expirationTime = userCooldowns.get(userId) + COOLDOWN_TIME;
            
            if (currentTime < expirationTime) {
                const remaining = (expirationTime - currentTime) / 1000;
                return interaction.reply({
                    content: `Please wait ${remaining.toFixed(1)} more seconds before using this command again.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
        // Defer reply as LLM processing might take time
        await interaction.deferReply();

        try {
			userCooldowns.set(userId, currentTime);
            const response = await fetch(ollama_endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model:  model,
                    prompt: interaction.options.getString('prompt'),
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`Ollama API Error: ${response.status}`);
            
            const data = await response.json();
            await interaction.editReply(`${data.response}`);

        } catch (error) {
            console.error('Ollama Error:', error);
            await interaction.editReply('Prompt is down at the moment.');
        }
    },
};