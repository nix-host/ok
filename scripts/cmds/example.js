module.exports = {
  // Command name used to trigger this command
  name: 'example',

  // Alternative names (aliases) to trigger the same command
  aliases: ['ex'],

  // Author of the command
  author: "ArYAN",
 
  //version of the command
  version: "0.0.1",

  // Role required to use the command (0 = everyone)
  role: 0,

  // Short description shown in help or command list
  description: 'example - Example command with reply and reaction',

  // Whether the command can be used without prefix (false means prefix is required)
  noPrefix: false,

  //category
  category: "DEVELOPER",

  /**
   * Main async function executed when command is called.
   * sock - WhatsApp socket connection object
   * msg - Incoming message object
   * message - Incoming message object (alias for msg)
   * args - Command arguments array
   * api - API object (optional, unused here)
   * sender - Sender's WhatsApp ID
   * config - Configuration object (optional, unused here)
   * commands - Loaded commands object (optional, unused here)
   * nixReply - Function to listen for replies or reactions linked to a message ID
   * removeReply - Function to remove the reply listener after finishing interaction
   * userMoney - User money data (optional, unused here)
   * prefixesData - Prefixes data (optional, unused here)
   * groupSettings - Group-specific settings (optional, unused here)
   * saveData - Function to save data (optional, unused here)
   * getData - Function to retrieve data (optional, unused here)
   */
  nix: async function ({ sock,
    msg,
    message, 
    args,
    api,
    sender,
    config,
    commands,
    addReply,
    nixReply,
    removeReply,
    userMoney,
    prefixesData,
    groupSettings,
    saveData,
    getData }) {
    // Get the chat ID (could be group or individual chat)
    const jid = msg.key.remoteJid;

    // Send initial question message asking for user's favorite color,
    // mentioning the sender so they get notified
    const questionMsg = await sock.sendMessage(jid, {
      text: `Hi! What is your favorite color?\nReply with your answer or react with ðŸ‘ to confirm you like this command.`,
      mentions: [sender],
    });

    // Listen for a reply message to the question message
    nixReply(questionMsg.key.id, async (replyMsg) => {
      // Extract text from reply message, supporting normal or extended text messages
      const text =
        replyMsg.message?.conversation ||
        replyMsg.message?.extendedTextMessage?.text ||
        '';

      // If no text found in reply, notify user and return early
      if (!text) {
        await replyMsg.reply("I didn't get your answer. Please try again.");
        return;
      }

      // Respond acknowledging the received favorite color
      await replyMsg.reply(`Nice! Your favorite color is "${text}". Thanks for sharing!`);

      // Remove this reply listener to clean up resources
      removeReply(questionMsg.key.id);
    });

    // Listen for reactions to the question message
    nixReply(questionMsg.key.id, async (reactionMsg) => {
      // Extract the reaction emoji text
      const emoji = reactionMsg.message?.reactionMessage?.text;

      // If user reacted with thumbs up emoji
      if (emoji === '👎') {
        // Send a thank you message mentioning the user
        await sock.sendMessage(jid, {
          text: 'Thanks for reacting with 👎!',
          mentions: [sender],
        });

        // Remove the reply listener since interaction is finished
        removeReply(questionMsg.key.id);
      }
    });
  },
};
