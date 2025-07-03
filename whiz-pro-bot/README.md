# 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot (Powered by Baileys)

𝐖𝐇𝐈𝐙-𝐌𝐃 is a feature-rich WhatsApp bot built with Node.js and **`@whiskeysockets/baileys`**. It uses a direct connection to WhatsApp, making it light and stable. Customize its behavior, prefixes, and commands via a `config.js` file. The bot offers automation, utilities, media tools, group management, owner commands, and a web UI for live logs.

## Features Overview

**General Commands:**
*   `<prefix>ping`: Checks responsiveness and uptime.
*   `<prefix>menu`: Displays the detailed, structured command menu.
*   `<prefix>contact`: Provides owner "Whiz" contact card & group info.
*   `<prefix>source`: Links to the bot's GitHub repository.
*   `<prefix>jid`: Shows JID of the current chat and quoted user (if any).
*   `<prefix>uptime`: Displays current bot uptime.

**Media & Utility Commands:**
*   `<prefix>sticker` (reply to image/video or send with caption): Creates a sticker.
    *   _Pack: "𝐖𝐇𝐈𝐙-𝐌𝐃 Stickers", Author: "Whiz"_
*   `<prefix>toimg` (reply to sticker): Converts sticker to image/video.
*   `<prefix>vv` (reply to view-once): Saves and resends view-once media to you.
*   `save` (reply to a message, e.g., forwarded status): Saves content to bot's & owner's chat.
*   `<prefix>ytsearch <query>`: Searches YouTube, returns top 3 video results.
*   `<prefix>calc <expression>`: Evaluates mathematical expressions.

**Group Admin Commands (Bot must be an administrator):**
*   `<prefix>promote @user`: Promotes mentioned user(s) to admin.
*   `<prefix>demote @user`: Demotes mentioned admin(s).
*   `<prefix>kick @user`: Removes mentioned user(s).
*   `<prefix>grouplink`: Gets the group's invite link.
*   `<prefix>groupinfo`: Displays current group details.

**Owner-Only Commands (Sender must match `OWNER_JID` in `.env`):**
*   `<prefix>delete` (reply to bot's message): Deletes the bot's message.
*   `<prefix>broadcast <message>`: Sends message to all groups the bot is in.
*   `<prefix>restart`: Restarts the bot (requires process manager like PM2).

**Automatic Features:**
*   **Auto Like Status**: Reacts '🔥' to new status updates.
*   **Startup Notification**: Sends a message to self on connection (uptime, links).
*   **Web Log Viewer**: Live logs at `http://localhost:3001/bot-log` (default port).

*(Auto View Statuses feature is currently under review for Baileys).*

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account.
*   Git (for `npm install` if any dependency requires it, and for cloning).

## Setup and Running

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/twoem/whizbotpro.git
    cd whizbotpro/whiz-md-bot
    ```
    *(Assuming `whiz-md-bot` is the correct sub-directory name)*

2.  **Install Dependencies:**
    In the `whiz-md-bot/` directory, run:
    ```bash
    npm install
    ```
    This installs `@whiskeysockets/baileys`, `express`, `ejs`, `dotenv`, `qrcode-terminal`, `youtube-sr`, `mathjs`, etc.

3.  **Configure the Bot (`config.js`):**
    *   Open `config.js` in the `whiz-md-bot/` directory.
    *   Customize settings like `botName`, `ownerName`, `prefixes`, `footerText`.
    *   You can also review and modify the `commandsList` which populates the `!menu`.
    *   **Note:** The `ownerJidEnvKey` and `statusSavesJidEnvKey` in `config.js` define the *names* of the environment variables the bot will look for (e.g., "OWNER_JID"). You'll set the actual JID values in the `.env` file.

4.  **Set Environment Variables (`.env` file):**
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Edit `.env` and provide your actual JIDs:
        ```env
        # Optional: Port for the bot's web log viewer (default: 3001)
        # BOT_WEB_PORT=3001

        # JID of the owner where saved statuses should also be forwarded (e.g., 2547xxxxxxxx@s.whatsapp.net)
        # Key name is defined in config.js (statusSavesJidEnvKey)
        OWNER_JID_FOR_STATUS_SAVES="your_number@s.whatsapp.net"

        # Bot Owner's JID (e.g., 2547xxxxxxxx@s.whatsapp.net)
        # Used for owner-only commands. Key name is defined in config.js (ownerJidEnvKey)
        OWNER_JID="your_number@s.whatsapp.net"
        ```
    *   **Important:** Add `.env` to your `.gitignore` file.

5.  **Run the Bot & Link Your Account (First Time):**
    ```bash
    npm start
    ```
    or `node index.js`.
    *   **On the first run (or if `baileys_auth_info/` is empty):** A QR code will appear in your terminal.
    *   Scan this QR code using WhatsApp on your phone: `Settings > Linked Devices > Link a Device`.
    *   The bot will connect and save its session in `baileys_auth_info/`.

6.  **Subsequent Runs:**
    *   Run `npm start`. The bot will use saved credentials in `baileys_auth_info/` to reconnect.

7.  **Accessing Web Log Viewer:**
    *   Default: `http://localhost:3001/bot-log` (or your configured `BOT_WEB_PORT`).

## Command Usage
*   Commands can be triggered using any of the prefixes defined in `config.js` (default: `!`, `.`, `#`, `/`). For example, `!menu` or `.ping`.
*   For commands requiring arguments (e.g., `<query>`, `<expression>`, `@user`), provide them after the command. Example: `!ytsearch best songs` or `!kick @1234567890`.

## How it Works
*   **Baileys Library**: Uses `@whiskeysockets/baileys` for direct WebSocket communication.
*   **Configuration**: Most settings are managed via `config.js`. Sensitive JIDs via `.env`.
*   **Authentication**: Console QR for initial link; session credentials stored in `baileys_auth_info/`.
*   **Multi-Prefix**: Parses commands based on the `prefixes` array in `config.js`.
*   **Dynamic Menu**: The `!menu` command content is generated from `config.commandsList`.
*   **Web Log Viewer**: Integrated Express.js server.

## File Structure (`whiz-md-bot/`)
*   `index.js`: Main bot logic.
*   `config.js`: Bot configurations (name, owner, prefixes, command list, etc.).
*   `package.json`: Project metadata and dependencies.
*   `.env.example`: Template for environment variables.
*   `baileys_auth_info/`: For Baileys session credentials. **Add to `.gitignore`**.
*   `bot_views/log.ejs`: Template for the web log page.
*   `bot_public/css/bot_style.css`: Stylesheet for the web log page.
*   `logs.txt`: Plain text file where console logs are also appended.
*   `README.md`: This file.

## Important Links
*   **Repository:** [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro)
*   **WhatsApp Group:** [https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM](https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM)

## Important Notes
*   **WhatsApp ToS**: Use responsibly.
*   **Session Files**: Keep `baileys_auth_info/` secure.
*   **Admin/Owner Commands**: Ensure bot has admin rights for group actions and `OWNER_JID` is set for owner commands.
*   **Console Output**: Baileys can be verbose. Use the web log viewer for structured logs.

Maintained by **Whiz**. Contact: `+254754783683`.
