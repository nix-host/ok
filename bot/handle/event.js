const { Message } = require("../custom.js");

exports.event = async function({ sock, msg, message }) {
  try {
    const newMembers = msg.message?.newChatMembers;
    const leftMembers = msg.message?.leftChatMember;
    const chatId = message.chatId;

    if (newMembers) {
      const user = newMembers.jid[0];
      const welcomeMessage = `Welcome @${user.split('@')[0]}!`;
      await sock.sendMessage(chatId, { text: welcomeMessage, mentions: [user] });

    } else if (leftMembers) {
      const user = leftMembers.jid[0];
      const goodbyeMessage = `Goodbye @${user.split('@')[0]}!`;
      await sock.sendMessage(chatId, { text: goodbyeMessage, mentions: [user] });
    }
  } catch (error) {
    console.error("Error in event handler:", error);
  }
};
