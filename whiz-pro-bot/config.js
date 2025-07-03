// WHIZ-MD Bot Configuration File
// ==============================
// Here you can easily customize your bot's settings.

const config = {
    // --- Bot & Owner Information ---
    botName: "𝐖𝐇𝐈𝐙-𝐌𝐃", // The name of your bot
    ownerName: "Whiz",          // Your name or the owner's name

    // --- Environment Variable Keys ---
    // These are the names of the environment variables the bot will look for in your .env file
    ownerJidEnvKey: "OWNER_JID",                        // For owner-only commands
    statusSavesJidEnvKey: "OWNER_JID_FOR_STATUS_SAVES", // For the !save (status) command

    // --- Command Prefixes ---
    // An array of characters or strings that can prefix commands.
    // Example: ['!', '.', '#', '/'] means commands can be !ping, .ping, #ping, /ping
    prefixes: ['!', '.', '#', '/'],

    // --- Links ---
    repoUrl: "https://github.com/twoem/whizbotpro",
    whatsappGroupUrl: "https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM",

    // --- Message Footers ---
    // This text will be appended to many bot messages (via getBotFooter() in index.js)
    // The group link in getBotFooter() will use the 'hidden' format.
    // Emojis like ❤️ should be added directly here if desired.
    footerText: "Made with love by Whiz",

    // --- Command List for !menu ---
    // This list is used to dynamically generate the !menu command output.
    // Categories: 'General', 'Media & Utility', 'Group Admin', 'Owner Only'
    // `cmd`: The command keyword (without prefix)
    // `desc`: A short description of the command
    // `args`: (Optional) Arguments the command takes, e.g., "<query>" or "@user"
    commandsList: [
        // General Commands
        { cmd: 'ping', desc: 'Check bot responsiveness & uptime.', category: 'General' },
        { cmd: 'menu', desc: 'Display this command menu.', category: 'General' },
        { cmd: 'contact', desc: 'Get owner & group information.', category: 'General' },
        { cmd: 'source', desc: 'Get the link to the bot\'s source code.', category: 'General' },
        { cmd: 'jid', desc: 'Get JID of current chat/quoted user.', category: 'General' },
        { cmd: 'uptime', desc: 'Show how long the bot has been running.', category: 'General' },

        // Media & Utility Commands
        { cmd: 'sticker', desc: 'Reply to image/video to make a sticker.', args: '(reply to media)', category: 'Media & Utility' },
        { cmd: 'toimg', desc: 'Reply to a sticker to convert to image/video.', args: '(reply to sticker)', category: 'Media & Utility' },
        { cmd: 'vv', desc: 'Reply to view-once media to save it.', args: '(reply to view-once)', category: 'Media & Utility' },
        { cmd: 'save', desc: 'Reply "save" to a (forwarded) message to save its content.', args: '(reply "save")', category: 'Media & Utility' },
        { cmd: 'ytsearch', desc: 'Search YouTube for videos.', args: '<query>', category: 'Media & Utility' },
        { cmd: 'calc', desc: 'Evaluate a math expression.', args: '<expression>', category: 'Media & Utility' },

        // Group Admin Commands (Bot must be admin)
        { cmd: 'promote', desc: 'Make user an admin.', args: '@user', category: 'Group Admin' },
        { cmd: 'demote', desc: 'Remove admin rights from user.', args: '@user', category: 'Group Admin' },
        { cmd: 'kick', desc: 'Remove user from group.', args: '@user', category: 'Group Admin' },
        { cmd: 'grouplink', desc: 'Get the group\'s invite link.', category: 'Group Admin' },
        { cmd: 'groupinfo', desc: 'Display group details.', category: 'Group Admin' },

        // Owner Only Commands
        { cmd: 'delete', desc: 'Reply to my message to delete it.', args: '(reply to bot msg)', category: 'Owner Only' },
        { cmd: 'broadcast', desc: 'Send message to all my groups.', args: '<message>', category: 'Owner Only' },
        { cmd: 'restart', desc: 'Restart me.', category: 'Owner Only' },
    ]
};

module.exports = config;
