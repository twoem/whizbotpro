require('dotenv').config(); // Load environment variables from .env file

const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const express = require('express');

const startTime = new Date();

// --- Log Collection for Web UI ---
const MAX_LOG_ENTRIES = 200;
const botLogs = [];

function addLog(message, type = 'INFO') {
    const timestamp = new Date();
    const logEntry = {
        timestamp: timestamp.toISOString(),
        type,
        message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message) // Ensure message is string
    };

    botLogs.push(logEntry);
    if (botLogs.length > MAX_LOG_ENTRIES) {
        botLogs.shift();
    }

    const consoleMessage = `[${type}] ${timestamp.toLocaleTimeString()}: ${logEntry.message}`;
    switch (type) {
        case 'ERROR':
            console.error(consoleMessage);
            break;
        case 'WARNING':
            console.warn(consoleMessage);
            break;
        case 'DEBUG':
            console.debug(consoleMessage);
            break;
        default:
            console.log(consoleMessage);
            break;
    }
}
// --- End Log Collection ---

addLog("𝐖𝐇𝐈𝐙-𝐌𝐃 Bot starting up..."); // Renamed

const DATA_PATH = path.join(__dirname, 'session_data');
const CLIENT_ID = "WHIZ-MD"; // Renamed Client ID for LocalAuth
let clientInitializationTimeoutId = null;

if (!fs.existsSync(DATA_PATH)) {
    addLog(`Data path ${DATA_PATH} does not exist, creating it.`, 'DEBUG');
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

const SESSION_ID_CONTENT = process.env.WHATSAPP_SESSION_ID;

if (SESSION_ID_CONTENT) {
    addLog('WHATSAPP_SESSION_ID found. Attempting to write it for LocalAuth...');
    const sessionFilePath = path.join(DATA_PATH, `session-${CLIENT_ID}.json`); // Uses new CLIENT_ID
    try {
        fs.writeFileSync(sessionFilePath, SESSION_ID_CONTENT, 'utf-8');
        addLog(`Session data written to ${sessionFilePath}`);
    } catch (err) {
        addLog(`Failed to write session data: ${err.message}. Proceeding without pre-filled session.`, 'ERROR');
    }
} else {
    addLog('WHATSAPP_SESSION_ID not found. LocalAuth will attempt to use existing session or create a new one.', 'WARNING');
}

const puppeteerArgs = [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'
];
const puppeteerOptions = { headless: true, args: puppeteerArgs };
const defaultExecutablePath = puppeteer.executablePath();
addLog(`[BOT_INIT] Default executable path from Puppeteer module: ${defaultExecutablePath}`);

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    addLog(`[BOT_INIT] Using custom executable path for Puppeteer (from env var OVERRIDE): ${puppeteerOptions.executablePath}`);
} else if (defaultExecutablePath) {
    puppeteerOptions.executablePath = defaultExecutablePath;
    addLog(`[BOT_INIT] Using executable path from Puppeteer module: ${puppeteerOptions.executablePath}`);
} else {
    addLog(`[BOT_INIT] No executable path from Puppeteer module and no override. Relying on puppeteer-core's default search.`, 'WARNING');
}
addLog(`[BOT_INIT] Puppeteer final options: ${JSON.stringify(puppeteerOptions)}`);

const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: DATA_PATH }), // Uses new CLIENT_ID
    puppeteer: puppeteerOptions,
});

const clearClientInitializationTimeout = () => {
    if (clientInitializationTimeoutId) {
        clearTimeout(clientInitializationTimeoutId);
        clientInitializationTimeoutId = null;
        addLog('[BOT_INIT] Client initialization timeout cleared.', 'DEBUG');
    }
};

client.on('qr', (qr) => {
    addLog('[BOT_QR] QR RECEIVED - This means the bot needs to be linked or the session is invalid.', 'WARNING');
    if (!SESSION_ID_CONTENT) {
        addLog('[BOT_QR] No SESSION_ID was provided. Please scan the QR to generate a session, then use that for future runs.');
    } else {
        addLog('[BOT_QR] A SESSION_ID was provided but is likely invalid. Please generate a new one using Whiz Session Generator.', 'WARNING');
    }
    clearClientInitializationTimeout();
});

client.on('authenticated', () => {
    addLog('[BOT_AUTH] AUTHENTICATED. Session is active.');
    clearClientInitializationTimeout();
});

client.on('auth_failure', msg => {
    addLog(`[BOT_AUTH_FAILURE] AUTHENTICATION FAILURE: ${msg}`, 'ERROR');
    addLog(`[BOT_AUTH_FAILURE] Failed to authenticate. If you provided a SESSION_ID, it might be invalid or corrupted. Path: ${path.join(DATA_PATH, `session-${CLIENT_ID}.json`)}`, 'ERROR');
    clearClientInitializationTimeout();
    process.exit(1);
});

client.on('ready', async () => {
    addLog('[BOT_READY] 𝐖𝐇𝐈𝐙-𝐌𝐃 client is ready!'); // Renamed
    clearClientInitializationTimeout();
    try {
        const clientInfoUser = client.info.me?.user || "UnknownUser";
        const clientInfoPushname = client.info.pushname || clientInfoUser;

        addLog(`[BOT_READY] Logged in as: ${clientInfoUser}`);
        addLog(`[BOT_READY] Bot Name/Number: ${clientInfoPushname}`);

        const userName = clientInfoPushname;
        const now = new Date();
        const uptimeMs = now - startTime;
        let uptimeString = "";
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        if (days > 0) uptimeString += `${days}d `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;
        if (uptimeString.trim() === "0s") uptimeString = "just now";

        const startupMessage = `Hello ${userName} 🤗\nYour Bot (𝐖𝐇𝐈𝐙-𝐌𝐃) is running perfectly 💥\nRepo: https://github.com/twoem/whizbotpro\nUptime: ${uptimeString}\nGroup: https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM`; // Added Group Link

        if (client.info.me?.user) {
            await client.sendMessage(client.info.me.user, startupMessage);
            addLog("[BOT_READY] Startup notification sent successfully to self.");
        } else {
            addLog("[BOT_READY] Could not send startup message: client.info.me.user is not defined.", 'WARNING');
        }
    } catch (err) {
        addLog(`[BOT_READY] Error during 'ready' event processing: ${err.message}`, 'ERROR');
    }
});

client.on('disconnected', (reason) => {
    addLog(`[BOT_DISCONNECTED] Client was logged out: ${reason}`, 'WARNING');
    clearClientInitializationTimeout();
    process.exit(1);
});

client.on('error', err => {
    addLog(`[BOT_ERROR] Client error: ${err.message}`, 'ERROR');
    clearClientInitializationTimeout();
});

client.on('message', async (msg) => {
    try {
        if (msg.body.toLowerCase() === '!vv') {
            addLog(`[MSG_HANDLER] Received !vv command from ${msg.from}`);
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg && quotedMsg.isViewOnce && quotedMsg.hasMedia) {
                    const media = await quotedMsg.downloadMedia();
                    if (media) {
                        await client.sendMessage(msg.from, media, { caption: 'Here is the view-once media you requested! ✨ (from 𝐖𝐇𝐈𝐙-𝐌𝐃)' });
                        await msg.reply("Got it! ✨ The view-once media has been captured and sent to you by 𝐖𝐇𝐈𝐙-𝐌𝐃.");
                        addLog(`[MSG_HANDLER] Successfully processed !vv for view-once media for ${msg.from}`);
                    } else {
                        await msg.reply("Oops! Something went wrong while trying to capture the media. 😥 Please try again. (Media download failed) - 𝐖𝐇𝐈𝐙-𝐌𝐃");
                        addLog(`[MSG_HANDLER] Failed to download media for !vv from ${msg.from}`, 'ERROR');
                    }
                } else {
                    await msg.reply("Hmm, it seems you didn't reply to a view-once message with media. Please use !vv as a reply to a view-once image or video. 🤔 - 𝐖𝐇𝐈𝐙-𝐌𝐃");
                }
            } else {
                await msg.reply("Please reply to a view-once message with `!vv` to save it. - 𝐖𝐇𝐈𝐙-𝐌𝐃");
            }
            return;
        }

        if (msg.body.toLowerCase() === '!menu') {
            addLog(`[MSG_HANDLER] Received !menu command from ${msg.from}`);
            const menuText = `
*𝐖𝐇𝐈𝐙-𝐌𝐃 Bot Menu* 🤖

*Commands:*
- \`!vv\` : Reply to a view-once message with \`!vv\` to save and receive it.
- \`!contact\` : Get the admin's contact link.
- \`!menu\` : Show this menu.

*Automatic Features:*
- Auto View Status: Automatically views status updates from your contacts.
- Auto Like Status: Automatically likes status updates with a '🔥' emoji.

Stay tuned for more features!
Repo: https://github.com/twoem/whizbotpro
Group: https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM
            `;
            await client.sendMessage(msg.from, menuText.trim());
            addLog(`[MSG_HANDLER] Sent menu to ${msg.from}`);
            return;
        }

        if (msg.id.remote === 'status@broadcast' && msg.author) {
            addLog(`[STATUS] New status detected from contact: ${msg.author} (ID: ${msg.id.id})`);
            try {
                await client.sendSeen(msg.author);
                addLog(`[STATUS] Status from ${msg.author} marked as seen.`);
                try {
                    await msg.react('🔥');
                    addLog(`[STATUS] Reacted with '🔥' to status from ${msg.author} (ID: ${msg.id.id})`);
                } catch (reactErr) {
                    addLog(`[STATUS] Failed to react to status from ${msg.author}: ${reactErr.message}`, 'ERROR');
                }
            } catch (err) {
                addLog(`[STATUS] Failed to mark status from ${msg.author} as seen or react: ${err.message}`, 'ERROR');
            }
        }

        if (msg.body.toLowerCase() === '!contact') {
            addLog(`[MSG_HANDLER] Received !contact command from ${msg.from}`);
            const contactOwner = "Whiz";
            const contactNumber = "254754783683";
            const contactLink = `https://wa.me/${contactNumber}`;
            // Group link will be added in the next step explicitly to this message
            const contactMessage = `You can reach out to the owner (${contactOwner}) here: ${contactLink}`;
            await client.sendMessage(msg.from, contactMessage);
            addLog(`[MSG_HANDLER] Sent contact link to ${msg.from}`);
            return;
        }
    } catch (error) {
        addLog(`[MSG_HANDLER] General error processing message from ${msg.from}: ${error.message}`, 'ERROR');
    }
});

addLog("[BOT_INIT] Initializing WhatsApp client...");
const BOT_INIT_TIMEOUT_DURATION = 90000;

clientInitializationTimeoutId = setTimeout(async () => {
    if (clientInitializationTimeoutId) {
        addLog(`[BOT_INIT] Initialization TIMEOUT after ${BOT_INIT_TIMEOUT_DURATION/1000}s. The client did not become ready or fail explicitly.`, 'ERROR');
        addLog("[BOT_INIT] This could be due to an issue with Puppeteer launch, network connection to WhatsApp, or an invalid session.", 'ERROR');
        addLog("[BOT_INIT] If a SESSION_ID was provided, it might be stale. Try generating a new one.", 'ERROR');
        addLog("[BOT_INIT] If no SESSION_ID, ensure you can scan a QR if one appears (check logs for QR_RECEIVED).", 'ERROR');
        addLog("[BOT_INIT] Exiting due to timeout.", 'ERROR');
        process.exit(1);
    }
}, BOT_INIT_TIMEOUT_DURATION);

client.initialize().then(() => {
    addLog("[BOT_INIT] client.initialize() promise resolved. Waiting for 'ready' or 'authenticated' event.");
}).catch(err => {
    clearClientInitializationTimeout();
    addLog(`[BOT_INIT] Failed to initialize client: ${err.message}`, 'ERROR');
    if (err.message && err.message.includes("session data file is corrupted")) {
        addLog(`[BOT_INIT] Session file at ${path.join(DATA_PATH, `session-${CLIENT_ID}.json`)} is corrupted. Please delete it and try to link again or provide a fresh SESSION_ID.`, 'ERROR');
    }
    process.exit(1);
});

// --- Express Web Server for Bot Logs ---
const app = express();
const BOT_WEB_PORT = process.env.BOT_WEB_PORT || 3001;

app.set('views', path.join(__dirname, 'bot_views'));
app.set('view engine', 'ejs');
app.use('/bot-static', express.static(path.join(__dirname, 'bot_public')));

app.get('/bot-log', (req, res) => {
    res.render('log', {
        title: '𝐖𝐇𝐈𝐙-𝐌𝐃 Bot Logs', // Renamed
        MAX_LOG_ENTRIES: MAX_LOG_ENTRIES
    });
});

app.get('/bot-api/logs', (req, res) => {
    res.json(botLogs);
});

app.listen(BOT_WEB_PORT, () => {
    addLog(`[BOT_WEB] 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot log server listening on http://localhost:${BOT_WEB_PORT}/bot-log`); // Renamed
});
// --- End Express Web Server ---

const cleanup = async () => {
    addLog("Caught interrupt signal for 𝐖𝐇𝐈𝐙-𝐌𝐃. Shutting down gracefully..."); // Renamed
    clearClientInitializationTimeout();
    if (client) {
        try {
            if (client.pupBrowser) {
                await client.destroy();
                addLog("𝐖𝐇𝐈𝐙-𝐌𝐃 WhatsApp client destroyed."); // Renamed
            } else {
                addLog("𝐖𝐇𝐈𝐙-𝐌𝐃 WhatsApp client (or its browser) was not fully initialized, skipping destroy call."); // Renamed
            }
        } catch (err) {
            addLog(`Error destroying 𝐖𝐇𝐈𝐙-𝐌𝐃 client during cleanup: ${err.message}`, 'ERROR'); // Renamed
        }
    }
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

addLog("Core logic for 𝐖𝐇𝐈𝐙-𝐌𝐃 setup complete. Client is initializing..."); // Renamed
