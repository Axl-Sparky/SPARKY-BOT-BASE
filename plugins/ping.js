const { Sparky } = require("../index.js");
  Sparky(
  {
    pattern: "ping",
    desc: "To check ping",
    type: "user",
  },
  async ({sparky , msg}) => {
    const start = new Date().getTime()
    let pong = await sparky.sendMessage(msg.chat , { text : "_*ᴄʜᴇᴄᴋɪɴɢ ᴘɪɴɢ...*_" }, { quoted : msg })
      const end = new Date().getTime();

    return await sparky.sendMessage(msg.chat , { text : `_*Rᴇꜱᴘᴏɴꜱᴇ ɪɴ*_ _*${end - start}*_ _*ᴍꜱ*_` , edit : pong.key } , { quoted : msg })
  }
);

