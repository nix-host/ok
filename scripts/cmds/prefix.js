const { getData, saveData } = require('../../database/storage');

module.exports = {
  name: 'prefix',
  aliases: ['nix'],
  author: "ArYAN",
  version: "1.0",
  role: 1,
  description: 'prefix change /',
  noPrefix: true,
  category: "GROUP",

  nix: async function ({ sock, msg, args, sender, config, nixReply, removeReply }) {
    const jid = msg.key.remoteJid;

    const prefixesData = await getData('prefixesData');
    const groupPrefix = prefixesData.find(p => p.id === jid)?.prefix;

    if (args.length === 0 || (args[0].toLowerCase() !== 'change' && args[0].toLowerCase() !== 'set')) {
      const current = groupPrefix || config.prefix;
      return await sock.sendMessage(jid, {
        text: `🌐 System prefix: ${config.prefix}\n🛸 This Group prefix: *${current}*`
      });
    }

    const command = args[0].toLowerCase();
    
    if (command === 'change' || command === 'set') {
      const newPrefix = args[1];
      if (!newPrefix) {
        return await sock.sendMessage(jid, {
          text: '❌ Please provide a new prefix.\nExample: prefix change !'
        });
      }

      const confirmMsg = await sock.sendMessage(jid, {
        text: `⚠️ Are you sure you want to change the prefix to *${newPrefix}*?\nReact with 👍 to confirm or 👎 to cancel.`,
        mentions: [sender]
      });

      nixReply(confirmMsg.key.id, async (reactionMsg) => {
        const emoji = reactionMsg.message?.reactionMessage?.text;

        if (emoji === '👍') {
          let prefixEntry = prefixesData.find(p => p.id === jid);
          if (prefixEntry) {
            prefixEntry.prefix = newPrefix;
          } else {
            prefixesData.push({ id: jid, prefix: newPrefix });
          }
          await saveData('prefixesData');
          await sock.sendMessage(jid, {
            text: `✅ Prefix changed to *${newPrefix}* for this group.`
          });
        } else {
          await sock.sendMessage(jid, {
            text: `❌ Prefix change cancelled.`
          });
        }
        removeReply(confirmMsg.key.id);
      });
    }
  }
};
