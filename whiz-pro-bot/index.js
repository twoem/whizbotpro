const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const startTime = new Date(); // Record start time

console.log("Whiz Pro Bot starting...");

const DATA_PATH = path.join(__dirname, 'session_data'); // Directory to store session files
const CLIENT_ID = "WHIZ_PRO_BOT"; // Client ID for LocalAuth

// Ensure data path directory exists
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

// Environment variable for Session ID (JSON string content)
const SESSION_ID_CONTENT = process.env.WHATSAPP_SESSION_ID;

if (SESSION_ID_CONTENT) {
    console.log('WHATSAPP_SESSION_ID found. Attempting to write it for LocalAuth...');
    // LocalAuth stores session in a specific file pattern: session-${clientId}.json
    const sessionFilePath = path.join(DATA_PATH, `session-${CLIENT_ID}.json`);
    try {
        fs.writeFileSync(sessionFilePath, SESSION_ID_CONTENT, 'utf-8');
        console.log(`Session data written to ${sessionFilePath}`);
    } catch (err) {
        console.error(`Failed to write session data: ${err}. Proceeding without pre-filled session.`);
        // If writing fails, LocalAuth will try to create a new session or use an existing one if the file is already there from a previous run.
    }
} else {
    console.log('WHATSAPP_SESSION_ID not found. LocalAuth will attempt to use existing session or create a new one (requires QR scan if new).');
}

const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: DATA_PATH }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            // '--single-process', // Disables zygote and uses a single process for rendering (useful in resource-constrained environments)
            '--disable-gpu'
        ]
    },
    // Set the device name here (info.pushname is user's name)
    // This is more about the name that appears in WhatsApp linked devices.
    // The actual way to set it might be via pupeteer options or after client is ready.
    // For now, we rely on the linking service to name it "WHIZ PRO".
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED. Scan this code with WhatsApp to link a new device.');
    qrcode.generate(qr, { small: true });
    console.log('This QR is typically for the initial setup by the linking service.');
    console.log('The main bot should run with a SESSION_ID provided after linking.');
});

client.on('authenticated', () => {
    // No specific session object is passed here with LocalAuth, it handles it internally.
    console.log('AUTHENTICATED');
    console.log('Session is active. If this is the linking service, the session files in "session_data" should now be populated.');
    console.log(`The linking service should read the content of 'session_data/session-${CLIENT_ID}.json' and send it to the user as their SESSION_ID.`);
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE:', msg);
    console.error(`Failed to authenticate. If you provided a SESSION_ID, it might be invalid or corrupted. Path: ${path.join(DATA_PATH, `session-${CLIENT_ID}.json`)}`);
    // Consider deleting the potentially corrupt session file so a new QR can be generated on next run if no valid SESSION_ID is provided
    // fs.unlinkSync(path.join(DATA_PATH, `session-${CLIENT_ID}.json`)); // Be cautious with auto-deletion
});

client.on('ready', async () => {
    console.log('WhatsApp client is ready!');
    try {
        if (client.info && client.info.me) {
            console.log(`Logged in as: ${client.info.me.user}`);
            console.log(`Bot Name/Number: ${client.info.pushname || client.info.me.user}`); // pushname is the profile name
        } else {
            console.log("Client info not fully available, but client is ready.");
        }

        // --- Send Startup Notification ---
        const userName = client.info.pushname || client.info.me.user;
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


        const startupMessage = `Hello ${userName} 🤗\nYour Bot is running perfectly 💥\nRepo: https://github.com/twoem\nUptime: ${uptimeString}`;

        if (client.info.me?.user) {
            try {
                await client.sendMessage(client.info.me.user, startupMessage);
                console.log("Startup notification sent successfully to self.");
            } catch (sendErr) {
                console.error("Failed to send startup notification:", sendErr);
            }
        } else {
            console.warn("Could not send startup message: client.info.me.user is not defined.");
        }
        // --- End Startup Notification ---

        // The device name "WHIZ PRO" should have been set during the linking process by the linking service.
        // We can't easily change it from here after it's linked.
    } catch (err) {
        console.error("Error accessing client info on ready or sending startup message:", err);
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    // TODO: Implement robust reconnection logic or graceful shutdown/notification.
    // For now, it will exit, and a process manager (like PM2) should restart it.
    process.exit(1);
});

client.on('error', err => {
    console.error('Client error:', err);
});

// --- Save View Once Media Functionality ---
const VIEW_ONCE_MEDIA_PATH = path.join(__dirname, 'view_once_saved_media');
if (!fs.existsSync(VIEW_ONCE_MEDIA_PATH)) {
    fs.mkdirSync(VIEW_ONCE_MEDIA_PATH, { recursive: true });
    console.log(`Created directory for view once media: ${VIEW_ONCE_MEDIA_PATH}`);
}

client.on('message', async (msg) => {
    // --- Modified View-Once Handling (!vv command) ---
    if (msg.body.toLowerCase() === '!vv') {
        if (msg.hasQuotedMsg) {
            try {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg && quotedMsg.isViewOnce && quotedMsg.hasMedia) {
                    const media = await quotedMsg.downloadMedia();
                    if (media) {
                        await client.sendMessage(msg.from, media, { caption: 'Here is the view-once media you requested! ✨' });
                        await msg.reply("Got it! ✨ The view-once media has been captured and sent to you.");
                    } else {
                        await msg.reply("Oops! Something went wrong while trying to capture the media. 😥 Please try again. (Media download failed)");
                    }
                } else {
                    await msg.reply("Hmm, it seems you didn't reply to a view-once message with media. Please use !vv as a reply to a view-once image or video. 🤔");
                }
            } catch (error) {
                console.error("Error processing !vv command:", error);
                await msg.reply("Oops! Something went wrong while trying to capture the media. 😥 Please try again.");
            }
        } else {
            await msg.reply("Please reply to a view-once message with `!vv` to save it.");
        }
        return; // Command processed, no further checks in this handler for this message
    }

    // --- Menu Command (!menu) ---
    if (msg.body.toLowerCase() === '!menu') {
        const menuText = `
*Whiz Pro Bot Menu* 🤖

*Commands:*
- \`!vv\` : Reply to a view-once message with \`!vv\` to save and receive it.
- \`!contact\` : Get the admin's contact link.
- \`!menu\` : Show this menu.

*Automatic Features:*
- Auto View Status: Automatically views status updates from your contacts.
- Auto Like Status: Automatically likes status updates with a '🔥' emoji.

Stay tuned for more features!
Repo: https://github.com/twoem
        `;
        try {
            await client.sendMessage(msg.from, menuText.trim());
            console.log(`Sent menu to ${msg.from}`);
        } catch (err) {
            console.error(`Failed to send menu to ${msg.from}: ${err}`);
        }
        return; // Menu command processed
    }

    // --- (Old Save View Once Media Functionality - Now Disabled/Removed) ---
    // if (msg.isViewOnce && msg.hasMedia) {
    //     console.log(`View once media received from ${msg.from}`);
    //     // ... old saving logic ...
    // }

    // --- Auto View Status Functionality ---
    // Status updates are messages from 'status@broadcast'
    // The actual sender (contact who posted the status) is in `msg.author`
    // msg.id.remote is 'status@broadcast' for status messages
    if (msg.id.remote === 'status@broadcast' && msg.author) {
        console.log(`New status detected from contact: ${msg.author} (ID: ${msg.id.id})`);
        try {
            // Mark the status as seen. client.sendSeen takes the chat ID of the status broadcaster.
            // For statuses, this is msg.author (the contact who posted).
            await client.sendSeen(msg.author);
            console.log(`Status from ${msg.author} marked as seen.`);

            // --- Auto Like Status with Emoji 🔥 ---
            try {
                await msg.react('🔥');
                console.log(`Reacted with '🔥' to status from ${msg.author} (ID: ${msg.id.id})`);
            } catch (reactErr) {
                console.error(`Failed to react to status from ${msg.author}: ${reactErr}`);
            }
            // --- End Auto Like ---

        } catch (err) {
            console.error(`Failed to mark status from ${msg.author} as seen or react: ${err}`);
        }
    }

    // --- WhatsApp Link to Contact Functionality ---
    if (msg.body === '!contact') {
        const contactNumber = "254754783683";
        const contactLink = `https://wa.me/${contactNumber}`;
        try {
            await client.sendMessage(msg.from, `You can reach out to the admin here: ${contactLink}`);
            console.log(`Sent contact link to ${msg.from}`);
        } catch (err) {
            console.error(`Failed to send contact link to ${msg.from}: ${err}`);
        }
    }
    // --- End WhatsApp Link to Contact ---
});
// --- End Combined Message Handler ---

// Initialize the client
console.log("Initializing WhatsApp client...");
client.initialize().catch(err => {
    console.error("Failed to initialize client:", err);
    // Common errors:
    // - Protocol error (Runtime.callFunctionOn): Often related to Puppeteer/Chrome issues.
    //   Ensure compatible Chrome/Chromium is available. Clearing session data might help.
    // - Timeout: Network issues or WhatsApp Web taking too long to load.
    if (err.message.includes("session data file is corrupted")) {
        console.error(`Session file at ${path.join(DATA_PATH, `session-${CLIENT_ID}.json`)} is corrupted. Please delete it and try to link again or provide a fresh SESSION_ID.`);
    }
});

// Graceful shutdown
const cleanup = async () => {
    console.log("Caught interrupt signal. Shutting down gracefully...");
    if (client) {
        try {
            await client.destroy();
            console.log("Client destroyed.");
        } catch (err) {
            console.error("Error destroying client:", err);
        }
    }
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log("Core logic setup complete. Client is initializing...");
