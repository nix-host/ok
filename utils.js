const { jidNormalizedUser, isJidGroup } = require("@whiskeysockets/baileys");

/**
 * Add a global reply handler for message responses or reactions.
 * @param {string} messageId
 * @param {Function} handler
 */
function addGlobalReplyHandler(messageId, handler) {
  global.teamnix.onReply.set(messageId, handler);
}

/**
 * Remove a global reply handler.
 * @param {string} messageId
 */
function removeGlobalReplyHandler(messageId) {
  global.teamnix.onReply.delete(messageId);
}

module.exports = { addGlobalReplyHandler, removeGlobalReplyHandler };
