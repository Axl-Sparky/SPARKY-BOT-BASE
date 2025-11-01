const { 
  getContentType, 
  downloadContentFromMessage 
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const fetch = require('node-fetch');
const { getBuffer, isUrl, imageToWebP, videoToWebP, addExifToWebP } = require('./utils'); // make sure these utils exist

module.exports = async (msg, sparky, store) => {
  if (msg.key) {
    msg.me = sparky.user.id.includes(':') ? sparky.user.id.split(':')[0] + '@s.whatsapp.net' : sparky.user.id;
    msg.chat = msg.key.remoteJid;
    msg.id = msg.key.id;
    msg.fromBot = msg.isBaileys = msg.id.startsWith('BAE5') && msg.id.length === 16;
    msg.fromMe = msg.key.fromMe;
    msg.isGroupChat = msg.isGroup = msg.key.remoteJid.endsWith('g.us');
    msg.isPrivateChat = msg.isPrivate = msg.key.remoteJid.endsWith('.net');
    msg.sender = msg.from = msg.fromMe ? msg.me : msg.isGroupChat ? msg.key.participant : msg.chat;
    if (msg.isGroupChat) msg.participant = msg.key.participant;
  }

  if (msg.message) {
    msg.mtype = getContentType(msg.message);
    msg.text = (msg.mtype === 'conversation') ? msg.message.conversation
      : (msg.mtype == 'imageMessage') ? msg.message.imageMessage.caption
      : (msg.mtype == 'videoMessage') ? msg.message.videoMessage.caption
      : (msg.mtype == 'extendedTextMessage') ? msg.message.extendedTextMessage.text
      : (msg.mtype == 'buttonsResponseMessage') ? msg.message.buttonsResponseMessage.selectedButtonId
      : (msg.mtype == 'listResponseMessage') ? msg.message.listResponseMessage.singleSelectReply.selectedRowId
      : (msg.mtype == 'templateButtonReplyMessage') ? msg.message.templateButtonReplyMessage.selectedId
      : (msg.mtype === 'messageContextInfo') ? (msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.singleSelectReply.selectedRowId || msg.msg)
      : '';

    msg.msg = (msg.mtype == 'viewOnceMessage'
      ? msg.message[msg.mtype].message[getContentType(msg.message[msg.mtype].message)]
      : msg.message[msg.mtype]);

    msg.replied = msg.msg?.contextInfo ? msg.msg.contextInfo.quotedMessage : false;
    msg.mentions = msg.msg?.contextInfo ? msg.msg.contextInfo.mentionedJid : [];

    if (msg.replied) {
      msg.replied.id = msg.msg.contextInfo.stanzaId || false;
      msg.replied.chat = msg.msg.contextInfo.remoteJid || msg.chat;
      msg.replied.fromBot = msg.replied.isBaileys = msg.replied.id ? msg.replied.id.startsWith('BAE5') && msg.replied.id.length === 16 : false;
      msg.replied.sender = msg.replied.from = msg.msg.contextInfo.participant || false;
      msg.replied.mentions = msg.msg.contextInfo ? msg.msg.contextInfo.mentionedJid : [];
      msg.replied.fromMe = msg.replied.me = msg.replied.sender === msg.me;
      msg.replied.mtype = getContentType(msg.replied);
      msg.replied.text = msg.replied.text || msg.replied.caption || msg.replied.conversation || msg.replied.contentText || msg.replied.selectedDisplayText || msg.replied.title || false;
      msg.replied.image = msg.replied.imageMessage || false;
      msg.replied.video = msg.replied.videoMessage || false;
      msg.replied.audio = msg.replied.audioMessage || false;
      msg.replied.sticker = msg.replied.stickerMessage || false;
      msg.replied.document = msg.replied.documentMessage || false;

      ////////////////////////////////////////////////////////////////////////////////
      const downloadMedia = (message, pathFile) =>
        new Promise(async (resolve, reject) => {
          let type = Object.keys(message)[0];
          let mimeMap = {
            imageMessage: "image",
            videoMessage: "video",
            stickerMessage: "sticker",
            documentMessage: "document",
            audioMessage: "audio",
          };
          let mes = message;
          if (type == "templateMessage") {
            mes = message.templateMessage.hydratedFourRowTemplate;
            type = Object.keys(mes)[0];
          }
          if (type == "buttonsMessage") {
            mes = message.buttonsMessage;
            type = Object.keys(mes)[0];
          }
          try {
            const stream = await downloadContentFromMessage(mes[type], mimeMap[type]);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            if (pathFile) {
              await fs.promises.writeFile(pathFile, buffer);
              resolve(pathFile);
            } else resolve(buffer);
          } catch (e) { reject(e); }
        });
      ////////////////////////////////////////////////////////////////////////////////
      msg.replied.download = async (pathFile) => {
        await downloadMedia(msg.replied, pathFile);
      };
      ////////////////////////////////////////////////////////////////////////////////
    }
  }

  msg.isOwner = msg.sender === msg.me;

  msg.reply = async (txt) => {
    return await sparky.sendMessage(msg.chat, { text: txt }, { quoted: msg });
  };

  msg.replay = async (message, options, jid = msg.chat) => {
    if (message.hasOwnProperty('text')) {
      return await sparky.sendMessage(jid, { text: message.text, mentions: (await msg.getMentions(message.text)), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('image')) {
      return await sparky.sendMessage(jid, { image: message.image, caption: (message?.caption || ''), mimetype: (message?.mimetype || 'image/png'), thumbnail: Buffer.alloc(0), mentions: (await msg.getMentions(message?.caption)), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('video')) {
      return await sparky.sendMessage(jid, { video: message.video, caption: (message?.caption || ''), mimetype: (message?.mimetype || 'video/mp4'), thumbnail: Buffer.alloc(0), mentions: (await msg.getMentions(message?.caption)), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('audio')) {
      return await sparky.sendMessage(jid, { audio: message.audio, ptt: (message?.ptt || false), mimetype: (message?.mimetype || 'audio/mpeg'), waveform: Array(40).fill().map(() => Math.floor(Math.random() * 99)), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('document')) {
      return await sparky.sendMessage(jid, { document: message.document, caption: (message?.caption || ''), mimetype: (message?.mimetype || 'application/pdf'), mentions: (await msg.getMentions(message?.caption)), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('sticker')) {
      return await sparky.sendMessage(jid, { sticker: message.sticker, mimetype: (message?.mimetype || 'image/webp'), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('poll')) {
      return await sparky.sendMessage(jid, { poll: { name: message.poll.title, values: message.poll.options }, mentions: (await msg.getMentions(message.title + '\n' + message.poll.options.join('_'))), ...message }, { quoted: msg, ...options });
    } else if (message.hasOwnProperty('delete')) {
      return await sparky.sendMessage(jid, { delete: message.delete.key });
    } else if (message.hasOwnProperty('edit')) {
      return await sparky.relayMessage(jid, { protocolMessage: { key: message.edit.key, type: 14, editedMessage: { conversation: message.edit.text, mentions: (await msg.getMentions(message.edit.text)) } }, }, {});
    }
  };

  msg.isAdmin = async (who) => {
    let group = await sparky.groupMetadata(msg.chat);
    let participant = group.participants.filter(p => p.id == who);
    if (participant.length != 0) return (participant[0].admin === 'superadmin' || participant[0].admin === 'admin') ? true : false;
    else return false;
  };

  msg.isParticipant = async (who, chat = msg.chat) => {
    let group = await sparky.groupMetadata(chat);
    let participant = group.participants.filter(p => p.id == who);
    if (participant.length == 0) return false;
    return true;
  };

  msg.getMentions = async (message) => {
    let mentions = [];
    try {
      mentions = [...message.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
    } catch {
      mentions = [];
    }
    return mentions;
  };

  msg.load = async (message) => {
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    let stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (let chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  };

  // ✅ Added m.sendMsg helper
  msg.sendMsg = async (jid, content, opt = { packname: "A-S-W-I-N-S-P-A-R-K-Y" }, type = "text") => {
    switch (type.toLowerCase()) {
      case "text":
        return await sparky.sendMessage(jid, { text: content, ...opt }, { ...opt });
      case "image":
        if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
        return await sparky.sendMessage(jid, {
          image: Buffer.isBuffer(content)
            ? content
            : (await isUrl(content))
              ? await getBuffer(content).catch(async () => (await fetch(content)).buffer())
              : null,
          ...opt
        }, { ...opt });
      case "video":
        if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
        return await sparky.sendMessage(jid, {
          video: Buffer.isBuffer(content)
            ? content
            : (await isUrl(content))
              ? await getBuffer(content).catch(async () => (await fetch(content)).buffer())
              : null,
          ...opt
        }, { ...opt });
      case "audio":
        if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
        return await sparky.sendMessage(jid, {
          audio: Buffer.isBuffer(content)
            ? content
            : (await isUrl(content))
              ? await getBuffer(content).catch(async () => (await fetch(content)).buffer())
              : null,
          ...opt
        }, { ...opt });
      case "sticker":
        const { data, mime } = await msg.getFile(content);
        const stickerBuffer =
          mime === "image/webp"
            ? await addExifToWebP(data, opt)
            : mime.startsWith("video")
              ? await videoToWebP(data, opt)
              : mime.startsWith("image")
                ? await imageToWebP(data, opt)
                : null;
        if (!stickerBuffer) throw new Error("Unsupported media type");
        return await sparky.sendMessage(jid, { sticker: stickerBuffer, ...opt }, opt);
    }
  };

  sparky.getName = async (id) => {
    id = id.toString();
    if (id.endsWith('net')) {
      if (id == sparky.user.id) return sparky.user.name;
      let s = store.contacts[id];
      try { s = s.name } catch { s = '+' + id.split('@')[0]; }
      return s;
    } else {
      return id;
    }
  };

  return msg;
};
