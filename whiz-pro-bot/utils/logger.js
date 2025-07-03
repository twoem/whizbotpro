const fs = require('fs');
const path = require('path');

// Determine DATA_DIR for log file path consistency with index.js
const DATA_DIR = process.env.DATA_DIR || process.env.RENDER_DISK_MOUNT_PATH || '.';
const LOG_FILE_PATH = path.join(DATA_DIR, 'logs.txt');

if (DATA_DIR !== '.' && !fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`[INIT_LOGGER] Created persistent data directory for logger: ${DATA_DIR}`);
    } catch (e) {
        console.error(`[INIT_LOGGER] Failed to create data directory ${DATA_DIR}: ${e.message}`);
        // Log file will attempt to write to current directory if DATA_DIR creation fails
    }
}


const MAX_LOG_ENTRIES_FOR_WEB_UI = 200;
const botLogsForWebUI = []; // Renamed to avoid conflict if this module is required multiple times accidentally

function addLog(message, type = 'INFO') {
  const timestamp = new Date();
  const logEntryForWeb = {
    timestamp: timestamp.toISOString(),
    type,
    message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message)
  };

  botLogsForWebUI.push(logEntryForWeb);
  if (botLogsForWebUI.length > MAX_LOG_ENTRIES_FOR_WEB_UI) {
      botLogsForWebUI.shift();
  }

  const consoleMessage = `[${type}] ${timestamp.toLocaleTimeString()}: ${logEntryForWeb.message}`;
  switch (type) {
    case 'ERROR': console.error(consoleMessage); break;
    case 'WARNING': console.warn(consoleMessage); break;
    case 'DEBUG': console.debug(consoleMessage); break;
    default: console.log(consoleMessage); break;
  }

  try {
    fs.appendFileSync(LOG_FILE_PATH, `[${timestamp.toISOString()}] [${type}] ${logEntryForWeb.message}\n`);
  } catch (err) {
    console.error(`[CRITICAL_LOG_FAIL] Failed to write to ${LOG_FILE_PATH}: ${err.message}`);
  }
}

function getBotLogsForWebUI() {
    return botLogsForWebUI;
}

module.exports = {
    addLog,
    getBotLogsForWebUI,
    MAX_LOG_ENTRIES: MAX_LOG_ENTRIES_FOR_WEB_UI // Export for use in EJS template if needed
};
