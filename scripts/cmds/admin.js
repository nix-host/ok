const { readFile, writeFile } = require("fs/promises");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "../../config.json");

module.exports = {
  name: "admin",
  aliases: ["adm"],
  author: "ArYAN",
  version: "1.6",
  role: 2,
  description: "Manage bot admins (role 2) with instant updates",
  noPrefix: false,
  category: "DEVELOPER",

  nix: async function ({ sock, message, args, sender, nixReply, removeReply }) {
    const jid = message.chatId;

    let config;
    try {
      const data = await readFile(CONFIG_PATH, "utf8");
      config = JSON.parse(data);
    } catch (error) {
      console.error("Error loading config.json:", error);
      await message.reply("⚠️ Error: Failed to load configuration. Contact the developer.");
      return;
    }

    const saveConfig = async () => {
      try {
        await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
        global.config = config;
      } catch (error) {
        console.error("Error saving config.json:", error);
        await message.reply("⚠️ Error: Failed to save changes. They may not persist.");
      }
    };

    const getName = async (uid) => {
      try {
        const contact = await sock.getContactById(uid);
        return contact?.pushName || uid.split("@")[0];
      } catch {
        return uid.split("@")[0];
      }
    };

    const isValidJID = (uid) => {
      if (!uid || typeof uid !== "string") return false;
      const jidPattern = /^\d+@(s\.whatsapp\.net|lid)$/;
      return jidPattern.test(uid);
    };

    const normalizeJID = (uid) => {
      if (!uid) return null;
      if (isValidJID(uid) && uid.includes("@")) return uid;
      const [number] = uid.split("@");
      if (!isNaN(number) && number.length > 6) return `${number}@s.whatsapp.net`;
      return null;
    };

    const extractUIDs = async () => {
      let uids = [];
      const quoted = message.msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = quoted?.mentionedJid;

      if (mentioned && Array.isArray(mentioned)) {
        uids = mentioned.filter(isValidJID);
      }
      
      if (!uids.length && quoted?.participant) {
        if (isValidJID(quoted.participant)) {
          uids.push(quoted.participant);
        }
      }

      if (!uids.length && args.length > 1) {
        uids = args.slice(1).map(normalizeJID).filter(Boolean);
      }

      return uids.length > 0 ? uids : null;
    };

    switch (args[0]?.toLowerCase()) {
      case "add":
      case "-a": {
        const uids = await extractUIDs();
        if (!uids) {
          await message.reply("⚠️: Please tag a user, reply to a message, or provide a UID (e.g., 123456789).");
          return;
        }

        const notAdminIds = uids.filter(uid => !config.roles["2"].includes(uid));
        const adminIds = uids.filter(uid => config.roles["2"].includes(uid));

        if (notAdminIds.length > 0) {
          config.roles["2"].push(...notAdminIds);
          await saveConfig();
        }

        const getNames = await Promise.all(uids.map(uid => getName(uid)));
        
        const responseText = [
          notAdminIds.length > 0
            ? `✅ Added ${notAdminIds.length} admin(s):\n${notAdminIds.map(uid => `- @${getNames[uids.indexOf(uid)]}`).join("\n")}`
            : "",
          adminIds.length > 0
            ? `\n⚠️ ${adminIds.length} user(s) already admin:\n${adminIds.map(uid => `- @${getNames[uids.indexOf(uid)]}`).join("\n")}`
            : "",
        ].filter(Boolean).join("\n");

        await message.reply(responseText || "⚠️ No changes made.");
        break;
      }
      
      case "remove":
      case "-r": {
        const uids = await extractUIDs();
        if (!uids) {
          await message.reply("⚠️: Please tag a user, reply to a message, or provide a UID (e.g., 123456789).");
          return;
        }

        const removedIds = [];
        const notRemovedIds = [];
        config.roles["2"] = config.roles["2"].filter(uid => {
          if (uids.includes(uid)) {
            removedIds.push(uid);
            return false;
          }
          return true;
        });

        const getNames = await Promise.all(uids.map(uid => getName(uid)));

        const responseText = [
          removedIds.length > 0
            ? `✅ Removed ${removedIds.length} admin(s):\n${removedIds.map(uid => `- @${getNames[uids.indexOf(uid)]}`).join("\n")}`
            : "",
          notRemovedIds.length > 0
            ? `\n⚠️ ${notRemovedIds.length} user(s) not admin:\n${notRemovedIds.map(uid => `- @${getNames[uids.indexOf(uid)]}`).join("\n")}`
            : "",
        ].filter(Boolean).join("\n");

        if (removedIds.length > 0) await saveConfig();
        await message.reply(responseText || "⚠️ No changes made.");
        break;
      }

      case "list":
      case "-l": {
        if (!config.roles["2"] || config.roles["2"].length === 0) {
          await message.reply("👑 No admins found.");
          return;
        }

        const getNames = await Promise.all(config.roles["2"].map(uid => getName(uid)));
        const responseText = `👑 Admin list:\n${getNames.map(name => `- @${name}`).join("\n")}`;
        await message.reply(responseText);
        break;
      }

      default: {
        await message.reply("⚠️: Invalid command. Use: `admin add <@tag | reply | uid>`, `admin remove <@tag | uid>`, or `admin list`");
        break;
      }
    }
  },
};
