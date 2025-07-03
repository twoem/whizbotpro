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
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment');
const fancytext = require('./lib/fancytext');
const config = require('./config.json');

// Ensure auth directory
const authPath = './auth_info';
if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);

// Uptime helper
let startTime = Date.now();
const getUptime = () => {
  const diff = Date.now() - startTime;
  const d = moment.duration(diff);
  return `${d.hours()}h ${d.minutes()}m ${d.seconds()}s`;
};

async function startBot() {
  console.clear();
  console.log(chalk.green(figlet.textSync(config.botname)));
  console.log(chalk.blue(`Owner: ${config.ownername}`));

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();
  console.log(chalk.yellow(`Using WhatsApp version ${version.join('.')}`));

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(chalk.red(`Disconnected: ${code}`));
      if (code !== DisconnectReason.loggedOut) startBot();
    } else if (connection === 'open') {
      console.log(chalk.green('✅ Connected to WhatsApp'));
      sock.sendMessage(sock.user.id, {
        text: `🤖 *${config.botname}* is online\n⏱ Uptime: ${getUptime()}`
      });
      startTime = Date.now();
    }
  });

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

    console.log(chalk.gray(`[MSG] ${jid} » ${body}`));
    const reply = (t) => sock.sendMessage(jid, { text: t }, quoted);

    switch (cmd) {
      case 'ping': return reply('🏓 Pong!');
      case 'uptime': return reply(`⏱ Uptime: ${getUptime()}`);
      case 'owner': return reply(`👑 Owner: ${config.ownername}`);
      case 'repo': return reply(`🔗 Repo: ${config.repo}`);

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
╰─ Have fun! ──
`;
        return sock.sendMessage(jid, { text: menu.trim() }, quoted);
      }

      case 'vv': {
        const view = m.message.ephemeralMessage?.message.viewOnceMessage?.message;
        if (view) {
          await sock.sendMessage(jid, { forward: view }, quoted);
        } else return reply('⚠️ Reply to a view‑once message and send !vv');
        break;
      }

      case 'fancy': {
        const txt = args.join(' ');
        if (!txt) return reply('⚠️ Usage: !fancy your text');
        const arr = fancytext(txt);
        return sock.sendMessage(jid, { text: arr.join('\n') }, quoted);
      }

      case 'echo': return reply(`🔁 ${args.join(' ') || '(nothing)'}`);
      case 'time': return reply(`🕒 ${moment().format('HH:mm:ss')}`);
      case 'date': return reply(`📅 ${moment().format('YYYY-MM-DD')}`);
      case 'day': return reply(`📌 ${moment().format('dddd')}`);
      case 'month': return reply(`🗓️ ${moment().format('MMMM')}`);
      case 'year': return reply(`📆 ${moment().format('YYYY')}`);

      case 'quote': {
        const qs = ["“Code is humor…”","“First solve…”","“Simplicity…”"];
        return reply(qs[Math.floor(Math.random()*qs.length)]);
      }

      case 'joke': {
        const js = ["Why bugs?","Debugging…","My code…"];
        return reply(js[Math.floor(Math.random()*js.length)]);
      }

      case 'fact': {
        const fsn = ["JS in 10 days","Git by Torvalds","Virus 1986"];
        return reply(fsn[Math.floor(Math.random()*fsn.length)]);
      }

      // Placeholders
      case 'ytmp3':
      case 'ytmp4':
      case 'tiktok':
        return reply('🔗 Download not implemented.');

      case 'ai':
        return reply(`🧠 AI: "${args.join(' ')}"`);

      case 'shorten':
        return reply('🔗 URL shortener not configured.');

      case 'weather':
        return reply('🌦 Weather API not configured.');

      case 'news':
        return reply('📰 News API not configured.');

      case 'identity':
        return reply(`🆔 Your ID: ${jid}`);

      case 'sticker':
        return reply('📸 Send media with caption "!sticker"');

      case 'speed':
        return reply('⚡ Speedtest not integrated.');

      case 'bye':
        return reply('👋 Goodbye!');

      default:
        return;
    }
  });
}

startBot();
