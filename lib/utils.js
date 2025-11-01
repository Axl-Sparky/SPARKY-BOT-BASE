const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const webp = require('node-webpmux');

// Set ffmpeg binary path (change if necessary)
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');

/* -------------------------------------------------------------------------- */
/*                               BASIC UTILITIES                              */
/* -------------------------------------------------------------------------- */

function isUrl(url) {
  return (/^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.){1,}[a-zA-Z]{2,}/).test(url);
}

function numericalToString(number) {
  if (isNaN(number)) return false;
  if (number >= 1_000_000) return (number / 1_000_000).toFixed(1) + 'M';
  if (number >= 1_000) return (number / 1_000).toFixed(1) + 'K';
  return number.toString();
}

function convertTimestamp(timestamp) {
  const d = new Date(timestamp * 1000);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    date: d.getDate(),
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d),
    year: d.getFullYear(),
    day: daysOfWeek[d.getUTCDay()],
    time: `${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}`
  };
}

/* -------------------------------------------------------------------------- */
/*                            NETWORK / JSON HELPERS                          */
/* -------------------------------------------------------------------------- */

async function parseJson(url) {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (e) {
    console.log('❌ Error fetching JSON:\n' + e.stack);
    return false;
  }
}

async function getJson(url, options = {}) {
  try {
    const res = await axios({
      method: 'GET',
      url,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
      },
      ...options,
    });
    return res.data;
  } catch (err) {
    console.log(`Error: ${err}`);
    throw err;
  }
}

async function getBuffer(url, options = {}) {
  try {
    const res = await axios({
      method: 'GET',
      url,
      headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 },
      ...options,
      responseType: 'arraybuffer',
    });
    return res.data;
  } catch (e) {
    console.log(`Error: ${e}`);
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                             TEMP FILE HELPERS                              */
/* -------------------------------------------------------------------------- */

async function createTmpFile(fileBuffer, extension) {
  const dir = os.tmpdir();
  const tmpFilePath = path.join(dir, `tempfile-${Date.now()}.${extension}`);
  await fs.writeFileSync(tmpFilePath, fileBuffer);
  return tmpFilePath;
}

async function createFile(extension) {
  const dir = os.tmpdir();
  const tmpFilePath = path.join(dir, `tempfile-${Date.now()}.${extension}`);
  return tmpFilePath;
}

/* -------------------------------------------------------------------------- */
/*                            STICKER CONVERSIONS                             */
/* -------------------------------------------------------------------------- */

async function addExifToWebP(buffer, options) {
  const outputFilePath = await createFile('webp');
  const inputFilePath = await createTmpFile(buffer, 'webp');

  if (options.packName || options.authorName) {
    const img = new webp.Image();
    const json = {
      'sticker-pack-id': 'https://github.com/KichuExe',
      'sticker-pack-name': options.packName,
      'sticker-pack-publisher': options.authorName,
      emojis: options.categories || [''],
    };

    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);

    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(inputFilePath);
    img.exif = exif;
    await img.save(outputFilePath);

    const stickerBuffer = fs.readFileSync(outputFilePath);
    fs.unlinkSync(inputFilePath);
    fs.unlinkSync(outputFilePath);

    return stickerBuffer;
  }
}

/* --------------------------- Image → WebP Convert -------------------------- */

async function imageToWebP(buffer, exif) {
  const outputFilePath = await createFile('webp');
  const inputFilePath = await createTmpFile(buffer, 'jpg');

  await new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .on('error', reject)
      .on('end', resolve)
      .addOutputOptions([
        '-vcodec', 'libwebp',
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15," +
        "pad=320:320:-1:-1:color=white@0.0,split[a][b];" +
        "[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];" +
        "[b][p]paletteuse",
      ])
      .toFormat('webp')
      .save(outputFilePath);
  });

  const buff = fs.readFileSync(outputFilePath);
  fs.unlinkSync(outputFilePath);
  fs.unlinkSync(inputFilePath);

  return exif
    ? await addExifToWebP(buff, { packName: exif.packName, authorName: exif.authorName })
    : buff;
}

/* --------------------------- Video → WebP Convert -------------------------- */

async function videoToWebP(buffer, exif) {
  const outputFilePath = await createFile('webp');
  const inputFilePath = await createTmpFile(buffer, 'mp4');

  await new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .on('error', reject)
      .on('end', resolve)
      .addOutputOptions([
        '-vcodec', 'libwebp',
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15," +
        "pad=320:320:-1:-1:color=white@0.0,split[a][b];" +
        "[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];" +
        "[b][p]paletteuse",
        '-loop', '0',
        '-ss', '00:00:00',
        '-t', '00:00:05',
        '-preset', 'default',
        '-an',
        '-vsync', '0',
      ])
      .toFormat('webp')
      .save(outputFilePath);
  });

  const buff = fs.readFileSync(outputFilePath);
  fs.unlinkSync(outputFilePath);
  fs.unlinkSync(inputFilePath);

  return exif
    ? await addExifToWebP(buff, { packName: exif.packName, authorName: exif.authorName })
    : buff;
}

/* -------------------------------------------------------------------------- */
/*                               MODULE EXPORTS                               */
/* -------------------------------------------------------------------------- */

module.exports = {
  parseJson,
  getJson,
  getBuffer,
  isUrl,
  numericalToString,
  convertTimestamp,
  addExifToWebP,
  imageToWebP,
  videoToWebP,
  createTmpFile,
  createFile,
};
