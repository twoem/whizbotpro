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
            // Defensive check for pupBrowser, as error indicated 'close' was called on null
            if (whatsappClient.pupBrowser) {
                await whatsappClient.destroy();
                console.log("WhatsApp client for QR destroyed successfully.");
            } else {
                console.log("WhatsApp client for QR (or its browser instance) not fully available, skipping destroy call but resetting state.");
            }
        } catch (e) {
            console.error("Error during whatsappClient.destroy() for QR:", e.message); // Log only message
        }
    }
    try {
        if (fs.existsSync(SESSION_DATA_PATH_QR)) {
            fs.rmSync(SESSION_DATA_PATH_QR, { recursive: true, force: true });
            console.log("Temporary QR session data cleaned up.");
        }
    } catch (e) {
        console.error(`Error cleaning up QR session directory ${SESSION_DATA_PATH_QR}:`, e.message);
        // If EBUSY, it might be due to puppeteer not closing fully/quickly enough
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
            if (pairingCodeClient.pupBrowser) {
                await pairingCodeClient.destroy();
                console.log("WhatsApp client for Pairing Code destroyed successfully.");
            } else {
                console.log("WhatsApp client for Pairing Code (or its browser instance) not fully available, skipping destroy call but resetting state.");
            }
        } catch (e) {
            console.error("Error during pairingCodeClient.destroy() for Pairing Code:", e.message); // Log only message
        }
    }
    try {
        if (fs.existsSync(SESSION_DATA_PATH_PAIRING)) {
            fs.rmSync(SESSION_DATA_PATH_PAIRING, { recursive: true, force: true });
            console.log("Temporary Pairing Code session data cleaned up.");
        }
    } catch (e) {
        console.error(`Error cleaning up Pairing Code session directory ${SESSION_DATA_PATH_PAIRING}:`, e.message);
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
    if (whatsappClient || clientInitializing) {
        console.log("QR Client already exists or is initializing.");
        return;
    }
    console.log("Initializing new WhatsApp client for QR linking...");
    clientInitializing = true;
    isAuthenticated = false;
    authError = null;
    currentQR = null;
    let initTimeoutId = null;

    const clearInitializationTimeout = () => {
        if (initTimeoutId) {
            clearTimeout(initTimeoutId);
            initTimeoutId = null;
        }
    };

    if (fs.existsSync(SESSION_DATA_PATH_QR)) {
        fs.rmSync(SESSION_DATA_PATH_QR, { recursive: true, force: true });
    }
    console.log(`[QR_INIT] Creating new Client instance for QR.`);
    const puppeteerArgsQR = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    const puppeteerOptions = { headless: true, args: puppeteerArgsQR };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log(`[QR_INIT] Using custom executable path for Puppeteer: ${puppeteerOptions.executablePath}`);
    } else {
        console.log(`[QR_INIT] Using default Puppeteer Chromium download.`);
    }
    console.log(`[QR_INIT] Puppeteer args: ${JSON.stringify(puppeteerArgsQR)}`);

    whatsappClient = new Client({
        authStrategy: new LocalAuth({ clientId: "whiz-qr-linker", dataPath: SESSION_DATA_PATH_QR }),
        puppeteer: puppeteerOptions,
    });
    console.log(`[QR_INIT] Client instance for QR created. Attaching event listeners.`);

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

    whatsappClient.on('authenticated', async () => {
        console.log('AUTHENTICATED via QR!');
        clearInitializationTimeout();
        isAuthenticated = true;
        currentQR = null;

        const sessionFilePath = path.join(SESSION_DATA_PATH_QR, `session-whiz-qr-linker.json`);
        if (fs.existsSync(sessionFilePath)) {
            const sessionData = fs.readFileSync(sessionFilePath, 'utf-8');
            try {
                await sendSessionToUser(whatsappClient, sessionData, 'QR');
            } catch (sendError) {
                console.error("Error sending session after QR auth:", sendError.message);
                authError = sendError.message;
            }
        } else {
            console.error("Session file not found after QR auth!");
            authError = "Session file not found after authentication.";
        }
    });

    whatsappClient.on('auth_failure', async (msg) => {
        console.error('QR AUTHENTICATION FAILURE', msg);
        clearInitializationTimeout();
        authError = `Authentication Failed: ${msg}. Please try refreshing.`;
        isAuthenticated = false;
        currentQR = null;
        await cleanupQrClient();
    });

    whatsappClient.on('disconnected', async (reason) => {
        console.log('Client was logged out (QR)', reason);
        clearInitializationTimeout();
        if (!isAuthenticated) {
            authError = "Client disconnected. Please try again.";
        }
        currentQR = null;
    });

    console.log(`[QR_INIT] Attempting to call whatsappClient.initialize().`);
    const QR_TIMEOUT_DURATION = 90000; // 90 seconds
    initTimeoutId = setTimeout(async () => {
        // Check if the timeout variable is still the same, meaning it wasn't cleared by success/failure.
        if (initTimeoutId && clientInitializing && !isAuthenticated) {
            console.error(`[QR_INIT] Initialization TIMEOUT after ${QR_TIMEOUT_DURATION/1000}s. Attempting cleanup.`);
            authError = `Initialization timed out. Please try again.`;
            clientInitializing = false;
            await cleanupQrClient();
        }
    }, QR_TIMEOUT_DURATION);

    whatsappClient.initialize().then(() => {
        clearInitializationTimeout();
        clientInitializing = false;
        console.log("[QR_INIT] WhatsApp client for QR initialized successfully.");
    }).catch(async err => {
        clearInitializationTimeout();
        console.error("[QR_INIT] Failed to initialize client for QR:", err);
        authError = `Failed to initialize WhatsApp client for QR: ${err.message}`;
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
    console.log(`[PAIRING_INIT ${phoneNumber}] Called initializeWhatsAppClientForPairing.`);
    pairingCodeInitializing = true;
    isPairingAuthenticated = false;
    pairingCodeError = null;
    currentPairingCode = null;
    let initTimeoutId = null;

    const clearInitializationTimeout = () => {
        if (initTimeoutId) {
            clearTimeout(initTimeoutId);
            initTimeoutId = null;
        }
    };

    if (fs.existsSync(SESSION_DATA_PATH_PAIRING)) {
        fs.rmSync(SESSION_DATA_PATH_PAIRING, { recursive: true, force: true });
    }

    const clientId = `whiz-pairing-linker-${phoneNumber}`;
    console.log(`[PAIRING_INIT ${phoneNumber}] Creating new Client instance with clientId: ${clientId}`);
    const puppeteerArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    const puppeteerOptions = { headless: true, args: puppeteerArgs };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log(`[PAIRING_INIT ${phoneNumber}] Using custom executable path for Puppeteer: ${puppeteerOptions.executablePath}`);
    } else {
        console.log(`[PAIRING_INIT ${phoneNumber}] Using default Puppeteer Chromium download.`);
    }
    console.log(`[PAIRING_INIT ${phoneNumber}] Puppeteer args: ${JSON.stringify(puppeteerArgs)}`);

    pairingCodeClient = new Client({
        authStrategy: new LocalAuth({ clientId: clientId, dataPath: SESSION_DATA_PATH_PAIRING }),
        puppeteer: puppeteerOptions,
    });
    console.log(`[PAIRING_INIT ${phoneNumber}] Client instance created. Attaching event listeners.`);

    pairingCodeClient.on('pairing_code', (code) => {
        console.log(`PAIRING CODE RECEIVED: ${code}`);
        currentPairingCode = code;
        pairingCodeError = null;
    });

    pairingCodeClient.on('authenticated', async () => {
        console.log('AUTHENTICATED via Pairing Code!');
        clearInitializationTimeout();
        isPairingAuthenticated = true;
        currentPairingCode = null;

        const sessionFilePath = path.join(SESSION_DATA_PATH_PAIRING, `session-${clientId}.json`);
        if (fs.existsSync(sessionFilePath)) {
            const sessionData = fs.readFileSync(sessionFilePath, 'utf-8');
            try {
                await sendSessionToUser(pairingCodeClient, sessionData, 'PairingCode');
            } catch (sendError) {
                console.error("Error sending session after Pairing auth:", sendError.message);
                pairingCodeError = sendError.message;
            }
        } else {
            console.error("Session file not found after Pairing auth!");
            pairingCodeError = "Session file not found after authentication.";
        }
    });

    pairingCodeClient.on('auth_failure', async (msg) => {
        console.error('PAIRING AUTHENTICATION FAILURE', msg);
        clearInitializationTimeout();
        pairingCodeError = `Authentication Failed: ${msg}. Please try again.`;
        isPairingAuthenticated = false;
        currentPairingCode = null;
        await cleanupPairingClient();
    });

    pairingCodeClient.on('disconnected', async (reason) => {
        console.log('Pairing Client was logged out', reason);
        clearInitializationTimeout();
        if(!isPairingAuthenticated) {
            pairingCodeError = "Client disconnected. Please try again.";
        }
        currentPairingCode = null;
    });

    return new Promise((resolve, reject) => {
        console.log(`[PAIRING_INIT ${phoneNumber}] Attempting to call pairingCodeClient.initialize().`);

        const PAIRING_TIMEOUT_DURATION = 90000; // 90 seconds
        initTimeoutId = setTimeout(async () => {
            // Check if the timeout variable is still the same, meaning it wasn't cleared by success/failure/error.
            if (initTimeoutId && pairingCodeInitializing && !isPairingAuthenticated) {
                console.error(`[PAIRING_INIT ${phoneNumber}] Initialization TIMEOUT after ${PAIRING_TIMEOUT_DURATION/1000}s. Attempting cleanup.`);
                pairingCodeError = `Initialization timed out. Please try again.`;
                pairingCodeInitializing = false;
                await cleanupPairingClient();
                reject(new Error(pairingCodeError));
            }
        }, PAIRING_TIMEOUT_DURATION);

        pairingCodeClient.initialize()
            .then(async () => {
                clearInitializationTimeout();
                pairingCodeInitializing = false;
                console.log(`[PAIRING_INIT ${phoneNumber}] Successfully initialized Pairing client.`);
                resolve();
            })
            .catch(async err => {
                clearInitializationTimeout();
                console.error(`[PAIRING_INIT ${phoneNumber}] Failed to initialize client for Pairing:`, err);
                pairingCodeError = `Failed to initialize WhatsApp client for pairing: ${err.message}`;
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
