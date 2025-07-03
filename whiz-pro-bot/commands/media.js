// Media Commands for WHIZ-MD-V2
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const stickerCommand = {
    name: 'sticker',
    aliases: ['s'],
    category: 'Media',
    description: 'Create a sticker from an image or short video.',
    usage: '<prefix>sticker [pack_name;author_name] (reply to media or send media with caption)',
    async execute(commandContext) {
        const { sock, msg, argsString, config, addLog, formatAndSendMessage } = commandContext;
        const sender = msg.key.remoteJid;

        addLog(`[CMD_STICKER] Sticker command executed by ${sender}. Args: "${argsString}"`);

        let targetMessage = msg;
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const isReply = !!contextInfo?.stanzaId;

        if (isReply && contextInfo?.quotedMessage) {
            const quotedKey = {
                remoteJid: sender,
                id: contextInfo.stanzaId,
                participant: contextInfo.participant,
                // Attempt to correctly set fromMe for the quoted message key context
                fromMe: (contextInfo.participant || sender) === (sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : undefined)
            };
            targetMessage = { key: quotedKey, message: contextInfo.quotedMessage };
            addLog(`[CMD_STICKER] Processing quoted message for sticker.`, 'DEBUG');
        } else {
            addLog(`[CMD_STICKER] Processing current message for sticker.`, 'DEBUG');
        }

        const messageContent = targetMessage.message;
        let mediaType = null;
        if (messageContent?.imageMessage) {
            mediaType = 'image';
        } else if (messageContent?.videoMessage) {
            // WhatsApp official client usually enforces 5-7 seconds for animated stickers.
            // Baileys might send longer ones but they might not animate or send correctly.
            const videoDuration = messageContent.videoMessage.seconds;
            if (typeof videoDuration === 'number' && videoDuration > 15) { // 15 seconds limit for this basic implementation
                addLog(`[CMD_STICKER] Video too long for animated sticker (${videoDuration}s). Max 15s.`, "WARNING");
                await formatAndSendMessage(sock, sender, 'Video is too long for an animated sticker. Please use a shorter video (max 15 seconds).', { quotedMsg: msg });
                return;
            }
            mediaType = 'video'; // Will be treated as potentially animated by Baileys
        }

        if (mediaType) {
            try {
                addLog(`[CMD_STICKER] Media found. Type: ${mediaType}. Downloading...`, "DEBUG");
                const buffer = await downloadMediaMessage(
                    targetMessage,
                    'buffer',
                    {},
                    { logger: { info:()=>{}, error:addLog, warn:addLog }, reuploadRequest: sock.updateMediaMessage }
                );
                addLog(`[CMD_STICKER] Media downloaded. Size: ${buffer.length}. Creating sticker.`, "DEBUG");

                let packName = `${config.botName} Stickers`;
                let authorName = config.ownerName;

                if (argsString) {
                    const parts = argsString.split(';');
                    if (parts[0]) packName = parts[0].trim();
                    if (parts[1]) authorName = parts[1].trim();
                }

                const stickerOptions = {
                    pack: packName,
                    author: authorName,
                    // type: 'full' // or 'crop', 'rounded' - these require wa-sticker-formatter or similar library
                };

                await sock.sendMessage(sender, { sticker: buffer, ...stickerOptions }, { quoted: msg });
                addLog(`[CMD_STICKER] Sticker sent to ${sender} | Pack: "${packName}", Author: "${authorName}".`);

            } catch (stickerError) {
                addLog(`[CMD_STICKER] Error creating sticker: ${stickerError.message}`, 'ERROR');
                console.error(stickerError);
                await formatAndSendMessage(sock, sender, 'Oops! Failed to create sticker. Ensure it is a valid image or a short video (max 15s).', { quotedMsg: msg });
            }
        } else {
            addLog(`[CMD_STICKER] No image/video found for ${sender}.`, "WARNING");
            await formatAndSendMessage(sock, sender, `Please reply to an image/video with the command, or send an image/video with the command as caption (e.g., ${config.prefixes[0]}sticker MyPack;MyAuthor).`, { quotedMsg: msg });
        }
    }
};

const toimgCommand = {
    name: 'toimg',
    aliases: ['image'], // As per the 80 command list
    category: 'Media',
    description: 'Convert a sticker to an image or GIF/video.',
    usage: '<prefix>toimg (reply to a sticker)',
    async execute(commandContext) {
        const { sock, msg, config, addLog, formatAndSendMessage, downloadMediaMessage } = commandContext;
        const sender = msg.key.remoteJid;

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const isReply = !!contextInfo?.stanzaId;
        const quotedMsgInfo = contextInfo?.quotedMessage;

        addLog(`[CMD_TOIMG] !toimg command executed by ${sender}`);

        if (isReply && quotedMsgInfo?.stickerMessage) {
            const stickerMsg = quotedMsgInfo.stickerMessage;
            try {
                addLog(`[CMD_TOIMG] Quoted message is a sticker. Downloading...`, "DEBUG");

                // Construct the key of the quoted sticker message to pass to downloadMediaMessage
                const quotedKey = {
                    remoteJid: sender,
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant,
                    fromMe: (contextInfo.participant || sender) === (sock.user?.id.split(':')[0] + '@s.whatsapp.net')
                };

                const buffer = await downloadMediaMessage(
                    { key: quotedKey, message: quotedMsgInfo },
                    'buffer',
                    {},
                    { logger: { info:()=>{}, error:addLog, warn:addLog }, reuploadRequest: sock.updateMediaMessage }
                );
                addLog(`[CMD_TOIMG] Sticker media downloaded. Size: ${buffer.length}. Sending back as media.`, "DEBUG");

                let mediaToSend = {};
                let caption = "";

                if (stickerMsg.isAnimated) {
                     mediaToSend = { video: buffer, gifPlayback: true };
                     caption = "Animated sticker converted to GIF/Video ✨";
                     addLog(`[CMD_TOIMG] Sticker is animated, sending as video/gif.`, "DEBUG");
                } else {
                     mediaToSend = { image: buffer };
                     caption = "Sticker converted to Image ✨";
                     addLog(`[CMD_TOIMG] Sticker is static, sending as image.`, "DEBUG");
                }

                await formatAndSendMessage(sock, sender, caption, { mediaBuffer: buffer, mediaType: stickerMsg.isAnimated ? 'video' : 'image', gifPlayback: stickerMsg.isAnimated, quotedMsg: msg });
                addLog(`[CMD_TOIMG] Media sent successfully to ${sender}.`);

            } catch (toImgError) {
                addLog(`[CMD_TOIMG] Error converting sticker to image/video: ${toImgError.message}`, 'ERROR');
                console.error(toImgError);
                await formatAndSendMessage(sock, sender, 'Oops! Failed to convert sticker. Please ensure you replied to a valid sticker.', { quotedMsg: msg });
            }
        } else {
            addLog(`[CMD_TOIMG] Command not used as a reply to a sticker by ${sender}.`, "WARNING");
            await formatAndSendMessage(sock, sender, `Please reply to a sticker with the command \`${config.prefixes[0]}toimg\`.`, { quotedMsg: msg });
        }
    }
};

// Other media commands like toimg, vv will be moved/added here.
module.exports = [
    stickerCommand,
    toimgCommand,
];
