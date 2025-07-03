require('dotenv').config();
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');
const YouTube = require('youtube-sr').default;
const { evaluate, isResultSet } = require('mathjs');

const startTime = new Date();

// --- Persistent Data Directory Setup (for OnRender) ---
const DATA_DIR = process.env.DATA_DIR || process.env.RENDER_DISK_MOUNT_PATH || '.';
if (DATA_DIR !== '.' && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[INIT] Created persistent data directory: ${DATA_DIR}`);
}
// --- End Persistent Data Directory Setup ---


// --- Log Collection for Web UI ---
const MAX_LOG_ENTRIES = 200;
const botLogs = [];
const LOG_FILE_PATH = path.join(DATA_DIR, 'logs.txt');

function addLog(message, type = 'INFO') {
  const timestamp = new Date();
  const logEntry = {
    timestamp: timestamp.toISOString(),
    type,
    message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message)
  };

  botLogs.push(logEntry);
  if (botLogs.length > MAX_LOG_ENTRIES) {
      botLogs.shift();
  }

  const consoleMessage = `[${type}] ${timestamp.toLocaleTimeString()}: ${logEntry.message}`;
  switch (type) {
    case 'ERROR': console.error(consoleMessage); break;
    case 'WARNING': console.warn(consoleMessage); break;
    case 'DEBUG': console.debug(consoleMessage); break;
    default: console.log(consoleMessage); break;
  }

  try {
    fs.appendFileSync(LOG_FILE_PATH, `[${timestamp.toISOString()}] [${type}] ${logEntry.message}\n`);
  } catch (err) {
    console.error(`[CRITICAL_LOG_FAIL] Failed to write to ${LOG_FILE_PATH}: ${err.message}`);
  }
}
// --- End Log Collection ---

// --- Helper function for "hidden" link ---
function formatHiddenLink(url) {
    if (!url || typeof url !== 'string') return '';
    return url.split('').join('\u200B');
}
// --- End Helper function ---

// --- Standard Message Footer & Links ---
const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM';
const REPO_LINK = 'https://github.com/twoem/whizbotpro';

function getBotFooter() {
    const hiddenGroupLink = formatHiddenLink(WHATSAPP_GROUP_LINK);
    return `\n\n---\nMade with love ❤️ by Whiz\nGroup: ${hiddenGroupLink}`;
}
// --- End Standard Message Footer ---

addLog("𝐖𝐇𝐈𝐙-𝐌𝐃 Bot (Baileys) starting up...");

const BAILEYS_AUTH_PATH = path.join(DATA_DIR, 'baileys_auth_info');
if (!fs.existsSync(BAILEYS_AUTH_PATH)) {
    fs.mkdirSync(BAILEYS_AUTH_PATH, { recursive: true });
    addLog(`Created Baileys auth directory: ${BAILEYS_AUTH_PATH}`, 'DEBUG');
}

let sock = null;

function formatUptime(start) {
  const ms = new Date() - start;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let uptimeString = "";
  if (hours > 0) uptimeString += `${hours}h `;
  if (minutes > 0) uptimeString += `${minutes}m `;
  uptimeString += `${seconds}s`;
  return uptimeString.trim() === "0s" ? "just now" : uptimeString.trim();
}

async function connectToWhatsApp() {
  addLog('[BAILEYS_CONNECT] Attempting to connect...');
  const { state, saveCreds } = await useMultiFileAuthState(BAILEYS_AUTH_PATH);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  addLog(`[BAILEYS_CONNECT] Using Baileys version: ${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    browser: ['𝐖𝐇𝐈𝐙-𝐌𝐃', 'Chrome', '120.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      addLog('[BAILEYS_CONNECT] QR code received — rendering now in terminal...');
      qrcodeTerminal.generate(qr, { small: true }, (qrString) => {
          console.log("\n" + qrString + "\n");
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      addLog(`[BAILEYS_CONNECT] Connection closed. Status: ${statusCode} (${DisconnectReason[statusCode] || 'Unknown'})`, 'WARNING');

      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
        addLog('Authentication error (logged out or bad session). Clearing auth info and attempting to reconnect for new QR.', 'ERROR');
        try {
            if (fs.existsSync(BAILEYS_AUTH_PATH)) {
                fs.readdirSync(BAILEYS_AUTH_PATH).forEach(f => fs.unlinkSync(path.join(BAILEYS_AUTH_PATH, f)));
                addLog('Old auth files deleted.', 'INFO');
            }
        } catch (err) {
            addLog(`Error deleting auth files: ${err.message}`, 'ERROR');
        }
        connectToWhatsApp();
      } else {
        addLog('Unexpected disconnect. Attempting to reconnect...', 'WARNING');
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      addLog('[BAILEYS_CONNECT] WhatsApp connection opened successfully. 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot is now online! 🎉');
      const botJid = sock.user?.id;
      if (botJid) {
        const userName = sock.user?.name || sock.user?.notify || botJid.split('@')[0];

        let startupMessageText = `Hello ${userName} 🤗\nYour Bot (𝐖𝐇𝐈𝐙-𝐌𝐃 with Baileys) is running perfectly 💥\n`;
        startupMessageText += `Repo: ${REPO_LINK}\n`;
        startupMessageText += `Uptime: ${formatUptime(startTime)}`;
        startupMessageText += getBotFooter();

        try {
            await sock.sendMessage(botJid, { text: startupMessageText });
            addLog("[BAILEYS_CONNECT] Startup notification sent to self.");
        } catch (err) {
            addLog(`[BAILEYS_CONNECT] Failed to send startup notification: ${err.message}`, "ERROR");
        }
      } else {
        addLog("[BAILEYS_CONNECT] Could not determine bot JID for startup message.", 'WARNING');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const msgText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '').trim();
    const command = msgText.toLowerCase();

    addLog(`[MSG_HANDLER] Received message from ${sender}: "${msgText}"`, 'DEBUG');

    try {
        if (command === '!menu') {
            addLog(`[MSG_HANDLER] Received !menu command from ${sender}`);
            const menuText = `
╭─ フロンティア 𝐖𝐇𝐈𝐙-𝐌𝐃 𝐁𝐎𝐓 フロンティア─╮
│
│ ✨ *Hello! I'm 𝐖𝐇𝐈𝐙-𝐌𝐃, your WhatsApp Assistant!* ✨
│
├─ フロンティア *General Commands* フロンティア─┤
│ ⚜️ \`!ping\` - Check my responsiveness & uptime.
│ ⚜️ \`!menu\` - Display this command menu.
│ ⚜️ \`!contact\` - Get owner & group information.
│ ⚜️ \`!source\` - Get my source code link.
│ ⚜️ \`!jid\` - Get chat/user JID.
│ ⚜️ \`!uptime\` - Show how long I've been running.
│
├─ フロンティア *Media & Utility* フロンティア─┤
│ ⚜️ \`!sticker\` - Reply to image/video to make a sticker.
│ ⚜️ \`!toimg\` - Reply to a sticker to convert to image/video.
│ ⚜️ \`!vv\` - Reply to view-once media to save it.
│ ⚜️ \`!save\` - Reply "save" to a (forwarded) status/message to save its content.
│ ⚜️ \`!ytsearch <query>\` - Search YouTube for videos.
│ ⚜️ \`!calc <expression>\` - Evaluate a math expression.
│
├─ フロンティア *Group Admin Commands* フロンティア─┤
│ *(Bot and user must be admin)*
│ ⚙️ \`!promote @user\` - Make user an admin.
│ ⚙️ \`!demote @user\` - Remove admin rights from user.
│ ⚙️ \`!kick @user\` - Remove user from group.
│ ⚙️ \`!grouplink\` - Get the group's invite link.
│ ⚙️ \`!groupinfo\` - Display group details.
│
├─ フロンティア *Owner Only Commands* フロンティア─┤
│ 🔑 \`!delete\` - Reply to my message to delete it.
│ 🔑 \`!broadcast <message>\` - Send message to all my groups.
│ 🔑 \`!restart\` - Restart me.
│
├─ フロンティア *Automatic Features* フロンティア─┤
│ 🔥 Auto Like Statuses.
│ 👁️ _Auto View Statuses (Under Review)_.
│
├─ フロンティア *Links & Info* フロンティア─┤
│ 🔗 Repo: ${REPO_LINK}
│ 🔗 Group: ${WHATSAPP_GROUP_LINK} (Plain link for menu)
│
╰─ フロンティア Powered by Whiz フロンティア─╯
`;
            await sock.sendMessage(sender, { text: menuText.trim() }); // Menu is self-contained, no getBotFooter()
            addLog(`[CMD] Sent enhanced menu to ${sender}`);
            return;
        }

        if (command === '!ping') {
            addLog(`[CMD] Received !ping command from ${sender}`);
            const pingReply = `Pong! 🏓\nUptime: ${formatUptime(startTime)}` + getBotFooter();
            await sock.sendMessage(sender, { text: pingReply });
            addLog(`[CMD] Sent !ping reply to ${sender}`);
            return;
        }

        if (command === '!contact') {
            addLog(`[CMD] Received !contact command from ${sender}`);
            const ownerNumber = "254754783683";
            const ownerName = "Whiz";
            const vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\nEND:VCARD`;

            await sock.sendMessage(sender, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard: vCard }]
                }
            });
            addLog(`[CMD] Sent contact card for ${ownerName} to ${sender}`);

            const contactFollowUp = `For community support or further questions, you can also join our group!` + getBotFooter();
            await sock.sendMessage(sender, { text: contactFollowUp });
            addLog(`[CMD] Sent contact follow-up message to ${sender}`);
            return;
        }

        const quotedMsgInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.stanzaId;

        if (command.startsWith('!vv') && isReply && quotedMsgInfo) {
            addLog(`[CMD] !vv command detected for a replied message from ${sender}`);
            const viewOnceTypes = ['viewOnceMessageV2Extension', 'viewOnceMessageV2', 'viewOnceMessage'];
            let actualViewOnceMsgContent = null;
            for (const type of viewOnceTypes) { if (quotedMsgInfo[type]) { actualViewOnceMsgContent = quotedMsgInfo[type].message; break; } }
            if (!actualViewOnceMsgContent && quotedMsgInfo.ephemeralMessage?.message) { for (const type of viewOnceTypes) { if (quotedMsgInfo.ephemeralMessage.message[type]) { actualViewOnceMsgContent = quotedMsgInfo.ephemeralMessage.message[type].message; break; } } }

            if (actualViewOnceMsgContent) {
                const mediaTypeKey = Object.keys(actualViewOnceMsgContent)[0];
                if (mediaTypeKey === 'imageMessage' || mediaTypeKey === 'videoMessage') {
                    try {
                        const originalMsgKey = { remoteJid: msg.message.extendedTextMessage.contextInfo.participant || sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: (msg.message.extendedTextMessage.contextInfo.participant || sender) === sock.user.id.split(':')[0] + '@s.whatsapp.net' };
                        const buffer = await downloadMediaMessage({ key: originalMsgKey, message: quotedMsgInfo }, 'buffer', {}, { logger: { info:()=>{}, error:console.error, warn:console.warn }, reuploadRequest: sock.updateMediaMessage });
                        const mediaType = mediaTypeKey.replace('Message','').toLowerCase();
                        await sock.sendMessage(sender, { [mediaType]: buffer, caption: "Here's the view-once media! ✨ - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter() });
                        await sock.sendMessage(sender, {text: "Got it! ✨ The view-once media has been captured and sent to you by 𝐖𝐇𝐈𝐙-𝐌𝐃." + getBotFooter()});
                        addLog(`[CMD] View-once media sent to ${sender}`);
                    } catch (err) {
                        addLog(`[ERROR] View-once download/send failed for ${sender}: ${err.message}`, 'ERROR');
                        console.error(err);
                        await sock.sendMessage(sender, {text: "Oops! Something went wrong while trying to capture the media. 😥 - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter()});
                    }
                } else { await sock.sendMessage(sender, {text: "Hmm, the replied message doesn't seem to be a view-once image or video. 🤔 - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter()}); }
            } else { await sock.sendMessage(sender, {text: "Hmm, it seems you didn't reply to a view-once message. Please use `!vv` as a reply. 🤔 - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter()}); }
            return;
        }

        if (command.startsWith('save') && isReply && quotedMsgInfo) {
            addLog(`[CMD] 'save' command detected for a replied message from ${sender}`);
            const ownerJidForStatusSaves = process.env.OWNER_JID_FOR_STATUS_SAVES;
            const botJid = sock.user?.id;
            if (!ownerJidForStatusSaves || !botJid) {
                addLog(`[CMD_SAVE_STATUS] OWNER_JID_FOR_STATUS_SAVES env var not set or bot JID not available. Cannot save status.`, 'ERROR');
                await sock.sendMessage(sender, { text: "Sorry, the 'save status' feature is not configured correctly by the admin." + getBotFooter() }); return;
            }
            try {
                let messageToSend = {}; let quotedText = quotedMsgInfo.conversation || quotedMsgInfo.extendedTextMessage?.text || '';
                const originalMsgKeyForSave = { remoteJid: msg.message.extendedTextMessage.contextInfo.participant || sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: (msg.message.extendedTextMessage.contextInfo.participant || sender) === sock.user.id.split(':')[0] + '@s.whatsapp.net'};
                if (quotedMsgInfo.imageMessage) {
                    const mediaBuffer = await downloadMediaMessage({ key: originalMsgKeyForSave, message: quotedMsgInfo }, 'buffer', {}, { logger: {info:()=>{}}, reuploadRequest: sock.updateMediaMessage });
                    messageToSend = { image: mediaBuffer, caption: (quotedMsgInfo.imageMessage.caption || '') + '\n\n(Saved from a reply)' };
                } else if (quotedMsgInfo.videoMessage) {
                    const mediaBuffer = await downloadMediaMessage({ key: originalMsgKeyForSave, message: quotedMsgInfo }, 'buffer', {}, { logger: {info:()=>{}}, reuploadRequest: sock.updateMediaMessage });
                    messageToSend = { video: mediaBuffer, caption: (quotedMsgInfo.videoMessage.caption || '') + '\n\n(Saved from a reply)' };
                } else if (quotedText) {
                    messageToSend = { text: `Forwarded message/status:\n\n${quotedText}` };
                } else {
                    await sock.sendMessage(sender, { text: "Sorry, I can only save text, image, or video messages." + getBotFooter() }); return;
                }
                await sock.sendMessage(botJid, messageToSend); addLog(`[CMD_SAVE_STATUS] Content forwarded to bot's own JID: ${botJid}`);
                await sock.sendMessage(ownerJidForStatusSaves, messageToSend); addLog(`[CMD_SAVE_STATUS] Content forwarded to owner JID: ${ownerJidForStatusSaves}`);
                await sock.sendMessage(sender, { text: "Content saved and forwarded successfully!" + getBotFooter() });
            } catch (error) {
                addLog(`[CMD_SAVE_STATUS] Error saving/forwarding content: ${error.message}`, 'ERROR'); console.error(error);
                await sock.sendMessage(sender, { text: "Oops! Something went wrong. 😥" + getBotFooter() });
            }
            return;
        }

        if (command.startsWith('!sticker')) {
            addLog(`[CMD] !sticker command detected from ${sender}`);
            let targetMessageSticker = msg;
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) { targetMessageSticker = { key: { remoteJid: sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, participant: msg.message.extendedTextMessage.contextInfo.participant }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }; addLog(`[CMD_STICKER] Processing quoted message for sticker. StanzaId: ${targetMessageSticker.key.id}`, "DEBUG");}
            else { addLog(`[CMD_STICKER] Processing current message for sticker.`, "DEBUG"); }
            const imageMsgSticker = targetMessageSticker.message?.imageMessage; const videoMsgSticker = targetMessageSticker.message?.videoMessage;
            if (imageMsgSticker || videoMsgSticker) {
                try {
                    const buffer = await downloadMediaMessage(targetMessageSticker, 'buffer', {}, { logger: { info:()=>{}, error:console.error, warn:console.warn }, reuploadRequest: sock.updateMediaMessage });
                    addLog(`[CMD_STICKER] Media downloaded. Size: ${buffer.length}. Creating sticker.`, "DEBUG");
                    const stickerOptions = { pack: '𝐖𝐇𝐈𝐙-𝐌𝐃 Stickers', author: 'Whiz ❤️'};
                    await sock.sendMessage(sender, { sticker: buffer, ...stickerOptions }); addLog(`[CMD_STICKER] Sticker sent successfully to ${sender}.`);
                } catch (stickerError) { addLog(`[CMD_STICKER] Error creating or sending sticker: ${stickerError.message}`, 'ERROR'); console.error(stickerError); await sock.sendMessage(sender, { text: 'Oops! Failed to create sticker. Please ensure it\'s a valid image or short video.' + getBotFooter() }); }
            } else { addLog(`[CMD_STICKER] No image/video found for ${sender}.`, "WARNING"); await sock.sendMessage(sender, { text: 'Please reply to an image/video with `!sticker`, or send an image/video with `!sticker` as the caption.' + getBotFooter() }); }
            return;
        }

        if (command.startsWith('!toimg') && isReply && quotedMsgInfo) {
            addLog(`[CMD] !toimg command detected from ${sender}`); const stickerMsg = quotedMsgInfo.stickerMessage;
            if (stickerMsg) {
                try {
                    addLog(`[CMD_TOIMG] Quoted message is a sticker. Downloading...`, "DEBUG");
                    const buffer = await downloadMediaMessage({ key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quotedMsgInfo }, 'buffer', {}, { logger: { info:()=>{}, error:console.error, warn:console.warn }, reuploadRequest: sock.updateMediaMessage });
                    addLog(`[CMD_TOIMG] Sticker media downloaded. Size: ${buffer.length}.`, "DEBUG");
                    let mediaToSend = { image: buffer, caption: "Sticker converted to Image ✨" + getBotFooter() };
                    if (stickerMsg.isAnimated) { mediaToSend = { video: buffer, gifPlayback: true, caption: "Animated sticker converted to GIF/Video ✨" + getBotFooter() }; addLog(`[CMD_TOIMG] Sticker is animated, sending as video/gif.`, "DEBUG");}
                    await sock.sendMessage(sender, mediaToSend); addLog(`[CMD_TOIMG] Media sent successfully to ${sender}.`);
                } catch (toImgError) { addLog(`[CMD_TOIMG] Error converting sticker: ${toImgError.message}`, 'ERROR'); console.error(toImgError); await sock.sendMessage(sender, { text: 'Oops! Failed to convert sticker.' + getBotFooter() }); }
            } else { addLog(`[CMD_TOIMG] Quoted message is not a sticker for ${sender}.`, "WARNING"); await sock.sendMessage(sender, { text: 'Please reply to a sticker with `!toimg`.' + getBotFooter() }); }
            return;
        }

        if (command === '!jid') {
            addLog(`[CMD] !jid command detected from ${sender}`); let replyText = `Chat JID: ${sender}`; const contextInfo = msg.message?.extendedTextMessage?.contextInfo; if (isReply && contextInfo?.participant) { replyText += `\nQuoted User JID: ${contextInfo.participant}`; } replyText += getBotFooter(); await sock.sendMessage(sender, { text: replyText }); addLog(`[CMD] Sent JID info to ${sender}`);
            return;
        }

        if (command === '!delete' && isReply && quotedMsgInfo) {
            const ownerJidEnv = process.env.OWNER_JID;
            if (ownerJidEnv && sender.startsWith(ownerJidEnv.split('@')[0])) {
                const botJid = sock.user?.id;
                if (msg.message.extendedTextMessage.contextInfo.participant === botJid) {
                    const messageToDelKey = { remoteJid: sender, fromMe: true, id: msg.message.extendedTextMessage.contextInfo.stanzaId };
                    try { addLog(`[CMD_DELETE] Owner (${sender}) requested deletion of bot's message (ID: ${messageToDelKey.id})`); await sock.sendMessage(sender, { delete: messageToDelKey }); addLog(`[CMD_DELETE] Bot message deleted successfully.`); } catch (delErr) { addLog(`[CMD_DELETE] Error deleting message: ${delErr.message}`, 'ERROR');}
                } else {addLog(`[CMD_DELETE] Owner (${sender}) tried to delete a message not sent by the bot.`, 'WARNING');}
            } else {addLog(`[CMD_DELETE] Non-owner (${sender}) or OWNER_JID not set, tried to use !delete command.`, 'WARNING');}
            return;
        }

        if (command === '!source') {
            addLog(`[CMD] !source command detected from ${sender}`); const sourceMessage = `You can find my source code and contribute at:\n${REPO_LINK}` + getBotFooter(); await sock.sendMessage(sender, { text: sourceMessage }); addLog(`[CMD] Sent source link to ${sender}`);
            return;
        }

        const getGroupAdmins = async (groupId) => { try { const m = await sock.groupMetadata(groupId); return m.participants.filter(p=>p.admin!==null).map(p=>p.id); } catch(e){addLog(`Error fetching group metadata for ${groupId}: ${e.message}`, 'ERROR'); return[];} };
        if (command.startsWith('!promote') || command.startsWith('!demote') || command.startsWith('!kick')) {
            if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "These commands can only be used in a group." + getBotFooter() }); return;}
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mentionedJids.length) { await sock.sendMessage(sender, {text: "Please mention the user(s) you want to perform the action on." + getBotFooter()}); return;}

            const groupMetadataForAdminCheck = await sock.groupMetadata(sender).catch((e) => {addLog(`Error fetching group metadata for admin check: ${e.message}`, 'ERROR'); return null;});
            const groupAdmins = groupMetadataForAdminCheck?.participants.filter(p=>p.admin !== null).map(p=>p.id) || [];
            const botIsAdmin = groupAdmins.includes(sock.user?.id);

            if (!botIsAdmin) { await sock.sendMessage(sender, {text: "I need to be an admin in this group to perform that action." + getBotFooter()}); return;}
            // Optional: Check if sender is admin: const senderIsAdmin = groupAdmins.includes(msg.key.participant || sender); if (!senderIsAdmin) { await sock.sendMessage(sender, {text: "You must be an admin to use this command."+getBotFooter()}); return;}

            let action = ''; let actionGerund = '';
            if (command.startsWith('!promote')) { action = 'promote'; actionGerund = 'Promoting'; }
            else if (command.startsWith('!demote')) { action = 'demote'; actionGerund = 'Demoting'; }
            else if (command.startsWith('!kick')) { action = 'remove'; actionGerund = 'Kicking'; }

            addLog(`[CMD_GROUP] ${actionGerund} user(s) ${mentionedJids.join(', ')} in group ${sender} by ${msg.key.participant || sender}`);
            try {
                const result = await sock.groupParticipantsUpdate(sender, mentionedJids, action);
                let successCount = 0; let failCount = 0; let detailedResults = [];
                if (Array.isArray(result)) { result.forEach(r => { (String(r.status).startsWith('2') ? successCount++ : failCount++); detailedResults.push(`@${r.jid.split('@')[0]}: ${r.status}`); });
                } else if (result && String(result.status).startsWith('2')) { successCount = 1; detailedResults.push(`@${result.jid.split('@')[0]}: ${result.status}`);
                } else if (result) { failCount = 1; detailedResults.push(`@${result.jid.split('@')[0]}: ${result.status || 'unknown error'}`); }

                if (successCount > 0 && failCount === 0) await sock.sendMessage(sender, { text: `Successfully ${actionGerund.toLowerCase().replace('ing','ed')} ${successCount} user(s).` + getBotFooter() });
                else if (successCount > 0 && failCount > 0) await sock.sendMessage(sender, { text: `Action partially successful for ${actionGerund.toLowerCase()}:\n${detailedResults.join('\n')}` + getBotFooter() });
                else if (failCount > 0) await sock.sendMessage(sender, { text: `Failed to ${action.toLowerCase()} user(s). Details:\n${detailedResults.join('\n')}` + getBotFooter() });
                else await sock.sendMessage(sender, { text: `Action ${actionGerund.toLowerCase()} completed. Status unknown or no users affected.` + getBotFooter() });
                addLog(`[CMD_GROUP] ${action} action result for ${sender}: ${JSON.stringify(result)}`);
            } catch (groupErr) { addLog(`[CMD_GROUP] Error performing ${action} in group ${sender}: ${groupErr.message}`, 'ERROR'); console.error(groupErr); await sock.sendMessage(sender, { text: `An error occurred. I might not have sufficient permissions or the user(s) may not be in the group.` + getBotFooter() }); }
            return;
        }

        if (command === '!grouplink') {
            if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "This command can only be used in a group." + getBotFooter()}); return;}
            addLog(`[CMD_GROUP] !grouplink command detected in group ${sender} by ${msg.key.participant || sender}`);
            try {const code = await sock.groupInviteCode(sender); await sock.sendMessage(sender, {text: `🔗 Group Invite Link:\nhttps://chat.whatsapp.com/${code}`+getBotFooter()}); addLog(`[CMD_GROUP] Sent group invite link for ${sender}`);}
            catch(err){ addLog(`[CMD_GROUP] Error getting group invite code for ${sender}: ${err.message}`, 'ERROR'); console.error(err); await sock.sendMessage(sender, {text:"Could not get the group invite link. I might need to be an admin, or an invite link may not be set."+getBotFooter()});}
            return;
        }

        if (command === '!groupinfo') {
            if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "This command can only be used in a group." + getBotFooter()}); return;}
            addLog(`[CMD_GROUP] !groupinfo command detected in group ${sender} by ${msg.key.participant || sender}`);
            try { const m = await sock.groupMetadata(sender); const info = `*✨ Group Information ✨*\n\nName: ${m.subject}\nID: ${m.id}\nParticipants: ${m.participants.length}\nOwner: ${m.owner ? m.owner.split('@')[0] : 'N/A'}\nCreated: ${new Date(m.creation * 1000).toLocaleString()}` + getBotFooter(); await sock.sendMessage(sender, {text:info}); addLog(`[CMD_GROUP] Sent group info for ${sender}`);}
            catch(err){ addLog(`[CMD_GROUP] Error getting group metadata for ${sender}: ${err.message}`, 'ERROR'); console.error(err); await sock.sendMessage(sender, {text:"Could not retrieve group information."+getBotFooter()});}
            return;
        }

        if (command.startsWith('!ytsearch ')) {
            const query = msgText.substring('!ytsearch '.length).trim();
            addLog(`[CMD_YTSEARCH] Received !ytsearch command from ${sender} with query: "${query}"`);
            if (!query) {await sock.sendMessage(sender, {text: "Please provide a search query after `!ytsearch`." + getBotFooter()}); return;}
            try {
                const searchResults = await YouTube.search(query, {limit:3, type:'video'});
                if(searchResults?.length){
                    let rText = `*🔍 YouTube Search Results for "${query}":*\n\n`;
                    searchResults.forEach((v,i)=>{rText+=`${i+1}. *${v.title}*\n   Duration: ${v.durationFormatted}\n   Link: https://youtube.com/watch?v=${v.id}\n\n`});
                    await sock.sendMessage(sender, {text: rText.trim()+getBotFooter()});
                    addLog(`[CMD_YTSEARCH] Sent YouTube search results to ${sender}`);
                } else {
                    await sock.sendMessage(sender, {text:`No YouTube video results found for "${query}".`+getBotFooter()});
                    addLog(`[CMD_YTSEARCH] No results for query "${query}" for ${sender}`);
                }
            } catch(ytErr){ addLog(`[CMD_YTSEARCH] Error searching YouTube: ${ytErr.message}`, 'ERROR'); console.error(ytErr); await sock.sendMessage(sender, {text:"Sorry, an error occurred while searching YouTube."+getBotFooter()});}
            return;
        }

        if (command.startsWith('!calc ')) {
            const expression = msgText.substring('!calc '.length).trim();
            addLog(`[CMD_CALC] Received !calc command from ${sender} with expression: "${expression}"`);
            if (!expression) { await sock.sendMessage(sender, { text: "Please provide a mathematical expression after `!calc`." + getBotFooter() }); return; }
            try {
                const result = evaluate(expression);
                let resultText = String(result);
                if (typeof result === 'function' || (typeof result === 'object' && result !== null && !isResultSet(result) && !Array.isArray(result) && typeof result.toString !== 'function') ) {
                    resultText = "Result is a complex type or function and cannot be displayed directly.";
                    addLog(`[CMD_CALC] Complex result type for expression "${expression}": ${typeof result}`, 'WARNING');
                } else if (typeof result === 'object' && result !== null && typeof result.toString === 'function' && !Array.isArray(result)) {
                    resultText = result.toString();
                }
                const calcReply = `🧮 Result for \`${expression}\`:\n\n\`\`\`${resultText}\`\`\`` + getBotFooter();
                await sock.sendMessage(sender, { text: calcReply });
                addLog(`[CMD_CALC] Sent calculation result "${resultText}" to ${sender}`);
            } catch (calcErr) { addLog(`[CMD_CALC] Error evaluating expression "${expression}": ${calcErr.message}`, 'ERROR'); await sock.sendMessage(sender, { text: `Sorry, I couldn't evaluate that expression.\nError: ${calcErr.message}` + getBotFooter() }); }
            return;
        }

        if (command.startsWith('!broadcast ')) {
            const ownerJidEnv = process.env.OWNER_JID;
            if (ownerJidEnv && sender.startsWith(ownerJidEnv.split('@')[0])) {
                const broadcastMessage = msgText.substring('!broadcast '.length).trim();
                if (!broadcastMessage) { await sock.sendMessage(sender, { text: "Please provide a message to broadcast." + getBotFooter() }); return; }
                addLog(`[CMD_BROADCAST] Owner (${sender}) initiated broadcast: "${broadcastMessage}"`);
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    if (groups && Object.keys(groups).length > 0) {
                        let groupIds = Object.keys(groups);
                        await sock.sendMessage(sender, { text: `Starting broadcast to ${groupIds.length} groups...` + getBotFooter() });
                        let successCount = 0; let failCount = 0;
                        for (let i = 0; i < groupIds.length; i++) {
                            const groupId = groupIds[i];
                            try {
                                const messageWithFooter = broadcastMessage + "\n\n📣 _This is a broadcast message from 𝐖𝐇𝐈𝐙-𝐌𝐃 Admin_" + getBotFooter();
                                await sock.sendMessage(groupId, { text: messageWithFooter }); successCount++;
                                addLog(`[CMD_BROADCAST] Message sent to group ${groupId}`);
                            } catch (groupSendErr) { failCount++; addLog(`[CMD_BROADCAST] Failed to send to group ${groupId}: ${groupSendErr.message}`, 'ERROR');}
                            if (i < groupIds.length - 1) { await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); }
                        }
                        await sock.sendMessage(sender, { text: `Broadcast finished.\nSent to: ${successCount} groups.\nFailed for: ${failCount} groups.` + getBotFooter() });
                    } else { await sock.sendMessage(sender, { text: "Not in any groups to broadcast to." + getBotFooter() }); }
                } catch (broadcastErr) { addLog(`[CMD_BROADCAST] Error: ${broadcastErr.message}`, 'ERROR'); console.error(broadcastErr); await sock.sendMessage(sender, { text: "Error during broadcast." + getBotFooter() }); }
            } else { addLog(`[CMD_BROADCAST] Non-owner or no OWNER_JID, !broadcast denied.`, 'WARNING');}
            return;
        }

        if (command === '!restart') {
            const ownerJidEnv = process.env.OWNER_JID;
            if (ownerJidEnv && sender.startsWith(ownerJidEnv.split('@')[0])) {
                addLog(`[CMD_RESTART] Owner (${sender}) initiated restart.`);
                await sock.sendMessage(sender, { text: "🔄 Restarting 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot now..." + getBotFooter() });
                addLog('[CMD_RESTART] Restart message sent. Exiting...');
                if (sock) { try { await sock.logout("Bot restart by owner."); addLog("[CMD_RESTART] Socket logged out.");} catch (e) {addLog(`[CMD_RESTART] Logout error: ${e.message}`, "ERROR");}}
                process.exit(1);
            } else { addLog(`[CMD_RESTART] Non-owner or no OWNER_JID, !restart denied.`, 'WARNING');}
            return;
        }

        // Auto-Like Status (Reactions)
        if (sender === 'status@broadcast' && msg.key.participant) {
            addLog(`[STATUS] New status detected from contact: ${msg.key.participant} (Msg ID: ${msg.key.id})`);
            try {
                await sock.sendMessage(sender, { react: { text: '🔥', key: msg.key }});
                addLog(`[STATUS] Reacted with '🔥' to status from ${msg.key.participant}`);
            } catch (statusErr) {
                addLog(`[STATUS] Failed to react to status from ${msg.key.participant}: ${statusErr.message}`, 'ERROR');
            }
        }
    } catch (error) {
        addLog(`[MSG_HANDLER] General error processing message from ${sender}: ${error.message}`, 'ERROR');
    }
  });

  return sock;
}

const app = express();
const WEB_SERVER_PORT = process.env.PORT || process.env.BOT_WEB_PORT || 3001;

app.set('views', path.join(__dirname, 'bot_views'));
app.set('view engine', 'ejs');
app.use('/bot-static', express.static(path.join(__dirname, 'bot_public')));

app.get('/', (_, res) => {
    addLog(`[BOT_WEB] Root path '/' accessed.`);
    res.send('✅ 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot is active and running! Access logs at /bot-log.');
});

app.get('/bot-log', (req, res) => {
    addLog(`[BOT_WEB] /bot-log page accessed.`);
    res.render('log', {
        title: '𝐖𝐇𝐈𝐙-𝐌𝐃 Bot Live Logs',
        MAX_LOG_ENTRIES: MAX_LOG_ENTRIES
    });
});

app.get('/bot-api/logs', (req, res) => {
    res.json(botLogs);
});

app.listen(WEB_SERVER_PORT, () => { // Use WEB_SERVER_PORT
    addLog(`[BOT_WEB] 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot status page active on http://localhost:${WEB_SERVER_PORT}/`);
    addLog(`[BOT_WEB] 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot log server listening on http://localhost:${WEB_SERVER_PORT}/bot-log`);
});

process.on('SIGINT', async () => {
  addLog('🛑 SIGINT received. Closing WhatsApp connection and exiting...');
  if (sock) {
      await sock.logout("SIGINT Shutdown");
      addLog("Socket logged out.");
  }
  process.exit(0);
});

connectToWhatsApp().catch(err => {
    addLog(`[FATAL_ERROR] Initial connection to WhatsApp failed: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
});

addLog("Core logic for 𝐖𝐇𝐈𝐙-𝐌𝐃 setup complete. Attempting initial WhatsApp connection...");
