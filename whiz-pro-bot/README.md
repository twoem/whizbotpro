# 𝐖𝐇𝐈𝐙-𝐌𝐃 Bot

𝐖𝐇𝐈𝐙-𝐌𝐃 is a versatile WhatsApp bot built with Node.js and `whatsapp-web.js`. It offers a range of automation and utility features for your WhatsApp account, along with a web interface to view live bot logs.

## Features

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

## Setup and Running

1.  **Clone the repository (or ensure all files are present if provided by Whiz/Jules AI).**
    *   The main directory for the bot is conceptually named `whiz-md-bot/`.

2.  **Install Dependencies:**
    Open a terminal in the `whiz-md-bot/` directory and run:
    ```bash
    npm install
    ```
    This will install all necessary dependencies including `whatsapp-web.js`, `puppeteer` (which downloads its own Chromium), `express`, `ejs`, and `dotenv`.

3.  **Configure Environment Variables:**
    *   Copy the `.env.example` file to a new file named `.env` in the bot's root directory:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and add your `WHATSAPP_SESSION_ID` (the JSON string obtained from the 𝐖𝐇𝐈𝐙-𝐌𝐃 Session Generator, *without* the `WHIZBOT_` prefix).
        ```env
        WHATSAPP_SESSION_ID="your_long_session_json_string_here"
        # Optional: Set a different port for the bot's web log viewer
        # BOT_WEB_PORT=3001
        ```
    *   **Important:** Add `.env` to your `.gitignore` file to avoid committing your session ID.

4.  **Puppeteer Configuration (Browser Handling):**
    *   By default, the bot uses the version of Chromium that comes bundled with the `puppeteer` npm package. This is generally the most reliable option.
    *   **Override (Optional):** If you need to use a specific system-installed version of Chrome/Chromium, you can set the `PUPPETEER_EXECUTABLE_PATH` environment variable to its full path before running the bot. See the 𝐖𝐇𝐈𝐙-𝐌𝐃 Session Generator's README for examples on how to set this.

5.  **Run the Bot:**
    ```bash
    npm start
    ```
    or directly:
    ```bash
    node index.js
    ```
    The bot will start, and you should see logs in your console. The web log viewer will also be available (default: `http://localhost:3001/bot-log`).

## How it Works

*   **Session Management**: Uses `LocalAuth` with the `WHATSAPP_SESSION_ID` from your `.env` file to restore the WhatsApp session, avoiding QR scans on each startup.
*   **Puppeteer**: Relies on Puppeteer for browser automation. The project now includes `puppeteer` as a direct dependency to manage its own Chromium version, enhancing stability.
*   **Web Log Viewer**: An integrated Express.js server collects important logs and serves them on a web page for real-time monitoring.
*   **Command Handling**: Listens for commands (`!vv`, `!contact`, `!menu`) and processes them.
*   **Status Automation**: Monitors and interacts with contact status updates.

## File Structure (Conceptual: `whiz-md-bot/`)

*   `index.js`: Main application logic for the bot and the web log server.
*   `package.json`: Project metadata and dependencies.
*   `.env.example`: Template for environment variables.
*   `session_data/`: Directory for `LocalAuth` session files.
*   `bot_views/log.ejs`: EJS template for the web log page.
*   `bot_public/css/bot_style.css`: Stylesheet for the web log page.
*   `README.md`: This file.

## Important Links

*   **Repository:** [https://github.com/twoem/whizbotpro](https://github.com/twoem/whizbotpro)
*   **WhatsApp Group:** [https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM](https://chat.whatsapp.com/JLmSbTfqf4I2Kh4SNJcWgM)

## Important Notes

*   **WhatsApp Terms of Service**: Use responsibly. Automation can be against ToS.
*   **Security**: Keep your `.env` file (with `WHATSAPP_SESSION_ID`) secure and private.
*   **Error Handling**: The bot includes improved logging. Check console and the web log viewer for errors.

Maintained by **Whiz**. Contact: `+254754783683`.
