# 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot (Powered by Baileys)

𝐖𝐇𝐈𝐙-𝐌𝐃 is a versatile WhatsApp bot built with Node.js and **`@whiskeysockets/baileys`**. This library allows for direct interaction with WhatsApp's servers, making the bot lighter and more stable by avoiding browser dependencies (like Puppeteer/Chromium) for its core operation. The bot offers a wide array of automation, utility, media, group management, and owner-specific commands, along with a web interface to view its live logs.

## Features

**General Commands:**
*   `!ping`: Checks bot's responsiveness and replies with "Pong!" and current uptime.
*   `!menu`: Displays the comprehensive command menu.
*   `!contact`: Provides contact information for "Whiz" (`+254754783683`) and a link to the community WhatsApp group.
*   `!source`: Get a link to the bot's source code repository.
*   `!jid`: Replies with the JID of the current chat. If replying to a message in a group, also includes the JID of the quoted message's original sender.
*   `!uptime`: Shows how long the bot has been running.

**Media & Utility Commands:**
*   `!sticker`: Reply to an image/video (or send an image/video with `!sticker` as caption) to create a sticker. (Pack: "𝐖𝐇𝐈𝐙-𝐌𝐃 Stickers", Author: "Whiz ❤️").
*   `!toimg`: Reply to a sticker message to convert it back into an image (for static stickers) or a GIF-like video (for animated stickers).
*   `!vv`: Reply to a view-once message (image or video) with `!vv`. The bot will download the media and send it back to you.
*   `!save`: Reply to a message (e.g., a status you forwarded to the bot) with "save". The bot will forward the content of that replied-to message to the bot's own chat and to a pre-configured owner JID.
*   `!ytsearch <query>`: Searches YouTube for the given query and returns the top 3 video results (title, duration, link).
*   `!calc <expression>`: Evaluates a mathematical expression (e.g., `!calc (2+2)*5/2`).

**Group Admin Commands (Bot must be an administrator in the group):**
*   `!promote @user`: Promotes one or more @mentioned users to group admin.
*   `!demote @user`: Demotes one or more @mentioned group admins.
*   `!kick @user`: Removes one or more @mentioned users from the group.
*   `!grouplink`: Retrieves and sends the current group's invite link.
*   `!groupinfo`: Displays information about the current group (name, ID, participant count, owner, creation date).

**Owner-Only Commands (Sender must match `OWNER_JID` in `.env` file):**
*   `!delete`: Reply to a message sent *by the bot* with `!delete` to make the bot delete its own message.
*   `!broadcast <message>`: Sends the provided message to all groups the bot is currently a member of. Includes a small delay between sends.
*   `!restart`: Sends a confirmation message and then exits the bot process (requires an external process manager like PM2 to auto-restart).

**Automatic Features:**
*   **Auto Like Status**: Automatically reacts with a '🔥' emoji to new status updates from your contacts.
*   **Startup Notification**: On successful connection, sends a message to its own number with greeting, name, repo/group links, and uptime.
*   **Web Log Viewer**: A built-in web server (default: `http://localhost:3001/bot-log`) displays live operational logs.

*(Auto View Statuses feature is currently under review for full Baileys implementation).*

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account (preferably not your main personal account for botting).

## Setup and Running

1.  **Clone the Repository:**
    Get the code from [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro).
    The main directory for the bot is `whiz-md-bot/`.

2.  **Install Dependencies:**
    Open a terminal in the `whiz-md-bot/` directory and run:
    ```bash
    npm install
    ```
    This installs `@whiskeysockets/baileys`, `express`, `ejs`, `dotenv`, `qrcode-terminal`, `youtube-sr`, `mathjs`, and other packages.

3.  **Configure Environment Variables:**
    *   Copy the `.env.example` file to a new file named `.env` in the bot's root directory:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and configure the variables:
        ```env
        # Optional: Port for the bot's web log viewer (default: 3001)
        # BOT_WEB_PORT=3001

        # JID of the owner where saved statuses should also be forwarded (e.g., 2547xxxxxxxx@s.whatsapp.net)
        # Used by the 'save' on reply feature.
        OWNER_JID_FOR_STATUS_SAVES="your_number@s.whatsapp.net"

        # Bot Owner's JID (e.g., 2547xxxxxxxx@s.whatsapp.net)
        # Used for owner-only commands like !delete, !broadcast, !restart.
        OWNER_JID="your_number@s.whatsapp.net"
        ```
        Replace `"your_number@s.whatsapp.net"` with the appropriate WhatsApp JIDs.
    *   **Important:** Add `.env` to your `.gitignore` file if you use Git.

4.  **Run the Bot & Link Your Account (First Time):**
    ```bash
    npm start
    ```
    or directly:
    ```bash
    node index.js
    ```
    *   **On the first run (or if `baileys_auth_info/` is empty):** A QR code will appear in your terminal.
    *   Scan this QR code using WhatsApp on your phone: `Settings > Linked Devices > Link a Device`.
    *   The bot will connect and save its session in `baileys_auth_info/`.

5.  **Subsequent Runs:**
    *   Run `npm start`. The bot will use saved credentials in `baileys_auth_info/` to reconnect.
    *   If logged out, a new QR will appear for re-linking.

6.  **Accessing Web Log Viewer:**
    *   Navigate to `http://localhost:3001/bot-log` (or your configured `BOT_WEB_PORT`).

## How it Works

*   **Baileys Library**: Uses `@whiskeysockets/baileys` for direct WebSocket communication with WhatsApp.
*   **Authentication**: Console QR for initial link; session credentials stored in `baileys_auth_info/` for reconnections.
*   **Web Log Viewer**: Integrated Express.js server for real-time log monitoring.
*   **Event-Driven**: Responds to WhatsApp events (new messages, connection updates).

## File Structure (`whiz-md-bot/`)

*   `index.js`: Main bot logic (Baileys client, command handlers, Express server).
*   `package.json`: Project metadata and dependencies.
*   `.env.example`: Template for environment variables.
*   `baileys_auth_info/`: Directory for Baileys session credentials. **Add to `.gitignore`**.
*   `bot_views/log.ejs`: Template for the web log page.
*   `bot_public/css/bot_style.css`: Stylesheet for the web log page.
*   `logs.txt`: Plain text file where console logs are also appended.
*   `README.md`: This file.

## Important Links

*   **Repository:** [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro)
*   **WhatsApp Group:** [https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM](https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM)

## Important Notes

*   **WhatsApp Terms of Service**: Use responsibly.
*   **Session Files**: Keep `baileys_auth_info/` secure.
*   **Admin Privileges**: For group management commands, the bot must be an admin in the group.
*   **Owner Commands**: Ensure `OWNER_JID` is correctly set in `.env` for owner-restricted commands.
*   **Console Output**: Baileys can be verbose in the console. Check the web log viewer for structured logs.

Maintained by **Whiz**. Contact: `+254754783683`.
