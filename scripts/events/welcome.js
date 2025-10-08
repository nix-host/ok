module.exports = {
  nix: {
    name: 'newChatMembers',
    author: 'ArYAN',
    version: '1.0',
    description: 'Sends a welcome message to new group members.',
  },
  
  run: async function ({ api, event }) {
    if (event.type === "newChatMembers") {
      const newMember = event.newChatMembers[0];
      const memberName = newMember.name || "New Friend";
      const welcomeMessage = `Welcome, ${memberName}! We're happy to have you in the group.`;
      
      api.sendMessage(welcomeMessage, event.chatId, {
        mentions: [{ id: newMember.id }]
      });
    }
  }
};
