const { command } = require("./handle/command.js");
const { reply } = require("./handle/reply.js");
const { reaction } = require("./handle/reaction.js");
const { event } = require("./handle/event.js");
const { push } = require("../push.js");
const { countUserMessage, dataCache, saveData } = require("../database/storage.js");
const { Message } = require("./custom.js");

exports.handleMain = (sock) => {
  // Push notification for updates
  push(sock);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.remoteJid === "status@broadcast") return;

    const message = new Message(sock, msg);

    // Count messages for the economy system
    await countUserMessage(message.chatId, message.sender, dataCache.userMoney, saveData);

    if (message.type === "reactionMessage") {
      reaction({ sock, msg, message });
    } else if (message.isQuoted) {
      reply({ sock, msg, message });
    } else if (message.type === "newChatMembers" || message.type === "leftChatMember") {
      event({ sock, msg, message });
    } else {
      const args = message.body ? message.body.split(" ") : [];
      const prefix = global.config.prefix;
      
      let isCommand = false;
      let commandName = '';
      
      if (message.body && message.body.startsWith(prefix)) {
        commandName = args[0].slice(prefix.length).toLowerCase();
        isCommand = true;
      } else if (global.config.noPrefix && message.body) {
        commandName = args[0].toLowerCase();
        isCommand = true;
      }

      if (isCommand) {
        command({ sock, msg, message, args, commandName });
      } else {
        const { word } = require("./handle/word.js");
        word({ sock, msg, message });
      }
    }
  });
};
