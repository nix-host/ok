const { jidNormalizedUser } = require("@whiskeysockets/baileys");

module.exports = {
  name: 'tagall',
  version: "1.1",
  author: "ArYAN",
  aliases: ['mentionall', 'everyone'],
  role: 1, 
  description: 'Mention all group members.',
  category: 'GROUP',

  async nix({ sock, msg, args, sender }) {
    const groupId = msg.key.remoteJid;

    if (!groupId.endsWith('@g.us')) {
      return await sock.sendMessage(groupId, { text: '❌ This command can only be used in a group chat.' });
    }

    try {
      const groupMetadata = await sock.groupMetadata(groupId);
      const participants = groupMetadata.participants;

      const mentions = participants.map(p => p.id);
      const message = args.join(" ") || "👥 Mentioning everyone:";
      const mentionText = `${message}\n\n` + mentions.map(u => `@${u.split('@')[0]}`).join(' ');

      await sock.sendMessage(groupId, {
        text: mentionText,
        mentions
      });
      
    } catch (error) {
      console.error("Error in tagall command:", error);
      await sock.sendMessage(groupId, { text: '❌ An error occurred while trying to mention everyone.' });
    }
  }
};
