const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require("@whiskeysockets/baileys");
const { handleMain } = require("../main.js");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const sessionDir = path.join(process.cwd(), 'cookies');

exports.startQRCodeBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.macOS("Nix-MD"),
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR code received. Scan it to log in:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconnecting QR code bot...");
        await exports.startQRCodeBot();
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
      console.log("Connection opened! Bot is now online.");
      const message = `BOT CONNECTION SUCCESSFUL\n\ndeveloper by Aryan\nFacebook: https://www.facebook.com/profile.php?id=61575494292207`;
      await sock.sendMessage(sock.user.id, { text: message });
      handleMain(sock);
    }
  });

  return sock;
};
