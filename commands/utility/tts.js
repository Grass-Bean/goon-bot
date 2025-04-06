const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const {tts_endpoint} = require("../../config.json");
const gTTS = require('gtts');
const { Readable } = require('stream');

// Map to hold queues per guild
const guildQueues = new Map();

async function generateTTS(item) {
    // Implementation that returns audio buffer instead of writing to file
    // Example using fetch API for HTTP TTS service:
    const response = await fetch(tts_endpoint, {
        method: 'POST',
        body: JSON.stringify({
            text: item.text,
            voice: item.voice,
            language_code: item.voice[0]
        })
    });
    
    if (!response.ok) throw new Error('TTS generation failed');
    return Buffer.from(await response.arrayBuffer());
}

// Asynchronous processQueue function: awaits TTS generation before playback.
async function processQueue(queue) {
    if (queue.queue.length === 0) {
        queue.isPlaying = false;
        return;
    }
    queue.isPlaying = true;
    const item = queue.queue.shift();
    queue.currentItem = { ...item };

    // Voice connection setup remains the same
    if (!queue.connection) {
        queue.connection = joinVoiceChannel({
            channelId: item.interaction.member.voice.channel.id,
            guildId: item.interaction.guild.id,
            adapterCreator: item.interaction.guild.voiceAdapterCreator,
        });
        try {
            await entersState(queue.connection, VoiceConnectionStatus.Ready, 15_000);
        } catch (error) {
            console.error('Error connecting to voice channel:', error);
        }
        queue.connection.subscribe(queue.player);
    }

    try {
        let audioBuffer;
        console.log(`TTS voice: ${item.voice}`);
        
        if (item.voice === 'gtts') {
            // Generate TTS directly to buffer
            audioBuffer = await new Promise((resolve, reject) => {
                const tts = new gTTS(item.text, item.language || 'en');
                const chunks = [];
                const stream = tts.stream();
                
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        } else {
            // Modified generateTTS to return buffer instead of writing to file
            audioBuffer = await generateTTS(item);
        }

        if (item.interaction.deferred) {
            await item.interaction.editReply('🔊 Now playing TTS...');
        }

        // Create audio resource from buffer
        const stream = Readable.from(audioBuffer);
        const resource = createAudioResource(stream, {
            inputType: StreamType.OggOpus,
            inlineVolume: true
        });

        queue.player.play(resource);
    } catch (error) {
        console.error('Error generating TTS:', error);
        if (item.interaction.deferred) {
            await item.interaction.editReply('❌ Failed to generate TTS audio');
        }
        queue.currentItem = null;
        processQueue(queue);
    }
}

// Creates a new guild queue with one-time event listeners on the player.
function createGuildQueue() {
    const player = createAudioPlayer();
    const queue = {
        queue: [],
        // currentItem holds the TTS item being played.
        currentItem: null,
        player,
        connection: null,
        isPlaying: false,
    };

    // When the player goes idle, process the next item asynchronously.
    player.on(AudioPlayerStatus.Idle, async () => {
        if (queue.currentItem) {
            console.log('Audio playback finished. Bot is now idle.');
            // Notify the user that speaking is done.
            if (queue.currentItem.interaction.deferred || queue.currentItem.interaction.replied) {
                queue.currentItem.interaction.editReply({ content: '✅ Done speaking!'}).catch(() => {});
            }
            queue.currentItem = null;
        }
        await processQueue(queue);
    });

    // On error, log and notify the user, then continue with the next item.
    player.on('error', async error => {
        console.error('Player error:', error);
        if (queue.currentItem && (queue.currentItem.interaction.deferred || queue.currentItem.interaction.replied)) {
            await queue.currentItem.interaction.editReply({ content: '❌ Error playing audio' }).catch(() => {});
        }
        queue.currentItem = null;
        await processQueue(queue);
    });

    return queue;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Text-to-Speech functionality')
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current item in queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disconnect')
                .setDescription('Disconnect from voice channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('voice')
                .setDescription('Speak in voice channel')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Text to speak')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('language')
                        .setDescription('Language code (e.g. en, es, fr), only for gtts')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('voice')
                        .setDescription('Choose TTS version ig')
                        .setRequired(false)
                        .addChoices(
                            { name: 'gtts', value: 'gtts' },
                            { name: 'af_heart 🚺❤️ American English', value: 'af_heart' },
                            { name: 'af_alloy 🚺 American English', value: 'af_alloy' },
                            { name: 'af_aoede 🚺 American English', value: 'af_aoede' },
                            { name: 'af_bella 🚺🔥 American English', value: 'af_bella' },
                            { name: 'af_kore 🚺 American English', value: 'af_kore' },
                            { name: 'af_nicole 🚺🎧 American English', value: 'af_nicole' },
                            { name: 'af_nova 🚺 American English', value: 'af_nova' },   
                            { name: 'af_sarah 🚺 American English', value: 'af_sarah' },
                            { name: 'af_sky 🚺 American English', value: 'af_sky' },
                            { name: 'bf_emma 🚺 British English', value: 'bf_emma' },
                            { name: 'bf_isabella 🚺 British English', value: 'bf_isabella' },
                            { name: 'jf_alpha 🚺 Japanese', value: 'jf_alpha' },
                            { name: 'jf_gongitsune 🚺 Japanese', value: 'jf_gongitsune' },
                            { name: 'jf_nezumi 🚺 Japanese', value: 'jf_nezumi' },
                            { name: 'jf_tebukuro 🚺 Japanese', value: 'jf_tebukuro' },
                            { name: 'jm_kumo 🚹 Japanese', value: 'jm_kumo' },
                            { name: 'zf_xiaobei 🚺 Mandarin Chinese', value: 'zf_xiaobei' },
                            { name: 'zf_xiaoni 🚺 Mandarin Chinese', value: 'zf_xiaoni' },
                            { name: 'zf_xiaoxiao 🚺 Mandarin Chinese', value: 'zf_xiaoxiao' },
                            { name: 'zf_xiaoyi 🚺 Mandarin Chinese', value: 'zf_xiaoyi' },
                        ))
                ),
                        
    
    async execute(interaction) {
        
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'skip') {
            const guildId = interaction.guild.id;
            const queue = guildQueues.get(guildId);
            if (!queue || !queue.isPlaying) {
                return interaction.reply({ content: '❌ Nothing is currently playing!' });
            }
            // Stop the player (this triggers the idle event for cleanup).
            queue.player.stop();
            interaction.reply({ content: '⏩ Skipped current TTS playback' }).catch(() => {});
        } 
        
        else if (subcommand === 'disconnect') {
            const guildId = interaction.guild.id;
            const queue = guildQueues.get(guildId);
            if (queue) {
                // Clear any queued items.
                queue.queue = [];
                if (queue.connection) {
                    queue.connection.destroy();
                }
                guildQueues.delete(guildId);
                return interaction.reply({ content: '✅ Successfully disconnected from voice channel' });
            }
            return interaction.reply({ content: '❌ Not in a voice channel!' });
        } 
        
        else if (subcommand === 'voice') {
            const member = interaction.member;
            if (!member.voice.channel) {
                return interaction.reply({ content: '❌ You must be in a voice channel!' });
            }
            await interaction.deferReply();
            const guildId = interaction.guild.id;
            const language = interaction.options.getString('language') || 'en';
            const text = interaction.options.getString('text');
            const voice = interaction.options.getString('voice') || 'gtts';
            console.log(`Incoming text: ${text}`)
            let queue;
            if (!guildQueues.has(guildId)) {
                queue = createGuildQueue();
                guildQueues.set(guildId, queue);
            } else {
                queue = guildQueues.get(guildId);
            }
            
            // Add the TTS request to the queue.
            queue.queue.push({
                text,
                language,
                interaction,
                voice
            });
            
            // If nothing is playing, process the queue immediately.
            if (!queue.isPlaying) {
                processQueue(queue);
            } else {
                // Calculate the overall position in the queue.
                // The currently playing item is considered position 1.
                const position = queue.queue.length + 1;
                interaction.editReply(`✅ Your request has been added to the queue at position ${position}`);
            }
        }
    }
};
