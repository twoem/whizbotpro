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
*   **A working installation of Google Chrome (or another Chromium-based browser) is highly recommended if Puppeteer's automatic Chromium download fails.**

## Setup and Running (Local Environment)

1.  **Clone the repository (or ensure all files like `server.js`, `package.json`, and directories `views/`, `public/` are present).**

2.  **Install Dependencies:**
    Open a terminal in the `whiz-session-generator` directory and run:
    ```bash
    npm install
    ```
    This command installs all necessary dependencies, including `puppeteer`. The `puppeteer` package will attempt to download its own version of Chromium. **If this download fails (e.g., due to network errors like `ECONNRESET`, firewall, or antivirus), please see the "Troubleshooting Puppeteer / Chromium Issues" section below.**

3.  **Configure Puppeteer (Browser Handling - IMPORTANT for Windows / Download Issues):**
    *   **Default Behavior:** The application will first try to use the Chromium version downloaded by the `puppeteer` npm package.
    *   **Primary Workaround (If Chromium download fails): Use Your System's Chrome.**
        If `npm install` fails to download Chromium or if you prefer to use your existing Chrome installation, you **must** set the `PUPPETEER_EXECUTABLE_PATH` environment variable.
        1.  **Find your Chrome executable path:**
            *   **Windows:** Usually `C:\Program Files\Google\Chrome\Application\chrome.exe` or `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`. (Right-click Chrome shortcut > Properties > Target).
            *   **macOS:** Usually `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
            *   **Linux:** Often `/usr/bin/google-chrome`. Use `which google-chrome`.
        2.  **Set `PUPPETEER_EXECUTABLE_PATH` Environment Variable (Persistently):**
            *   **Windows:** Search for "environment variables" > "Edit the system environment variables" > "Environment Variables..." button. Under "User variables" (or "System variables"), click "New...".
                *   Variable name: `PUPPETEER_EXECUTABLE_PATH`
                *   Variable value: `C:\Program Files\Google\Chrome\Application\chrome.exe` (Your actual path)
                Click OK on all dialogs.
            *   **Linux/macOS:** Add `export PUPPETEER_EXECUTABLE_PATH="/path/to/your/chrome"` to your shell profile (e.g., `~/.bashrc`, `~/.zshrc`), then run `source ~/.bashrc` or open a new terminal.
        3.  **IMPORTANT: Close and re-open your command prompt/terminal** after setting the variable for it to take effect in that session.
    *   **(Optional) Skip Chromium Download by Puppeteer:** If you are consistently using `PUPPETEER_EXECUTABLE_PATH`, you can tell `npm install` not to download Chromium:
        *   Set environment variable `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` before running `npm install`.
        *   Or, create a file named `.npmrc` (no extension) in the `whiz-session-generator` project root and add the line: `puppeteer_skip_chromium_download=true`. Then run `npm install`.

4.  **Run the Web Server:**
    After successful `npm install` and (if needed) setting `PUPPETEER_EXECUTABLE_PATH`:
    ```bash
    npm start
    ```
    or
    ```bash
    node server.js
    ```
    By default, the server will start on `http://localhost:3000`. Check the console logs; it will indicate which Chrome/Chromium executable path it's attempting to use.

## How to Use
(This section remains largely the same as before - user navigates to localhost:3000, chooses method, etc.)
1.  **Open the Web Application:** Navigate to `http://localhost:3000`...
2.  **Choose Linking Method:** ...
3.  **Option A: Link with QR Code** ...
4.  **Option B: Link with Pairing Code** ...
5.  **Session Delivery:** ...
    1.  **Session ID:** `WHIZBOT_{"WABrowserId":"...", ...}`
    2.  **Success Info Message:** (Example message with correct repo/group links)
6.  **Using the Session ID:** ...

## Visuals
(Remains the same)

## File Structure Overview
(Remains largely the same, `puppeteer` version updated)

## Important Links
(Remains the same)

## Important Notes
(Remains largely the same)

## Troubleshooting Puppeteer / Chromium Issues

If you see errors like **"Could not find expected browser (chrome) locally"** or **`ECONNRESET` during `npm install`**, it means Puppeteer is having trouble with its Chromium browser.

1.  **Primary Solution: Use `PUPPETEER_EXECUTABLE_PATH` (Recommended)**
    *   Follow the detailed instructions in **Section 3 of "Setup and Running"** above to set this environment variable to point to your system's installed Google Chrome. This is the most reliable fix if the automatic download fails.
    *   **Remember to restart your terminal after setting the variable.**

2.  **Verify `npm install` for Bundled Chromium:**
    *   The `puppeteer` package (now a direct dependency) attempts to download its own Chromium. If `PUPPETEER_EXECUTABLE_PATH` is *not* set, this bundled version is used.
    *   If the download fails during `npm install` (check for `ECONNRESET` or other download errors in the `npm install` log), the bundled Chromium will be missing or corrupt.
    *   **To fix a failed download of bundled Chromium:**
        1.  Ensure no `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` environment variable is set.
        2.  Delete `node_modules` and `package-lock.json`.
        3.  Try `npm install` again, carefully watching for network errors, firewall/antivirus interference.

3.  **`EPERM` or `EBUSY` errors during `npm install` or cleanup:**
    *   These errors mean files or folders (often within `node_modules/@puppeteer/browsers` or the temporary session data folders) are locked by another process.
    *   **Solution:** Close any running instances of the application. Close any lingering `node.exe` or `chrome.exe` processes (check Task Manager on Windows). Manually delete the `node_modules` folder and the temporary session data folders (`temp_qr_session_data`, `temp_pairing_session_data`) if they exist. A system reboot can also help clear file locks. Then try `npm install` again.

Maintained by **Whiz**. Contact: `+254754783683`.
