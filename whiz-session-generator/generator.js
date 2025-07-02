// Whiz Session Generator
// This service will:
// 1. Generate a QR code for linking a new WhatsApp device.
// 2. Once linked, capture the session data.
// 3. Prompt the user for their own WhatsApp number.
// 4. Send the captured session data (as a JSON string) to their own number.

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log("Whiz Session Generator - Version 1.0");
console.log("-------------------------------------");
console.log("This script will generate a QR code to link a new WhatsApp device.");
console.log("After successful linking, it will capture the session data.");
console.log("IMPORTANT: Run this script in a terminal that can display QR codes.");
console.log("-------------------------------------");

const DATA_PATH = path.join(__dirname, 'temp_session_data_generator'); // Temporary path for this generator
const CLIENT_ID = "WHIZ_PRO_LINKER"; // Unique client ID for this linking process

// Clean up previous temporary session data to ensure a new QR code is generated
if (fs.existsSync(DATA_PATH)) {
    console.log("Cleaning up previous temporary session data...");
    fs.rmSync(DATA_PATH, { recursive: true, force: true });
}
fs.mkdirSync(DATA_PATH, { recursive: true });

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: CLIENT_ID,
        dataPath: DATA_PATH
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    },
    // It's good practice to suggest a client name during linking.
    // This name will appear in the user's "Linked Devices" list on WhatsApp.
    // Note: This property might be `clientInfo.pushname` or similar in newer wwebjs versions,
    // or might need to be set via other means. For now, this is a common approach.
    // The actual naming of the device to "WHIZ PRO" as requested.
    clientName: 'WHIZ PRO' // This is an illustrative property, actual may vary.
                           // Often, the device name is set by WhatsApp based on OS or manually by user.
                           // We'll rely on the library's default behavior or user's action for actual naming.
                           // The important part is capturing the session linked to *a* device.
});

console.log("Initializing WhatsApp client for QR code generation...");

client.on('qr', (qr) => {
    console.log("-------------------------------------");
    console.log("QR Code Received! Scan this with your WhatsApp application:");
    qrcode.generate(qr, { small: true });
    console.log("-------------------------------------");
    console.log("Waiting for you to scan the QR code...");
});

client.on('authenticated', () => {
    // Session object is not directly passed with LocalAuth, it's stored in DATA_PATH
    console.log("-------------------------------------");
    console.log("AUTHENTICATED SUCCESSFULLY!");
    console.log("Device linked. Session data has been saved locally in:", DATA_PATH);
    console.log("The next step will be to retrieve this session data and send it to you.");
    // The session file is typically 'session_data_path/session-CLIENT_ID.json'
    const sessionFilePath = path.join(DATA_PATH, `session-${CLIENT_ID}.json`);
    if (fs.existsSync(sessionFilePath)) {
        const sessionData = fs.readFileSync(sessionFilePath, 'utf-8');
        // This sessionData is what needs to be sent to the user.
        // We will implement the sending part in the next step.
        console.log("Captured session data (this is your SESSION_ID for the bot):");
        console.log("-------------------------------------");
        console.log(sessionData); // Displaying for now, will be sent via WhatsApp later.
        console.log("-------------------------------------");
        console.log("You can now copy this session data and use it for the Whiz Pro Bot.");
        console.log("The script will now attempt to send this session ID to your WhatsApp number.");

        const capturedSessionData = process.env.CAPTURED_SESSION_DATA; // Retrieve from where it was stored

        if (!capturedSessionData) {
            console.error("CRITICAL: Captured session data is missing. Cannot proceed to send.");
            await client.destroy();
            fs.rmSync(DATA_PATH, { recursive: true, force: true });
            process.exit(1);
            return;
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question("Enter your WhatsApp number (including country code, e.g., 14155552671): ", async (phoneNumber) => {
            rl.close();
            const sanitizedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
            if (!sanitizedNumber || sanitizedNumber.length < 10) { // Basic validation
                console.error("Invalid phone number provided. Session data was not sent.");
                console.log("Your SESSION_ID is printed above. Please copy it manually.");
                await client.destroy();
                fs.rmSync(DATA_PATH, { recursive: true, force: true }); // Clean up temp data
                process.exit(1);
                return;
            }

            const targetJid = `${sanitizedNumber}@c.us`;
            const messageHeader = "=== WHIZ PRO BOT SESSION ID ===\n\n";
            const messageFooter = "\n\nIMPORTANT: Keep this Session ID private and secure. Do not share it with anyone.\nUse this ID to configure your Whiz Pro Bot.";
            const sessionMessage = messageHeader + capturedSessionData + messageFooter;

            try {
                console.log(`Sending session ID to ${targetJid}...`);
                await client.sendMessage(targetJid, sessionMessage);
                console.log("-------------------------------------");
                console.log(`Session ID sent successfully to ${phoneNumber}!`);
                console.log("You can now close this script and use the received Session ID for the bot.");
                console.log("-------------------------------------");
            } catch (sendError) {
                console.error(`Failed to send Session ID to ${phoneNumber}:`, sendError);
                console.log("Your SESSION_ID is printed above. Please copy it manually.");
            } finally {
                await client.destroy();
                console.log("Client destroyed. Cleaning up temporary files...");
                fs.rmSync(DATA_PATH, { recursive: true, force: true });
                console.log("Cleanup complete. Exiting.");
                process.exit(0);
            }
        });

    } else {
        console.error("CRITICAL: Session file not found after authentication. Path:", sessionFilePath);
        console.log("Please report this issue.");
        await client.destroy();
        fs.rmSync(DATA_PATH, { recursive: true, force: true });
        process.exit(1);
    }
});

client.on('auth_failure', (msg) => {
    console.error("-------------------------------------");
    console.error("AUTHENTICATION FAILURE:", msg);
    console.error("-------------------------------------");
    console.error("Failed to link the device. Please try running the script again.");
    client.destroy().then(() => {
        fs.rmSync(DATA_PATH, { recursive: true, force: true }); // Clean up temp data
        process.exit(1);
    });
});

client.on('ready', () => {
    console.log("Client is ready. This usually means it's fully logged in and operational.");
    console.log("If you see this, authentication was successful and session is active.");
    // The main goal (capturing session) is achieved on 'authenticated'.
    // This 'ready' event is more for an active bot.
    // For session generation, we might not need to wait for full 'ready' if 'authenticated' gives us the session.
});

client.on('disconnected', (reason) => {
    console.log("Client was logged out or disconnected:", reason);
    fs.rmSync(DATA_PATH, { recursive: true, force: true }); // Clean up temp data
    process.exit(1);
});

client.initialize().catch(err => {
    console.error("Failed to initialize client:", err);
    fs.rmSync(DATA_PATH, { recursive: true, force: true }); // Clean up temp data
    process.exit(1);
});

console.log("Waiting for QR code or authentication events...");

// The script will continue running, waiting for user to scan QR.
// Next steps will add logic after 'authenticated' event.
