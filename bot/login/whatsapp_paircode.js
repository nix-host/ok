const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const { handleMain } = require("../main.js");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const sessionDir = path.join(process.cwd(), 'cookies');

async function createSessionBackup() {
  try {
    const backupData = {};
    const files = fs.readdirSync(sessionDir);
    
    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      if (fs.statSync(filePath).isFile() && file.endsWith('.json')) {
        backupData[file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }
    
    const backupPath = path.join(sessionDir, 'session-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log('✅ Session backup created:', backupPath);
    return backupPath;
  } catch (err) {
    console.error('Failed to create backup:', err);
    return null;
  }
}

async function restoreSessionFromBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) return false;
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    
    for (const [fileName, data] of Object.entries(backupData)) {
      const filePath = path.join(sessionDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    
    console.log('✅ Session restored from backup');
    return true;
  } catch (err) {
    console.error('Failed to restore backup:', err);
    return false;
  }
}

exports.startPairCodeBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const phoneNumber = global.config.paircode;
  
  if (!phoneNumber) {
    console.error("❌ Error: Phone number not set in config.json under 'paircode' field.");
    console.log("Please add your phone number in config.json like: \"paircode\": \"8801234567890\"");
    process.exit(1);
  }

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Nix-MD"),
    defaultQueryTimeoutMs: undefined
  });

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        // Remove leading 0 if present
        if (formattedNumber.startsWith('0')) {
          formattedNumber = formattedNumber.substring(1);
        }
        
        console.log(`📱 Using phone number: +${formattedNumber}`);
        const code = await sock.requestPairingCode(formattedNumber);
        console.log(`\n🔐 Pairing Code: ${code}\n`);
        console.log("⚠️ IMPORTANT: Make sure this phone number matches your WhatsApp:");
        console.log(`   +${formattedNumber}`);
        console.log("\nEnter this code in your WhatsApp app:");
        console.log("1. Open WhatsApp");
        console.log("2. Go to Settings > Linked Devices");
        console.log("3. Tap 'Link a Device'");
        console.log("4. Enter the code above\n");
      } catch (err) {
        console.error("❌ Failed to get pairing code:", err.message);
        console.error("💡 Tip: Make sure the phone number in config.json is correct");
        console.error("   Format: Country code + number (e.g., 8801739761673 for Bangladesh)");
      }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconnecting pair code bot...");
        await delay(2000);
        await exports.startPairCodeBot();
      } else {
        console.log("Connection closed. You are logged out.");
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {
          console.error("Failed to remove session directory:", e);
        }
      }
    }

    if (connection === "open") {
      console.log("✅ Connection opened! Bot is now online.");
      
      await delay(2000);
      
      const backupPath = await createSessionBackup();
      
      const notificationNumber = `${phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      const message = `✅ *BOT CONNECTION SUCCESSFUL*\n\n👤 Developer: Aryan\n🔗 Facebook: https://www.facebook.com/profile.php?id=61575494292207\n\n🤖 Bot is now running and ready to receive commands!\n\n📁 Session backup has been sent below. Download this file and keep it safe. You can use it to restore your bot session later.`;
      
      try {
        await sock.sendMessage(notificationNumber, { text: message });
        console.log(`📨 Notification sent to ${phoneNumber}`);
        
        if (backupPath && fs.existsSync(backupPath)) {
          await delay(1000);
          await sock.sendMessage(notificationNumber, {
            document: fs.readFileSync(backupPath),
            fileName: `bot-session-backup-${Date.now()}.json`,
            mimetype: 'application/json',
            caption: '📦 *Session Backup*\n\nDownload this file and save it. To restore:\n1. Rename it to "session-backup.json"\n2. Place it in the cookies folder\n3. Restart the bot'
          });
          console.log(`📦 Backup file sent to ${phoneNumber}`);
        }
      } catch (err) {
        console.error("Failed to send notification:", err.message);
      }
      
      handleMain(sock);
    }
  });

  return sock;
};
