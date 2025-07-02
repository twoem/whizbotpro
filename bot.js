require('dotenv').config();
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// 📂 Setup directories
const AUTH_DIR = './auth_info';
const TEMP_DIR = './temp_media';
const LOG_FILE = './bot.log';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const app = express();
const PORT = process.env.PORT || 3000;
let sock = null;

// 📝 Logging utility
function addLog(msg, level = 'INFO') {
  const entry = `[${moment().format('YYYY-MM-DD HH:mm:ss')}] [${level}] ${msg}`;
  console.log(entry);
  fs.appendFileSync(LOG_FILE, entry + '\n');
}

// ⏱ Uptime calculation
const start = Date.now();
function getUptime() {
  const diff = Date.now() - start;
  const d = new Date(diff);
  return `${d.getUTCHours()}h ${d.getUTCMinutes()}m ${d.getUTCSeconds()}s`;
}

// 🧠 Handle view-once media
async function handleViewOnce(msg, sender) {
  const viewOnce = msg.message?.viewOnceMessageV2?.message;
  if (!viewOnce) {
    await sock.sendMessage(sender, { text: '⚠️ Reply to a view-once message using `!vv`.' });
    return;
  }
  const type = Object.keys(viewOnce)[0];
  const ext = type === 'imageMessage' ? 'jpg' : 'mp4';
  const stream = await downloadContentFromMessage(viewOnce[type], type === 'imageMessage' ? 'image' : 'video');
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  const tmp = path.join(TEMP_DIR, `tmp.${ext}`);
  fs.writeFileSync(tmp, buffer);
  await sock.sendMessage(sender, { [type === 'imageMessage' ? 'image' : 'video']: { url: tmp }, caption: '🔓 View-once Unlocked' });
  fs.unlinkSync(tmp);
  addLog('🔓 View-once media unlocked for ' + sender);
}

// 🟢 Start the bot
async function startBot() {
  addLog('Initializing WhatsApp socket');
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    browser: ['WHIZ-BOT', 'Chrome', '120.0']
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      addLog('QR received, displaying in terminal');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      addLog(`Connection closed: ${code}`, 'WARN');
      if (code !== DisconnectReason.loggedOut) startBot();
    }
    if (connection === 'open') {
      addLog('✅ Connected to WhatsApp');
      sock.sendMessage(sock.user.id, { text: `🤖 WHIZ-BOT is now online.\nUptime: ${getUptime()}` });
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const sender = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const cmd = body.startsWith('!') ? body.slice(1).trim().split(' ')[0].toLowerCase() : null;
    addLog(`Message from ${sender}: ${body}`);

    if (cmd) {
      switch (cmd) {
        case 'ping': return sock.sendMessage(sender, { text: '🏓 Pong!' });
        case 'vv': return handleViewOnce(m, sender);
        case 'help':
        case 'menu':
          return sock.sendMessage(sender, {
            text: `
┏━━━━━━━━ WHIZ BOT ━━━━━━━━┓
┃ 🛠 Commands:               ┃
┃ !ping       • Pong test   ┃
┃ !vv         • Unlock view-once media ┃
┃ !time       • Show time   ┃
┃ !date       • Show date   ┃
┃ !day        • Day of week ┃
┃ !month      • Month name  ┃
┃ !year       • Year        ┃
┃ !quote      • Motivational quote ┃
┃ !joke       • Random joke ┃
┃ !fact       • Random fact ┃
┃ !echo text  • Repeat text ┃
┃ !about      • About Bot   ┃
┃ !creator    • About WHIZ  ┃
┃ !status     • Bot status  ┃
┃ !calc expr  • Calculator  ┃
┃ !user       • Your ID     ┃
┃ !support    • Support info┃
┃ !emoji      • Random emoji┃
┃ !uptime     • Bot uptime  ┃
┃ !help, !menu • Show this  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
          });
        case 'time':
          return sock.sendMessage(sender, { text: `🕒 ${moment().format('HH:mm:ss')}` });
        case 'date':
          return sock.sendMessage(sender, { text: `📅 ${moment().format('YYYY-MM-DD')}` });
        case 'day':
          return sock.sendMessage(sender, { text: `📌 ${moment().format('dddd')}` });
        case 'month':
          return sock.sendMessage(sender, { text: `🗓️ ${moment().format('MMMM')}` });
        case 'year':
          return sock.sendMessage(sender, { text: `📆 ${moment().format('YYYY')}` });
        case 'quote': {
          const quotes = [
            "“Code is like humor. When you have to explain it, it’s bad.”",
            "“First, solve the problem. Then, write the code.”",
            "“Simplicity is the soul of efficiency.”"
          ];
          return sock.sendMessage(sender, { text: quotes[Math.floor(Math.random() * quotes.length)] });
        }
        case 'joke': {
          const jokes = [
            "Why do programmers hate nature? Too many bugs.",
            "Why did the dev go broke? Cos he used all his cache!",
            "I told a UDP joke once... no reply."
          ];
          return sock.sendMessage(sender, { text: jokes[Math.floor(Math.random() * jokes.length)] });
        }
        case 'fact': {
          const facts = [
            "JS was created in 10 days!",
            "Git was made by Linus Torvalds.",
            "First virus: 1986!"
          ];
          return sock.sendMessage(sender, { text: facts[Math.floor(Math.random() * facts.length)] });
        }
        case 'echo':
          return sock.sendMessage(sender, { text: body.replace(/^!echo\s+/, '') || 'Nothing to echo!' });
        case 'about':
          return sock.sendMessage(sender, {
            text: '🤖 WHIZ BOT v1.0 built with Baileys\nFeature-rich and robust.'
          });
        case 'creator':
          return sock.sendMessage(sender, { text: '👨‍💻 Creator: WHIZ — Software Designer & Web Dev.' });
        case 'status':
          return sock.sendMessage(sender, { text: '✅ I am up and working fine!' });
        case 'calc': {
          const expr = body.replace(/^!calc\s+/, '');
          try {
            const res = eval(expr);
            return sock.sendMessage(sender, { text: `🧮 Result: ${res}` });
          } catch {
            return sock.sendMessage(sender, { text: '❌ Invalid expression. Use e.g. !calc 5+5' });
          }
        }
        case 'user':
          return sock.sendMessage(sender, { text: `🙋 Your ID: ${sender}` });
        case 'support':
          return sock.sendMessage(sender, { text: '📞 Support: support@whiz.dev' });
        case 'emoji': {
          const em = ['😀','🔥','🚀','✨','🎯','🤖','💡','📱'];
          return sock.sendMessage(sender, { text: em[Math.floor(Math.random() * em.length)] });
        }
        case 'uptime':
          return sock.sendMessage(sender, { text: `⏱️ Uptime: ${getUptime()}` });
        default:
          return sock.sendMessage(sender, { text: `❓ Unknown command: ${cmd}. Use !menu` });
      }
    }
  });

  // 🗂 Express app for quick status/log
  app.get('/', (_, res) => {
    res.send(`
      <h1>🤖 WHIZ BOT</h1>
      <p>Status: <strong>Online</strong></p>
      <p>Uptime: ${getUptime()}</p>
      <pre>${fs.readFileSync(LOG_FILE, 'utf-8').slice(-5000)}</pre>
    `);
  });

  app.listen(PORT, () => addLog(`Express server running at http://localhost:${PORT}`));
}

startBot();
