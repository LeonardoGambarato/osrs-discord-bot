const {
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { google } = require("googleapis");

/* =========================
   🔒 PERMISSÕES
========================= */
const ALLOWED_ROLE_IDS = [
  "1453203651941372086",
  "987654321098765432"
];

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const MAIN_RANGE = "panel_main!A2:D";
const SUB_RANGE = "panel_sub!A2:E";
const CHUNK_SIZE = 5;

/* =========================
   CACHE
========================= */
const sheetCache = {
  main: null,
  sub: null,
  lastFetch: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/* =========================
   GOOGLE AUTH
========================= */
const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   EMOJI PARSER
========================= */
function parseEmoji(emoji) {
  if (!emoji) return undefined;

  emoji = emoji.trim();

  // emoji custom <:name:id> ou <a:name:id>
  const match = emoji.match(/^<a?:\w+:(\d+)>$/);
  if (match) return { id: match[1] };

  // emoji unicode
  if (emoji.length <= 2) return emoji;

  return undefined;
}

/* =========================
   GET SHEETS COM CACHE
========================= */
async function getSheetsData(sheets) {
  const now = Date.now();

  if (
    sheetCache.main &&
    sheetCache.sub &&
    now - sheetCache.lastFetch < CACHE_DURATION
  ) {
    return {
      main: sheetCache.main,
      sub: sheetCache.sub
    };
  }

  const [mainRes, subRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: MAIN_RANGE
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SUB_RANGE
    })
  ]);

  sheetCache.main = mainRes.data.values || [];
  sheetCache.sub = subRes.data.values || [];
  sheetCache.lastFetch = now;

  console.log("🔄 Cache do Sheets atualizado");

  return {
    main: sheetCache.main,
    sub: sheetCache.sub
  };
}

/* =========================
   COMMAND !dropdown
========================= */
module.exports = async (message) => {
  /* =========================
     🔒 CHECK DE PERMISSÃO
  ========================= */
  const hasRole = message.member.roles.cache.some(role =>
    ALLOWED_ROLE_IDS.includes(role.id)
  );

  if (!hasRole) {
    return message.reply("❌ Você não tem permissão para usar este comando.");
  }

  /* =========================
     GOOGLE SHEETS
  ========================= */
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const { main, sub } = await getSheetsData(sheets);

  if (!main.length) {
    return message.reply("❌ panel_main vazio.");
  }

  // ordena pelo campo order
  main.sort((a, b) => Number(a[3]) - Number(b[3]));

  /* =========================
     🖼️ BANNER DO SERVIDOR
  ========================= */
  const banner = message.guild.bannerURL({
    size: 4096,
    extension: "png"
  });

  if (banner) {
    await message.channel.send({ files: [banner] });
  }

  /* =========================
     CRIA TODOS OS MENUS
  ========================= */
  const rows = [];

  for (const [id, label] of main) {
    const items = sub.filter(r => r[0] === id);
    if (!items.length) continue;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`submenu_${id}`)
      .setPlaceholder(`${label} - Click Here`);

    items.forEach(r => {
      const [, value, itemLabel, desc, emoji] = r;

      menu.addOptions({
        label: itemLabel,
        value: `${id}:${value}`,
        description: desc || undefined,
        emoji: parseEmoji(emoji)
      });
    });

    rows.push(new ActionRowBuilder().addComponents(menu));
  }

  /* =========================
     📦 ENVIO EM BLOCOS DE 5
  ========================= */
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    await message.channel.send({
      components: chunk
    });
  }
};
