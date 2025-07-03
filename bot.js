// bot.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const figlet = require('figlet');
const moment = require('moment');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fancytext = require('./lib/fancytext');
const config = require('./config.json');

// --- 1) Start Express to open a port for Render ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('🤖 WHIZBotPro is running'));
app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));

// --- 2) Ensure auth storage exists ---
const authPath = './auth_info';
if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);

// --- 3) Uptime helper ---
let startTime = Date.now();
const getUptime = () => {
  const diff = Date.now() - startTime;
  const d = moment.duration(diff);
  return `${d.hours()}h ${d.minutes()}m ${d.seconds()}s`;
};

async function startBot() {
  console.clear();
  console.log(figlet.textSync(config.botname));
  console.log(`Owner: ${config.ownername}`);

  // Auth state
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  // Baileys version
  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp version ${version.join('.')}`);

  // Create socket
  const sock = makeWASocket({
    version,
    logger: P({ level: 'fatal' }),      // silence internal logs
    printQRInTerminal: false,            // deprecated builtin
    auth: state,
    syncFullHistory: false
  });

  // Save creds on update
  sock.ev.on('creds.update', saveCreds);

  // Connection updates: QR, reconnect, open
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n🔐 Please scan this QR code:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`Disconnected: ${code}`);
      if (code !== DisconnectReason.loggedOut) startBot();
      else console.log('⚠️ Logged out. Delete auth_info/ and restart to re-authenticate.');
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
      sock.sendMessage(sock.user.id, {
        text: `🤖 *${config.botname}* is online\n⏱ Uptime: ${getUptime()}`
      });
      startTime = Date.now();
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const body =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      '';
    const prefix = config.prefixes.find(p => body.startsWith(p));
    if (!prefix) return;

    const [cmdRaw, ...args] = body.slice(prefix.length).trim().split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const quoted = { quoted: m };

    console.log(`[MSG] ${jid} » ${body}`);
    const reply = (t) => sock.sendMessage(jid, { text: t }, quoted);

    switch (cmd) {
      case 'ping':
        return reply('🏓 Pong!');
      case 'menu':
      case 'help': {
        const border = '═'.repeat(30);
        const menu = `
╭─⊷ ${config.botname} ⊶─
│ Owner   : ${config.ownername}
│ Prefix  : ${config.prefixes.join(' ')}
│ Uptime  : ${getUptime()}
│ Repo    : ${config.repo}
${border}
│ Commands:
│ ${config.commands.join('\n│ ')}
${border}
╰─ Enjoy! ──
`.trim();
        return sock.sendMessage(jid, { text: menu }, quoted);
      }
      // ... other cases remain unchanged ...
      default:
        // do nothing
        break;
    }
  });
}

startBot();
