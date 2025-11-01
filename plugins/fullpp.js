const { Sparky } = require("../index.js");
const Jimp = require("jimp");

Sparky(
  {
    pattern: "pp",
    desc: "fullpp",
    type: "owner",
  },

  async (sparky, image, msg) => {
   if (!msg.replied.image)
    return await msg.reply("*Reply to a photo*");
    let media = await msg.quoted.download();
    await updateProfilePicture(msg.me, media, msg);
    return await msg.reply("*Profile Picture Updated*");
  }
);

async function updateProfilePicture(jid, imag, msg) {
  const { query } = msg.client;
  const { img } = await generateProfilePicture(imag);
  await query({
    tag: "iq",
    attrs: {
      to: jid,
      type: "set",
      xmlns: "w:profile:picture",
    },
    content: [
      {
        tag: "picture",
        attrs: { type: "image" },
        content: img,
      },
    ],
  });
}

async function generateProfilePicture(buffer) {
  const jimp = await Jimp.read(buffer);
  const min = jimp.getWidth();
  const max = jimp.getHeight();
  const cropped = jimp.crop(0, 0, min, max);
  return {
    img: await cropped.scaleToFit(324, 720).getBufferAsync(Jimp.MIME_JPEG),
    preview: await cropped.normalize().getBufferAsync(Jimp.MIME_JPEG),
  };
}
