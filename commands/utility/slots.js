const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { setTimeout: wait } = require('node:timers/promises');
const { slots_cooldown, goon_token } = require("../../config.json");
const userCooldowns = new Map();
const COOLDOWN_TIME = slots_cooldown;
const GoonBotUser = require('../../classes/user');

const WEIGHTED_SYMBOLS = [
    { symbol: '🍋', weight: 45 },  // Lemon - Most common
    { symbol: '🍒', weight: 35 },  // Cherry
    { symbol: '🍊', weight: 30 },  // Orange
    { symbol: '🔔', weight: 15 },  // Bell
    { symbol: '🍉', weight: 12 },  // Watermelon
    { symbol: '💠', weight: 10 },  // Diamond
    { symbol: '⭐', weight: 8 },    // Star
    { symbol: '🎰', weight: 6 },    // Slot Machine
    { symbol: '7️⃣', weight: 5 },    // Seven
    { symbol: '💰', weight: 3 },    // Money Bag
    { symbol: '👑', weight: 2 },    // Crown
    { symbol: '💎', weight: 1 },    // Gem (Rarest)
];

const SPIN_DURATION = 500;
const SPIN_ICON = '❓';

function generateSpinningEmbed(user, reels, revealedCount = 0) {
    const display = reels.map((s, i) => i < revealedCount ? s : SPIN_ICON);
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎰 Slot Machine Spinning...')
        .setDescription(`**${display.join(' | ')}**`)
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL() });
}

function calculateResult(reels) {
    const counts = {};
    for (const symbol of reels) {
        counts[symbol] = (counts[symbol] || 0) + 1;
    }

    const matches = Object.values(counts).sort((a, b) => b - a);
    const uniqueSymbols = new Set(reels).size;

    // Jackpot conditions
    const isJackpot = matches[0] === 3 && ['💎', '👑', '7️⃣'].includes(reels[0]);
    
    // Payout tiers
    if (isJackpot) {
        return { win: 'JACKPOT', multiplier: 50 };
    }
    if (matches[0] === 3) {
        const basePayout = {
            '💰': 20,
            '🔔': 15,
            '💠': 10,
            '⭐': 8,
            '🎰': 7,
            '🍉': 5,
            default: 3
        };
        return { 
            win: 'TRIPLE', 
            multiplier: basePayout[reels[0]] || basePayout.default 
        };
    }
    if (matches[0] === 2) {
        // Check for adjacent matches
        const isAdjacent = (reels[0] === reels[1]) || (reels[1] === reels[2]);
        return { 
            win: isAdjacent ? 'DOUBLE_ADJACENT' : 'DOUBLE',
            multiplier: isAdjacent ? 2 : 1 
        };
    }
    if (uniqueSymbols === 3 && ['💎', '⭐', '🔔'].every(s => reels.includes(s))) {
        return { win: 'SPECIAL_COMBO', multiplier: 5 };
    }
    return { win: 'LOSE', multiplier: 0 };
}

// Helper function to get random symbol based on weights
function getRandomSymbol() {
    const totalWeight = WEIGHTED_SYMBOLS.reduce((acc, cur) => acc + cur.weight, 0);
    const random = Math.random() * totalWeight;
    let accumulator = 0;

    for (const symbolData of WEIGHTED_SYMBOLS) {
        accumulator += symbolData.weight;
        if (random < accumulator) return symbolData.symbol;
    }
    return WEIGHTED_SYMBOLS[0].symbol; // Fallback
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('GAMBA!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet on (default: 1. min: 1)')
                .setMinValue(1)
                .setRequired(false)),
        
    async execute(interaction) {
        const userId = interaction.user.id;
        const currentTime = Date.now();
        const goonbotuser = GoonBotUser.load_user(userId);
        const used = interaction.options.getInteger('bet') || 1;
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
        if(!goonbotuser){
            return interaction.reply({
                content: '❌ You are not a registered user. Create a new account under /register to begin.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (!goonbotuser.sub_bal(used)){
            return interaction.reply({
                content: `❌ Insufficient balance.\nCurrent balance: **${goonbotuser.balance}** Goon Token(s) ${goon_token}.`,
            });
        }
        userCooldowns.set(userId, currentTime);
        // Generate final result first
        const reels = [
            getRandomSymbol(),
            getRandomSymbol(),
            getRandomSymbol()
        ];
        
        // Create initial spinning embed
        let embed = generateSpinningEmbed(interaction.user, reels);
        await interaction.reply({ embeds: [embed] });
        const message = await interaction.fetchReply();

        // Animate first reel
        await wait(SPIN_DURATION);
        embed = generateSpinningEmbed(interaction.user, reels, 1);
        await message.edit({ embeds: [embed] });

        // Animate second reel
        await wait(SPIN_DURATION);
        embed = generateSpinningEmbed(interaction.user, reels, 2);
        await message.edit({ embeds: [embed] });

        // Final result
        await wait(SPIN_DURATION);
        const result = calculateResult(reels);
        const colorMap = {
            JACKPOT: '#FFD700',
            TRIPLE: '#00FF00',
            DOUBLE_ADJACENT: '#FFA500',
            DOUBLE: '#ADD8E6',
            SPECIAL_COMBO: '#9400D3',
            LOSE: '#FF0000'
        };
        const won = used*result.multiplier;
        goonbotuser.add_bal(won);
        embed = new EmbedBuilder()
        .setColor(colorMap[result.win] || '#FFFFFF')
            .setTitle(result.win === 'JACKPOT' ? '💰 JACKPOT 💰' : '🎰 Slot Machine')
            .setDescription(`**${reels.join(' | ')}**`) // Wider spacing
            .addFields(
                { name: 'Result', value: getResultMessage(result.win) },
                { name: 'Used', value: `**${used}** Goon Token(s) ${goon_token}`, inline: true },
                { name: 'Won', value: `**${won}** Goon Token(s) ${goon_token}`, inline: true }
            )
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() }),
            
        await message.edit({ embeds: [embed] });
    }
};

function getResultMessage(resultType) {
    const messages = {
        JACKPOT: '🎉💰 JACKPOT! 💰🎉',
        TRIPLE: '🔥 Triple Match!',
        DOUBLE_ADJACENT: '🎯 Adjacent Pair!',   
        DOUBLE: '🎯 Matching Pair!',
        SPECIAL_COMBO: '✨ Special Symbol Combo!',
        LOSE: '💸 Aw, dang it!'
    };
    return messages[resultType] || 'No Result';
}