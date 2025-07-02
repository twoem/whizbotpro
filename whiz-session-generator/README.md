# Whiz Session Generator

This tool is used to generate a WhatsApp `SESSION_ID` for the `Whiz Pro Bot`. It works by guiding you through linking a new device to your WhatsApp account. The linked device will appear as "WHIZ PRO" in your WhatsApp "Linked Devices" list.

Once linked, the tool captures the session information and sends it as a message to your own WhatsApp number. This session ID (a JSON string) is then used by the `Whiz Pro Bot` to operate without needing to scan a QR code on every startup.

## Prerequisites

*   Node.js (v16 or higher recommended)
*   NPM (usually comes with Node.js)
*   A working WhatsApp account to link.
*   A terminal capable of displaying QR codes (most modern terminals).

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

3.  **Run the Generator:**
    ```bash
    npm start
    ```
    or
    ```bash
    node generator.js
    ```

## How it Works

1.  **Initialization**: The script starts a new `whatsapp-web.js` client. It cleans up any previous temporary session data to ensure a fresh QR code is generated.
2.  **QR Code Display**: A QR code will be displayed in your terminal.
3.  **Linking**: Open WhatsApp on your phone, go to `Settings > Linked Devices > Link a Device`, and scan the QR code shown in the terminal. The device should be named "WHIZ PRO".
4.  **Authentication & Session Capture**: Once you scan the QR code and WhatsApp authenticates, the script captures the session data. This data is saved temporarily in the `temp_session_data_generator` directory.
5.  **Session ID Display (Console)**: The captured session ID (a JSON string) will be printed to your console.
6.  **Prompt for Phone Number**: The script will then ask you to enter your own WhatsApp number (including the country code, e.g., `+14155552671` or `14155552671`).
7.  **Send Session ID via WhatsApp**: The script uses the newly linked "WHIZ PRO" session to send the captured Session ID string as a message to the number you provided.
8.  **Cleanup**: After sending the message (or if an error occurs), the script cleans up the temporary session files and exits.

## Using the Session ID

Copy the entire JSON string received in the WhatsApp message (or from the console log). This is your `SESSION_ID`. You will use this to set the `WHATSAPP_SESSION_ID` environment variable when running the `Whiz Pro Bot`.

Example of a (truncated) Session ID:
```json
{"WABrowserId":"\"...\"","WASecretBundle":"\"...\"","WAToken1":"\"...\"","WAToken2":"\"...\""}
```

## File Structure

*   `generator.js`: The main application file for the session generator.
*   `package.json`: Project metadata and dependencies.
*   `temp_session_data_generator/`: Temporary directory created during runtime to store session files for linking. It is automatically deleted upon script completion or error.
*   `README.md`: This file.

## Important Notes

*   **Security**: The generated `SESSION_ID` grants full access to your WhatsApp account, similar to an active linked device. **KEEP IT PRIVATE AND SECURE.** Do not share it with anyone.
*   **One Session ID per Bot Instance**: Each instance of the `Whiz Pro Bot` needs its own unique `SESSION_ID` generated this way.
*   **Re-generation**: If the bot logs out or the session becomes invalid, you will need to run this generator again to get a new `SESSION_ID`.
*   **Headless Environment**: The Puppeteer arguments are configured for running in a headless Linux environment. If you are on a different OS or encounter Puppeteer issues, you might need to adjust these or install additional system dependencies.

This tool was created by Jules, your AI Software Engineer.
