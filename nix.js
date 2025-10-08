const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { initStorage } = require("./database/storage.js");
const pino = require("pino");

const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  pink: "\x1b[35m",
  bold: "\x1b[1m",
};

// Use pino-pretty for better console logging
const logger = pino({ level: "silent" }).child({
    level: "silent",
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname,msg,time'
        }
    }
});

const configPath = path.join(process.cwd(), 'config.json');
if (!fs.existsSync(configPath)) {
  console.error(`${c.red}[ERROR]${c.reset} config.json not found.`);
  process.exit(1);
}

global.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Load texts
const textsPath = path.join(process.cwd(), 'language', 'texts.txt');
global.texts = {};
if (fs.existsSync(textsPath)) {
  fs.readFileSync(textsPath, 'utf-8').split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) global.texts[key.trim()] = value.trim();
  });
}

global.teamnix = { cmds: new Map(), cooldowns: new Map(), onReply: new Map(), events: new Map() };

global.vip = { uid: global.config.vip || [] };

async function startBot() {
  await initStorage();

  // Load commands
  const cmdsDir = path.join(process.cwd(), "scripts", "cmds");
  if (fs.existsSync(cmdsDir)) {
    fs.readdirSync(cmdsDir).filter(f => f.endsWith(".js")).forEach(file => {
      try {
        const cmdModule = require(path.join(cmdsDir, file));
        if (cmdModule.name) {
          teamnix.cmds.set(cmdModule.name.toLowerCase(), cmdModule);
          (cmdModule.aliases || []).forEach(a => teamnix.cmds.set(a.toLowerCase(), cmdModule));
        }
      } catch(e) { 
        console.error(`${c.red}[ERROR]${c.reset} Failed to load command: ${file}`, e);
      }
    });
  }

  // Load events
  const eventsDir = path.join(process.cwd(), "bot", "handle");
  if (fs.existsSync(eventsDir)) {
    fs.readdirSync(eventsDir).filter(f => f.endsWith(".js")).forEach(file => {
      try {
        const evModule = require(path.join(eventsDir, file));
        if (evModule.nix?.name) teamnix.events.set(evModule.nix.name.toLowerCase(), evModule);
      } catch(e) { 
        console.error(`${c.red}[ERROR]${c.reset} Failed to load event: ${file}`, e);
      }
    });
  }

  console.log(`${c.cyan}${"─".repeat(40)}`);
  console.log(`${c.bold}${c.pink}STARTING WHATSAPP BOT${c.reset}`);
  console.log(`${c.cyan}${"─".repeat(40)}${c.reset}`);

  const loginMethod = config.loginMethod.toLowerCase();
  if (loginMethod === "qrcode") {
    const { startQRCodeBot } = require("./bot/login/whatsapp_qrcode.js");
    await startQRCodeBot();
  } else if (loginMethod === "paircode") {
    const { startPairCodeBot } = require("./bot/login/whatsapp_paircode.js");
    await startPairCodeBot();
  } else if (loginMethod === "cloud") {
    const { startCloudAPIBot } = require("./bot/login/whatsapp_cloud.js");
    await startCloudAPIBot();
  } else {
    console.error(`${c.red}[ERROR]${c.reset} Invalid login method.`);
    process.exit(1);
  }
}

startBot();
