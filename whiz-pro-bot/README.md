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

## Deployment on OnRender.com

This bot can be deployed as a Web Service on OnRender. A `render.yaml` blueprint file is included in this repository to simplify deployment.

**Key Deployment Considerations:**

1.  **Persistent Storage (Crucial for Session):**
    *   The bot uses the `baileys_auth_info/` directory to store session credentials after you link your WhatsApp account via QR code. It also saves console logs to `logs.txt`.
    *   OnRender's filesystems are ephemeral by default. To prevent losing your session and logs on every restart or redeploy, a **Persistent Disk** must be used.
    *   The included `render.yaml` configures a 1GB persistent disk named `whiz-md-data` and mounts it to `/opt/render/project/src/data`.
    *   The bot's `index.js` is configured to use the `DATA_DIR` environment variable (which `render.yaml` sets to this mount path) for storing `baileys_auth_info/` and `logs.txt`.
    *   When setting up your service on OnRender (if not using the blueprint directly), ensure you create a persistent disk and set its mount path. Then, set the `DATA_DIR` environment variable in your OnRender service settings to this mount path.

2.  **Environment Variables on OnRender:**
    *   In your OnRender service dashboard (under "Environment"), you **must** set the following environment variables:
        *   `OWNER_JID`: Your WhatsApp JID (e.g., `2547xxxxxxxx@s.whatsapp.net`) for owner-only commands.
        *   `OWNER_JID_FOR_STATUS_SAVES`: The JID where saved statuses should be forwarded (can be the same as `OWNER_JID`).
        *   `DATA_DIR`: Set this to the mount path of your persistent disk (e.g., `/opt/render/project/src/data` if using the `render.yaml` defaults).
    *   Optional variables you might set:
        *   `BOT_WEB_PORT`: While OnRender assigns `PORT` for web services, `index.js` uses `process.env.PORT || process.env.BOT_WEB_PORT || 3001`. For OnRender, `PORT` will be used automatically. `BOT_WEB_PORT` is mainly for local override if needed.
        *   `NODE_VERSION`: OnRender usually respects the `engines` field in `package.json`.

3.  **Build and Start Commands:**
    *   The `render.yaml` uses `npm install` for building and `npm start` for starting. These should work by default.

4.  **Health Check:**
    *   The root path `/` serves a basic "Bot is active" message and can be used as the health check path in OnRender (default in `render.yaml`).

5.  **Free Tier Limitations:**
    *   Free web services on OnRender **sleep after 15 minutes of inactivity**. This means your bot will go offline and only wake up when an HTTP request is made to its web server (e.g., accessing the `/bot-log` page). This is not ideal for a bot that needs to be always responsive.
    *   For continuous operation, consider upgrading to a paid plan on OnRender or using their "Background Worker" service type (though free background workers also sleep).
    *   A common workaround for free web services is to use an external uptime monitoring service (like UptimeRobot, Cron-job.org) to ping your bot's health check URL (e.g., `your-bot-url.onrender.com/`) every 5-10 minutes to keep it awake.

**Using `render.yaml`:**
*   Connect your GitHub repository (containing this bot) to OnRender.
*   Choose to deploy using a "Blueprint". OnRender should detect the `render.yaml` file.
*   Review the service settings populated from the blueprint.
*   **Crucially, go to the Environment Variables section for the created service in the OnRender dashboard and set your actual `OWNER_JID` and `OWNER_JID_FOR_STATUS_SAVES` values.**
*   Deploy the service.

Once deployed, the first time the bot starts, it will output a QR code in the **runtime logs** on OnRender. You'll need to access these logs, copy the QR code (it might be large text), or scan it quickly if your terminal displays it well enough, to link your WhatsApp account. After linking, the session will be saved on the persistent disk.
