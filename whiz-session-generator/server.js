const express = require('express');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); // For generating QR image data for web
const fs = require('fs'); // For session cleanup if needed

// const whatsappHandler = require('./whatsapp_handler'); // Will be developed later

const app = express();
const PORT = process.env.PORT || 3000;

// --- In-memory store for QR and Auth status (simplification) ---
let currentQR = null;
let isAuthenticated = false; // For QR
let authError = null; // For QR
let whatsappClient = null; // QR Client
let clientInitializing = false; // For QR
const SESSION_DATA_PATH_QR = './temp_qr_session_data';

// --- State for Pairing Code Linking ---
let pairingCodeClient = null;
let pairingCodeInitializing = false;
let currentPairingCode = null;
let pairingCodeError = null;
let isPairingAuthenticated = false; // For Pairing
const SESSION_DATA_PATH_PAIRING = './temp_pairing_session_data';
// --- End Pairing Code State ---


// Function to cleanup session files and reset state for QR client
const cleanupQrClient = async () => {
    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
            console.log("WhatsApp client destroyed for QR.");
        } catch (e) {
            console.error("Error destroying QR client:", e);
        }
    }
    if (fs.existsSync(SESSION_DATA_PATH_QR)) {
        fs.rmSync(SESSION_DATA_PATH_QR, { recursive: true, force: true });
        console.log("Temporary QR session data cleaned up.");
    }
    whatsappClient = null;
    currentQR = null;
    isAuthenticated = false;
    authError = null;
    clientInitializing = false;
};

// Function to cleanup session files and reset state for Pairing Code client
const cleanupPairingClient = async () => {
    if (pairingCodeClient) {
        try {
            await pairingCodeClient.destroy();
            console.log("WhatsApp client destroyed for Pairing Code.");
        } catch (e) {
            console.error("Error destroying Pairing Code client:", e);
        }
    }
    if (fs.existsSync(SESSION_DATA_PATH_PAIRING)) {
        fs.rmSync(SESSION_DATA_PATH_PAIRING, { recursive: true, force: true });
        console.log("Temporary Pairing Code session data cleaned up.");
    }
    pairingCodeClient = null;
    currentPairingCode = null;
    isPairingAuthenticated = false;
    pairingCodeError = null;
    pairingCodeInitializing = false;
};

// --- Session Capture & Delivery Function ---
const sendSessionToUser = async (clientInstance, sessionDataString, linkMethod) => {
    if (!clientInstance || !clientInstance.info || !clientInstance.info.me) {
        console.error("sendSessionToUser: Client instance or client info is not available.");
        // This error should be propagated back to the auth handler to set an appropriate error state.
        throw new Error("Client info not available to send session.");
    }
    const targetJid = clientInstance.info.me.user;
    if (!targetJid) {
        console.error("sendSessionToUser: Target JID (user's own number) could not be determined.");
        throw new Error("Could not determine your WhatsApp number to send the session.");
    }

    console.log(`Preparing to send session ID and info to ${targetJid} via ${linkMethod} method.`);

    const sessionMessage = `WHIZBOT_${sessionDataString}`; // Prepend WHIZBOT_

    let successInfoMessageText = "";
    if (linkMethod === 'QR') {
        successInfoMessageText = "*QR HAS BEEN SCANNED SUCCESSFULLY* ✅\n\n*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟\nhttps://github.com/twoem\n\n*WHIZ BOT* 🥀";
    } else if (linkMethod === 'PairingCode') {
        successInfoMessageText = "*SUCCESS PAIRING CODE WAS CORRECT* ✅\n\n*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟\nhttps://github.com/twoem\n\n*WHIZ BOT* 🥀";
    } else { // Fallback, though should always be one of the two
        successInfoMessageText = "*LINKING SUCCESSFUL* ✅\n\n*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟\nhttps://github.com/twoem\n\n*WHIZ BOT* 🥀";
    }

    try {
        console.log(`Sending Session ID to ${targetJid}...`);
        await clientInstance.sendMessage(targetJid, sessionMessage);
        console.log(`Session ID sent to ${targetJid}.`);

        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay before sending the next message

        console.log(`Sending Success Info message to ${targetJid}...`);
        await clientInstance.sendMessage(targetJid, successInfoMessageText);
        console.log(`Success Info message sent to ${targetJid}.`);

    } catch (error) {
        console.error(`Failed to send messages to ${targetJid}:`, error);
        // This error should be propagated back
        throw new Error(`Failed to send session/info to your WhatsApp: ${error.message}. Please copy the session from server logs if available.`);
    }
};
// --- End Session Capture & Delivery Function ---


// Function to initialize WhatsApp client for QR linking
const initializeWhatsAppClientForQR = () => {
    if (whatsappClient || clientInitializing) { // Check QR client state
        console.log("QR Client already exists or is initializing.");
        return;
    }
    console.log("Initializing new WhatsApp client for QR linking...");
    clientInitializing = true;
    isAuthenticated = false;
    authError = null;
    currentQR = null; // Reset QR code

    if (fs.existsSync(SESSION_DATA_PATH_QR)) {
        fs.rmSync(SESSION_DATA_PATH_QR, { recursive: true, force: true });
    }

    whatsappClient = new Client({
        authStrategy: new LocalAuth({ clientId: "whiz-qr-linker", dataPath: SESSION_DATA_PATH_QR }),
        puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] },
    });

    whatsappClient.on('qr', async (qrValue) => {
        console.log('QR RECEIVED (for web)', qrValue);
        try {
            currentQR = await qrcode.toDataURL(qrValue);
            authError = null;
        } catch (err) {
            console.error('Error generating QR Data URL:', err);
            currentQR = null;
            authError = "Error generating QR code image.";
        }
    });

    whatsappClient.on('authenticated', async () => { // Session object is not directly passed with LocalAuth
        console.log('AUTHENTICATED via QR!');
        isAuthenticated = true;
        currentQR = null;

        const sessionFilePath = path.join(SESSION_DATA_PATH_QR, `session-whiz-qr-linker.json`);
        if (fs.existsSync(sessionFilePath)) {
            const sessionData = fs.readFileSync(sessionFilePath, 'utf-8');
            try {
                await sendSessionToUser(whatsappClient, sessionData, 'QR');
                // authError will be null if successful
            } catch (sendError) {
                console.error("Error sending session after QR auth:", sendError.message);
                authError = sendError.message; // Set authError to display on frontend
            }
        } else {
            console.error("Session file not found after QR auth!");
            authError = "Session file not found after authentication.";
        }
        // Do not destroy client immediately, sendSessionToUser needs it.
        // It will be cleaned up by cleanupQrClient() called by frontend or timeout.
        // setTimeout(cleanupQrClient, 15000); // Increased timeout or handle cleanup differently
    });

    whatsappClient.on('auth_failure', async (msg) => {
        console.error('QR AUTHENTICATION FAILURE', msg);
        authError = `Authentication Failed: ${msg}. Please try refreshing.`;
        isAuthenticated = false;
        currentQR = null;
        await cleanupQrClient();
    });

    whatsappClient.on('disconnected', async (reason) => {
        console.log('Client was logged out (QR)', reason);
        // Only set error if not already authenticated successfully
        if (!isAuthenticated) {
            authError = "Client disconnected. Please try again.";
        }
        currentQR = null; // Clear QR on disconnect
        // Don't cleanup immediately if it was an authenticated session that got disconnected later.
        // Let timeout or manual refresh handle it.
        // await cleanupQrClient();
    });

    whatsappClient.initialize().then(() => {
        clientInitializing = false;
        console.log("WhatsApp client for QR initialized.");
    }).catch(async err => {
        console.error("Failed to initialize client for QR:", err);
        authError = "Failed to initialize WhatsApp client. Please try again later.";
        clientInitializing = false;
        await cleanupQrClient();
    });
};

// Function to initialize WhatsApp client for Pairing Code linking
const initializeWhatsAppClientForPairing = (phoneNumber) => {
    if (pairingCodeClient || pairingCodeInitializing) {
        console.log("Pairing Code Client already exists or is initializing.");
        if (pairingCodeError) {
            console.log("Resetting due to previous pairing error.");
            cleanupPairingClient();
        } else {
            return Promise.reject(new Error("Pairing process already active."));
        }
    }
    console.log(`Initializing new WhatsApp client for Pairing Code with number: ${phoneNumber}`);
    pairingCodeInitializing = true;
    isPairingAuthenticated = false;
    pairingCodeError = null;
    currentPairingCode = null;

    if (fs.existsSync(SESSION_DATA_PATH_PAIRING)) {
        fs.rmSync(SESSION_DATA_PATH_PAIRING, { recursive: true, force: true });
    }

    const clientId = `whiz-pairing-linker-${phoneNumber}`; // Make clientId unique per phone number
    pairingCodeClient = new Client({
        authStrategy: new LocalAuth({ clientId: clientId, dataPath: SESSION_DATA_PATH_PAIRING }),
        puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] },
    });

    pairingCodeClient.on('pairing_code', (code) => {
        console.log(`PAIRING CODE RECEIVED: ${code}`);
        currentPairingCode = code;
        pairingCodeError = null;
    });

    pairingCodeClient.on('authenticated', async () => { // Session not passed here
        console.log('AUTHENTICATED via Pairing Code!');
        isPairingAuthenticated = true;
        currentPairingCode = null;

        const sessionFilePath = path.join(SESSION_DATA_PATH_PAIRING, `session-${clientId}.json`);
        if (fs.existsSync(sessionFilePath)) {
            const sessionData = fs.readFileSync(sessionFilePath, 'utf-8');
            try {
                await sendSessionToUser(pairingCodeClient, sessionData, 'PairingCode');
                // pairingCodeError will be null if successful
            } catch (sendError) {
                console.error("Error sending session after Pairing auth:", sendError.message);
                pairingCodeError = sendError.message; // Set error to display on frontend
            }
        } else {
            console.error("Session file not found after Pairing auth!");
            pairingCodeError = "Session file not found after authentication.";
        }
        // setTimeout(cleanupPairingClient, 15000); // Increased timeout
    });

    pairingCodeClient.on('auth_failure', async (msg) => {
        console.error('PAIRING AUTHENTICATION FAILURE', msg);
        pairingCodeError = `Authentication Failed: ${msg}. Please try again.`;
        isPairingAuthenticated = false;
        currentPairingCode = null;
        await cleanupPairingClient();
    });

    pairingCodeClient.on('disconnected', async (reason) => {
        console.log('Pairing Client was logged out', reason);
        if(!isPairingAuthenticated) {
            pairingCodeError = "Client disconnected. Please try again.";
        }
        currentPairingCode = null;
        // await cleanupPairingClient();
    });

    return new Promise((resolve, reject) => {
        pairingCodeClient.initialize()
            .then(async () => {
                pairingCodeInitializing = false;
                console.log("Pairing client initialized. Ready to request pairing code via API.");
                resolve();
            })
            .catch(async err => {
                console.error("Failed to initialize client for Pairing:", err);
                pairingCodeError = "Failed to initialize WhatsApp client for pairing.";
                pairingCodeInitializing = false;
                await cleanupPairingClient();
                reject(err);
            });
    });
};

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files setup (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for parsing request bodies (if needed for forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Basic route for the home page (index)
app.get('/', (req, res) => {
    res.render('index', { title: 'Whiz Session Generator Home' });
});

app.get('/qr-link', async (req, res) => {
    if (!whatsappClient && !clientInitializing) {
        console.log("No active QR client, initializing for /qr-link page visit.");
        await cleanupQrClient();
        initializeWhatsAppClientForQR();
    } else if (authError && !currentQR && !isAuthenticated) {
        console.log("Previous QR error, re-initializing for /qr-link page visit.");
        await cleanupQrClient();
        initializeWhatsAppClientForQR();
    }
    res.render('qr-link', { title: 'Link with QR Code' });
});

app.get('/pairing-code-link', async (req, res) => {
    if (pairingCodeError && !currentPairingCode && !isPairingAuthenticated) {
        console.log("Clearing previous pairing error before loading page.");
        await cleanupPairingClient();
    }
    res.render('pairing-link', { title: 'Link with Pairing Code' });
});

// --- API Routes for QR Linking ---
app.get('/api/get-qr', (req, res) => {
    if (isAuthenticated) {
        // If authError is set, it means sending messages failed.
        return res.json({ status: 'authenticated', qrData: null, error: authError });
    }
    if (authError) { // Error during QR generation or pre-auth
        return res.json({ status: 'error', qrData: null, error: authError });
    }
    if (currentQR) {
        return res.json({ status: 'qr_ready', qrData: currentQR, error: null });
    }
    if (clientInitializing) {
        return res.json({ status: 'initializing', qrData: null, error: null });
    }
    return res.json({ status: 'waiting', qrData: null, error: 'Waiting for QR code generation...' });
});

app.get('/api/auth-status', (req, res) => { // Kept for compatibility, but /api/get-qr is more comprehensive
    res.json({
        isAuthenticated: isAuthenticated,
        error: authError
    });
});

app.post('/api/new-qr-session', async (req, res) => {
    console.log("Request received for new QR session.");
    await cleanupQrClient();
    initializeWhatsAppClientForQR();
    res.json({ status: 'reinitializing', message: 'New QR session is being initialized. Please wait.' });
});
// --- End API Routes for QR ---

// --- API Routes for Pairing Code Linking ---
app.post('/api/request-pairing-code', async (req, res) => {
    const phoneNumber = req.body.phoneNumber ? req.body.phoneNumber.replace(/\D/g, '') : null;

    if (!phoneNumber) {
        return res.status(400).json({ status: 'error', message: 'Phone number is required.' });
    }

    if (pairingCodeClient || pairingCodeInitializing) {
         if (pairingCodeError) {
            console.log("Overwriting existing errored pairing client for new request.");
            await cleanupPairingClient();
        } else {
            return res.status(409).json({ status: 'error', message: 'A pairing process is already active. Please wait or refresh.' });
        }
    }

    try {
        await initializeWhatsAppClientForPairing(phoneNumber);
        if (pairingCodeClient) {
            await pairingCodeClient.requestPairingCode(phoneNumber); // Request code after client is ready

            // Wait briefly for the 'pairing_code' event to set currentPairingCode
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (currentPairingCode) {
                res.json({ status: 'code_issued', message: 'Pairing code issued. Check below.', pairingCode: currentPairingCode });
            } else if (pairingCodeError) { // Check if error was set during init or code request
                 res.status(500).json({ status: 'error', message: pairingCodeError });
            } else {
                // This case might happen if 'pairing_code' event is significantly delayed or fails silently.
                res.status(202).json({ status: 'processing', message: 'Processing request... If no code appears shortly, check server logs or try again.'});
            }
        } else {
            // This should ideally be caught by initializeWhatsAppClientForPairing's promise rejection
            throw new Error("Pairing client not available after initialization attempt.");
        }
    } catch (error) {
        console.error('Error initializing or requesting pairing code:', error);
        // Ensure pairingCodeError is set with the most relevant error message
        pairingCodeError = pairingCodeError || error.message || 'Failed to start pairing process.';
        res.status(500).json({ status: 'error', message: pairingCodeError });
    }
});

app.get('/api/pairing-auth-status', (req, res) => {
    if (isPairingAuthenticated) {
        // If pairingCodeError is set, it means sending messages failed post-auth.
        return res.json({ status: 'authenticated', message: pairingCodeError || 'Successfully authenticated with pairing code.' });
    }
    if (pairingCodeError) { // Error during code generation or pre-auth
        return res.json({ status: 'error', message: pairingCodeError });
    }
    if (currentPairingCode) {
        return res.json({ status: 'code_issued', pairingCode: currentPairingCode, message: 'Pairing code issued. Please enter it on your phone.' });
    }
    if (pairingCodeInitializing) {
        return res.json({ status: 'initializing', message: 'Pairing client is initializing...' });
    }
    return res.json({ status: 'idle', message: 'Submit your phone number to start.' });
});

app.post('/api/new-pairing-session', async (req, res) => {
    console.log("Request received for new Pairing Code session.");
    await cleanupPairingClient();
    res.json({ status: 'reset', message: 'Pairing session reset. Please submit your phone number again.' });
});
// --- End API Routes for Pairing Code ---

app.listen(PORT, () => {
    console.log(`Whiz Session Generator server running on http://localhost:${PORT}`);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
