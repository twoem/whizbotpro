# Whiz Pro Bot

Whiz Pro Bot is a WhatsApp bot built with Node.js and `whatsapp-web.js`. It provides the following features:

1.  **Save View Once Media**: Automatically downloads and saves view-once images and videos sent to the bot's WhatsApp account.
2.  **Auto View Status**: Automatically marks status updates from contacts as viewed.
3.  **Auto Like Status**: Automatically reacts with a '🔥' emoji to new status updates from contacts.
4.  **Contact Link**: Provides a WhatsApp contact link for the admin/developer upon user request (`!contact` command).

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account.
*   A `SESSION_ID` obtained from the `whiz-session-generator` tool.

## Setup and Running

1.  **Clone the repository (or create the files as provided).**

2.  **Install Dependencies:**
    Due to sandbox limitations during development, `npm install` steps were problematic. In a local environment, you would run:
    ```bash
    npm install
    ```
    This will install `whatsapp-web.js`, `qrcode-terminal`, and any other dependencies listed in `package.json`. If `package.json` does not list them, you'll need to install them manually:
    ```bash
    npm install whatsapp-web.js qrcode-terminal
    ```

3.  **Set Environment Variables:**
    The bot requires a `WHATSAPP_SESSION_ID` environment variable. This is the JSON string captured by the `whiz-session-generator`.
    You can set this variable in your terminal before running the bot:
    ```bash
    export WHATSAPP_SESSION_ID='your_long_session_json_string_here'
    ```
    Alternatively, you can use a `.env` file with a library like `dotenv` (you would need to add `require('dotenv').config();` to the script and install `dotenv`).

4.  **Run the Bot:**
    ```bash
    npm start
    ```
    or
    ```bash
    node index.js
    ```

## How it Works

*   **Session Management**: The bot uses the `LocalAuth` strategy from `whatsapp-web.js`. When a `WHATSAPP_SESSION_ID` is provided, it writes this session data to a local file (`session_data/session-WHIZ_PRO_BOT.json`) which `LocalAuth` then uses to restore the WhatsApp session. This avoids needing to scan a QR code every time the bot starts.
*   **View Once Media**: Media is saved to the `view_once_saved_media` directory in the bot's root folder.
*   **Status Handling**: The bot listens for incoming messages. If a message is identified as a status update from a contact, it automatically sends a "seen" receipt and reacts with a '🔥' emoji.

## File Structure

*   `index.js`: The main application file containing all bot logic.
*   `package.json`: Project metadata and dependencies.
*   `session_data/`: Directory created to store session files (managed by `LocalAuth`).
*   `view_once_saved_media/`: Directory created to store downloaded view-once media.
*   `README.md`: This file.

## Important Notes

*   **WhatsApp Terms of Service**: Using automated systems like this bot can be against WhatsApp's Terms of Service. Use responsibly and at your own risk. Frequent automated actions might lead to your number being flagged or banned.
*   **Error Handling**: The bot includes basic error handling, but robust, production-ready error management (e.g., retries, notifications for critical failures) would require further development.
*   **Headless Environment**: The Puppeteer arguments are configured for running in a headless Linux environment. If you are on a different OS or encounter Puppeteer issues, you might need to adjust these or install additional system dependencies (like Chrome/Chromium).

This bot was created by Jules, your AI Software Engineer.
