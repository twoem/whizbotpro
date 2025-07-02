const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment');
const fancytext = require('./lib/fancytext');
const config = require('./config.json');

const authPath = './auth_info';
if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);

const store = makeInMemoryStore({
  logger: P().child({ level: 'silent', stream: 'store' })
});
store.readFromFile(path.join(authPath, 'store.json'));
setInterval(() => {
  store.writeToFile(path.join(authPath, 'store.json'));
}, 10_000);

let startTime = Date.now();
const getUptime = () => {
  const diff = Date.now() - startTime;
  const dur = moment.duration(diff);
  return `${dur.hours()}h ${dur.minutes()}m ${dur.seconds()}s`;
};

async function startBot() {
  console.clear();
  console.log(chalk.green(figlet.textSync(config.botname)));
  console.log(chalk.blue(`Owner: ${config.ownername}`));

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();
  console.log(chalk.yellow(`Using WA version ${version.join('.')}`));

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: false
  });
  store.bind(sock.ev);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(chalk.red(`Disconnected: ${code}`));
      if (code !== DisconnectReason.loggedOut) startBot();
    } else if (connection === 'open') {
      console.log(chalk.green('Connected to WhatsApp!'));
      sock.sendMessage(sock.user.id, {
        text: `🤖 ${config.botname} is now online!\n⏱ Uptime: ${getUptime()}`
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

    const [cmd, ...args] = body.slice(prefix.length).trim().split(/\s+/);
    const command = cmd.toLowerCase();
    const quoted = { quoted: m };

    console.log(chalk.gray(`[MSG] ${jid} » ${body}`));

    // Helper to send text
    const reply = (t) => sock.sendMessage(jid, { text: t }, quoted);

    switch (command) {
      case 'ping': return reply('🏓 Pong!');
      case 'uptime': return reply(`⏱ Uptime: ${getUptime()}`);
      case 'owner': return reply(`👑 Owner: ${config.ownername}`);
      case 'repo': return reply(`🔗 Repo: ${config.repo}`);
      case 'menu':
      case 'help': {
        const border = '═'.repeat(30);
        const menu = `
╭─⊷ ${config.botname} ⊶─
│ Owner : ${config.ownername}
│ Prefix: ${config.prefixes.join(' ')}
│ Uptime: ${getUptime()}
│ Repo  : ${config.repo}
${border}
│ Commands:
│ ${config.commands.join('\n│ ')}
${border}
╰─ Have fun! ──
`;
        return sock.sendMessage(jid, { text: menu }, quoted);
      }

      case 'vv': {
        const v1 = m.message?.ephemeralMessage?.message?.viewOnceMessage?.message;
        if (v1) {
          await sock.sendMessage(jid, { forward: v1 }, quoted);
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
        const qs = [
          "“Code is like humor...” – Cory House",
          "“First, solve the problem...” – John Johnson",
          "“Simplicity is the soul...” – Austin Freeman"
        ];
        return reply(qs[Math.floor(Math.random()*qs.length)]);
      }

      case 'joke': {
        const js = [
          "Why do programmers hate nature? It has too many bugs!",
          "Debugging: where you replace a bug with two new bugs.",
          "I told my computer I needed a break... it said no problem, it needed one too."
        ];
        return reply(js[Math.floor(Math.random()*js.length)]);
      }

      case 'fact': {
        const fsn = [
          "JS was invented in 10 days.",
          "Git was created by Linus Torvalds.",
          "The first virus was in 1986."
        ];
        return reply(fsn[Math.floor(Math.random()*fsn.length)]);
      }

      // Placeholder downloaders
      case 'ytmp3':
      case 'ytmp4':
      case 'tiktok':
        return reply('🔗 Download feature not implemented yet.');

      case 'ai':
        return reply(`🧠 AI says: "${args.join(' ')}"`);

      case 'shorten':
        return reply('🔗 URL shortener not set up.');

      case 'weather':
        return reply('🌦 Weather API not configured.');

      case 'news':
        return reply('📰 News API not configured.');

      case 'identity':
        return reply(`🆔 Your ID: ${jid}`);

      case 'sticker': {
        // sticker creation needs media download logic
        return reply('📸 Send an image/video with caption "!sticker"');
      }

      case 'speed':
        return reply('⚡ Speedtest not integrated.');

      case 'bye':
        return reply('👋 Goodbye!');

      default:
        return; // ignore
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

startBot();
