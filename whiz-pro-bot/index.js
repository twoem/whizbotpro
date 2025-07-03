require('dotenv').config();
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  downloadMediaMessage,
  getContentType
} = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');
// Note: YouTube, mathjs etc. will be required in specific command files, not globally here.

// --- Local Modules ---
const config = require('./config.js');
const { addLog, getBotLogsForWebUI, MAX_LOG_ENTRIES: MAX_WEB_LOG_ENTRIES } = require('./utils/logger.js');
const { formatAndSendMessage, getBotFooter, formatHiddenLink } = require('./utils/messageFormatter.js');
const { formatUptime } = require('./utils/commandUtils.js');

const startTime = new Date();
const app = express();

const DATA_DIR = process.env.RENDER_DISK_MOUNT_PATH || process.env.DATA_DIR || '.';
if (DATA_DIR !== '.' && !fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`[INIT] Created persistent data directory: ${DATA_DIR}`);
    } catch (e) {
        console.error(`[INIT_ERROR] Failed to create data directory ${DATA_DIR}: ${e.message}. Exiting.`);
        process.exit(1);
    }
}
addLog(`${config.botName} v${config.botVersion} (Baileys) starting up...`);
addLog(`Data directory set to: ${path.resolve(DATA_DIR)}`, 'DEBUG');


const BAILEYS_AUTH_PATH = path.join(DATA_DIR, 'baileys_auth_info');
if (!fs.existsSync(BAILEYS_AUTH_PATH)) {
    fs.mkdirSync(BAILEYS_AUTH_PATH, { recursive: true });
    addLog(`Created Baileys auth directory: ${BAILEYS_AUTH_PATH}`, 'DEBUG');
}

let sock = null;
const commandsMap = new Map();

// --- Command Loader ---
async function loadCommands() {
    addLog('[COMMAND_LOADER] Loading commands...');
    commandsMap.clear();
    const commandCategories = ['general', 'media', 'group', 'owner', 'fun', 'search', 'download', 'api_driven'];

    for (const category of commandCategories) {
        const filePath = path.join(__dirname, 'commands', `${category}.js`);
        try {
            if (fs.existsSync(filePath)) {
                delete require.cache[require.resolve(filePath)];
                const commandModules = require(filePath);

                if (Array.isArray(commandModules)) {
                    commandModules.forEach(cmdObj => {
                        if (cmdObj && cmdObj.name && typeof cmdObj.execute === 'function') {
                            commandsMap.set(cmdObj.name.toLowerCase(), cmdObj);
                            addLog(`[COMMAND_LOADER] Loaded command: ${cmdObj.name} from ${category}.js`, 'DEBUG');
                            if (cmdObj.aliases && Array.isArray(cmdObj.aliases)) {
                                cmdObj.aliases.forEach(alias => {
                                    commandsMap.set(alias.toLowerCase(), cmdObj);
                                    addLog(`[COMMAND_LOADER] Loaded alias: ${alias} for ${cmdObj.name}`, 'DEBUG');
                                });
                            }
                        } else {
                            addLog(`[COMMAND_LOADER] Invalid command object structure in ${category}.js`, 'WARNING');
                        }
                    });
                } else {
                     addLog(`[COMMAND_LOADER] ${category}.js did not export an array of commands.`, 'WARNING');
                }
            } else {
                addLog(`[COMMAND_LOADER] Command file not found: ${category}.js`, 'DEBUG');
            }
        } catch (error) {
            addLog(`[COMMAND_LOADER] Error loading commands from ${category}.js: ${error.message}`, 'ERROR');
            console.error(error);
        }
    }
    addLog(`[COMMAND_LOADER] Total commands loaded: ${commandsMap.size}`);
}


// --- Main WhatsApp Connection Logic ---
async function connectToWhatsApp() {
  addLog('[BAILEYS_CONNECT] Attempting to connect to WhatsApp...');
  await loadCommands();

  const { state, saveCreds } = await useMultiFileAuthState(BAILEYS_AUTH_PATH);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  addLog(`[BAILEYS_CONNECT] Using Baileys version: ${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    browser: [config.botName, 'Chrome', '120.0'],
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
        const reason = DisconnectReason[statusCode] || 'Unknown';
        addLog(`[BAILEYS_CONNECT] Connection closed. Status: ${statusCode} (${reason})`, 'WARNING');
        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
            addLog('Authentication error. Clearing auth info and attempting to reconnect for new QR.', 'ERROR');
            try { if (fs.existsSync(BAILEYS_AUTH_PATH)) { fs.readdirSync(BAILEYS_AUTH_PATH).forEach(f => fs.unlinkSync(path.join(BAILEYS_AUTH_PATH, f))); addLog('Old auth files deleted.', 'INFO');}} catch (err) { addLog(`Error deleting auth files: ${err.message}`, 'ERROR');}
            connectToWhatsApp();
        } else if (statusCode !== DisconnectReason.connectionReplaced) {
            addLog('Unexpected disconnect or connection issue. Attempting to reconnect...', 'WARNING');
            connectToWhatsApp();
        }
    }
    else if (connection === 'open') {
      addLog(`[BAILEYS_CONNECT] WhatsApp connection opened successfully. ${config.botName} is now online! 🎉`);
      const botJid = sock.user?.id;
      if (botJid) {
        const userName = sock.user?.name || sock.user?.notify || botJid.split('@')[0];
        let startupMessageText = `Hello ${userName} 🤗\nYour Bot (${config.botName} v${config.botVersion}) is running perfectly 💥\n`;
        startupMessageText += `Repo: ${config.repoUrl}`;
        await formatAndSendMessage(sock, botJid, startupMessageText, { uptimePrefix: "\nUptime: ", startTime: startTime });
        addLog("[BAILEYS_CONNECT] Startup notification sent to self.");
      } else { addLog("[BAILEYS_CONNECT] Could not determine bot JID for startup message.", 'WARNING');}
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid; // JID of the user or group sending the message
    const originalMsgText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '').trim();

    let detectedPrefix = null;
    let commandName = null;
    let argsString = '';
    let argsArray = [];

    for (const p of config.prefixes) {
        if (originalMsgText.toLowerCase().startsWith(p)) {
            detectedPrefix = p;
            const commandAndArgs = originalMsgText.substring(detectedPrefix.length).trim();
            const firstSpaceIndex = commandAndArgs.indexOf(' ');
            if (firstSpaceIndex === -1) {
                commandName = commandAndArgs.toLowerCase();
                argsString = ''; argsArray = [];
            } else {
                commandName = commandAndArgs.substring(0, firstSpaceIndex).toLowerCase();
                argsString = commandAndArgs.substring(firstSpaceIndex + 1).trim();
                argsArray = argsString.split(/\s+/);
            }
            addLog(`[MSG_HANDLER] Command: '${commandName}', Prefix: '${detectedPrefix}', Args: "${argsString}" from ${sender}`, 'DEBUG');
            break;
        }
    }

    if (detectedPrefix && commandName) {
        const commandHandler = commandsMap.get(commandName);
        if (commandHandler) {
            try {
                // --- Permission Checks ---
                const ownerJidFromEnv = process.env[config.ownerJidEnvKey];
                // msg.key.participant is the JID of the user who sent the command in a group.
                // sender is the group JID itself if it's a group message.
                // For DMs, msg.key.participant is undefined, and sender is the user's JID.
                const commandSenderJid = msg.key.participant || sender;

                if (commandHandler.ownerOnly === true) {
                    if (!ownerJidFromEnv || !commandSenderJid.startsWith(ownerJidFromEnv.split('@')[0])) {
                        addLog(`[AUTH_FAIL] Non-owner ${commandSenderJid} attempted owner command '${commandName}'.`, 'WARNING');
                        return; // Silently ignore for non-owners
                    }
                }

                const isGroup = sender.endsWith('@g.us');
                if (commandHandler.groupOnly === true && !isGroup) {
                     addLog(`[AUTH_FAIL] Command '${commandName}' used outside a group by ${commandSenderJid}.`, 'WARNING');
                     return formatAndSendMessage(sock, sender, "This command can only be used in groups.", { quotedMsg: msg });
                }

                if (commandHandler.adminOnly === true && isGroup) {
                    const groupMeta = await sock.groupMetadata(sender).catch(() => null);
                    const admins = groupMeta?.participants.filter(p => p.admin !== null && p.admin !== undefined).map(p => p.id) || [];

                    if (commandHandler.botMustBeAdmin === true || ['promote', 'demote', 'kick', 'rename', 'chat', 'grouplink_admin_only'].includes(commandHandler.name) ) { // Example check
                        const botIsAdmin = admins.includes(sock.user?.id);
                        if (!botIsAdmin) {
                             addLog(`[AUTH_FAIL] Bot is not admin in group ${sender} for admin command '${commandName}'.`, 'WARNING');
                             return formatAndSendMessage(sock, sender, "I need to be an admin in this group to perform that action.", { quotedMsg: msg });
                        }
                    }
                    // Optionally, check if user sending command is admin
                    // const senderIsAdmin = admins.includes(commandSenderJid);
                    // if (!senderIsAdmin) {
                    //    addLog(`[AUTH_FAIL] Non-admin user ${commandSenderJid} tried admin command '${commandName}'.`, 'WARNING');
                    //    return formatAndSendMessage(sock, sender, "Only group admins can use this command.", { quotedMsg: msg });
                    // }
                }

                const commandContext = {
                    sock, msg, originalMsgText, argsString, argsArray, config, addLog,
                    formatAndSendMessage, downloadMediaMessage, getContentType, startTime, commandsMap,
                    isGroup, commandSenderJid // Pass these for convenience in command files
                };
                await commandHandler.execute(commandContext);

            } catch (error) {
                addLog(`[CMD_ERROR] Error executing command '${commandName}' for ${sender}: ${error.message}`, 'ERROR');
                console.error(`Full error for ${commandName}:`, error);
                await formatAndSendMessage(sock, sender, `Oops! An error occurred while running \`${commandName}\`. Please try again.`, { quotedMsg: msg });
            }
        } else {
            addLog(`[MSG_HANDLER] Unknown command '${commandName}' with prefix '${detectedPrefix}' from ${sender}`, 'DEBUG');
        }
    } else {
        // Non-command message handling (e.g., Auto-Like Status)
        if (msg.key.remoteJid === 'status@broadcast' && msg.key.participant) {
            addLog(`[STATUS] New status detected from contact: ${msg.key.participant} (Msg ID: ${msg.key.id})`);
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '🔥', key: msg.key }});
                addLog(`[STATUS] Reacted with '🔥' to status from ${msg.key.participant}`);
            } catch (statusErr) {
                addLog(`[STATUS] Failed to react to status from ${msg.key.participant}: ${statusErr.message}`, 'ERROR');
            }
        }
    }
  });
  return sock;
}

// --- Express Web Server for Bot Logs ---
const WEB_SERVER_PORT = process.env.PORT || process.env.BOT_WEB_PORT || 3001;
app.set('views', path.join(__dirname, 'bot_views'));
app.set('view engine', 'ejs');
app.use('/bot-static', express.static(path.join(__dirname, 'bot_public')));
app.get('/', (_, res) => {
    addLog(`[BOT_WEB] Root path '/' accessed.`);
    res.send(`✅ ${config.botName} Bot v${config.botVersion} is active and running! Access logs at /bot-log.`);
});
app.get('/bot-log', (req, res) => {
    addLog(`[BOT_WEB] /bot-log page accessed.`);
    res.render('log', {
        title: `${config.botName} Bot Live Logs`,
        MAX_LOG_ENTRIES: MAX_WEB_LOG_ENTRIES
    });
});
app.get('/bot-api/logs', (req, res) => { res.json(getBotLogsForWebUI()); });
app.listen(WEB_SERVER_PORT, () => {
    addLog(`[BOT_WEB] ${config.botName} v${config.botVersion} status page active on http://localhost:${WEB_SERVER_PORT}/`);
    addLog(`[BOT_WEB] ${config.botName} v${config.botVersion} log server listening on http://localhost:${WEB_SERVER_PORT}/bot-log`);
});
// --- End Express Web Server ---

// --- Graceful Shutdown ---
const shutdown = async (signal) => {
    addLog(`🛑 ${signal} received. Closing ${config.botName} connection and exiting...`);
    if (sock) {
        try { await sock.logout(`Shutdown triggered by ${signal} for ${config.botName}`); addLog("Socket logged out."); }
        catch (e) { addLog(`Error during ${signal} logout: ${e.message}`, 'ERROR'); }
    }
    process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// --- End Graceful Shutdown ---

// --- Start Bot ---
connectToWhatsApp().catch(err => {
    addLog(`[FATAL_ERROR] Initial connection to WhatsApp failed for ${config.botName}: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
});
addLog(`Core logic for ${config.botName} setup complete. Attempting initial WhatsApp connection...`);
