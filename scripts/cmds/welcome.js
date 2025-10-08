const { getData, saveData } = require("../../database/storage.js");

module.exports = {
  name: "welcome",
  version: "1.0",
  author: "ArYAN",
  aliases: [],
  role: 1,
  description: "Toggle welcome/leave messages in group.",
  category: "GROUP",

  nix: async function ({ sock, msg, args, sender }) {
    const groupId = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (!["on", "off"].includes(sub)) {
      return sock.sendMessage(groupId, { text: "❗ Usage: `!welcome on` or `!welcome off`" }, { quoted: msg });
    }
    
    const status = sub === "on";
    const groupSettings = await getData('groupSettings');
    let group = groupSettings.find(g => g.id === groupId);
    if (!group) {
      group = { id: groupId, settings: { welcome: status } };
      groupSettings.push(group);
    } else {
      group.settings.welcome = status;
    }
    await saveData('groupSettings');

    await sock.sendMessage(groupId, {
      text: `✅ Welcome/Leave messages have been turned *${status ? "on" : "off"}*!`,
    }, { quoted: msg });
  },

  nixEvent: async function ({ sock, update }) {
    const groupId = update.id;
    const groupSettings = await getData('groupSettings');
    const group = groupSettings.find(g => g.id === groupId);

    if (group?.settings?.welcome === false) return;

    const metadata = await sock.groupMetadata(groupId);

    const botBase = sock.user.id.split(":")[0];
    const botNumberS = `${botBase}@s.whatsapp.net`;
    const botNumberLid = `${botBase}@lid`;

    for (const participant of update.participants) {
      if (
        update.action === "add" &&
        (participant === botNumberS || participant === botNumberLid)
      ) {
        const text = `Thanks for adding me to *${metadata.subject}*!\n` +
                     `Use ${global.config.prefix}help to see all available commands.`;

        await sock.sendMessage(groupId, { text });
        continue; 
      }

      const username = participant.split("@")[0];
      const pp = await sock.profilePictureUrl(participant, "image").catch(() => "https://i.ibb.co/FzYpDmt/default.png");
      const memberCount = metadata.participants.length;

      if (update.action === "add") {
        const text =
          `👋‹ Welcome @${username} to *${metadata.subject}*!  🎉\n` +
          `You are the *${memberCount}áµ—Ê°* member of this group.\n` +
          `Feel free to introduce yourself!`;

        await sock.sendMessage(groupId, {
          image: { url: pp },
          caption: text,
          mentions: [participant],
        });
      }

      if (update.action === "remove") {
        const text = `😢 @${username} has left *${metadata.subject}*. Farewell!`;

        await sock.sendMessage(groupId, {
          image: { url: pp },
          caption: text,
          mentions: [participant],
        });
      }
    }
  },
};
