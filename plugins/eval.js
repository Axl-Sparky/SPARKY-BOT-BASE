const {
    Sparky
} = require("../index.js");
const X = require("../config.js");
const util = require("util");

Sparky(
    {
        on: "text",
        fromMe: true,
    },
    async ({
        sparky, msg, text
    }) => {
            text = text || '';
        if (typeof text !== "string") text = String(text);
        if (text.startsWith(">")) {
            try {
                let evaled = await eval(`(async () => { ${text.replace(">", "")} })()`);
                if (typeof evaled !== "string") evaled = util.inspect(evaled);
                await msg.reply(`${'```'}${evaled}${'```'}`)
            } catch (err) {
                await msg.reply(`_${util.format(err)}_`);
            }
        }
        }
);