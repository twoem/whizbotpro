# Whiz Pro Bot

Whiz Pro Bot is a WhatsApp bot built with Node.js and `whatsapp-web.js`. It offers a range of automation and utility features for your WhatsApp account.

## Features

1.  **Save View Once Media (`!vv` command)**: Reply to any view-once message (image or video) with the command `!vv`. The bot will download the media and send it back to you, effectively saving it.
2.  **Auto View Status**: Automatically marks status updates from your contacts as viewed.
3.  **Auto Like Status**: Automatically reacts with a '🔥' emoji to new status updates from your contacts.
4.  **Contact Link (`!contact` command)**: Use the command `!contact` to receive a WhatsApp contact link for the bot admin/developer.
5.  **Bot Menu (`!menu` command)**: Use the command `!menu` to display a list of all available commands and features.
6.  **Startup Notification**: When the bot successfully starts and connects to your WhatsApp, it sends a notification message to your own number, including a greeting, repository link, and its current uptime.

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account.
*   A `SESSION_ID` obtained from the web-based `whiz-session-generator` tool. This ID is a JSON string.

## Setup and Running

1.  **Clone the repository (or create the files as provided by Jules AI).**

2.  **Install Dependencies:**
    Open a terminal in the `whiz-pro-bot` directory and run:
    ```bash
    npm install
    ```
    This will install `whatsapp-web.js`, `qrcode-terminal` (though not directly used for QR scanning by this bot if a session is provided), and any other dependencies that might be listed in `package.json`. If `package.json` is minimal, you might need:
    ```bash
    npm install whatsapp-web.js
    ```

3.  **Set Environment Variables:**
    The bot requires a `WHATSAPP_SESSION_ID` environment variable. This is the JSON string captured by the `whiz-session-generator` (ensure you use the string *without* the `WHIZBOT_` prefix).
    You can set this variable in your terminal before running the bot:
    ```bash
    export WHATSAPP_SESSION_ID='your_long_session_json_string_here'
    ```
    Alternatively, you can use a `.env` file with a library like `dotenv` (you would need to add `require('dotenv').config();` at the start of `index.js` and install `dotenv` via npm).

4.  **Run the Bot:**
    ```bash
    npm start
    ```
    or directly:
    ```bash
    node index.js
    ```

## How it Works

*   **Session Management**: The bot uses the `LocalAuth` strategy from `whatsapp-web.js`. When a `WHATSAPP_SESSION_ID` is provided via the environment variable, the bot writes this session data to a local file (`session_data/session-WHIZ_PRO_BOT.json`). `LocalAuth` then uses this file to restore the WhatsApp session, avoiding the need for QR code scanning on each startup.
*   **Command Handling**: The bot listens for specific commands in messages (e.g., `!vv`, `!contact`, `!menu`) and processes them accordingly.
*   **Status Automation**: It monitors status updates from contacts to automatically view them and react with an emoji.

## File Structure

*   `index.js`: The main application file containing all bot logic.
*   `package.json`: Project metadata and dependencies.
*   `session_data/`: Directory created by `LocalAuth` to store session files.
*   `view_once_saved_media/`: Directory previously used for automatic view-once saving. While the directory might still be created by older code paths if not fully removed, the `!vv` command sends media directly to the user, not this folder. (This can be cleaned up).
*   `README.md`: This file.

## Important Notes

*   **WhatsApp Terms of Service**: Using automated systems like this bot can be against WhatsApp's Terms of Service. Use responsibly and at your own risk. Excessive automated actions might lead to your number being flagged or banned.
*   **Error Handling**: The bot includes basic error handling. For production use, more robust error management and logging would be beneficial.
*   **Headless Environment**: Puppeteer arguments in `index.js` are configured for running in a headless Linux environment. If you are on a different OS or encounter Puppeteer issues, you might need to adjust these or install additional system dependencies (like Chrome/Chromium).

This bot was created by Jules, your AI Software Engineer.
