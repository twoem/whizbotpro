// Search Commands for WHIZ-MD-V2
// (e.g., img, ytsearch, lyrics, movie, news, ud, dic)

/*
Example structure:
const ytSearchCommand = {
    name: 'ytsearch',
    aliases: ['youtube'],
    category: 'Search',
    description: 'Search YouTube for videos.',
    usage: '!ytsearch <query>',
    async execute(sock, msg, args, config, addLog, formatAndSendMessage, externalApis) {
        // const results = await externalApis.youtubeSearch(args.join(' '));
        // await formatAndSendMessage(sock, msg.key.remoteJid, results, { quotedMsg: msg });
    }
};

module.exports = [
    ytSearchCommand,
    // ... other search commands
];
*/

module.exports = [];
