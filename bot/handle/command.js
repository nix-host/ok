const { uid, addGlobalReplyHandler, removeGlobalReplyHandler } = require("../../utils.js");
const { Message } = require("../custom.js");
const { getData, saveData } = require("../../database/storage.js");

exports.command = async function({ sock, msg, message, args, commandName }) {
  const prefix = global.config.prefix;
  const senderId = message.sender;
  const chatId = message.chatId;

  // Log command usage
  console.log(`Command triggered: "${commandName}" by ${senderId} in ${chatId}`);

  let cmdModule = global.teamnix.cmds.get(commandName);

  if (!cmdModule) {
    const notFoundMessage = (global.texts.commandNotFound || 'Command "{commandName}" does not exist, type {prefix}help to see all available commands.')
      .replace('{commandName}', commandName)
      .replace('{prefix}', prefix);
    await message.reply(notFoundMessage);
    return;
  }

  const userMoney = await getData('userMoney');
  const userData = await getData('userData');
  const groupSettings = await getData('groupSettings');

  const isDev = global.config.roles["3"]?.includes(senderId);
  const isGroup = message.isGroup;
  
  let metadata, botIsAdmin, userIsAdmin;
  if (isGroup) {
      metadata = await sock.groupMetadata(chatId);
      botIsAdmin = metadata.participants.find(p => p.id === sock.user.id)?.admin === 'admin';
      userIsAdmin = metadata.participants.find(p => p.id === senderId)?.admin === 'admin';
  }

  if (cmdModule.groupOnly && !isGroup) return await message.reply(global.texts.groupOnly);
  if (cmdModule.privateOnly && isGroup) return await message.reply(global.texts.privateOnly);
  if (cmdModule.adminGroupOnly && !botIsAdmin) return await message.reply(global.texts.adminGroupOnly);
  if (cmdModule.userIsAdmin && !userIsAdmin) return await message.reply(global.texts.notGroupAdmin);

  if (cmdModule.cooldown && (!global.config.CoolDownForDev || !isDev)) {
    const now = Date.now();
    const cooldownAmount = (cmdModule.cooldown || 3) * 1000;
    const cooldownKey = senderId + ":" + cmdModule.name;

    if (global.teamnix.cooldowns.has(cooldownKey)) {
      const expirationTime = global.teamnix.cooldowns.get(cooldownKey) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        const cooldownMsg = (global.texts.cooldown || "⏳ | Please wait {timeLeft}s before using this command again.")
            .replace('{timeLeft}', timeLeft);
        await message.reply(cooldownMsg);
        return;
      }
    }
    global.teamnix.cooldowns.set(cooldownKey, now);
    setTimeout(() => global.teamnix.cooldowns.delete(cooldownKey), cooldownAmount);
  }

  try {
    const slicedArgs = message.body.startsWith(prefix) ? args.slice(1) : args;
    await cmdModule.nix({
      sock, msg, message, args: slicedArgs, sender: senderId,
      nixReply: addGlobalReplyHandler, removeReply: removeGlobalReplyHandler,
      userMoney, userData, prefixesData: await getData('prefixesData'), groupSettings,
      saveData, getData
    });
  } catch (error) {
    console.error(`Error executing command '${commandName}':`, error);
    const errorMessage = (global.texts.commandExecutionError || "Error in command '{commandName}': {errorMessage}")
      .replace('{commandName}', cmdModule.name)
      .replace('{errorMessage}', error.message);
    await message.reply(errorMessage);
  }
};
