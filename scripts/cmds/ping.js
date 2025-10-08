module.exports = {
  name: 'ping',
  aliases: ['p'],
  author: 'Aryan',
  version: '1.0',
  role: 0,
  description: 'Checks the bot\'s response time.',
  
  nix: async function ({ message }) {
    const startTime = Date.now();
    await message.reply("Pong!");
    const endTime = Date.now();
    const latency = endTime - startTime;
    await message.reply(`Response Time: ${latency}ms`);
  }
};
