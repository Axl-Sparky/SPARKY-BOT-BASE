const { Sparky } = require("../index.js");
const yts = require("yt-search");
const { getJson } = require("../lib/utils.js");
let API = "https://api-aswin-sparky.koyeb.app"


Sparky(
  {
    pattern: "ytv",
    desc: "",
    type: "downloader",
  },
  async ({ sparky, msg, text }) => {
    if (!text) return msg.reply("_Enter Youtube Video Link!_\n\n Eg: ytv https://youtu.be/xxxxxx");
    var ytmp4 = await getJson(`${API}/api/downloader/ytv?url=${text}`);
    await sparky.sendMessage(msg.chat, { video: { url: ytmp4.data.url }, caption: `*${ytmp4.data.title}*` }, { quoted: msg })
  }
);

Sparky(
  {
    pattern: "yta",
    desc: "",
    type: "downloader",
  },
  async ({ sparky, msg, text }) => {
    if (!text) return msg.reply("_Enter Youtube Video/audio Link!_\n\n Eg: ytv https://youtu.be/xxxxxx");
    var ytmp3 = await getJson(`${API}/api/downloader/song?search=${text}`);
    await sparky.sendMessage(msg.chat, { audio: { url: ytmp3.data.url }, mimetype: 'audio/mpeg' }, { quoted: msg });
  }
);

Sparky(
  {
    pattern: "yts",
    desc: "Search YouTube videos",
    type: "search",
  },
  async ({ sparky, msg, text }) => {
    if (!text)
      return msg.reply("_Enter search query!_\n\nEg: yts Alan Walker faded");

    try {
      const search = await yts(text);
      const videos = search.videos.slice(0, 5); // get top 5 results
      if (!videos || videos.length === 0)
        return msg.reply("_No results found!_");

      let caption = `*🔍 YouTube Search Results:*\n\n`;
      for (let i = 0; i < videos.length; i++) {
        caption += `🎬 *${videos[i].title}*\n`;
        caption += `👤 ${videos[i].author.name}\n`;
        caption += `⏱️ ${videos[i].timestamp}\n`;
        caption += `🔗 ${videos[i].url}\n\n`;
      }

      await sparky.sendMessage(msg.chat, {
        image: { url: videos[0].thumbnail },
        caption: caption.trim(),
      }, { quoted: msg });

    } catch (err) {
      console.error(err);
      return msg.reply("_Error while fetching search results._");
    }
  }
);

Sparky(
  {
    pattern: "play",
    desc: "Search and download song from YouTube",
    type: "downloader",
  },
  async ({ sparky, msg, text }) => {
    if (!text)
      return msg.reply("_Enter song name!_\n\nEg: play heat waves");

    try {
      const search = await yts(text);
      const video = search.videos[0];
      if (!video) return msg.reply("_No results found!_");

      const song = await getJson(`${API}/api/downloader/song?search=${video.url}`);

      if (!song || !song.data || !song.data.url)
        return msg.reply("_Error fetching song download link!_");

      await sparky.sendMessage(
        msg.chat,
        {
          audio: { url: song.data.url },
          mimetype: "audio/mpeg",
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: video.title,
              body: video.author.name,
              thumbnailUrl: video.thumbnail,
              sourceUrl: video.url,
              mediaType: 2,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);
      return msg.reply("_Error while processing request!_");
    }
  }
);

Sparky(
  {
    pattern: "insta",
    desc: "",
    type: "downloader",
  },
  async ({ sparky, msg, text }) => {
    if (!text) return msg.reply("_Enter Instagram Post Link!_\n\n Eg: insta https://www.instagram.com/p/xxxxxx");
    var response = await getJson(`${API}/api/downloader/igdl?url=${text}`);
    for (let i of response.data) {
      await msg.sendMsg(msg.chat, i.url, { quoted: msg }, i.type)
    }
  }
);