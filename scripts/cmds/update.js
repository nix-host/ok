const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const https = require("https");
const os = require("os");
const crypto = require("crypto");

module.exports = {
  name: "update",
  version: "1.4",
  author: "ArYAN",
  category: "UTILITY",
  role: 3,
  aliases: ["upgrade", "refresh"],
  isPrefix: true,

  nix: async function ({ sock, msg, message, nixReply, removeReply }) {
    const repoPath = path.resolve(__dirname, '..', '..');
    const backupRoot = path.resolve(repoPath, 'backup');
    const tempPath = path.join(os.tmpdir(), "nix-update-temp");

    function fetchJSON(url) {
      return new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on("error", reject);
      });
    }

    function hashFile(filePath) {
      if (!fs.existsSync(filePath)) return null;
      try {
        if (!fs.statSync(filePath).isFile()) return null;
        const data = fs.readFileSync(filePath);
        return crypto.createHash("sha256").update(data).digest("hex");
      } catch (err) {
        return null;
      }
    }

    try {
      const localPkgPath = path.join(repoPath, "package.json");
      if (!fs.existsSync(localPkgPath)) {
        return await message.reply("❌ Local package.json not found.");
      }

      const localPkg = JSON.parse(fs.readFileSync(localPkgPath, "utf8"));
      const remotePkgUrl = "https://raw.githubusercontent.com/FNG-ARYAN/WP-BOT-V2/main/package.json";
      const remotePkg = await fetchJSON(remotePkgUrl);

      const localVersion = localPkg.version || "0.0.0";
      const remoteVersion = remotePkg.version || "0.0.0";

      if (localVersion === remoteVersion) {
        return await message.reply(`✅ Your bot is already up to date (v${localVersion}).`);
      }

      await fse.remove(tempPath);
      await new Promise((resolve, reject) => {
        exec(
          `git clone --depth 1 https://github.com/FNG-ARYAN/WP-BOT-V2.git "${tempPath}"`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupRoot, `backup-${timestamp}`);
      await fse.ensureDir(backupPath);

      const files = await fse.readdir(tempPath);
      for (const file of files) {
        if (["config.json", "scripts", "cmds", ".git"].includes(file)) continue;

        const tempFile = path.join(tempPath, file);
        const localFile = path.join(repoPath, file);

        if (!fs.statSync(tempFile).isFile()) continue;

        if (fs.existsSync(localFile)) {
          if (!fs.statSync(localFile).isFile()) continue;

          const localHash = hashFile(localFile);
          const tempHash = hashFile(tempFile);
          if (localHash === tempHash) continue;

          await fse.ensureDir(path.join(backupPath));
          await fse.move(localFile, path.join(backupPath, file));
        }

        await fse.copy(tempFile, localFile);
      }

      const localCommandsDir = path.join(repoPath, "scripts", "cmds");
      const tempCommandsDir = path.join(tempPath, "scripts", "cmds");

      const modifiedCommands = [];
      const addedCommands = [];

      if (fs.existsSync(tempCommandsDir)) {
        const commandFiles = await fse.readdir(tempCommandsDir);
        for (const file of commandFiles) {
          if (!file.endsWith(".js")) continue;

          const tempCmdPath = path.join(tempCommandsDir, file);
          const localCmdPath = path.join(localCommandsDir, file);

          if (!fs.statSync(tempCmdPath).isFile()) continue;

          const localExists = fs.existsSync(localCmdPath);
          const localHash = hashFile(localCmdPath);
          const tempHash = hashFile(tempCmdPath);

          if (localExists) {
            if (localHash === tempHash) continue;

            const backupCmdDir = path.join(backupPath, "scripts", "cmds");
            await fse.ensureDir(backupCmdDir);
            await fse.move(localCmdPath, path.join(backupCmdDir, file));
            await fse.copy(tempCmdPath, localCmdPath);
            modifiedCommands.push(file);
          } else {
            await fse.copy(tempCmdPath, localCmdPath);
            addedCommands.push(file);
          }
        }
      }

      await fse.remove(tempPath);

      let changesSummary = "";
      if (addedCommands.length)
        changesSummary += `\n- Added scripts/cmds:\n  > ${addedCommands.join("\n  > ")}`;
      if (modifiedCommands.length)
        changesSummary += `\n- Modified scripts/cmds:\n  > ${modifiedCommands.join("\n  > ")}`;

      const confirmMsg = await sock.sendMessage(msg.key.remoteJid, {
        text: `✅ Bot updated to v${remoteVersion}!\nChanges:${changesSummary || "None"}\nBackup: \`${backupPath}\`\n\nReact with 👍 to restart.`,
        mentions: [msg.key.participant || msg.key.remoteJid],
      });

      nixReply(confirmMsg.key.id, async (reactionMsg) => {
        const emoji = reactionMsg.message?.reactionMessage?.text;

        if (emoji === "👍") {
          const restartFile = path.join(repoPath, "database", "restartTime.json");
          fs.writeFileSync(
            restartFile,
            JSON.stringify({
              start: Date.now(),
              jid: msg.key.remoteJid,
            })
          );
          await sock.sendMessage(msg.key.remoteJid, { text: "♻️ Restarting bot now..." });
          process.exit(2);
        } else {
          await sock.sendMessage(msg.key.remoteJid, { text: "❌ Restart cancelled." });
        }
        removeReply(confirmMsg.key.id);
      });
    } catch (err) {
      console.error("Update error:", err);
      await message.reply(`❌ Update failed: ${err.message}`);
    }
  },
};
