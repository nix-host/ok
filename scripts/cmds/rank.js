const Canvas = require('canvas');
const axios = require('axios');
const path = require('path');
const { getData } = require('../../database/storage.js');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

module.exports = {
  name: 'rank',
  version: "3.2",
  author: "ArYAN",
  description: 'Display user rank, level, and experience with a stylish card',
  usage: 'rank [@user] | top [number]',
  role: 0,
  cooldown: 5,
  category: 'UTILITY',
  isPrefix: false,

  nix: async function({ sock, msg, args, message }) {
    try {
      const groupId = msg.key.remoteJid;
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const command = args[0]?.toLowerCase();

      if (!groupId.endsWith('@g.us')) {
        return await sock.sendMessage(groupId, { text: '❌ This command is only available in group chats.' }, { quoted: msg });
      }

      const userMoneyData = await getData('userMoney');
      const groupMeta = await sock.groupMetadata(groupId).catch(() => ({ participants: [], subject: 'Unknown Group' }));
      const participants = groupMeta.participants || [];

      const users = participants.map(p => {
        const id = `${groupId}_${p.id}`;
        const user = userMoneyData.find(u => u.id === id);
        return {
          jid: p.id,
          msgCount: user?.msgCount || 0,
        };
      });

      users.sort((a, b) => b.msgCount - a.msgCount);

      if (command === 'top' || command === 'leaderboard') {
        const topCount = Math.min(parseInt(args[1]) || 10, 20);
        const topUsers = users.slice(0, topCount);
        if (topUsers.length === 0) {
            return await sock.sendMessage(groupId, { text: '❌ No user data found for the leaderboard.' }, { quoted: msg });
        }
        await generateTopCard(sock, msg, topUsers, groupMeta.subject, topCount);
        return;
      }

      const targetJid = mentionedJid || senderJid;
      const rankIndex = users.findIndex(u => u.jid === targetJid);
      const userRank = rankIndex !== -1 ? rankIndex + 1 : "N/A";
      const userDataEntry = users[rankIndex] || { msgCount: 0 };
      const msgCount = userDataEntry.msgCount;
      const level = Math.floor(Math.sqrt(msgCount / 5));
      const requiredXP = Math.pow(level + 1, 2) * 5;
      const currentXP = msgCount;

      let targetName = message.pushName || "User";
      try {
        const contact = sock.contacts[targetJid] || (await sock.onWhatsApp(targetJid))?.[0];
        if (contact?.notify) targetName = contact.notify;
      } catch {}

      await generateRankCard(sock, msg, userDataEntry, targetJid, userRank, users.length, level, currentXP, requiredXP, targetName);

    } catch (error) {
      console.error('Rank command error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ An error occurred while generating the rank card. Please try again later.' }, { quoted: msg });
    }
  }
};

async function generateRankCard(sock, msg, userDataEntry, targetJid, userRank, totalUsers, level, currentXP, requiredXP, targetName) {
  try {
    let avatarImg;
    try {
      let avatarUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null);
      if (!avatarUrl) avatarUrl = 'https://i.imgur.com/ZXBtVw7.png';
      const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
      avatarImg = await Canvas.loadImage(res.data);
    } catch {
      const fallback = await axios.get('https://i.imgur.com/ZXBtVw7.png', { responseType: 'arraybuffer' });
      avatarImg = await Canvas.loadImage(fallback.data);
    }

    const width = 1600;
    const height = 500;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    bgGradient.addColorStop(0, '#1a0066');
    bgGradient.addColorStop(0.3, '#0d0033');
    bgGradient.addColorStop(0.6, '#001a33');
    bgGradient.addColorStop(1, '#000a1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff08';
    for (let i = 0; i < 80; i++) {
      const x = (i * 37) % width;
      const y = Math.sin(i * 0.3) * 40 + height / 2;
      const size = Math.sin(i * 0.5) * 2 + 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const cardGradient = ctx.createLinearGradient(0, 0, 0, height);
    cardGradient.addColorStop(0, '#ffffff20');
    cardGradient.addColorStop(0.5, '#ffffff15');
    cardGradient.addColorStop(1, '#ffffff10');
    ctx.fillStyle = cardGradient;
    ctx.strokeStyle = '#ffffff35';
    ctx.lineWidth = 3;
    roundRect(ctx, 25, 25, width - 50, height - 50, 40);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#00ffaa25';
    ctx.lineWidth = 1;
    roundRect(ctx, 27, 27, width - 54, height - 54, 38);
    ctx.stroke();

    const avatarSize = 220;
    const avatarX = 70;
    const avatarY = (height / 2) - (avatarSize / 2);

    for (let i = 0; i < 3; i++) {
      ctx.shadowColor = '#00FFAA';
      ctx.shadowBlur = 40 - (i * 10);
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 15 - (i * 5), 0, Math.PI * 2);
      ctx.fillStyle = `#00FFAA${(20 - i * 5).toString(16)}`;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    const avatarBorderGradient = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avatarBorderGradient.addColorStop(0, '#00FFAA');
    avatarBorderGradient.addColorStop(0.5, '#00DDFF');
    avatarBorderGradient.addColorStop(1, '#0088FF');
    ctx.strokeStyle = avatarBorderGradient;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 62px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    let displayName = targetName.length > 20 ? targetName.substring(0, 17) + '...' : targetName;
    ctx.fillText(displayName, width / 2, 120);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 58px "Arial Black", sans-serif';
    ctx.textAlign = 'right';
    const levelGradient = ctx.createLinearGradient(width - 300, 80, width - 100, 120);
    levelGradient.addColorStop(0, '#00FFAA');
    levelGradient.addColorStop(0.5, '#00DDFF');
    levelGradient.addColorStop(1, '#0088FF');
    ctx.fillStyle = levelGradient;
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 15;
    ctx.fillText(`Level ${level}`, width - 120, 120);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 55px sans-serif';
    ctx.fillStyle = levelGradient;
    ctx.textAlign = 'center';
    ctx.shadowColor = levelGradient;
    ctx.shadowBlur = 10;
    ctx.fillText(`${userRank}/${totalUsers}`, width - 180, height - 100);
    ctx.shadowBlur = 0;

    const lineY = height / 2 + 10;
    const lineGradient = ctx.createLinearGradient(avatarX + avatarSize + 50, lineY, width - 200, lineY);
    lineGradient.addColorStop(0, '#00FFAA00');
    lineGradient.addColorStop(0.1, '#00FFAA60');
    lineGradient.addColorStop(0.5, '#00FFAAFF');
    lineGradient.addColorStop(0.9, '#0080FF60');
    lineGradient.addColorStop(1, '#0080FF00');
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(avatarX + avatarSize + 50, lineY);
    ctx.lineTo(width - 200, lineY);
    ctx.stroke();

    const barWidth = 900;
    const barHeight = 40;
    const barX = (width / 2) - (barWidth / 2);
    const barY = height - 130;
    const progress = Math.min(currentXP / requiredXP, 1);

    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#E8E8E8';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`EXP: ${currentXP.toLocaleString()} / ${requiredXP.toLocaleString()}`, width / 2, barY - 50);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    roundRect(ctx, barX, barY, barWidth, barHeight, 22);
    ctx.fill();
    ctx.stroke();

    const xpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    xpGradient.addColorStop(0, '#00FFAA');
    xpGradient.addColorStop(0.3, '#00DDFF');
    xpGradient.addColorStop(0.7, '#0088FF');
    xpGradient.addColorStop(1, '#0066CC');
    ctx.fillStyle = xpGradient;
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 20;
    roundRect(ctx, barX, barY, barWidth * progress, barHeight, 22);
    ctx.fill();
    ctx.shadowBlur = 0;

    const shineGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    shineGradient.addColorStop(0, '#ffffff50');
    shineGradient.addColorStop(0.3, '#ffffff30');
    shineGradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = shineGradient;
    roundRect(ctx, barX, barY, barWidth * progress, barHeight / 2, 22);
    ctx.fill();

    const buffer = canvas.toBuffer();
    await sock.sendMessage(msg.key.remoteJid, {
      image: buffer,
      caption: `🏆 *RANK CARD* 🏆\n👤 *${displayName}*\n⭐ *Level ${level}* | 🏅 *Rank ${userRank}/${totalUsers}*\n🔥 *${currentXP.toLocaleString()} XP* | 🎯 *${((progress * 100).toFixed(1))}% to next level*`,
      mentions: [targetJid],
    }, { quoted: msg });

  } catch (error) {
    console.error('Error generating rank card:', error);
    throw error;
  }
}

async function generateTopCard(sock, msg, topUsers, groupName, topCount) {
  try {
    const width = 1500;
    const height = Math.max(700, 180 + (topUsers.length * 90));
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    bgGradient.addColorStop(0, '#2a0860');
    bgGradient.addColorStop(0.5, '#1a0340');
    bgGradient.addColorStop(1, '#0d0120');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff10';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 4 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 56px "Arial Black", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF8800';
    ctx.shadowBlur = 15;
    ctx.fillText(`🏆 TOP ${topCount} LEADERBOARD`, width / 2, 100);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#DDDDDD';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    let displayGroupName = groupName.length > 30 ? groupName.substring(0, 27) + '...' : groupName;
    ctx.fillText(displayGroupName, width / 2, 150);
    ctx.shadowBlur = 0;

    const cardX = 30;
    const cardY = 30;
    const cardWidth = width - 60;
    const cardHeight = height - 60;

    const cardGradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
    cardGradient.addColorStop(0, '#ffffff25');
    cardGradient.addColorStop(1, '#ffffff15');
    ctx.fillStyle = cardGradient;
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 4;
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 35);
    ctx.fill();
    ctx.stroke();
    
    const paddingLeft = cardX + 50;
    const paddingTop = cardY + 180;
    const avatarSize = 70;
    const spacingY = 90;

    const topMentions = [];

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      const yPos = paddingTop + i * spacingY;
      const xPos = paddingLeft;
      topMentions.push(user.jid);

      let avatarImg;
      try {
        let avatarUrl = await sock.profilePictureUrl(user.jid, 'image').catch(() => null);
        if (!avatarUrl) avatarUrl = 'https://i.imgur.com/ZXBtVw7.png';
        const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
        avatarImg = await Canvas.loadImage(res.data);
      } catch {
        const fallback = await axios.get('https://i.imgur.com/ZXBtVw7.png', { responseType: 'arraybuffer' });
        avatarImg = await Canvas.loadImage(fallback.data);
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(xPos + avatarSize / 2, yPos + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, xPos, yPos, avatarSize, avatarSize);
      ctx.restore();

      let displayName = user.jid.split('@')[0];
      try {
        const contact = sock.contacts[user.jid] || (await sock.onWhatsApp(user.jid))?.[0];
        if (contact?.notify) displayName = contact.notify;
      } catch {}
      if (displayName.length > 20) displayName = displayName.substring(0, 17) + '...';

      ctx.font = 'bold 32px "Arial Black", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(displayName, xPos + avatarSize + 30, yPos + avatarSize / 2 + 12);
      ctx.shadowBlur = 0;

      const level = Math.floor(Math.sqrt(user.msgCount / 5));
      const msgCountText = `Messages: ${user.msgCount.toLocaleString()}`;
      const levelText = `Level: ${level}`;

      ctx.font = '28px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#00FFAA';
      ctx.fillText(levelText, cardX + cardWidth - 120, yPos + avatarSize / 2 - 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(msgCountText, cardX + cardWidth - 120, yPos + avatarSize / 2 + 28);
    }

    const buffer = canvas.toBuffer();
    await sock.sendMessage(msg.key.remoteJid, {
      image: buffer,
      caption: `🏆 Top ${topCount} users in *${displayGroupName}*`,
      mentions: topMentions,
    }, { quoted: msg });

  } catch (error) {
    console.error('Error generating top rank card:', error);
    throw error;
  }
}
