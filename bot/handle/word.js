const { Message } = require("../custom.js");
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promises: fsPromises } = require('fs');

const urlRegex = /(https?:\/\/[^\s]+)/g;

exports.word = async function({ sock, msg, message }) {
  try {
    const text = message.text;
    if (!text) return;

    const match = text.match(urlRegex);
    if (match && match.length > 0) {
      const mediaUrl = match[0];
      const isMedia = mediaUrl.match(/\.(jpeg|jpg|png|gif|mp4|mov|avi|mkv|webp)$/i);

      if (isMedia) {
        await message.reply("Media link detected. Downloading...");
        try {
          const response = await axios({ url: mediaUrl, method: 'GET', responseType: 'stream' });
          const tempFilePath = path.join(__dirname, `temp_media_${Date.now()}${isMedia[0]}`);
          const writer = fs.createWriteStream(tempFilePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
          const fileType = response.headers['content-type'];

          if (fileType.includes('image')) await sock.sendMessage(message.chatId, { image: { url: tempFilePath } });
          else if (fileType.includes('video')) await sock.sendMessage(message.chatId, { video: { url: tempFilePath } });
          else await message.reply("Unsupported media type.");

          await fsPromises.unlink(tempFilePath);
        } catch (error) {
          console.error("Download or send error:", error);
          await message.reply("Failed to download or send media.");
        }
      } else {
        if (text.toLowerCase().includes("hello")) await message.reply("Hello! How can I help?");
      }
    } else {
      if (text.toLowerCase().includes("hello")) await message.reply("Hello! How can I help?");
    }
  } catch (error) {
    console.error("Error in word handler:", error);
  }
};
