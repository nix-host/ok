const { default: makeWASocket, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const { handleMain } = require("../main.js");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const cloudSessionFile = path.join(process.cwd(), "cloud_session.json");

exports.startCloudAPIBot = async () => {
  if (!fs.existsSync(cloudSessionFile)) {
    console.error("Cloud session file not found. Please create cloud_session.json with your access token and phone number.");
    process.exit(1);
  }

  const cloudSession = JSON.parse(fs.readFileSync(cloudSessionFile, "utf8"));
  const { accessToken, phoneNumber } = cloudSession;
  if (!accessToken || !phoneNumber) {
    console.error("Cloud session file is invalid. Must include accessToken and phoneNumber.");
    process.exit(1);
  }

  const sock = makeWASocket({
    auth: { creds: { accessToken } },
    printQRInTerminal: false,
    browser: Browsers.macOS("Nix-MD"),
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconnecting Cloud API bot...");
        await exports.startCloudAPIBot();
      } else {
        console.log("Cloud API bot logged out.");
      }
    }

    if (connection === "open") {
      console.log("Cloud API bot connected successfully!");
      const message = `BOT CONNECTION SUCCESSFUL\n\ndeveloper by Aryan\nFacebook: https://www.facebook.com/profile.php?id=61575494292207`;
      await sock.sendMessage(phoneNumber + "@s.whatsapp.net", { text: message });
      handleMain(sock);
    }
  });

  return sock;
};
