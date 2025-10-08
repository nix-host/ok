const { Message } = require("../custom.js");

exports.reply = async function({ sock, msg, message }) {
  try {
    const quotedMessageId = message.quotedMsgId;
    if (!quotedMessageId) return;

    const replyHandler = global.teamnix.onReply.get(quotedMessageId);
    if (replyHandler) {
      await replyHandler(message);
    }
  } catch (error) {
    console.error("Error in reply handler:", error);
  }
};
