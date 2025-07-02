require('dotenv').config(); // Load environment variables from .env file

const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const express = require('express');
// Puppeteer is no longer needed for the bot itself
// const puppeteer = require('puppeteer');

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
}
// --- End Log Collection ---

addLog("𝐖𝐇𝐈𝐙-𝐌𝐃 Bot (Baileys) starting up...");

// Directory for Baileys authentication state
const BAILEYS_AUTH_PATH = path.join(__dirname, 'baileys_auth_info');
if (!fs.existsSync(BAILEYS_AUTH_PATH)) {
    fs.mkdirSync(BAILEYS_AUTH_PATH, { recursive: true });
    addLog(`Created Baileys auth directory: ${BAILEYS_AUTH_PATH}`, 'DEBUG');
}

// Global variable for the Baileys socket
let sock = null;

async function connectToWhatsApp() {
    addLog('[BAILEYS_CONNECT] Attempting to connect to WhatsApp...');

    const { state, saveCreds } = await useMultiFileAuthState(BAILEYS_AUTH_PATH);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    addLog(`[BAILEYS_CONNECT] Using Baileys version: ${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        printQRInTerminal: true, // Output QR to terminal
        auth: state,
        browser: ['𝐖𝐇𝐈𝐙-𝐌𝐃', 'Chrome', '120.0'], // Browser name for WhatsApp Web
        // logger: { info: () => {}, error: console.error, warn: console.warn, debug: () => {} }, // Removed to use Baileys default logger
        // To prevent pino from flooding console, customize or use a more robust logger later
        // getMessage: async key => { return { conversation: 'hello' } } // Example, for message retries
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            addLog('[BAILEYS_CONNECT] QR code received. Scan with your WhatsApp mobile app.');
            qrcodeTerminal.generate(qr, { small: true }, (qrString) => {
                addLog('QR code displayed in terminal (first 2 lines):\n' + qrString.split('\n').slice(0,2).join('\n'), 'DEBUG');
            });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            addLog(`[BAILEYS_CONNECT] Connection closed. Status Code: ${statusCode}, Reason: ${DisconnectReason[statusCode] || 'Unknown'}`, 'WARNING');

            if (statusCode === DisconnectReason.loggedOut) {
                addLog('[BAILEYS_CONNECT] Logged out. Deleting auth info and attempting to reconnect for new QR.', 'ERROR');
                try {
                    // fs.rmSync(BAILEYS_AUTH_PATH, { recursive: true, force: true }); // Risky if path is wrong
                    // More controlled deletion:
                    const files = fs.readdirSync(BAILEYS_AUTH_PATH);
                    for (const file of files) {
                        fs.unlinkSync(path.join(BAILEYS_AUTH_PATH, file));
                    }
                    addLog('Old auth files deleted.', 'INFO');
                } catch (err) {
                    addLog(`Error deleting auth files: ${err.message}`, 'ERROR');
                }
                connectToWhatsApp(); // Reconnect to generate new QR
            } else if (statusCode === DisconnectReason.connectionClosed ||
                       statusCode === DisconnectReason.connectionLost ||
                       statusCode === DisconnectReason.timedOut ||
                       statusCode === DisconnectReason.restartRequired) {
                addLog('[BAILEYS_CONNECT] Connection issue, attempting to reconnect...', 'WARNING');
                connectToWhatsApp();
            } else if (statusCode === DisconnectReason.badSession) {
                 addLog('[BAILEYS_CONNECT] Bad session file. Deleting auth info and attempting to reconnect for new QR.', 'ERROR');
                 try {
                    const files = fs.readdirSync(BAILEYS_AUTH_PATH);
                    for (const file of files) {
                        fs.unlinkSync(path.join(BAILEYS_AUTH_PATH, file));
                    }
                    addLog('Old auth files deleted due to bad session.', 'INFO');
                } catch (err) {
                    addLog(`Error deleting auth files for bad session: ${err.message}`, 'ERROR');
                }
                connectToWhatsApp();
            } else {
                addLog(`[BAILEYS_CONNECT] Unhandled disconnect reason: ${statusCode}. Not attempting to reconnect automatically. Please check logs and restart manually if needed.`, 'ERROR');
            }
        } else if (connection === 'open') {
            addLog('[BAILEYS_CONNECT] Connection opened successfully. 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot is now online!');
            // --- Startup Notification Logic (will be fully implemented in Step 3 of Baileys plan) ---
            try {
                const botJid = sock.user?.id;
                if (botJid) {
                    const userName = sock.user?.name || sock.user?.notify || botJid.split('@')[0];
                    const now = new Date();
                    const uptimeMs = now - startTime;
                    let uptimeString = "";
                    const totalSeconds = Math.floor(uptimeMs / 1000);
                    const days = Math.floor(totalSeconds / 86400);
                    const hours = Math.floor((totalSeconds % 86400) / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;

                    if (days > 0) uptimeString += `${days}d `;
                    if (hours > 0) uptimeString += `${hours}h `;
                    if (minutes > 0) uptimeString += `${minutes}m `;
                    uptimeString += `${seconds}s`;
                    if (uptimeString.trim() === "0s") uptimeString = "just now";

                    const startupMessage = `Hello ${userName} 🤗\nYour Bot (𝐖𝐇𝐈𝐙-𝐌𝐃 with Baileys) is running perfectly 💥\nRepo: https://github.com/twoem/whizbotpro\nUptime: ${uptimeString}\nGroup: https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM`;
                    await sock.sendMessage(botJid, { text: startupMessage });
                    addLog("[BAILEYS_CONNECT] Startup notification sent to self.");
                } else {
                     addLog("[BAILEYS_CONNECT] Could not determine bot JID for startup message.", 'WARNING');
                }
            } catch (err) {
                addLog(`[BAILEYS_CONNECT] Error sending startup notification: ${err.message}`, 'ERROR');
            }
            // --- End Startup Notification ---
        }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Message handling and other features will be attached here in the next step
    // e.g., sock.ev.on('messages.upsert', ...)


    // --- Message Handler ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages || messages.length === 0) return;
        const msg = messages[0]; // Process the first message in the upsert

        // Ensure message has content and is not from the bot itself
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        let textContent = '';

        if (msg.message.conversation) {
            textContent = msg.message.conversation;
        } else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) {
            textContent = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage && msg.message.imageMessage.caption) {
            textContent = msg.message.imageMessage.caption;
        } else if (msg.message.videoMessage && msg.message.videoMessage.caption) {
            textContent = msg.message.videoMessage.caption;
        }

        const command = textContent.toLowerCase().trim();

        try {
            if (command === '!menu') {
                addLog(`[MSG_HANDLER] Received !menu command from ${remoteJid}`);
                const menuText = `
*𝐖𝐇𝐈𝐙-𝐌𝐃 Bot Menu* 🤖

*Commands:*
- \`!vv\` : Reply to a view-once message with \`!vv\` to save and receive it.
- \`!contact\` : Get the admin's contact link.
- \`!menu\` : Show this menu.

*Automatic Features (Baileys):*
- Auto View Status: (Under Review for Baileys)
- Auto Like Status (Reactions): (Under Review for Baileys)

Stay tuned for more features!
Repo: https://github.com/twoem/whizbotpro
Group: https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM
                `;
                await sock.sendMessage(remoteJid, { text: menuText.trim() });
                addLog(`[MSG_HANDLER] Sent menu to ${remoteJid}`);
                return;
            }

            if (command === '!contact') {
                addLog(`[MSG_HANDLER] Received !contact command from ${remoteJid}`);
                const contactOwner = "Whiz";
                const contactNumber = "254754783683";
                const contactLink = `https://wa.me/${contactNumber}`;
                const contactMessage = `You can reach out to the owner (${contactOwner}) here: ${contactLink}\nFor community support, join our WhatsApp group: https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM`;
                await sock.sendMessage(remoteJid, { text: contactMessage });
                addLog(`[MSG_HANDLER] Sent contact link to ${remoteJid}`);
                return;
            }

            // --- !vv (View Once) Command for Baileys ---
            if (command === '!vv') {
                addLog(`[MSG_HANDLER] Received !vv command from ${remoteJid}`);
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const quotedMsgKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId; // Key of the quoted message

                if (quoted && quotedMsgKey) {
                    // Check if the quoted message is a view-once message
                    const viewOnceMsg = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension || quoted.ephemeralMessage?.message?.viewOnceMessage || quoted.ephemeralMessage?.message?.viewOnceMessageV2;

                    if (viewOnceMsg && (viewOnceMsg.message?.imageMessage || viewOnceMsg.message?.videoMessage)) {
                        try {
                            // Construct a minimal message object for downloadMediaMessage
                            // It needs the actual message part (imageMessage/videoMessage) that was inside viewOnce
                            const mediaMsgForDownload = viewOnceMsg.message;

                            // Ensure it's not an empty object before trying to download
                            if (Object.keys(mediaMsgForDownload).length === 0) {
                                 throw new Error("Quoted message content for view-once is empty.");
                            }

                            addLog(`[MSG_HANDLER] Attempting to download view-once media for ${remoteJid}. QuotedStanzaId: ${quotedMsgKey}`, 'DEBUG');
                            const buffer = await downloadMediaMessage(
                                { key: { remoteJid: remoteJid, id: quotedMsgKey, fromMe: false }, message: { viewOnceMessage: viewOnceMsg } }, // Simplified key, might need original key if from other user
                                'buffer',
                                {},
                                { logger: { info:()=>{}, error:console.error, warn:console.warn }, reuploadRequest: sock.updateMediaMessage }
                            );

                            let messageType = viewOnceMsg.message.imageMessage ? { image: buffer } : { video: buffer };
                            await sock.sendMessage(remoteJid, {
                                ...messageType,
                                caption: 'Here is the view-once media you requested! ✨ (from 𝐖𝐇𝐈𝐙-𝐌𝐃)'
                            });
                            await sock.sendMessage(remoteJid, { text: "Got it! ✨ The view-once media has been captured and sent to you by 𝐖𝐇𝐈𝐙-𝐌𝐃." });
                            addLog(`[MSG_HANDLER] Successfully processed !vv for view-once media for ${remoteJid}`);

                        } catch (dlError) {
                            addLog(`[MSG_HANDLER] Failed to download or send view-once media for ${remoteJid}: ${dlError.message}`, 'ERROR');
                            console.error(dlError); // Log full error for debugging
                            await sock.sendMessage(remoteJid, { text: "Oops! Something went wrong while trying to capture the media. 😥 Please try again. (Download/Send Failed) - 𝐖𝐇𝐈𝐙-𝐌𝐃" });
                        }
                    } else {
                        await sock.sendMessage(remoteJid, { text: "Hmm, it seems you didn't reply to a view-once image or video. Please use `!vv` as a reply. 🤔 - 𝐖𝐇𝐈𝐙-𝐌𝐃" });
                    }
                } else {
                    await sock.sendMessage(remoteJid, { text: "Please reply to a view-once message with `!vv` to save it. - 𝐖𝐇𝐈𝐙-𝐌𝐃" });
                }
                return;
            }
            // --- End !vv Command ---

            // --- Auto Like Status (Reactions) ---
            if (remoteJid === 'status@broadcast' && msg.key.participant) {
                // msg.key.participant is the JID of the contact who posted the status
                addLog(`[STATUS] New status detected from contact: ${msg.key.participant} (Msg ID: ${msg.key.id})`);
                try {
                    // Send reaction to the status message
                    await sock.sendMessage(remoteJid, {
                        react: {
                            text: '🔥',
                            key: msg.key
                        }
                    });
                    addLog(`[STATUS] Reacted with '🔥' to status from ${msg.key.participant} (Msg ID: ${msg.key.id})`);

                    // Auto-viewing (sending read receipt) is more complex and deferred.
                    // Example of what it might look like (NEEDS TESTING & REFINEMENT):
                    // await sock.sendReceipt(remoteJid, msg.key.participant, [msg.key.id], 'read');
                    // addLog(`[STATUS] Marked status from ${msg.key.participant} as read.`);

                } catch (statusErr) {
                    addLog(`[STATUS] Failed to react or mark status as read for ${msg.key.participant}: ${statusErr.message}`, 'ERROR');
                }
                // Do not return here, as a status message might also be a command if someone captions it with !menu etc. (unlikely but possible)
                // However, for status@broadcast, we typically don't expect further command processing.
            }
            // --- End Auto Like Status ---


        } catch (error) {
            addLog(`[MSG_HANDLER] Error processing command '${command}' from ${remoteJid}: ${error.message}`, 'ERROR');
            // await sock.sendMessage(remoteJid, { text: "Sorry, an error occurred." }); // Optional
        }
    });
    // --- End Message Handler ---


    return sock;
}

// --- Message Handling & Features (To be re-implemented with Baileys API in next step) ---
// Old client.on('message', ...) logic needs to be adapted to sock.ev.on('messages.upsert', ...)
// For now, this section is placeholder for Baileys message handling.
// addLog("[BAILEYS_MSG_HANDLER] Message handler logic will be implemented here."); // This can be removed

// --- Express Web Server for Bot Logs (Largely unchanged) ---
const app = express();
const BOT_WEB_PORT = process.env.BOT_WEB_PORT || 3001;

app.set('views', path.join(__dirname, 'bot_views'));
app.set('view engine', 'ejs');
app.use('/bot-static', express.static(path.join(__dirname, 'bot_public')));

app.get('/bot-log', (req, res) => {
    res.render('log', {
        title: '𝐖𝐇𝐈𝐙-𝐌𝐃 Bot Logs',
        MAX_LOG_ENTRIES: MAX_LOG_ENTRIES
    });
});

app.get('/bot-api/logs', (req, res) => {
    res.json(botLogs);
});

app.listen(BOT_WEB_PORT, () => {
    addLog(`[BOT_WEB] 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot log server listening on http://localhost:${BOT_WEB_PORT}/bot-log`);
});
// --- End Express Web Server ---

// Graceful shutdown
const cleanup = async () => {
    addLog("Caught interrupt signal for 𝐖𝐇𝐈𝐙-𝐌𝐃. Shutting down gracefully...");
    if (sock) {
        try {
            // Baileys doesn't have a .destroy() like wwebjs. It just closes the socket.
            // useMultiFileAuthState handles saving creds on update.
            // We might want to explicitly end the socket if needed.
            await sock.logout(); // Or sock.end(new Error('Shutdown'))
            addLog("𝐖𝐇𝐈𝐙-𝐌𝐃 Baileys client logged out/ended.");
        } catch (err) {
            addLog(`Error during Baileys client cleanup: ${err.message}`, 'ERROR');
        }
    }
    // Clean up auth info directory on SIGINT can be risky if not handled well.
    // For now, let's not auto-delete on every shutdown.
    // if (fs.existsSync(BAILEYS_AUTH_PATH)) {
    //     fs.rmSync(BAILEYS_AUTH_PATH, { recursive: true, force: true });
    //     addLog('Baileys auth info deleted on shutdown.');
    // }
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the connection process
connectToWhatsApp().catch(err => {
    addLog(`[BAILEYS_CONNECT] Failed to connect to WhatsApp initially: ${err.message}`, 'ERROR');
    // Depending on the error, might want to exit or retry after a delay
    // For now, if initial connect fails badly, it might just exit from an unhandled rejection
});

addLog("Core logic for 𝐖𝐇𝐈𝐙-𝐌𝐃 (Baileys) setup complete. Attempting to connect...");
