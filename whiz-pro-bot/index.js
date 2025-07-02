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
const { evaluate, isResultSet } = require('mathjs'); // For !calc

const startTime = new Date();

// --- Log Collection for Web UI ---
const MAX_LOG_ENTRIES = 200;
const botLogs = [];

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
    fs.appendFileSync('./logs.txt', `[${timestamp.toISOString()}] [${type}] ${logEntry.message}\n`);
  } catch (err) {
    console.error('Failed to write to logs.txt:', err);
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

const BAILEYS_AUTH_PATH = './baileys_auth_info';
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
` + getBotFooter(); // The footer will add its own "Group: [hidden link]" and "Made with love"
            // To avoid duplicate group link, we can adjust getBotFooter or the menu text.
            // For now, let's make the menu's group link plain and keep footer's hidden.
            // The menu is now self-contained with its own footer elements.

            await sock.sendMessage(sender, { text: menuText.trim() });
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
            // ... !vv logic ... (as implemented before)
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
                    } catch (err) { await sock.sendMessage(sender, {text: "Oops! Something went wrong while trying to capture the media. 😥 - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter()}); }
                } else { await sock.sendMessage(sender, {text: "Hmm, the replied message doesn't seem to be a view-once image or video. 🤔 - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter()}); }
            } else { await sock.sendMessage(sender, {text: "Hmm, it seems you didn't reply to a view-once message. Please use `!vv` as a reply. 🤔 - 𝐖𝐇𝐈𝐙-𝐌𝐃" + getBotFooter()}); }
            return;
        }

        if (command.startsWith('save') && isReply && quotedMsgInfo) {
            // ... !save logic ... (as implemented before)
            addLog(`[CMD] 'save' command detected for a replied message from ${sender}`);
            const ownerJidForStatusSaves = process.env.OWNER_JID_FOR_STATUS_SAVES;
            const botJid = sock.user?.id;
            if (!ownerJidForStatusSaves || !botJid) { await sock.sendMessage(sender, { text: "Sorry, the 'save status' feature is not configured correctly by the admin." + getBotFooter() }); return; }
            try {
                let messageToSend = {}; let quotedText = quotedMsgInfo.conversation || quotedMsgInfo.extendedTextMessage?.text || ''; let mediaBuffer = null; let mediaType = null;
                const originalMsgKeyForSave = { remoteJid: msg.message.extendedTextMessage.contextInfo.participant || sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: (msg.message.extendedTextMessage.contextInfo.participant || sender) === sock.user.id.split(':')[0] + '@s.whatsapp.net'};
                if (quotedMsgInfo.imageMessage) { mediaBuffer = await downloadMediaMessage({ key: originalMsgKeyForSave, message: quotedMsgInfo }, 'buffer', {}, { logger: {info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); messageToSend.image = mediaBuffer; messageToSend.caption = (quotedMsgInfo.imageMessage.caption || '') + '\n\n(Saved from a reply)';
                } else if (quotedMsgInfo.videoMessage) { mediaBuffer = await downloadMediaMessage({ key: originalMsgKeyForSave, message: quotedMsgInfo }, 'buffer', {}, { logger: {info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); messageToSend.video = mediaBuffer; messageToSend.caption = (quotedMsgInfo.videoMessage.caption || '') + '\n\n(Saved from a reply)';
                } else if (quotedText) { messageToSend.text = `Forwarded message/status:\n\n${quotedText}`;
                } else { await sock.sendMessage(sender, { text: "Sorry, I can only save text, image, or video messages." + getBotFooter() }); return; }
                await sock.sendMessage(botJid, messageToSend); await sock.sendMessage(ownerJidForStatusSaves, messageToSend);
                await sock.sendMessage(sender, { text: "Content saved and forwarded successfully!" + getBotFooter() });
            } catch (error) { await sock.sendMessage(sender, { text: "Oops! Something went wrong. 😥" + getBotFooter() });}
            return;
        }

        if (command.startsWith('!sticker')) {
            // ... !sticker logic ... (as implemented before)
            addLog(`[CMD] !sticker command detected from ${sender}`);
            let targetMessageSticker = msg;
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) { targetMessageSticker = { key: { remoteJid: sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, participant: msg.message.extendedTextMessage.contextInfo.participant }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage };}
            const imageMsgSticker = targetMessageSticker.message?.imageMessage; const videoMsgSticker = targetMessageSticker.message?.videoMessage;
            if (imageMsgSticker || videoMsgSticker) {
                try { const buffer = await downloadMediaMessage(targetMessageSticker, 'buffer', {}, { logger: { info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); const stickerOptions = { pack: '𝐖𝐇𝐈𝐙-𝐌𝐃 Stickers', author: 'Whiz ❤️'}; await sock.sendMessage(sender, { sticker: buffer, ...stickerOptions });
                } catch (stickerError) { await sock.sendMessage(sender, { text: 'Oops! Failed to create sticker.' + getBotFooter() }); }
            } else { await sock.sendMessage(sender, { text: 'Please reply to an image/video with `!sticker` or send one with the caption.' + getBotFooter() }); }
            return;
        }

        if (command.startsWith('!toimg') && isReply && quotedMsgInfo) {
            // ... !toimg logic ... (as implemented before)
            addLog(`[CMD] !toimg command detected from ${sender}`); const stickerMsg = quotedMsgInfo.stickerMessage;
            if (stickerMsg) {
                try { const buffer = await downloadMediaMessage({ key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quotedMsgInfo }, 'buffer', {}, { logger: { info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); let mediaToSend = { image: buffer, caption: "Sticker to Image ✨" + getBotFooter() }; if (stickerMsg.isAnimated) { mediaToSend = { video: buffer, gifPlayback: true, caption: "Animated Sticker to GIF/Video ✨" + getBotFooter() }; } await sock.sendMessage(sender, mediaToSend);
                } catch (toImgError) { await sock.sendMessage(sender, { text: 'Oops! Failed to convert sticker.' + getBotFooter() }); }
            } else { await sock.sendMessage(sender, { text: 'Please reply to a sticker with `!toimg`.' + getBotFooter() }); }
            return;
        }

        if (command === '!jid') {
            // ... !jid logic ... (as implemented before)
            addLog(`[CMD] !jid command detected from ${sender}`); let replyText = `Chat JID: ${sender}`; const contextInfo = msg.message?.extendedTextMessage?.contextInfo; if (isReply && contextInfo?.participant) { replyText += `\nQuoted User JID: ${contextInfo.participant}`; } replyText += getBotFooter(); await sock.sendMessage(sender, { text: replyText });
            return;
        }

        if (command === '!delete' && isReply && quotedMsgInfo) {
            // ... !delete logic ... (as implemented before)
            const ownerJidEnv = process.env.OWNER_JID; if (ownerJidEnv && sender.startsWith(ownerJidEnv.split('@')[0])) { const botJid = sock.user?.id; if (msg.message.extendedTextMessage.contextInfo.participant === botJid) { const messageToDelKey = { remoteJid: sender, fromMe: true, id: msg.message.extendedTextMessage.contextInfo.stanzaId }; try { await sock.sendMessage(sender, { delete: messageToDelKey }); } catch (delErr) { addLog(`[CMD_DELETE] Error deleting message: ${delErr.message}`, 'ERROR');}} else {addLog(`[CMD_DELETE] Owner tried to delete non-bot message.`, 'WARNING');}} else {addLog(`[CMD_DELETE] Non-owner or no OWNER_JID, !delete denied.`, 'WARNING');}
            return;
        }

        if (command === '!source') {
            // ... !source logic ... (as implemented before)
            addLog(`[CMD] !source command detected from ${sender}`); const sourceMessage = `Source code:\n${REPO_LINK}` + getBotFooter(); await sock.sendMessage(sender, { text: sourceMessage });
            return;
        }

        const getGroupAdmins = async (groupId) => { try { const m = await sock.groupMetadata(groupId); return m.participants.filter(p=>p.admin!==null).map(p=>p.id); } catch(e){return[];} };
        if (command.startsWith('!promote') || command.startsWith('!demote') || command.startsWith('!kick')) {
            // ... Group management logic ... (as implemented before, condensed for brevity in this overwrite)
            if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "Group commands only."+getBotFooter()}); return;}
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mentionedJids.length) { await sock.sendMessage(sender, {text: "Mention user(s)."+getBotFooter()}); return;}
            const groupMeta = await sock.groupMetadata(sender).catch(()=>null);
            const admins = groupMeta?.participants.filter(p=>p.admin !== null).map(p=>p.id) || [];
            if (!admins.includes(sock.user?.id)) { await sock.sendMessage(sender, {text: "I must be admin."+getBotFooter()}); return;}
            // Optional: check if sender is admin: if (!admins.includes(msg.key.participant || sender)) { await sock.sendMessage(sender, {text: "You must be admin."+getBotFooter()}); return;}
            let action = command.startsWith('!promote') ? 'promote' : command.startsWith('!demote') ? 'demote' : 'remove';
            try { await sock.groupParticipantsUpdate(sender, mentionedJids, action); await sock.sendMessage(sender, {text: `Action ${action} attempted.`+getBotFooter()}); } catch (e) {await sock.sendMessage(sender, {text: `Failed to ${action}.`+getBotFooter()});}
            return;
        }

        if (command === '!grouplink') {
            // ... !grouplink logic ... (as implemented before)
            if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "Group command only."+getBotFooter()}); return;}
            try {const code = await sock.groupInviteCode(sender); await sock.sendMessage(sender, {text: `Group Link: https://chat.whatsapp.com/${code}`+getBotFooter()});} catch(e){await sock.sendMessage(sender, {text:"Couldn't get link."+getBotFooter()});}
            return;
        }

        if (command === '!groupinfo') {
            // ... !groupinfo logic ... (as implemented before)
            if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "Group command only."+getBotFooter()}); return;}
            try { const m = await sock.groupMetadata(sender); const info = `*Name:* ${m.subject}\n*ID:* ${m.id}\n*Participants:* ${m.participants.length}` + getBotFooter(); await sock.sendMessage(sender, {text:info});} catch(e){await sock.sendMessage(sender, {text:"Couldn't get info."+getBotFooter()});}
            return;
        }

        if (command.startsWith('!ytsearch ')) {
            // ... !ytsearch logic ... (as implemented before)
            const query = msgText.substring('!ytsearch '.length).trim(); if (!query) {await sock.sendMessage(sender, {text: "Query needed."+getBotFooter()}); return;}
            try { const results = await YouTube.search(query, {limit:3, type:'video'}); if(results?.length){ let rText = `*YouTube Results for "${query}":*\n\n`; results.forEach((v,i)=>{rText+=`${i+1}. *${v.title}*\nLink: https://youtube.com/watch?v=${v.id}\n\n`}); await sock.sendMessage(sender, {text: rText.trim()+getBotFooter()});} else {await sock.sendMessage(sender, {text:"No results."+getBotFooter()});}} catch(e){await sock.sendMessage(sender, {text:"YT search error."+getBotFooter()});}
            return;
        }

        // --- !calc Command ---
        if (command.startsWith('!calc ')) {
            const expression = msgText.substring('!calc '.length).trim();
            addLog(`[CMD_CALC] Received !calc command from ${sender} with expression: "${expression}"`);

            if (!expression) {
                await sock.sendMessage(sender, { text: "Please provide a mathematical expression after `!calc`." + getBotFooter() });
                return;
            }

            try {
                const result = evaluate(expression);
                let resultText = String(result);
                // Check for complex results that shouldn't be sent directly
                if (typeof result === 'function' || (typeof result === 'object' && result !== null && !isResultSet(result) && !Array.isArray(result) && typeof result.toString !== 'function') ) {
                    resultText = "Result is a complex type or function and cannot be displayed directly.";
                    addLog(`[CMD_CALC] Complex result type for expression "${expression}": ${typeof result}`, 'WARNING');
                } else if (typeof result === 'object' && result !== null && typeof result.toString === 'function' && !Array.isArray(result)) {
                    // For objects with a toString method (like mathjs units, matrices if simple)
                    resultText = result.toString();
                }


                const calcReply = `🧮 Result for \`${expression}\`:\n\n\`\`\`${resultText}\`\`\`` + getBotFooter();
                await sock.sendMessage(sender, { text: calcReply });
                addLog(`[CMD_CALC] Sent calculation result "${resultText}" to ${sender}`);
            } catch (calcErr) {
                addLog(`[CMD_CALC] Error evaluating expression "${expression}": ${calcErr.message}`, 'ERROR');
                await sock.sendMessage(sender, { text: `Sorry, I couldn't evaluate that expression. Please ensure it's valid.\nError: ${calcErr.message}` + getBotFooter() });
            }
            return; // !calc command processed
        }
        // --- End !calc Command ---

        // --- !broadcast Command (Owner Only) ---
        if (command.startsWith('!broadcast ')) {
            const ownerJidEnv = process.env.OWNER_JID;
            if (ownerJidEnv && sender.startsWith(ownerJidEnv.split('@')[0])) {
                const broadcastMessage = msgText.substring('!broadcast '.length).trim();
                if (!broadcastMessage) {
                    await sock.sendMessage(sender, { text: "Please provide a message to broadcast after `!broadcast`." + getBotFooter() });
                    return;
                }

                addLog(`[CMD_BROADCAST] Owner (${sender}) initiated broadcast: "${broadcastMessage}"`);
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    if (groups && Object.keys(groups).length > 0) {
                        let groupIds = Object.keys(groups);
                        await sock.sendMessage(sender, { text: `Starting broadcast to ${groupIds.length} groups...` + getBotFooter() });

                        let successCount = 0;
                        let failCount = 0;

                        for (let i = 0; i < groupIds.length; i++) {
                            const groupId = groupIds[i];
                            try {
                                // Append a small note that it's a broadcast, and the standard footer
                                const messageWithFooter = broadcastMessage + "\n\n📣 _This is a broadcast message from 𝐖𝐇𝐈𝐙-𝐌𝐃 Admin_" + getBotFooter();
                                await sock.sendMessage(groupId, { text: messageWithFooter });
                                addLog(`[CMD_BROADCAST] Message sent to group ${groupId}`);
                                successCount++;
                            } catch (groupSendErr) {
                                addLog(`[CMD_BROADCAST] Failed to send message to group ${groupId}: ${groupSendErr.message}`, 'ERROR');
                                failCount++;
                            }
                            // Delay between messages to avoid rate limiting
                            if (i < groupIds.length - 1) { // Don't delay after the last one
                                await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // 1.5-2.5s delay
                            }
                        }
                        await sock.sendMessage(sender, { text: `Broadcast finished.\nSuccessfully sent to: ${successCount} groups.\nFailed for: ${failCount} groups.` + getBotFooter() });
                    } else {
                        await sock.sendMessage(sender, { text: "I am not currently in any groups to broadcast to." + getBotFooter() });
                    }
                } catch (broadcastErr) {
                    addLog(`[CMD_BROADCAST] Error fetching groups or during broadcast: ${broadcastErr.message}`, 'ERROR');
                    console.error(broadcastErr);
                    await sock.sendMessage(sender, { text: "An error occurred during the broadcast process." + getBotFooter() });
                }
            } else {
                addLog(`[CMD_BROADCAST] Non-owner (${sender}) or OWNER_JID not set, tried to use !broadcast.`, 'WARNING');
                // Optionally send a "command not found" or "permission denied" message
                // For now, silent for non-owners.
            }
            return; // Broadcast command processed
        }
        // --- End !broadcast Command ---

        // --- !restart Command (Owner Only) ---
        if (command === '!restart') {
            const ownerJidEnv = process.env.OWNER_JID;
            if (ownerJidEnv && sender.startsWith(ownerJidEnv.split('@')[0])) {
                addLog(`[CMD_RESTART] Owner (${sender}) initiated restart.`);
                const restartMessage = "🔄 Restarting 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot now..." + getBotFooter();
                await sock.sendMessage(sender, { text: restartMessage });
                addLog('[CMD_RESTART] Restart message sent. Exiting process...');
                // Gracefully close socket before exiting, if possible within a short timeframe
                if (sock) {
                    try {
                        await sock.logout("Bot restart requested by owner.");
                        addLog("[CMD_RESTART] Socket logged out before exit.");
                    } catch (logoutErr) {
                        addLog(`[CMD_RESTART] Error during logout before restart: ${logoutErr.message}`, "ERROR");
                    }
                }
                process.exit(1); // Exit with code 1 to indicate intentional restart/error for PM2 etc.
            } else {
                addLog(`[CMD_RESTART] Non-owner (${sender}) or OWNER_JID not set, tried to use !restart.`, 'WARNING');
                // Silent for non-owners
            }
            return; // Restart command processed (though process will exit)
        }
        // --- End !restart Command ---


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
const BOT_WEB_PORT = process.env.BOT_WEB_PORT || 3001;

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

app.listen(BOT_WEB_PORT, () => {
    addLog(`[BOT_WEB] 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot status page active on http://localhost:${BOT_WEB_PORT}/`);
    addLog(`[BOT_WEB] 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot log server listening on http://localhost:${BOT_WEB_PORT}/bot-log`);
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
