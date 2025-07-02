# 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot

𝐖𝐇𝐈𝐙-𝐌𝐃 is a versatile WhatsApp bot built with Node.js and `whatsapp-web.js`. It offers a range of automation and utility features for your WhatsApp account, along with a web interface to view live bot logs.

## Features
(Features list remains as previously updated)
1.  **Save View Once Media (`!vv` command)**: Reply to any view-once message (image or video) with the command `!vv`. The bot will download the media and send it back to you, effectively saving it.
2.  **Auto View Status**: Automatically marks status updates from your contacts as viewed.
3.  **Auto Like Status**: Automatically reacts with a '🔥' emoji to new status updates from your contacts.
4.  **Contact Link (`!contact` command)**: Use the command `!contact` to receive contact information for "Whiz" (`+254754783683`) and a link to the community WhatsApp group.
5.  **Bot Menu (`!menu` command)**: Use the command `!menu` to display a list of all available commands, features, repository link, and group link.
6.  **Startup Notification**: When the bot successfully starts and connects to your WhatsApp, it sends a notification message to your own number, including a greeting, your WhatsApp profile name, the official repository link, the community group link, and its current uptime.
7.  **Web Log Viewer**: A built-in web server provides a page (typically at `http://localhost:3001/bot-log`) to view live operational logs from the bot, including status updates, errors, and processed commands.

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account.
*   A `SESSION_ID` obtained from the web-based **𝐖𝐇𝐈𝐙-𝐌𝐃 Session Generator** tool. This ID is a JSON string.
*   **A working installation of Google Chrome (or another Chromium-based browser) is highly recommended if Puppeteer's automatic Chromium download fails.**

## Setup and Running

1.  **Clone the repository (or ensure all files are present).**
    *   The main directory for the bot is conceptually named `whiz-md-bot/`.

2.  **Install Dependencies:**
    Open a terminal in the `whiz-md-bot/` directory and run:
    ```bash
    npm install
    ```
    This command installs all necessary dependencies, including `puppeteer`. The `puppeteer` package will attempt to download its own version of Chromium. **If this download fails (e.g., due to network errors like `ECONNRESET`, firewall, or antivirus), please see the "Troubleshooting Puppeteer / Chromium Issues" section below.**

3.  **Configure Puppeteer (Browser Handling - IMPORTANT for Windows / Download Issues):**
    *   **Default Behavior:** The bot will first try to use the Chromium version downloaded by the `puppeteer` npm package.
    *   **Primary Workaround (If Chromium download fails): Use Your System's Chrome.**
        If `npm install` fails to download Chromium or if you prefer to use your existing Chrome installation, you **must** set the `PUPPETEER_EXECUTABLE_PATH` environment variable.
        1.  **Find your Chrome executable path:** (Same instructions as session generator: Windows, macOS, Linux)
        2.  **Set `PUPPETEER_EXECUTABLE_PATH` Environment Variable (Persistently):** (Same instructions as session generator: Windows, Linux/macOS)
        3.  **IMPORTANT: Close and re-open your command prompt/terminal** after setting the variable.
    *   **(Optional) Skip Chromium Download by Puppeteer:** If you are consistently using `PUPPETEER_EXECUTABLE_PATH`, you can tell `npm install` not to download Chromium:
        *   Set environment variable `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` before running `npm install`.
        *   Or, create a file named `.npmrc` in the `whiz-md-bot/` project root with: `puppeteer_skip_chromium_download=true`. Then run `npm install`.

4.  **Configure Bot Environment Variables:**
    *   Copy the `.env.example` file to `.env`: `cp .env.example .env`
    *   Open `.env` and add your `WHATSAPP_SESSION_ID` (the JSON string from the Session Generator, *without* `WHIZBOT_` prefix).
        ```env
        WHATSAPP_SESSION_ID="your_long_session_json_string_here"
        # Optional: Set a different port for the bot's web log viewer
        # BOT_WEB_PORT=3001
        ```
    *   **Important:** Add `.env` to your `.gitignore` file.

5.  **Run the Bot:**
    After successful `npm install` and configuration:
    ```bash
    npm start
    ```
    or directly:
    ```bash
    node index.js
    ```
    Check console logs and the web log viewer (default: `http://localhost:3001/bot-log`). The console will indicate which Chrome/Chromium executable path is being used.

## How it Works
(Remains largely the same - Puppeteer note updated)
*   **Session Management**: ...
*   **Puppeteer**: Relies on Puppeteer. Now includes `puppeteer` as a direct dependency to manage its own Chromium, enhancing stability. Supports `PUPPETEER_EXECUTABLE_PATH` override.
*   **Web Log Viewer**: ...
*   **Command Handling**: ...
*   **Status Automation**: ...

## File Structure (Conceptual: `whiz-md-bot/`)
(Remains the same)

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
    *   These errors mean files or folders are locked.
    *   **Solution:** Close any running instances of the application/bot. Close any lingering `node.exe` or `chrome.exe` processes (check Task Manager on Windows). Manually delete the `node_modules` folder. A system reboot can also help. Then try `npm install` again.

Maintained by **Whiz**. Contact: `+254754783683`.
