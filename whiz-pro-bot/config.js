// WHIZ-MD-V2 Bot Configuration File
// =================================
// Customize your bot's settings here.

const config = {
    // --- Bot & Owner Information ---
    botName: "𓅓ᴡʜɪᴢ ᴍᴅ𓅓", // Stylized Bot Name
    botVersion: "2.1.6",
    ownerName: "Whiz",
    ownerContact: "+254754783683", // Added for direct use

    // --- Environment Variable Keys ---
    // These are the names of the environment variables the bot will look for in your .env file
    ownerJidEnvKey: "OWNER_JID",                        // For owner-only commands (e.g., "2547xxxxxxxx@s.whatsapp.net")
    statusSavesJidEnvKey: "OWNER_JID_FOR_STATUS_SAVES", // For the !save (status) command ("2547xxxxxxxx@s.whatsapp.net")
    // Example for an API key: removeBgApiKeyEnvKey: "REMOVE_BG_API_KEY",

    // --- Command Prefixes ---
    prefixes: ['!', '.', '#', '/'],

    // --- Links ---
    repoUrl: "https://github.com/twoem/whizbotpro",
    whatsappGroupUrl: "https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM",

    // --- Media URLs ---
    mainLogoUrl: "https://i.ibb.co/mCCvTv6w/20250703-045149.jpg",
    ownerCmdImageUrl: "https://i.ibb.co/kgsM3jDB/DSC-1892.jpg",

    // --- Message Footers ---
    // The heart emoji (❤️) might cause issues with some tools if not handled as UTF-8.
    // It's generally safe in JavaScript strings. User can edit this file to add it.
    footerText: "Made with love by Whiz",
    // Example with heart: footerText: "Made with love ❤️ by Whiz",

    // --- Command List for !menu ---
    // This list will be populated as commands are implemented.
    // Categories: 'General', 'Media', 'Utility', 'Group', 'Owner', 'Fun', 'Search', 'Download', 'AI & API Tools'
    // `cmd`: The command keyword (without prefix)
    // `desc`: A short description of the command
    // `args`: (Optional) Arguments the command takes, e.g., "<query>" or "@user"
    // `adminOnly`: (Optional) boolean, true if only group admins can use
    // `ownerOnly`: (Optional) boolean, true if only bot owner can use
    // `groupOnly`: (Optional) boolean, true if command only works in groups
    commandsList: [
        // General
        { cmd: 'alive', desc: 'Check if the bot is online.', category: 'General' },
        { cmd: 'ping', desc: 'Check bot responsiveness & uptime.', category: 'General' },
        { cmd: 'menu', desc: 'Display this command menu.', category: 'General' },
        { cmd: 'contact', desc: 'Get owner & group information.', category: 'General' },
        { cmd: 'source', desc: 'Get the link to the bot\'s source code.', category: 'General' },
        { cmd: 'jid', desc: 'Get JID of current chat/quoted user.', category: 'General' },
        { cmd: 'uptime', desc: 'Show how long the bot has been running.', category: 'General' },

        // Media & Utility
        { cmd: 'sticker', desc: 'Create a sticker from media.', args: '(reply to image/video or send with caption)', category: 'Media' },
        // { cmd: 'sticker crop', desc: 'Crop the sticker size.', args: '(reply to sticker)', category: 'Media' }, // Example for later
        // { cmd: 'sticker author', desc: 'Add metadata author to sticker.', args: '<author_name>', category: 'Media' },
        // { cmd: 'sticker pack', desc: 'Add metadata pack name to sticker.', args: '<pack_name>', category: 'Media' },
        // { cmd: 'sticker nometadata', desc: 'Remove all metadata from a sticker.', args: '(reply to sticker)', category: 'Media' },
        // { cmd: 'steal', desc: 'Send a sticker with the bot\'s metadata.', args: '(reply to sticker)', category: 'Media' },
        { cmd: 'toimg', desc: 'Convert a sticker to an image/video.', args: '(reply to sticker)', category: 'Media' },
        { cmd: 'image', desc: 'Alias for !toimg.', args: '(reply to sticker)', category: 'Media' }, // Alias
        { cmd: 'vv', desc: 'Save view-once media.', args: '(reply to view-once)', category: 'Utility' },
        { cmd: 'save', desc: 'Save replied-to message content.', args: '(reply "save")', category: 'Utility' },
        { cmd: 'mp3', desc: 'Convert a video to audio.', args: '(reply to video)', category: 'Media' }, // Placeholder, needs ffmpeg
        // { cmd: 'tomp3', desc: 'Alias for !mp3.', args: '(reply to video)', category: 'Media' },
        // { cmd: 'mp4audio', desc: 'Alias for !mp3.', args: '(reply to video)', category: 'Media' },
        { cmd: 'tts', desc: 'Convert text to speech (sticker or audio).', args: '<text>', category: 'Media' }, // Placeholder, needs API/lib
        { cmd: 'removebg', desc: 'Remove background from an image.', args: '(reply to image)', category: 'AI & API Tools' }, // Needs API

        // Search & Info
        { cmd: 'img', desc: 'Search for an image using Google.', args: '<query>', category: 'Search' }, // Needs API/lib
        { cmd: 'ytsearch', desc: 'Search YouTube for videos.', args: '<query>', category: 'Search' },
        { cmd: 'l', desc: 'Get lyrics for a song.', args: '<song name>', category: 'Search' }, // Needs API
        { cmd: 'movie', desc: 'Get download link for a movie.', args: '<movie name>', category: 'Search' }, // Needs API
        { cmd: 'anime', desc: 'Get a random anime quote.', category: 'Fun' }, // Needs API
        // { cmd: 'anime name', desc: 'Get quote from specific anime character.', args: '<character name>', category: 'Fun' },
        // { cmd: 'anime title', desc: 'Get quote from an anime show.', args: '<show title>', category: 'Fun' },
        { cmd: 'fact', desc: 'Get a random fact.', category: 'Fun' }, // Needs API
        { cmd: 'news', desc: 'Show tech news.', category: 'Search' }, // Needs API
        // { cmd: 'news categories', desc: 'Show news from a specific category.', args: '<category>', category: 'Search' },
        // { cmd: 'list', desc: 'Show a list of news categories.', category: 'Search' },
        { cmd: 'gender', desc: 'Get gender percentage based on a name.', args: '<name>', category: 'Fun' }, // Needs API
        { cmd: 'horo', desc: 'Show horoscope for a zodiac sign.', args: '<zodiac sign>', category: 'Fun' }, // Needs API
        { cmd: 'advice', desc: 'Get random advice.', category: 'Fun' }, // Needs API
        { cmd: 'quote', desc: 'Get random quote.', category: 'Fun' }, // Needs API
        { cmd: 'proq', desc: 'Get programming quote.', category: 'Fun' }, // Needs API/list
        // { cmd: 'proquote', desc: 'Alias for !proq.', category: 'Fun' },
        // { cmd: 'qpt', desc: 'Get a poem by author and title.', args: '<author;title>', category: 'Fun' },
        // { cmd: 'qpt author', desc: 'Get a poem by a specific author.', args: '<author name>', category: 'Fun' },
        // { cmd: 'qpt authors', desc: 'List poem authors.', category: 'Fun' },
        // { cmd: 'qpoetry', desc: 'Get a poem by an author.', category: 'Fun' },
        { cmd: 'ud', desc: 'Show Urban Dictionary meaning of a word.', args: '<word>', category: 'Search' }, // Needs API
        { cmd: 'dic', desc: 'Get dictionary definition of a word.', args: '<word>', category: 'Search' }, // Needs API

        // Downloads (often require significant work and external libraries like ytdl-core, ffmpeg)
        { cmd: 'song', desc: 'Download a song by name.', args: '<song name>', category: 'Download' }, // Complex, needs ytdl-core, ffmpeg
        { cmd: 'yt', desc: 'Download a YouTube video.', args: '<YouTube link>', category: 'Download' }, // Complex
        // { cmd: 'vs', desc: 'Search for and download a video.', args: '<query>', category: 'Download' }, // Very complex
        { cmd: 'insta', desc: 'Download media from Instagram.', args: '<Instagram link>', category: 'Download' }, // Needs API/lib, often breaks
        // { cmd: 'idp', desc: 'Download private Instagram profile picture.', args: '<username>', category: 'Download' }, // Very complex, likely needs login

        // Group Admin Commands
        { cmd: 'add', desc: 'Add a new member to the group.', args: '<phone_number>', category: 'Group Admin', groupOnly: true, adminOnly: true },
        { cmd: 'ban', desc: 'Alias for !kick.', args: '@user', category: 'Group Admin', groupOnly: true, adminOnly: true },
        { cmd: 'promote', desc: 'Give admin permissions to a member.', args: '@user', category: 'Group Admin', groupOnly: true, adminOnly: true },
        { cmd: 'demote', desc: 'Remove admin permissions from a member.', args: '@user', category: 'Group Admin', groupOnly: true, adminOnly: true },
        { cmd: 'rename', desc: 'Change the group\'s subject.', args: '<new subject>', category: 'Group Admin', groupOnly: true, adminOnly: true },
        { cmd: 'welcome', desc: 'Set/manage the group\'s welcome message.', args: '[on|off|message]', category: 'Group Admin', groupOnly: true, adminOnly: true }, // Stateful
        { cmd: 'chat', desc: 'Enable or disable group chat (open/close group).', args: '<on|off>', category: 'Group Admin', groupOnly: true, adminOnly: true },
        { cmd: 'link', desc: 'Alias for !grouplink.', category: 'Group Admin', groupOnly: true },
        { cmd: 'warn', desc: 'Give a warning to a member.', args: '@user [reason]', category: 'Group Admin', groupOnly: true, adminOnly: true }, // Stateful
        { cmd: 'unwarn', desc: 'Remove a warning from a member.', args: '@user', category: 'Group Admin', groupOnly: true, adminOnly: true }, // Stateful
        { cmd: 'tagall', desc: 'Tag all members with a message.', args: '[message]', category: 'Group Admin', groupOnly: true },

        // Owner Only Commands
        { cmd: 'delete', desc: 'Reply to my message to delete it.', args: '(reply to bot msg)', category: 'Owner Only', ownerOnly: true },
        { cmd: 'broadcast', desc: 'Send message to all my groups.', args: '<message>', category: 'Owner Only', ownerOnly: true },
        { cmd: 'restart', desc: 'Restart me.', category: 'Owner Only', ownerOnly: true },

        // Examples of commands from the list that are more complex or might be placeholders for now
        // { cmd: 'joke categories', desc: 'Get a joke from a specific category.', args: '<category>', category: 'Fun' }, // Needs API with categories
        // { cmd: 'text', desc: 'Add header/footer text to an image.', args: 'Top;Bottom; (reply to image)', category: 'Media' }, // Needs image manipulation
        // { cmd: 'txtmeme', desc: 'Alias for !text.', args: 'Top;Bottom; (reply to image)', category: 'Media' },
        // { cmd: 'nsfw', desc: 'Get NSFW percentage of an image.', args: '(reply to image)', category: 'AI & API Tools' }, // Needs API
    ]
};

module.exports = config;
