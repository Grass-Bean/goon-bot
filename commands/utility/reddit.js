const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const snoowrap = require('snoowrap');
const config = require('../../config.json');
const DEFAULT_SUBREDDITS = config.subreddit;
const userCooldowns = new Map();
const COOLDOWN_TIME = config.reddit_cooldown;
module.exports = {
    data: new SlashCommandBuilder()
    .setName('reddit')
    .setNSFW(true)
    .setDescription('Gets random reddit post with media (defaults: ZZZ_Official, WutheringWaves, HonkaiStarRail).')
    .addStringOption(option =>
        option.setName('subreddits')
            .setDescription('Optional comma-separated subreddits (default: ZZZ_Official, WutheringWaves, HonkaiStarRail)')
            .setRequired(false)) // Changed to not required
    .addStringOption(option =>
        option.setName('sort')
            .setDescription('Sorting method (default: hot)')
            .addChoices(
                { name: 'Hot', value: 'hot' },
                { name: 'New', value: 'new' },
                { name: 'Top', value: 'top' }
            )
            .setRequired(false))
    .addIntegerOption(option =>
        option.setName('limit')
            .setDescription('Posts per subreddit (default: 150. min: 50. max: 500)')
            .setMinValue(10)
            .setMaxValue(500)
            .setRequired(false)),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const currentTime = Date.now();
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
        await interaction.deferReply();

        try {
            // Get options from command
            userCooldowns.set(userId, currentTime);
            const subredditInput = interaction.options.getString('subreddits');
            const subreddits = subredditInput 
            ? subredditInput.split(',').map(s => s.trim().replace('r/', ''))
            : DEFAULT_SUBREDDITS;
            // Validate at least one subreddit exists
            if (subreddits.length === 0)
                return await interaction.editReply('❌ Please provide at least one valid subreddit');
            const sortMethod = interaction.options.getString('sort') || 'hot';
            const postLimit = interaction.options.getInteger('limit') || 150;

            // Get posts from all subreddits
            const allPosts = await this.searchMultipleSubreddits(subreddits, sortMethod, postLimit);
            
            if (allPosts.length === 0) {
                return await interaction.editReply('No media posts found in specified subreddits 😢');
            }
            
            // Select random post
            const randomPost = allPosts[Math.floor(Math.random() * allPosts.length)];
            const response = [
                `**From r/${randomPost.subreddit}**`,
                `**${randomPost.text}**`,
                `Score: ⬆️ ${randomPost.score}`,
                `Link: ${randomPost.link}`
            ].join('\n');

            await interaction.editReply(response);
        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to fetch posts 😢');
        }
    },
    
    async searchMultipleSubreddits(subreddits, sort = 'hot', limit = 150) {
        const r = new snoowrap({
            userAgent: 'GoonBot/1.0 (by YOUR_REDDIT_USERNAME)',
            clientId: config.reddit_client_id,
            clientSecret: config.reddit_secret_token,
            refreshToken: config.reddit_refresh_token
        });

        try {
            // Combine subreddits into multi-search
            console.log(`Searching ${subreddits.join('+')}`)
            const multiSub = await r.getSubreddit(subreddits.join('+'));

            // Get posts based on sort method
            let posts;
            switch(sort.toLowerCase()) {
                case 'new':
                    posts = await multiSub.getNew({ limit });
                    break;
                case 'top':
                    posts = await multiSub.getTop({ time: 'week', limit });
                    break;
                default:
                    posts = await multiSub.getHot({ limit });
            }
            
            // Media URL pattern matching
            const mediaRegex = /\.(jpe?g|png|gif|webp|mp4|mov|avi|webm)$/i;

            return posts.map(post => ({
                link: post.url,
                text: post.title,
                score: post.score,
                nsfw: post.over_18,
                subreddit: post.subreddit.display_name
            })).filter(post => 
                mediaRegex.test(post.link)
            );

        } catch (error) {
            console.error('Reddit API Error:', error);
            throw new Error('Failed to search subreddits');
        }
    }
};