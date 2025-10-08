const a = require("axios");
const f = require("fs");

const removeHomeDir = (str) => {
    if (typeof str !== "string") return str;
    const homeDir = process.env.HOME || process.env.USERPROFILE || "/home";
    return str.replace(new RegExp(homeDir, "g"), "~");
};

const langs = {
            en: {
                error: "❌ An error occurred:",
                invalidCode: "⚠️ Please provide code to execute.",
                restricted: "🔒 This command is restricted to developers with role 3 or higher.",
                invalidFormat: "❌ Invalid command format. Use: eval <code>",
                timeout: "⏰ Code execution timed out after 5 seconds.",
                success: ""
            }
        }; 

module.exports = {
    name: "eval",
    role: 3,
    author: "ArYAN",
    version: "4.1",
    category: "DEVELOPER",
    noPrefix: false,

    nix: async ({
        sock,
        msg,
        message,
        args,
        api,
        sender,
        config,
        commands,
        addReply,
        nixReply,
        removeReply,
        userMoney,
        userData,
        prefixesData,
        groupSettings,
        saveData,
        getData
    }) => {
        const getLang = (key, replacements = {}) => {
            const lang = config?.lang || "en";
            let text = langs[lang][key] || langs.en[key];
            for (const [k, v] of Object.entries(replacements)) {
                text = text.replace(`{${k}}`, v);
            }
            return text;
        };

        async function out(output) {
            let msg = output;
            if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function") {
                msg = msg.toString();
            } else if (msg instanceof Map) {
                let text = `Map(${msg.size}) `;
                text += JSON.stringify(mapToObj(msg), null, 2);
                msg = text;
            } else if (typeof msg === "object" && msg !== null) {
                try {
                    msg = JSON.stringify(msg, null, 2);
                } catch (e) {
                    msg = "[Object with circular reference]";
                }
            } else if (typeof msg === "undefined" || msg === null) {
                msg = "undefined";
            }
            return await message.reply(`\`\`\`\n${msg}\n\`\`\``);
        }

        function mapToObj(map) {
            const obj = {};
            map.forEach((v, k) => {
                obj[k] = v;
            });
            return obj;
        }

        const code = args.join(" ");

        // Check for dev role from the global config object
        const isDev = global.config.roles["3"]?.includes(sender);
        if (!isDev) {
            return await message.reply(getLang("restricted"));
        }
        
        if (!code) {
          return await message.reply(getLang("invalidCode"));
        }

        try {
          const evalFunc = new Function(
            "a", "f", "sock", "msg", "message", "args", "api", "sender",
            "config", "commands", "addReply", "nixReply", "removeReply",
            "userMoney", "userData", "prefixesData", "groupSettings", "saveData", "getData", "out",
            `return (async () => {
                try {
                    const fas = f.readFileSync;
                    const usermoney = userMoney;
                    const userdata = userData;
                    return ${code};
                } catch (innerErr) {
                    throw innerErr;
                }
            })();`
          );

          const evalResult = await Promise.race([
            evalFunc.bind(null,
              a, f, sock, msg, message, args, api, sender,
              config, commands, addReply, nixReply, removeReply,
              userMoney, userData, prefixesData, groupSettings, saveData, getData, out
            )(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Execution timed out")), 5000))
          ]);

          console.log("Eval Command Success:", { sender, code, result: evalResult });

          await out(evalResult);
          await message.reply(getLang("success"));
        } catch (err) {
            console.error("Eval Command Error:", {
                sender,
                code,
                error: err.toString(),
                stack: err.stack
            });

            const errorMessage = `${getLang("error")}\n\`\`\`\n${removeHomeDir(err.stack || err.toString())}\n\`\`\``;
            await message.reply(errorMessage);
        }
    }
};
