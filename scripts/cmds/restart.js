const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'restart',
  author: "ArYAN",
  version: "1.0",
  usage: 'restart',
  aliases: ['res'],
  role: 2,
  cooldown: 5,
  category: 'DEVELOPER',
  description: 'Restart the bot',
  
  async nix({ sock, msg }) {
    const restartFile = path.join(__dirname, '..', '..', 'database', 'restartTime.json');
    fs.writeFileSync(restartFile, JSON.stringify({
      start: Date.now(),
      jid: msg.key.remoteJid 
    }));
    await sock.sendMessage(msg.key.remoteJid, { text: '🧰 Bot is restarting...' });
    process.exit(2);
  }, 
};
