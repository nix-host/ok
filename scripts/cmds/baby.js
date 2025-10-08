const axios = require("axios");

const API_BASE = "https://noobs-api.top/dipto";

async function getApi(path) {
  try {
    const { data } = await axios.get(`${API_BASE}${path}`);
    return data;
  } catch (error) {
    console.error("API Call Error:", error.message);
    return {
      message: "An API error occurred. Please try again later."
    };
  }
}

async function replyHandler(rMsg, sock, nixReply) {
  try {
    const body = rMsg.message?.conversation || rMsg.message?.extendedTextMessage?.text || "";
    if (!body) return;

    const res = await getApi(`/baby?text=${encodeURIComponent(body.toLowerCase())}&senderID=${rMsg.participant || rMsg.key.participant}&font=1`);
    const sent = await sock.sendMessage(rMsg.key.remoteJid, { text: res.reply }, { quoted: rMsg });
    nixReply(sent.key.id, rMsg => replyHandler(rMsg, sock, nixReply));
  } catch (error) {
    console.error("Reply Handler Error:", error);
  }
}

module.exports = {
  name: "bby",
  aliases: ["baby", "suna", "jan", "bot"],
  author: "ArYAN",
  version: "1.0.1",
  role: 0,
  description: "Enjoy bby 😉",
  category: "CHAT",
  noPrefix: true,

  async nix({
    sock,
    msg,
    message,
    args,
    sender,
    nixReply,
    removeReply
  }) {
    const jid = msg.key.remoteJid;
    const uid = sender;
    const text = args.join(" ").toLowerCase();

    if (!text) {
      const r = ["Yes 😀, I am here🥴", "hmm baby bolo 🦆", "vahuna baby😘😘😘😘😘😘❤️❤️😘🌝", "😋😋😛"];
      const sent = await sock.sendMessage(
        jid,
        { text: r[Math.floor(Math.random() * r.length)] },
        { quoted: msg }
      );
      nixReply(sent.key.id, rMsg => replyHandler(rMsg, sock, nixReply));
      return;
    }
    
    if (text === "list") {
      const res = await getApi(`/baby?list=all`);
      if (res.status === false) {
          return sock.sendMessage(jid, { text: res.message || "No list found." }, { quoted: msg });
      }
      
      const teacherList = res.teacher.teacherList || [];
      const out = teacherList.map((item, i) => {
          const id = Object.keys(item)[0];
          const val = item[id];
          return `${i + 1}. ${id} - ${val}`;
      }).join("\n");
      
      const replyText = `👑 | List of Teachers\n\n${out}\n\n❇️ | Total Teach: ${res.responseLength}`;
      return sock.sendMessage(jid, { text: replyText }, { quoted: msg });
    }

    if (text.startsWith("remove ")) {
      const term = text.replace("remove ", "");
      const res = await getApi(`/baby?remove=${encodeURIComponent(term)}&senderID=${uid}`);
      return sock.sendMessage(jid, { text: res.message || res.error }, { quoted: msg });
    }

    if (text.startsWith("teach ")) {
      const parts = text.split(/\s*-\s*/);
      if (parts.length < 2) {
        return sock.sendMessage(jid, { text: "❌ | Invalid format! Use `teach [YourMessage] - [Reply]`" }, { quoted: msg });
      }
      const query = parts[0].replace("teach ", "").trim();
      const reply = parts.slice(1).join("-").trim();
      if (query.length < 1 || reply.length < 1) {
        return sock.sendMessage(jid, { text: "❌ | Both message and reply are required." }, { quoted: msg });
      }
      const res = await getApi(`/baby?teach=${encodeURIComponent(query)}&reply=${encodeURIComponent(reply)}&senderID=${uid}`);
      return sock.sendMessage(jid, { text: `✅ Replies added ${res.message}` || res.error }, { quoted: msg });
    }
    
    const res = await getApi(`/baby?text=${encodeURIComponent(text)}&senderID=${uid}&font=1`);
    const sent = await sock.sendMessage(jid, { text: res.reply }, { quoted: msg });
    nixReply(sent.key.id, rMsg => replyHandler(rMsg, sock, nixReply));
  }
};
