'use strict';
const X = require("./config.js")
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeInMemoryStore, getContentType, generateForwardMessageContent, downloadContentFromMessage, jidDecode } = require('@whiskeysockets/baileys');
const { Sequelize, DataTypes } = require('sequelize');
const { list, uninstall } = require('./lib/database/commands');
const { getFilter } = require('./lib/database/filter');
const { parseJson } = require('./lib/utils');
const { database } = require('./lib/database.js');
const Greetings = require('./lib/database/greetings');
const axios = require('axios');
const pino = require('pino');
const fs = require("fs");
const fx = require("fs-extra");
const {Boom} = require('@hapi/boom');
const sleep = ms => new Promise(res => setTimeout(res, ms));
require('http')
 .createServer(async (req, res) => {})
 .listen(process.env?.PORT || 8080, () => true);

const Users = database.define('Users', {
    name: {
        primaryKey: true,
        unique: false,
        type: DataTypes.STRING,
        allowNull: false
    },
    id: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

const commands = [];
function Sparky(commandInfo, func) {
  commandInfo.function = func;
  if (commandInfo.pattern) {
    commandInfo.pattern =
      new RegExp(`${X.PREFIX}( ?${commandInfo.pattern})`, "is") || false;
  }
  commandInfo.dontAddCommandList = commandInfo.dontAddCommandList || false;
  commandInfo.fromMe = commandInfo.fromMe || false;
  commandInfo.type = commandInfo.type || "misc";

  commands.push(commandInfo);
  return commandInfo;
}

async function Connect() {
    try {

        
        let { version, isLatest } = await fetchLatestBaileysVersion();
        let { state, saveCreds } = await useMultiFileAuthState('./lib/session');
        let sparky = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            markOnlineOnConnect: false,
            browser: ['sparky', 'Chrome', '1.0.0'],
            auth: state,
            version: version
        });

            sparky.ev.on('connection.update', async ({connection, lastDisconnect}) => {
            if(connection === 'connecting') console.log('Connecting...');
            else if (connection === 'open') {
                console.log('Connected.');
                let start = `_BOT STARTED!_`
                fs.readdirSync(__dirname + "/plugins").forEach((plugin) => {
              if (plugin.endsWith(".js")) {
              require(__dirname + "/plugins/" + plugin);
              }});
              console.log("Plugins Loaded")
                let num = X.SUDO.split(",")[0]
                    sparky.sendMessage(num + "@s.whatsapp.net", {text : start})
            } else if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === DisconnectReason.connectionReplaced) {
                    console.log('Connection replaced. Logout current session first.');
                    await client.logout();
                } else {
                    console.log('Reconnecting...');
                    await sleep(3000);
                    Connect();
                }
            }
        });

        sparky.ev.on('group-participants.update', async (info) => {
           if (info.action == 'add') {
            let wtext = await Greetings.getMessage('welcome', info.id);
            if (wtext !== false) await sparky.sendMessage(info.id, { text: wtext });
           } else if (info.action == 'remove') {
            let gtext = await Greetings.getMessage('goodbye', info.id);
            if (gtext !== false) await sparky.sendMessage(info.id, { text: gtext });
           }
        });
 
        sparky.ev.on('messages.upsert', async (msg) => {
        // try {
            msg = msg.messages[0];
            if (!msg.message) return;
            msg = await require('./lib/message.js')(msg, sparky);
            if (msg.chat === 'status@broadcast') return;
            try {
             let user = await Users.findAll({ where: { id: msg.isPrivate ? msg.chat : msg.sender } });
             if (user.length < 1) {
              await Users.create({ name: msg.pushName, id: msg.isPrivate ? msg.chat : msg.sender });
             } else {
              await Users[0]?.update({ name: msg.pushName });
             }
            } catch {}

           
            let filters = await getFilter(msg.chat);
            filters.forEach(async (filter) => {
              let regex = new RegExp(filter.match, 'i');
              if (regex.test(msg.text) &&
                  filter.chat == msg.chat &&
                  !msg.fromBot) await msg.reply({ text: filter.response });
            });
           
    
           commands.map(async (Sparky) => {
           let comman = msg.text;
            let text;
           switch (true) {
           case Sparky.pattern && Sparky.pattern.test(comman):
             text = msg.text.replace(new RegExp(Sparky.pattern, "i"), "").trim();
                 Sparky.function({sparky, msg, text});
           break;
           case comman && Sparky.on === "text":
             text = msg.text
               Sparky.function({sparky, msg, text});
           break;
           case Sparky.on === "image" || Sparky.on === "photo":
           if (msg.mtype === "imageMessage") {
               Sparky.function({sparky, msg});
           }
           break;
           case Sparky.on === "sticker":
           if (msg.mtype === "stickerMessage") {
               Sparky.function({sparky, msg});
           }
           break;
           case Sparky.on === "video":
           if (msg.mtype === "videoMessage") {
             Sparky.function({sparky, msg});
           }
           break;
           default:
           break;
           }
           });
           
        });

        sparky.ev.on('contacts.upsert', async (contact) => store.bind(contact));
        sparky.ev.on('creds.update', saveCreds);
    } catch (e) {
        console.log(e);
    }
}

setTimeout( () => {
    Connect()
    }, 3000)


module.exports = {
 Users,
 Connect,
 Sparky,
 commands
};
