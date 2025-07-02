# WHIZBotPro

A powerful WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys) and Node.js.

## Features

- QR login & session persistence
- 20+ built-in commands:
  - General: `!ping`, `!uptime`, `!menu`, `!help`
  - Media: `!vv`, `!sticker`, `!fancy`
  - Info: `!owner`, `!repo`, `!identity`
  - Fun: `!quote`, `!joke`, `!fact`
  - Utils: `!time`, `!date`, `!echo`, `!speed`, `!shorten`
  - Download placeholders: `!ytmp3`, `!tiktok`, etc.
  - AI placeholder: `!ai`
- Styled, bordered menu
- Auto‑reconnect & in‑memory store

## Setup

1. `git clone https://github.com/twoem/whizbotpro`
2. `cd whizbotpro`
3. `npm install`
4. `npm start`
5. Scan the QR in your terminal the first time.

## Deployment

- On Render.com: set Node version to 18.x, start command `npm start`
- Ensure `auth_info` is writable for session files.

Enjoy! 🚀
