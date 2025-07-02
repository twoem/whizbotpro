# 𝐖𝐇𝐈𝐙-𝐌𝐃 Session Generator (Web Application)

This web application generates a WhatsApp `SESSION_ID` for the **𝐖𝐇𝐈𝐙-𝐌𝐃 Bot**. It guides you through linking a new device to your WhatsApp account using either a QR code or a phone number pairing code, with a user interface inspired by modern web QR linking pages (e.g., `SuhailTechInfo/web-qr`).

Once linked, the tool captures the session information and sends it as two messages to your own WhatsApp number:
1.  The Session ID string, prefixed with `WHIZBOT_`.
2.  A success confirmation message including links to the official repository and community WhatsApp group.

This `SESSION_ID` (the JSON string, *without* the `WHIZBOT_` prefix) is then used by the **𝐖𝐇𝐈𝐙-𝐌𝐃 Bot** to operate without needing to scan a QR code on every startup.

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
    This will install all necessary dependencies including `express`, `ejs`, `whatsapp-web.js`, `qrcode`, and importantly, `puppeteer` (which downloads its own compatible Chromium browser).

3.  **Puppeteer Configuration (Browser Handling):**
    *   **Default:** The application now defaults to using the Chromium instance bundled with the `puppeteer` npm package. This is generally the most reliable method.
    *   **Override (Optional):** If you encounter issues or prefer to use a system-installed Chrome/Chromium, you can set the `PUPPETEER_EXECUTABLE_PATH` environment variable. See the Troubleshooting section for details.

4.  **Run the Web Server:**
    ```bash
    npm start
    ```
    or
    ```bash
    node server.js
    ```
    By default, the server will start on `http://localhost:3000`.

## How to Use

1.  **Open the Web Application:** Navigate to `http://localhost:3000` (or the appropriate URL if deployed) in your web browser. The pages feature a dark theme and the 𝐖𝐇𝐈𝐙-𝐌𝐃 logo.

2.  **Choose Linking Method:**
    *   The index page will offer two choices: "Link with QR Code" or "Link with Pairing Code".

3.  **Option A: Link with QR Code**
    *   Click "Link with QR Code".
    *   The page will display a QR code. A progress bar indicates its expiry time (approx. 20 seconds). Use the "New QR" button if needed.
    *   Open WhatsApp on your phone (`Settings > Linked Devices > Link a Device`), and scan the QR code.
    *   Wait for authentication status on the page.

4.  **Option B: Link with Pairing Code**
    *   Click "Link with Pairing Code".
    *   Enter your full WhatsApp phone number (with country code) and click "Get Pairing Code".
    *   A pairing code will be displayed.
    *   On your primary phone, open WhatsApp (`Settings > Linked Devices > Link with phone number instead`) and enter the code.
    *   Wait for authentication status on the page.

5.  **Session Delivery:**
    *   Upon successful authentication, the web page will indicate success.
    *   Two messages will be sent to the WhatsApp account you just linked:
        1.  **Session ID:** `WHIZBOT_{"WABrowserId":"...", ...}`
        2.  **Success Info Message:**
            Example for QR: "*QR HAS BEEN SCANNED SUCCESSFULLY* ✅\n\n*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟\n[https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro)\n\n*Join our WhatsApp Group for Support & Updates:*\n[https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM](https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM)\n\n*𝐖𝐇𝐈𝐙-𝐌𝐃* 🥀"
            (A similar message is sent for successful Pairing Code linking.)

6.  **Using the Session ID:**
    *   Copy the JSON string part from the `WHIZBOT_{...}` message.
    *   Use this `SESSION_ID` for the `WHATSAPP_SESSION_ID` environment variable when running the **𝐖𝐇𝐈𝐙-𝐌𝐃 Bot**.

## Visuals
*   The web pages feature the 𝐖𝐇𝐈𝐙-𝐌𝐃 logo:
    <img src="https://i.ibb.co/XxJgqVKp/IMG-20250701-WA0003.jpg" alt="Whiz Bot Logo" width="80"> <!-- Adjusted size for README -->
*   Pages have a consistent dark theme.

## File Structure Overview
*   `server.js`: Main Express.js application.
*   `package.json`: Project metadata and dependencies (now includes `puppeteer`).
*   `views/`: EJS templates (`index.ejs`, `qr-link.ejs`, `pairing-link.ejs`) for the dark-themed UI.
*   `public/css/style.css`: Global stylesheet.
*   `temp_qr_session_data/`, `temp_pairing_session_data/`: Temporary directories for session files during linking.

## Important Links
*   **Repository:** [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro)
*   **WhatsApp Group:** [https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM](https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM)

## Important Notes
*   **Security**: The `SESSION_ID` grants full access. Keep it private.
*   **Single User Focus**: Best for one user generating a session at a time.
*   **Pairing Code Format**: The pairing code is generated by WhatsApp; its format cannot be customized (e.g., to `WHIZ-1234`).

## Troubleshooting

### Error: "Could not find expected browser (chrome) locally."

This error means Puppeteer could not find/launch Chromium. This project now defaults to using Chromium bundled with the `puppeteer` npm package.

1.  **Ensure `npm install` Completed Successfully:**
    *   `npm install` *must* complete without errors and download `puppeteer`'s Chromium. Check its output for any Puppeteer/Chromium download error messages (network, firewall, antivirus issues can block this).

2.  **Force Clean Installation & Re-download:**
    *   Delete `node_modules` and `package-lock.json`. Run `npm install` again, monitoring output.

3.  **Check `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` Env Var:**
    *   Ensure this is NOT set to `true` during `npm install` if you want the bundled Chromium.

4.  **(Override) Use a System-Installed Chrome/Chromium via `PUPPETEER_EXECUTABLE_PATH`:**
    *   If bundled Chromium use fails, or you prefer a system browser, set `PUPPETEER_EXECUTABLE_PATH`.
    *   **Find path:**
        *   Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe` or `C:\Program Files (x86)\...`
        *   macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
        *   Linux: `which google-chrome` (e.g., `/usr/bin/google-chrome`)
    *   **Set variable (examples):**
        *   Cmd (Win): `set PUPPETEER_EXECUTABLE_PATH=C:\Your\Path\To\chrome.exe`
        *   PowerShell (Win): `$env:PUPPETEER_EXECUTABLE_PATH="C:\Your\Path\To\chrome.exe"`
        *   Bash (Linux/macOS): `export PUPPETEER_EXECUTABLE_PATH="/path/to/your/chrome"`
    *   The application prioritizes this variable if set.

### Other Issues
*   **EBUSY errors:** If `chrome_debug.log` or similar files are locked, restart server/machine. The app now handles this more gracefully to avoid crashes.

Maintained by **Whiz**. Contact: `+254754783683`.
