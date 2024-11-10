(async () => {
  try {
    const chalk = await import("chalk");
    const { makeWASocket } = await import("@whiskeysockets/baileys");
    const qrcode = await import("qrcode-terminal");
    const fs = await import('fs');
    const pino = await import('pino');
    const {
      delay,
      useMultiFileAuthState,
      BufferJSON,
      fetchLatestBaileysVersion,
      PHONENUMBER_MCC,
      DisconnectReason,
      makeInMemoryStore,
      jidNormalizedUser,
      makeCacheableSignalKeyStore
    } = await import("@whiskeysockets/baileys");
    const Pino = await import("pino");
    const NodeCache = await import("node-cache");

    const phoneNumber = "2250799684818";
    const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
    const useMobile = process.argv.includes("--mobile");

    const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });
    const question = (text) => new Promise((resolve) => rl.question(text, resolve));

    async function qr() {
      let { version, isLatest } = await fetchLatestBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(`./session`);
      const msgRetryCounterCache = new (await NodeCache).default();

      const MrRoyal = makeWASocket({
        logger: (await pino).default({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        mobile: useMobile,
        browser: ['Chrome (Linux)', '', ''],
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, (await Pino).default({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
          let jid = jidNormalizedUser(key.remoteJid);
          let msg = await store.loadMessage(jid, key.id);
          return msg?.message || "";
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
      });

      if (pairingCode && !MrRoyal.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api');

        let phoneNumber;
        if (!!phoneNumber) {
          phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

          if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
            console.log(chalk.default.bgBlack(chalk.default.redBright("Start with the country code of your WhatsApp number, Example: +2250799684818")));
            process.exit(0);
          }
        } else {
          phoneNumber = await question(chalk.default.bgBlack(chalk.default.greenBright(`Please type your WhatsApp number\nFor example: +2250799684818 : `)));
          phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

          if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
            console.log(chalk.default.bgBlack(chalk.default.redBright("Start with the country code of your WhatsApp Number, Example: +2250799684818")));

            phoneNumber = await question(chalk.default.bgBlack(chalk.default.greenBright(`Please type your WhatsApp number 😍\nFor example: +2250799684818 : `)));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            rl.close();
          }
        }

        setTimeout(async () => {
          let code = await MznKing.requestPairingCode(phoneNumber);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log(chalk.default.black(chalk.default.bgGreen(`Your pairing code : `)), chalk.default.black(chalk.default.white(code)));
        }, 3000);
      }

      MznKing.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection == "open") {
          await delay(1000 * 10);
          await MrRoyal.sendMessage(MrRoyal.user.id, { text: `👋 Hello there, Welcome to WhatsApp BUGGY-CRASH !\n\n⎆WhatsApp: https://wa.me/+2250799684818\n⎆Github: https://github.com/MznStudios/\n\nDon't forget to follow me on github and contact me on WhatsApp for any helps!\n\nThank you for using MZN Pairing Code.\n` });
          let sessionMzn = fs.default.readFileSync('./session/creds.json');
          await delay(1000 * 2);
          const mznses = await MrRoyal.sendMessage(MrRoyal.user.id, { document: sessionMzn, mimetype: `application/json`, fileName: `creds.json` });
          await MrRoyal.sendMessage(MrRoyal.user.id, { text: `⚠️ *Do not share this file with anybody* ⚠️\n
┌─❖
│ WhatsApp BUGGY-CRASH 🤖
└┬❖  
┌┤✑  Thanks for using MZN Pairing Code.
│└────────────┈     
│© Mr Royal
└─────────────────┈\n` }, { quoted: mznses });
          await delay(1000 * 2);
          process.exit(0);
        }
        if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode != 401
        ) {
          qr();
        }
      });
      MznKing.ev.on('creds.update', saveCreds);
      MznKing.ev.on("messages.upsert", () => { });
    }

    qr();

    process.on('uncaughtException', function (err) {
      let e = String(err);
      if (e.includes("Socket connection timeout")) return;
      if (e.includes("rate-overlimit")) return;
      if (e.includes("Connection Closed")) return;
      if (e.includes("Timed Out")) return;
      if (e.includes("Value not found")) return;
      console.log('Caught exception: ', err);
    });
  } catch (error) {
    console.error("Error importing modules:", error);
  }
})();
