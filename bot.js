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

// ─── 1) Express Server (for Render port binding) ─────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('🤖 WHIZBotPro is running'));
app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));

// ─── 2) Ensure auth directory ───────────────────────────────────────────
const authPath = './auth_info';
if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);

// ─── 3) Uptime helper ──────────────────────────────────────────────────
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

  // ─── Authentication State ────────────────────────────────────────────
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  // ─── Fetch Latest Baileys Version ────────────────────────────────────
  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp version ${version.join('.')}`);

  // ─── Create the Socket ───────────────────────────────────────────────
  const sock = makeWASocket({
    version,
    logger: P({ level: 'fatal' }),     // Silence all but fatal
    printQRInTerminal: false,           // We render QR ourselves
    auth: state,
    syncFullHistory: false
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // ─── Handle Connection Updates ───────────────────────────────────────
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n🔐 Please scan this QR code:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`Disconnected: ${code}`);
      if (code !== DisconnectReason.loggedOut) startBot();
      else console.log('⚠️ Logged out—delete auth_info/ and restart to re-authenticate.');
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
      sock.sendMessage(sock.user.id, {
        text: `🤖 *${config.botname}* is online\n⏱ Uptime: ${getUptime()}`
      });
      startTime = Date.now();
    }
  });

  // ─── Message Handler ─────────────────────────────────────────────────
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

    const [cmdRaw, ...args] = body
      .slice(prefix.length)
      .trim()
      .split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const quoted = { quoted: m };

    console.log(`[MSG] ${jid} » ${body}`);
    const reply = (t) => sock.sendMessage(jid, { text: t }, quoted);

    switch (cmd) {
      // ─ General ───────────────────────────────────────
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
      case 'owner':
        return reply(`👑 Owner: ${config.ownername}`);
      case 'repo':
        return reply(`🔗 Repo: ${config.repo}`);
      case 'uptime':
        return reply(`⏱ Uptime: ${getUptime()}`);
      case 'identity':
        return reply(`🆔 Your ID: ${jid}`);

      // ─ View‑Once ─────────────────────────────────────
      case 'vv': {
        const view = m.message.ephemeralMessage
          ?.message.viewOnceMessage?.message;
        if (view) {
          await sock.sendMessage(jid, { forward: view }, quoted);
        } else {
          return reply('⚠️ Reply to a view‑once message and send !vv');
        }
        break;
      }

      // ─ Media & Fun ──────────────────────────────────
      case 'sticker':
        return reply('📸 Send an image/video with caption "!sticker"');
      case 'fancy': {
        const txt = args.join(' ');
        if (!txt) return reply('⚠️ Usage: !fancy your text');
        const arr = fancytext(txt);
        return sock.sendMessage(jid, { text: arr.join('\n') }, quoted);
      }
      case 'echo':
        return reply(`🔁 ${args.join(' ') || '(nothing)'}`);

      // ─ Time & Date ─────────────────────────────────
      case 'time':
        return reply(`🕒 Time: ${moment().format('HH:mm:ss')}`);
      case 'date':
        return reply(`📅 Date: ${moment().format('YYYY-MM-DD')}`);
      case 'day':
        return reply(`📌 Day: ${moment().format('dddd')}`);
      case 'month':
        return reply(`🗓️ Month: ${moment().format('MMMM')}`);
      case 'year':
        return reply(`📆 Year: ${moment().format('YYYY')}`);

      // ─ Quotes & Jokes ──────────────────────────────
      case 'quote': {
        const qs = [
          "“Code is like humor.…” – Cory House",
          "“First, solve the problem. Then, write the code.” – John Johnson",
          "“Simplicity is the soul of efficiency.” – Austin Freeman"
        ];
        return reply(qs[Math.floor(Math.random() * qs.length)]);
      }
      case 'joke': {
        const js = [
          "Why do programmers prefer dark mode? Because light attracts bugs!",
          "Why did the dev go broke? Because he used up all his cache.",
          "I would tell you a UDP joke, but you might not get it."
        ];
        return reply(js[Math.floor(Math.random() * js.length)]);
      }

      // ─ Facts ────────────────────────────────────────
      case 'fact': {
        const fsn = [
          "JavaScript was created in just 10 days!",
          "Git was developed by Linus Torvalds.",
          "The first computer virus appeared in 1986."
        ];
        return reply(fsn[Math.floor(Math.random() * fsn.length)]);
      }

      // ─ Placeholders ─────────────────────────────────
      case 'ytmp3':
      case 'ytmp4':
      case 'tiktok':
        return reply('🔗 Download feature not implemented.');
      case 'ai':
        return reply(`🧠 AI: "${args.join(' ')}"`);
      case 'shorten':
        return reply('🔗 URL shortener not configured.');
      case 'weather':
        return reply('🌦 Weather API not configured.');
      case 'news':
        return reply('📰 News API not configured.');
      case 'speed':
        return reply('⚡ Speedtest not integrated.');
      case 'about':
        return reply(`🤖 ${config.botname} v1.0 — by ${config.ownername}`);
      case 'bye':
        return reply('👋 Goodbye!');

      // ─ Default ──────────────────────────────────────
      default:
        // no action
        break;
    }
  });
}

startBot();
