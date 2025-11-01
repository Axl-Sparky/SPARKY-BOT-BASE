const fs = require("fs");
const path = require("path");
const { Sparky } = require("../index");
const Config = require("../config");

const [BOT_NAME, OWNER_NAME, BOT_IMAGE] = (Config.BOT_INFO || "X-BOT-MD;ASWIN SPARKY;https://url.sparky.biz.id/5ftLiA.jpg").split(";");

Sparky(
  {
    pattern: "menu",
    desc: "Show all bot commands",
    type: "info",
  },
  async ({ sparky, msg }) => {
    try {
      const pluginDir = path.join(__dirname, "../plugins");
      const files = fs.readdirSync(pluginDir).filter(f => f.endsWith(".js"));

      let commands = [];

      for (let file of files) {
        const content = fs.readFileSync(path.join(pluginDir, file), "utf-8");

        const matches = [...content.matchAll(/pattern:\s*["'`](.*?)["'`]/g)];
        for (let match of matches) {
          if (match[1]) commands.push(match[1]);
        }
      }

      commands = [...new Set(commands)].sort();

      if (commands.length === 0) return msg.reply("_No commands found in plugins folder!_");

      const caption =
        `*🤖 ${BOT_NAME} MENU*\n\n` +
        `👑 *Owner:* ${OWNER_NAME}\n` +
        `📦 *Total Commands:* ${commands.length}\n\n` +
        `✨ *Available Commands:*\n${commands.map(cmd => `◦ ${cmd}`).join("\n")}\n\n` +
        `_© ${BOT_NAME} | Powered by ${OWNER_NAME}_`;

      await sparky.sendMessage(
        msg.chat,
        {
          image: { url: BOT_IMAGE },
          caption: caption.trim(),
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error(e);
      return msg.reply("_Error reading plugins folder!_");
    }
  }
);
