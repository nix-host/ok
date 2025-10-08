const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const { handleMain } = require("../main.js");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const sessionDir = path.join(process.cwd(), 'cookies');

exports.startPairCodeBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const phoneNumber = global.config.paircode;
  
  if (!phoneNumber) {
    console.error("❌ Error: Phone number not set in config.json under 'paircode' field.");
    console.log("Please add your phone number in config.json like: \"paircode\": \"8801234567890\"");
    process.exit(1);
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Nix-MD")
  });

  if (!state.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`\n🔐 Pairing Code: ${code}\n`);
      console.log("Enter this code in your WhatsApp app:");
      console.log("1. Open WhatsApp");
      console.log("2. Go to Settings > Linked Devices");
      console.log("3. Tap 'Link a Device'");
      console.log("4. Enter the code above\n");
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconnecting pair code bot...");
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
      
      const notificationNumber = `${phoneNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      const message = `✅ BOT CONNECTION SUCCESSFUL\n\n👤 Developer: Aryan\n🔗 Facebook: https://www.facebook.com/profile.php?id=61575494292207\n\n🤖 Bot is now running and ready to receive commands!`;
      
      try {
        await sock.sendMessage(notificationNumber, { text: message });
        console.log(`📨 Notification sent to ${phoneNumber}`);
      } catch (err) {
        console.log("Failed to send notification:", err.message);
      }
      
      handleMain(sock);
    }
  });

  return sock;
};
