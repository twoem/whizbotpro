// Owner-Only Commands for WHIZ-MD-V2
const config = require('../config'); // To access config.ownerJidEnvKey if needed, though index.js handles the check

const deleteCommand = {
    name: 'delete',
    aliases: ['del', 'd'],
    category: 'Owner Only',
    description: 'Deletes a message previously sent by the bot.',
    usage: '<prefix>delete (reply to the bot\'s message you want to delete)',
    ownerOnly: true, // This flag will be checked by the main command handler in index.js
    async execute(commandContext) {
        const { sock, msg, addLog, formatAndSendMessage } = commandContext;
        const sender = msg.key.remoteJid; // This is the chat JID

        const quotedMsgInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const botJid = sock.user?.id;

        if (!isReply || !quotedMsgInfo) {
            addLog(`[CMD_DELETE] Owner (${sender}) used !delete without replying to a message.`, 'WARNING');
            // No need to send a message back, owner should know how to use.
            return;
        }

        // Check if the quoted message was actually sent by the bot
        // contextInfo.participant for group messages, or if quoted message key's fromMe is true.
        // For DMs, if the bot sent it, the quoted message's key.fromMe would be true from bot's perspective.
        // However, contextInfo.participant is more reliable if it's a group.
        // If it's a DM, the participant of the quoted message would be the bot's JID.
        const quotedMsgParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        const quotedMsgStanzaId = msg.message.extendedTextMessage.contextInfo.stanzaId;

        // A simple check: if participant of quoted message is the bot's JID
        if (quotedMsgParticipant === botJid) {
            const messageToDelKey = {
                remoteJid: sender, // The chat where the message is
                fromMe: true,      // Critical: Bot is deleting its own message
                id: quotedMsgStanzaId,
                participant: sender.endsWith('@g.us') ? botJid : undefined // For group messages, participant is who sent it (bot)
            };
            try {
                addLog(`[CMD_DELETE] Owner (${msg.key.participant || sender}) requested deletion of bot's message (ID: ${messageToDelKey.id}) in chat ${sender}`);
                await sock.sendMessage(sender, { delete: messageToDelKey });
                addLog(`[CMD_DELETE] Bot message deleted successfully.`);
                // Optionally react to the '!delete' command as confirmation
                await sock.sendMessage(sender, { react: { text: '👌', key: msg.key } });
            } catch (delErr) {
                addLog(`[CMD_DELETE] Error deleting message: ${delErr.message}`, 'ERROR');
                // Don't send an error message back for !delete to keep it clean and avoid loops
            }
        } else {
            addLog(`[CMD_DELETE] Owner (${msg.key.participant || sender}) tried to delete a message not sent by the bot, or in a context where participant ID didn't match bot JID. Quoted participant: ${quotedMsgParticipant}, Bot JID: ${botJid}`, 'WARNING');
            // Optionally inform owner that it wasn't the bot's message
            // await formatAndSendMessage(sock, sender, "I can only delete my own messages.", { quotedMsg: msg });
        }
    }
};

// Placeholder for other owner commands like !broadcast, !restart
module.exports = [
    deleteCommand,
    // restartCommand,
    // broadcastCommand,
];
