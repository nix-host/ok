module.exports = {
  name: "bal",
  author: "ArYAN",
  version: "1.0",
  aliases: ["bal"],
  role: 0,
  usage: "bal",
  noPrefix: false,
  category: 'GAMES',

nix: async function ({ message, sender, userMoney }) {
    const user = userMoney.find(u => u.id === sender) || { money: 0 };
    await message.reply(`💸 Your balance: ${user.money} BDT`);
  }
};
