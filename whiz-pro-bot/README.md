# 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot (Powered by Baileys)

𝐖𝐇𝐈𝐙-𝐌𝐃 is a versatile WhatsApp bot built with Node.js and **`@whiskeysockets/baileys`**. This library allows for direct interaction with WhatsApp's servers, making the bot lighter and more stable by avoiding browser dependencies (like Puppeteer/Chromium). The bot offers automation and utility features, along with a web interface to view its live logs.

## Features

1.  **Save View Once Media (`!vv` command)**: Reply to any view-once message (image or video) with `!vv`. The bot will download the media and send it back to you.
2.  **Auto Like Status (Reactions)**: Automatically reacts with a '🔥' emoji to new status updates from your contacts. (Auto-viewing of statuses is currently under review for full Baileys implementation).
3.  **Contact Link (`!contact` command)**: Use `!contact` to get contact information for "Whiz" (`+254754783683`) and a link to the community WhatsApp group.
4.  **Bot Menu (`!menu` command)**: Use `!menu` to display a list of available commands, features, repository link, and group link.
5.  **Startup Notification**: When the bot successfully connects to WhatsApp, it sends a notification message to your own number, including a greeting, your WhatsApp profile name, repository/group links, and its current uptime.
6.  **Web Log Viewer**: A built-in web server provides a page (default: `http://localhost:3001/bot-log`) to view live operational logs.

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account.

## Setup and Running

1.  **Clone the Repository:**
    Get the code from [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro) or ensure all files are present if provided by Whiz.
    The main directory for the bot is `whiz-md-bot/`.

2.  **Install Dependencies:**
    Open a terminal in the `whiz-md-bot/` directory and run:
    ```bash
    npm install
    ```
    This will install `@whiskeysockets/baileys`, `express`, `ejs`, `dotenv`, `qrcode-terminal`, and other necessary packages.

3.  **Configure Environment Variables (Optional):**
    *   The bot primarily uses a local folder (`baileys_auth_info/`) for session persistence after the initial link.
    *   You can optionally create a `.env` file (by copying `.env.example`) to set:
        ```env
        # Optional: Set a different port for the bot's web log viewer
        # BOT_WEB_PORT=3001
        ```
    *   The `WHATSAPP_SESSION_ID` variable is **no longer used** with Baileys.

4.  **Run the Bot & Link Your Account (First Time):**
    ```bash
    npm start
    ```
    or directly:
    ```bash
    node index.js
    ```
    *   **On the very first run (or if `baileys_auth_info/` is empty or deleted):** A QR code will be generated and displayed directly in your terminal/console.
    *   **Scan this QR code** using your WhatsApp mobile application: Go to `WhatsApp Settings > Linked Devices > Link a Device`.
    *   Once scanned, the bot will connect and save its authentication state in the `baileys_auth_info/` folder.
    *   You should see log messages indicating connection progress and eventually "Connection opened successfully."

5.  **Subsequent Runs:**
    *   Simply run `npm start` or `node index.js`. The bot will use the saved credentials in `baileys_auth_info/` to automatically reconnect without needing a new QR scan, as long as the session is still valid on WhatsApp's servers.
    *   If you are logged out by WhatsApp (e.g., `DisconnectReason.loggedOut`), the bot will automatically delete the old `baileys_auth_info/` contents and generate a new QR code in the console for you to re-link.

6.  **Accessing Web Log Viewer:**
    *   Once the bot is running, you can view its live logs by navigating to `http://localhost:3001/bot-log` (or the port you configured via `BOT_WEB_PORT`) in your web browser.

## How it Works

*   **Baileys Library**: Uses `@whiskeysockets/baileys` to connect directly to WhatsApp's WebSocket servers.
*   **Authentication**: On first run, a QR code is displayed in the terminal for linking. Subsequent connections use saved session credentials from the `baileys_auth_info/` directory.
*   **Web Log Viewer**: An integrated Express.js server collects important logs and serves them on a web page.
*   **Event-Driven**: Listens for WhatsApp events (new messages, connection updates) to trigger actions.

## File Structure (`whiz-md-bot/`)

*   `index.js`: Main application logic for the bot (Baileys client) and the web log server.
*   `package.json`: Project metadata and dependencies.
*   `.env.example`: Template for optional environment variables like `BOT_WEB_PORT`.
*   `baileys_auth_info/`: Directory created by Baileys to store session credentials. **Consider adding this to your `.gitignore` file if you manage your code with Git.**
*   `bot_views/log.ejs`: EJS template for the web log page.
*   `bot_public/css/bot_style.css`: Stylesheet for the web log page.
*   `README.md`: This file.

## Important Links

*   **Repository:** [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro)
*   **WhatsApp Group:** [https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM](https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM)

## Important Notes

*   **WhatsApp Terms of Service**: Use responsibly. Automation can be against ToS.
*   **Session Files**: The `baileys_auth_info/` directory contains sensitive session credentials. Keep this directory secure.
*   **Error Handling**: Check console logs and the web log viewer for operational details and errors.

Maintained by **Whiz**. Contact: `+254754783683`.
