# Whiz Session Generator (Web Application)

This tool is a web application used to generate a WhatsApp `SESSION_ID` for the `Whiz Pro Bot`. It guides you through linking a new device to your WhatsApp account using either a QR code or a phone number pairing code. The linked device will be associated with the session generated.

Once linked, the tool captures the session information and sends it as two messages to your own WhatsApp number:
1.  The Session ID string, prefixed with `WHIZBOT_`.
2.  A success confirmation message with a link to the project repository.

This `SESSION_ID` (the JSON string, without the `WHIZBOT_` prefix) is then used by the `Whiz Pro Bot` to operate without needing to scan a QR code on every startup.

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A modern web browser.
*   A working WhatsApp account to link.

## Setup and Running (Local Environment)

1.  **Clone the repository (or ensure all files like `server.js`, `package.json`, and directories `views/`, `public/` are present).**

2.  **Install Dependencies:**
    Open a terminal in the `whiz-session-generator` directory and run:
    ```bash
    npm install
    ```
    This will install `express`, `ejs`, `whatsapp-web.js`, `qrcode`, and other necessary dependencies.

3.  **Run the Web Server:**
    ```bash
    npm start
    ```
    or
    ```bash
    node server.js
    ```
    By default, the server will start on `http://localhost:3000`.

## How to Use

1.  **Open the Web Application:** Navigate to `http://localhost:3000` (or the appropriate URL if deployed) in your web browser.

2.  **Choose Linking Method:**
    *   The index page will present two options:
        *   "Link with QR Code"
        *   "Link with Pairing Code"

3.  **Option A: Link with QR Code**
    *   Click "Link with QR Code".
    *   A new page will load, attempting to generate and display a QR code.
    *   A progress bar will indicate the QR code's approximate expiry time (around 20 seconds). The QR code may refresh automatically, or you can use the "Refresh QR Code" button.
    *   Open WhatsApp on your phone, go to `Settings > Linked Devices > Link a Device`, and scan the QR code shown on the web page.
    *   Wait for authentication. The status on the page will update.

4.  **Option B: Link with Pairing Code**
    *   Click "Link with Pairing Code".
    *   Enter your full WhatsApp phone number (including country code, e.g., `+14155552671`) in the input field and click "Get Pairing Code".
    *   A pairing code (usually 8 characters) will be displayed on the web page.
    *   On your primary phone, open WhatsApp and go to `Settings > Linked Devices > Link with phone number instead`.
    *   Enter the pairing code displayed on the web page into your WhatsApp.
    *   Wait for authentication. The status on the page will update.

5.  **Session Delivery:**
    *   Upon successful authentication (via either method), the web page will indicate success.
    *   The system will then send two messages to the WhatsApp account you just linked:
        1.  **Session ID Message:** Starts with `WHIZBOT_` followed by the actual session JSON string.
            Example: `WHIZBOT_{"WABrowserId":"...", ...}`
        2.  **Success Info Message:** Confirms linking and provides a GitHub repository link.
            Example for QR: "*QR HAS BEEN SCANNED SUCCESSFULLY* ✅\n\n*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟\nhttps://github.com/twoem\n\n*WHIZ BOT* 🥀"
            Example for Pairing Code: "*SUCCESS PAIRING CODE WAS CORRECT* ✅\n\n*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟\nhttps://github.com/twoem\n\n*WHIZ BOT* 🥀"

6.  **Using the Session ID:**
    *   Copy the JSON string part from the `WHIZBOT_{...}` message (i.e., everything *after* `WHIZBOT_`). This is your `SESSION_ID`.
    *   Use this `SESSION_ID` to set the `WHATSAPP_SESSION_ID` environment variable when running the `Whiz Pro Bot`.

## Visuals
*   The web pages feature the Whiz Bot logo:
    <img src="https://i.ibb.co/XxJgqVKp/IMG-20250701-WA0003.jpg" alt="Whiz Bot Logo" width="100">
*   Pages have a consistent dark theme background.

## File Structure Overview

*   `server.js`: The main Express.js application file.
*   `package.json`: Project metadata and dependencies.
*   `views/`: Contains EJS templates (`index.ejs`, `qr-link.ejs`, `pairing-link.ejs`).
*   `public/`: Contains static assets:
    *   `css/style.css`: Global stylesheet.
    *   `js/script.js`: Placeholder for any future global client-side JS (currently, JS is embedded in EJS files).
    *   `images/`: Placeholder for local images (logo is currently hotlinked).
*   `temp_qr_session_data/`, `temp_pairing_session_data/`: Temporary directories created during runtime to store session files. These should be cleaned up by the application, but manual deletion might be needed if the server crashes.

## Important Notes

*   **Security**: The generated `SESSION_ID` grants full access to your WhatsApp account. **KEEP IT PRIVATE AND SECURE.** Do not share it.
*   **Single User Focus**: The current backend implementation is simplified and best suited for one user generating a session at a time. Running multiple linking processes concurrently might lead to issues.
*   **Error Handling**: Basic error handling is implemented. If you encounter persistent issues, check the server console logs.
*   **Headless Environment**: Puppeteer arguments are configured for a headless Linux environment. Adjustments or additional system dependencies might be needed for other operating systems.

This tool was created by Jules, your AI Software Engineer.
