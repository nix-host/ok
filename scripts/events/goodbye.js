module.exports = {
  nix: {
    name: 'leftChatMember',
    author: 'ArYAN',
    version: '1.0',
    description: 'Sends a goodbye message when a member leaves the group.',
  },
  
  run: async function ({ api, event }) {
    if (event.type === "leftChatMember") {
      const leftMember = event.leftChatMember;
      const memberName = leftMember.name || "A friend";
      const goodbyeMessage = `Goodbye, ${memberName}! You will be missed.`;
      
      api.sendMessage(goodbyeMessage, event.chatId);
    }
  }
};
