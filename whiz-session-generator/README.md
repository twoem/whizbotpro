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

## Troubleshooting

### Error: "Could not find expected browser (chrome) locally."

This error means that Puppeteer (used by `whatsapp-web.js`) could not find or launch a compatible version of Chromium. This project now includes `puppeteer` as a direct dependency, which means `npm install` should download a known-compatible version of Chromium into your `node_modules` folder. The application will attempt to use this version by default.

If you still encounter this error, here's how to troubleshoot:

1.  **Ensure `npm install` Completed Successfully:**
    *   The `npm install` command *must* complete without errors. It's responsible for downloading `puppeteer` and its bundled Chromium.
    *   Watch the output of `npm install` carefully for any messages related to "Puppeteer" or "Chromium download" failing (e.g., due to network issues, firewalls, antivirus software).

2.  **Force Clean Installation & Re-download of Chromium:**
    *   If you suspect an incomplete or corrupted download:
        1.  Delete the `node_modules` folder in your `whiz-session-generator` directory.
        2.  Delete the `package-lock.json` file (if it exists).
        3.  Run `npm install` again. Monitor the output closely for Puppeteer's Chromium download progress and success messages.

3.  **Check `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` Environment Variable:**
    *   Ensure this environment variable is NOT set to `true` (or `1`) when you run `npm install`, as this would explicitly prevent Puppeteer from downloading its bundled Chromium.

4.  **(Override) Use a System-Installed Chrome/Chromium via `PUPPETEER_EXECUTABLE_PATH`:**
    *   If, for some reason, the Chromium bundled with the `puppeteer` npm package cannot be used or if you prefer to use a specific system-installed version of Chrome/Chromium, you can set the `PUPPETEER_EXECUTABLE_PATH` environment variable.
    *   The application will prioritize this environment variable if set.
    *   **Find your Chrome executable path:**
        *   **Windows:** Usually `C:\Program Files\Google\Chrome\Application\chrome.exe` or `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`. You can find it by right-clicking your Chrome shortcut, going to Properties, and looking at the "Target" field.
        *   **macOS:** Usually `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
        *   **Linux:** Often `/usr/bin/google-chrome`, `/opt/google/chrome/chrome`, or similar. Use the `which google-chrome` command in your terminal.
    *   **Set the environment variable:** Before running `npm start` or `node server.js`, set the `PUPPETEER_EXECUTABLE_PATH` environment variable to the full path you found.
        *   **Windows (Command Prompt):**
            ```cmd
            set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
            ```
            (Replace with your actual path. You might need to escape spaces or use quotes if the command interpreter requires it, though often `set` handles spaces well if the path itself is not quoted.)
            For persistent setting, search for "environment variables" in Windows settings.
        *   **Windows (PowerShell):**
            ```powershell
            $env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
            ```
        *   **Linux/macOS (Terminal):**
            ```bash
            export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"
            ```
            (Replace with your actual path.) Add this line to your shell profile (e.g., `.bashrc`, `.zshrc`) for persistence.
    *   The application will detect this environment variable and use your specified Chrome/Chromium installation.

### Other Issues
*   **EBUSY errors during cleanup:** If you see errors related to files being busy during cleanup (often `chrome_debug.log`), it might mean a previous Puppeteer instance didn't shut down correctly. Restarting the server or even your machine might be necessary in rare cases to clear file locks. The application has been updated to handle these more gracefully to prevent crashes.

This tool was created by Jules, your AI Software Engineer.
