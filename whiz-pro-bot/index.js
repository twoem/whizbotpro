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
const config = require('./config.js');

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
    const currentDataDir = typeof DATA_DIR !== 'undefined' ? DATA_DIR : '.';
    const currentLogFilePath = path.join(currentDataDir, 'logs.txt');
    fs.appendFileSync(currentLogFilePath, `[${timestamp.toISOString()}] [${type}] ${logEntry.message}\n`);
  } catch (err) {
    console.error(`[CRITICAL_LOG_FAIL] Failed to write to log file: ${err.message}`);
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
function getBotFooter() {
    const hiddenGroupLink = formatHiddenLink(config.whatsappGroupUrl);
    return `\n\n---\n${config.footerText}\nGroup: ${hiddenGroupLink}`;
}
// --- End Standard Message Footer ---

addLog(`${config.botName} (Baileys) starting up...`);

const DATA_DIR = process.env.DATA_DIR || process.env.RENDER_DISK_MOUNT_PATH || '.';
if (DATA_DIR !== '.' && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    addLog(`[INIT] Created persistent data directory: ${DATA_DIR}`);
}

const BAILEYS_AUTH_PATH = path.join(DATA_DIR, 'baileys_auth_info');
if (!fs.existsSync(BAILEYS_AUTH_PATH)) {
    fs.mkdirSync(BAILEYS_AUTH_PATH, { recursive: true });
    addLog(`Created Baileys auth directory: ${BAILEYS_AUTH_PATH}`, 'DEBUG');
}

let sock = null;
const CLIENT_ID_FOR_LOGS = config.botName.replace(/\s+/g, '-');

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
    browser: [config.botName, 'Chrome', '120.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) { /* ... QR handling ... */
        addLog('[BAILEYS_CONNECT] QR code received — rendering now in terminal...');
        qrcodeTerminal.generate(qr, { small: true }, (qrString) => {
            console.log("\n" + qrString + "\n");
        });
    }
    if (connection === 'close') { /* ... connection close handling ... */
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        addLog(`[BAILEYS_CONNECT] Connection closed. Status: ${statusCode} (${DisconnectReason[statusCode] || 'Unknown'})`, 'WARNING');
        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
            addLog('Authentication error. Clearing auth info and attempting to reconnect for new QR.', 'ERROR');
            try { if (fs.existsSync(BAILEYS_AUTH_PATH)) { fs.readdirSync(BAILEYS_AUTH_PATH).forEach(f => fs.unlinkSync(path.join(BAILEYS_AUTH_PATH, f))); addLog('Old auth files deleted.', 'INFO');}} catch (err) { addLog(`Error deleting auth files: ${err.message}`, 'ERROR');}
            connectToWhatsApp();
        } else { addLog('Unexpected disconnect. Attempting to reconnect...', 'WARNING'); connectToWhatsApp(); }
    }
    else if (connection === 'open') {
      addLog(`[BAILEYS_CONNECT] WhatsApp connection opened successfully. ${config.botName} is now online! 🎉`);
      const botJid = sock.user?.id;
      if (botJid) {
        const userName = sock.user?.name || sock.user?.notify || botJid.split('@')[0];
        let startupMessageText = `Hello ${userName} 🤗\nYour Bot (${config.botName} with Baileys) is running perfectly 💥\n`;
        startupMessageText += `Repo: ${config.repoUrl}\n`;
        startupMessageText += `Uptime: ${formatUptime(startTime)}`;
        startupMessageText += getBotFooter();
        try { await sock.sendMessage(botJid, { text: startupMessageText }); addLog("[BAILEYS_CONNECT] Startup notification sent to self."); }
        catch (err) { addLog(`[BAILEYS_CONNECT] Failed to send startup notification: ${err.message}`, "ERROR");}
      } else { addLog("[BAILEYS_CONNECT] Could not determine bot JID for startup message.", 'WARNING');}
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    let msgText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '').trim();

    let detectedPrefix = null;
    let commandName = null;
    let argsString = '';

    for (const p of config.prefixes) {
        if (msgText.toLowerCase().startsWith(p)) {
            detectedPrefix = p;
            const commandAndArgs = msgText.substring(detectedPrefix.length).trim();
            const firstSpaceIndex = commandAndArgs.indexOf(' ');
            if (firstSpaceIndex === -1) {
                commandName = commandAndArgs.toLowerCase();
                argsString = '';
            } else {
                commandName = commandAndArgs.substring(0, firstSpaceIndex).toLowerCase();
                argsString = commandAndArgs.substring(firstSpaceIndex + 1).trim();
            }
            addLog(`[MSG_HANDLER] Detected command '${commandName}' with prefix '${detectedPrefix}' from ${sender}. Args: "${argsString}"`, 'DEBUG');
            break;
        }
    }

    if (detectedPrefix) {
        try {
            if (commandName === 'menu') {
                addLog(`[CMD_MENU] Received menu command from ${sender}`);

                const uptime = formatUptime(startTime);
                const lineRepeatCount = 35; // Adjust for desired width
                const topBorder = `╭─⊷ ${config.botName} ⊶─╮`;
                const bottomBorder = `╰─⊷ Have fun using ${config.botName}! ⊶─╯`;
                const sectionSeparator = `├${'─'.repeat(lineRepeatCount)}┤`;
                const categoryHeader = (title) => `├─⊷ ${title.toUpperCase()} ⊶─┤`;

                let menuText = `${topBorder}\n`;
                menuText += `│ Owner   : ${config.ownerName}\n`;
                menuText += `│ Prefix  : ${config.prefixes.join(' ')}\n`;
                menuText += `│ Uptime  : ${uptime}\n`;
                menuText += `│ Repo    : ${config.repoUrl}\n`;
                menuText += `│ Group   : ${config.whatsappGroupUrl}\n`;

                const commandsByCategory = {};
                config.commandsList.forEach(cmd => {
                    if (!commandsByCategory[cmd.category]) {
                        commandsByCategory[cmd.category] = [];
                    }
                    commandsByCategory[cmd.category].push(cmd);
                });

                menuText += `${sectionSeparator}\n`;
                menuText += `│ *Available Commands:*\n`;

                const categoryOrder = ['General', 'Media & Utility', 'Group Admin', 'Owner Only'];

                for (const category of categoryOrder) {
                    if (commandsByCategory[category] && commandsByCategory[category].length > 0) {
                        menuText += `${categoryHeader(category)}\n`;
                        commandsByCategory[category].forEach(cmd => {
                            const argsDisplay = cmd.args ? ` ${cmd.args}` : '';
                            menuText += `│ ${config.prefixes[0]}${cmd.cmd}${argsDisplay} - ${cmd.desc}\n`;
                        });
                    }
                }

                menuText += `${categoryHeader('Automatic Features')}\n`;
                menuText += `│ 🔥 Auto Like Statuses\n`;
                menuText += `│ 👁️ _Auto View Statuses (Under Review)_\n`;
                menuText += bottomBorder;

                await sock.sendMessage(sender, { text: menuText.trim() });
                addLog(`[CMD_MENU] Sent enhanced menu to ${sender}`);
            } else if (commandName === 'ping') {
                addLog(`[CMD_PING] Received ping command from ${sender}`);
                const pingReply = `Pong! 🏓\nUptime: ${formatUptime(startTime)}` + getBotFooter();
                await sock.sendMessage(sender, { text: pingReply });
            } else if (commandName === 'contact') {
                addLog(`[CMD_CONTACT] Received contact command from ${sender}`);
                const ownerActualJidNumber = process.env[config.ownerJidEnvKey] ? process.env[config.ownerJidEnvKey].split('@')[0] : "your_owner_number_not_set";
                const vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.ownerName}\nTEL;type=CELL;type=VOICE;waid=${ownerActualJidNumber}:${ownerActualJidNumber}\nEND:VCARD`;
                await sock.sendMessage(sender, { contacts: { displayName: config.ownerName, contacts: [{ vcard: vCard }] } });
                const contactFollowUp = `For community support or further questions, you can also join our group: ${config.whatsappGroupUrl}` + getBotFooter(); // Plain group link here for direct click
                await sock.sendMessage(sender, { text: contactFollowUp });
            }
            else if (commandName === 'vv') {
                const quotedMsgInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (isReply && quotedMsgInfo) {
                    addLog(`[CMD_VV] !vv command detected for a replied message from ${sender}`);
                    const viewOnceTypes = ['viewOnceMessageV2Extension', 'viewOnceMessageV2', 'viewOnceMessage'];
                    let actualViewOnceMsgContent = null;
                    for (const type of viewOnceTypes) { if (quotedMsgInfo[type]) { actualViewOnceMsgContent = quotedMsgInfo[type].message; break; } }
                    if (!actualViewOnceMsgContent && quotedMsgInfo.ephemeralMessage?.message) { for (const type of viewOnceTypes) { if (quotedMsgInfo.ephemeralMessage.message[type]) { actualViewOnceMsgContent = quotedMsgInfo.ephemeralMessage.message[type].message; break; } } }

                    if (actualViewOnceMsgContent) {
                        const mediaTypeKey = Object.keys(actualViewOnceMsgContent)[0];
                        if (mediaTypeKey === 'imageMessage' || mediaTypeKey === 'videoMessage') {
                            try {
                                const originalMsgKey = { remoteJid: msg.message.extendedTextMessage.contextInfo.participant || sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: (msg.message.extendedTextMessage.contextInfo.participant || sender) === sock.user.id.split(':')[0] + '@s.whatsapp.net' };
                                const buffer = await downloadMediaMessage({ key: originalMsgKey, message: quotedMsgInfo }, 'buffer', {}, { logger: { info:()=>{}}, reuploadRequest: sock.updateMediaMessage });
                                const mediaType = mediaTypeKey.replace('Message','').toLowerCase();
                                await sock.sendMessage(sender, { [mediaType]: buffer, caption: `Here's the view-once media! ✨ - ${config.botName}` + getBotFooter() });
                                await sock.sendMessage(sender, {text: `Got it! ✨ The view-once media has been captured and sent to you by ${config.botName}.` + getBotFooter()});
                            } catch (err) { addLog(`[CMD_VV] Error processing !vv: ${err.message}`, 'ERROR'); await sock.sendMessage(sender, {text: `Oops! Something went wrong with !vv. 😥 - ${config.botName}` + getBotFooter()}); }
                        } else { await sock.sendMessage(sender, {text: `Replied message is not view-once image/video. 🤔 - ${config.botName}` + getBotFooter()}); }
                    } else { await sock.sendMessage(sender, {text: `Please reply to a view-once message with ${detectedPrefix}vv. 🤔 - ${config.botName}` + getBotFooter()}); }
                } else { await sock.sendMessage(sender, {text: `Please reply to a message to use ${detectedPrefix}vv.` + getBotFooter()}); }
            }
            else if (commandName === 'save') {
                const quotedMsgInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (isReply && quotedMsgInfo) {
                    addLog(`[CMD_SAVE] 'save' command detected from ${sender}`);
                    const ownerJidForSaving = process.env[config.statusSavesJidEnvKey];
                    const botJid = sock.user?.id;
                    if (!ownerJidForSaving || !botJid) { await sock.sendMessage(sender, { text: "Sorry, the 'save' feature is not configured." + getBotFooter() }); }
                    else {
                        try {
                            let messageToSend = {}; let quotedText = quotedMsgInfo.conversation || quotedMsgInfo.extendedTextMessage?.text || '';
                            const originalMsgKeyForSave = { remoteJid: msg.message.extendedTextMessage.contextInfo.participant || sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: (msg.message.extendedTextMessage.contextInfo.participant || sender) === sock.user.id.split(':')[0] + '@s.whatsapp.net'};
                            if (quotedMsgInfo.imageMessage) { const mediaBuffer = await downloadMediaMessage({ key: originalMsgKeyForSave, message: quotedMsgInfo }, 'buffer', {}, { logger: {info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); messageToSend = { image: mediaBuffer, caption: (quotedMsgInfo.imageMessage.caption || '') + `\n\n(Saved via ${config.botName})` };
                            } else if (quotedMsgInfo.videoMessage) { const mediaBuffer = await downloadMediaMessage({ key: originalMsgKeyForSave, message: quotedMsgInfo }, 'buffer', {}, { logger: {info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); messageToSend = { video: mediaBuffer, caption: (quotedMsgInfo.videoMessage.caption || '') + `\n\n(Saved via ${config.botName})` };
                            } else if (quotedText) { messageToSend = { text: `Forwarded/Saved Content (by ${config.botName}):\n\n${quotedText}` };
                            } else { await sock.sendMessage(sender, { text: "Can only save text, image, or video messages." + getBotFooter() }); return; }
                            await sock.sendMessage(botJid, messageToSend); await sock.sendMessage(ownerJidForSaving, messageToSend);
                            await sock.sendMessage(sender, { text: "Content saved and forwarded!" + getBotFooter() });
                        } catch (error) { await sock.sendMessage(sender, { text: `Oops! Error saving content. 😥` + getBotFooter() }); addLog(`[CMD_SAVE] Error: ${error.message}`, 'ERROR');}
                    }
                } else { await sock.sendMessage(sender, { text: `Please reply to a message with 'save'.` + getBotFooter() }); }
            }
            else if (commandName === 'sticker') {
                addLog(`[CMD_STICKER] !sticker command detected from ${sender}`);
                let targetMessageSticker = msg;
                if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) { targetMessageSticker = { key: { remoteJid: sender, id: msg.message.extendedTextMessage.contextInfo.stanzaId, participant: msg.message.extendedTextMessage.contextInfo.participant }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage };}
                const imageMsgSticker = targetMessageSticker.message?.imageMessage; const videoMsgSticker = targetMessageSticker.message?.videoMessage;
                if (imageMsgSticker || videoMsgSticker) {
                    try { const buffer = await downloadMediaMessage(targetMessageSticker, 'buffer', {}, { logger: { info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); const stickerOptions = { pack: `${config.botName} Stickers`, author: config.ownerName }; await sock.sendMessage(sender, { sticker: buffer, ...stickerOptions });
                    } catch (stickerError) { await sock.sendMessage(sender, { text: 'Oops! Failed to create sticker.' + getBotFooter() }); addLog(`[CMD_STICKER] Error: ${stickerError.message}`, 'ERROR');}
                } else { await sock.sendMessage(sender, { text: `Reply to image/video or send with caption ${detectedPrefix}sticker.` + getBotFooter() }); }
            }
            else if (commandName === 'toimg') {
                const quotedMsgInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (isReply && quotedMsgInfo?.stickerMessage) {
                    addLog(`[CMD_TOIMG] !toimg detected for sticker from ${sender}`);
                    try { const buffer = await downloadMediaMessage({ key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quotedMsgInfo }, 'buffer', {}, { logger: { info:()=>{}}, reuploadRequest: sock.updateMediaMessage }); let mediaToSend = { image: buffer, caption: `Sticker to Image ✨ - ${config.botName}` + getBotFooter() }; if (quotedMsgInfo.stickerMessage.isAnimated) { mediaToSend = { video: buffer, gifPlayback: true, caption: `Animated Sticker to GIF/Video ✨ - ${config.botName}` + getBotFooter() }; } await sock.sendMessage(sender, mediaToSend);
                    } catch (toImgError) { await sock.sendMessage(sender, { text: 'Oops! Failed to convert sticker.' + getBotFooter() }); addLog(`[CMD_TOIMG] Error: ${toImgError.message}`, 'ERROR');}
                } else { await sock.sendMessage(sender, { text: `Please reply to a sticker with ${detectedPrefix}toimg.` + getBotFooter() }); }
            }
            else if (commandName === 'jid') {
                addLog(`[CMD_JID] !jid detected from ${sender}`); let replyText = `Chat JID: ${sender}`; const contextInfo = msg.message?.extendedTextMessage?.contextInfo; if (isReply && contextInfo?.participant) { replyText += `\nQuoted User JID: ${contextInfo.participant}`; } replyText += getBotFooter(); await sock.sendMessage(sender, { text: replyText });
            }
            else if (commandName === 'delete') {
                const ownerJidToCheck = process.env[config.ownerJidEnvKey];
                const quotedMsgInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const isReply = !!msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (ownerJidToCheck && sender.startsWith(ownerJidToCheck.split('@')[0]) && isReply && quotedMsgInfo) {
                    const botJid = sock.user?.id;
                    if (msg.message.extendedTextMessage.contextInfo.participant === botJid) {
                        const messageToDelKey = { remoteJid: sender, fromMe: true, id: msg.message.extendedTextMessage.contextInfo.stanzaId };
                        try { await sock.sendMessage(sender, { delete: messageToDelKey }); addLog(`[CMD_DELETE] Owner deleted bot message.`);} catch (delErr) { addLog(`[CMD_DELETE] Error: ${delErr.message}`, 'ERROR');}
                    } else {addLog(`[CMD_DELETE] Owner tried to delete non-bot message.`, 'WARNING');}
                } else {addLog(`[CMD_DELETE] Non-owner or invalid use of !delete.`, 'WARNING');}
            }
            else if (commandName === 'source') {
                addLog(`[CMD_SOURCE] !source detected from ${sender}`); const sourceMessage = `You can find my source code and contribute at:\n${config.repoUrl}` + getBotFooter(); await sock.sendMessage(sender, { text: sourceMessage });
            }
            else if (['promote', 'demote', 'kick'].includes(commandName)) {
                if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "These commands can only be used in a group."+getBotFooter()}); }
                else { /* ... Group management logic ... */ } // Condensed for brevity
            }
            else if (commandName === 'grouplink') {
                if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "Group command only."+getBotFooter()});}
                else { /* ... !grouplink logic ... */ } // Condensed
            }
            else if (commandName === 'groupinfo') {
                if (!sender.endsWith('@g.us')) { await sock.sendMessage(sender, { text: "Group command only."+getBotFooter()});}
                else { /* ... !groupinfo logic ... */ } // Condensed
            }
            else if (commandName === 'ytsearch') {
                const query = argsString;
                if (!query) {await sock.sendMessage(sender, {text: `Please provide a query after ${detectedPrefix}ytsearch.` + getBotFooter()}); }
                else { /* ... !ytsearch logic ... */ } // Condensed
            }
            else if (commandName === 'calc') {
                const expression = argsString;
                if (!expression) { await sock.sendMessage(sender, { text: `Please provide an expression after ${detectedPrefix}calc.` + getBotFooter() }); }
                else { /* ... !calc logic ... */ } // Condensed
            }
            else if (commandName === 'broadcast') {
                const ownerJidToCheck = process.env[config.ownerJidEnvKey];
                if (ownerJidToCheck && sender.startsWith(ownerJidToCheck.split('@')[0])) {
                    const broadcastMessage = argsString;
                    if (!broadcastMessage) { await sock.sendMessage(sender, { text: "Message needed for broadcast." + getBotFooter() });}
                    else { /* ... !broadcast logic ... */ } // Condensed
                } else { addLog(`[CMD_BROADCAST] Non-owner or no OWNER_JID, denied.`, 'WARNING');}
            }
            else if (commandName === 'restart') {
                const ownerJidToCheck = process.env[config.ownerJidEnvKey];
                if (ownerJidToCheck && sender.startsWith(ownerJidToCheck.split('@')[0])) {
                    // ... !restart logic ... (condensed)
                    addLog(`[CMD_RESTART] Owner (${sender}) initiated restart.`);
                    await sock.sendMessage(sender, { text: `🔄 Restarting ${config.botName} now...` + getBotFooter() });
                    if (sock) { try { await sock.logout("Bot restart by owner.");} catch (e) {addLog(`[CMD_RESTART] Logout error: ${e.message}`, "ERROR");}}
                    process.exit(1);
                } else { addLog(`[CMD_RESTART] Non-owner or no OWNER_JID, denied.`, 'WARNING');}
            }
             // Ensure all command handlers have a return if they are meant to be final
            if (['menu', 'ping', 'contact', 'vv', 'save', 'sticker', 'toimg', 'jid', 'delete', 'source', 'promote', 'demote', 'kick', 'grouplink', 'groupinfo', 'ytsearch', 'calc', 'broadcast', 'restart'].includes(commandName)) {
                return;
            }

        } // End if(detectedPrefix)
    } catch (error) {
        addLog(`[MSG_HANDLER] General error processing message from ${sender}: ${error.message}`, 'ERROR');
    }

    // Auto-Like Status (Reactions) - Process if not a command or if command didn't return
    if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant) {
        addLog(`[STATUS] New status detected from contact: ${msg.key.participant} (Msg ID: ${msg.key.id})`);
        try {
            await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔥', key: msg.key }});
            addLog(`[STATUS] Reacted with '🔥' to status from ${msg.key.participant}`);
        } catch (statusErr) {
            addLog(`[STATUS] Failed to react to status from ${msg.key.participant}: ${statusErr.message}`, 'ERROR');
        }
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
    res.send(`✅ ${config.botName} Bot is active and running! Access logs at /bot-log.`);
});

app.get('/bot-log', (req, res) => {
    addLog(`[BOT_WEB] /bot-log page accessed.`);
    res.render('log', {
        title: `${config.botName} Bot Live Logs`,
        MAX_LOG_ENTRIES: MAX_LOG_ENTRIES
    });
});

app.get('/bot-api/logs', (req, res) => {
    res.json(botLogs);
});

app.listen(WEB_SERVER_PORT, () => {
    addLog(`[BOT_WEB] ${config.botName} Bot status page active on http://localhost:${WEB_SERVER_PORT}/`);
    addLog(`[BOT_WEB] ${config.botName} Bot log server listening on http://localhost:${WEB_SERVER_PORT}/bot-log`);
});

process.on('SIGINT', async () => {
  addLog(`🛑 SIGINT received. Closing ${config.botName} connection and exiting...`);
  if (sock) {
      await sock.logout("SIGINT Shutdown");
      addLog("Socket logged out.");
  }
  process.exit(0);
});

connectToWhatsApp().catch(err => {
    addLog(`[FATAL_ERROR] Initial connection to WhatsApp failed for ${config.botName}: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
});

addLog(`Core logic for ${config.botName} setup complete. Attempting initial WhatsApp connection...`);
