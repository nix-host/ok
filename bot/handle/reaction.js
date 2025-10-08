const { Message } = require("../custom.js");

exports.reaction = async function({ sock, msg, message }) {
  try {
    const reactionMessage = message.msg.message?.reactionMessage;
    if (!reactionMessage) return;

    const reactedMessageId = reactionMessage.stanzaId;
    const reactionHandler = global.teamnix.onReply.get(reactedMessageId);
    
    if (reactionHandler) {
      await reactionHandler(message);
    }
  } catch (error) {
    console.error("Error in reaction handler:", error);
  }
};
