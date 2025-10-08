const { jidNormalizedUser, isJidGroup } = require("@whiskeysockets/baileys");

class Message {
  constructor(sock, msg) {
    this.sock = sock;
    this.msg = msg;
    this.chatId = msg.key.remoteJid;
    this.sender = msg.key.participant || msg.key.remoteJid;
    this.type = Object.keys(msg.message)[0];
    this.isGroup = this.chatId.endsWith('@g.us');
    this.text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    this.isQuoted = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    this.quotedMsg = this.isQuoted ? msg.message.extendedTextMessage.contextInfo.quotedMessage : null;
    this.quotedMsgId = this.isQuoted ? msg.message.extendedTextMessage.contextInfo.stanzaId : null;
    this.key = msg.key;
  }

  async reply(text) {
    await this.sock.sendMessage(this.chatId, { text }, { quoted: this.msg });
  }

  async send(text) {
    await this.sock.sendMessage(this.chatId, { text });
  }

  async react(emoji) {
    await this.sock.sendMessage(this.chatId, { react: { text: emoji, key: this.msg.key } });
  }

  async sendImage(imagePath, caption = '') {
    await this.sock.sendMessage(this.chatId, { image: { url: imagePath }, caption }, { quoted: this.msg });
  }
}

module.exports = { Message };
