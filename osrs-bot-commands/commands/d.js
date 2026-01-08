const { google } = require("googleapis");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const DATA_RANGE = "Diaries_Data!A2:G";

const DEFAULT_THUMBNAIL =
  "https://oldschool.runescape.wiki/images/Achievement_Diary_icon.png?format=original";

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   CACHE
========================= */
let diaryCache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

async function loadDiaryData(sheets) {
  if (diaryCache && Date.now() - cacheTime < CACHE_TTL) return diaryCache;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: DATA_RANGE
  });

  diaryCache = res.data.values || [];
  cacheTime = Date.now();
  return diaryCache;
}

/* =========================
   COMMAND !d
========================= */
module.exports = async (message) => {
  try {
    const raw = message.content.slice(2).trim();

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const rows = await loadDiaryData(sheets);

    /* =========================
       MENU PRINCIPAL (!d)
    ========================= */
    if (!raw) {
      const diaryNames = [...new Set(rows.map(r => r[0]))];

      const components = [];
let row = new ActionRowBuilder();

diaryNames.slice(0, 25).forEach((name, i) => {
  if (i > 0 && i % 4 === 0) { // 4 botões por linha
    components.push(row);
    row = new ActionRowBuilder();
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`diary_${name.toLowerCase()}`)
      .setLabel(name)
      .setStyle(ButtonStyle.Secondary) // ✅ SECONDARY
  );
});

if (row.components.length > 0) {
  components.push(row);
}

      const embed = new EmbedBuilder()
        .setTitle("📘 Achievement Diary Calculator")
        .setDescription("Select a diary below:")
        .setThumbnail(DEFAULT_THUMBNAIL)
        .setColor(0x3498db)
        .setFooter({
          text: `${message.guild?.name || "Avernic Store"} • Diary Services`,
          iconURL: message.guild?.iconURL({ dynamic: true, size: 128 }) || undefined
        });

      return message.reply({
        embeds: [embed],
        components
      });
    }

    /* =========================
       BLOQUEIO DE USO INCORRETO
    ========================= */
    return message.reply(
      "❌ Use apenas `!d` e selecione o diary pelos botões."
    );

  } catch (err) {
    console.error("Erro no comando !d:", err);
    return message.reply("❌ Erro ao carregar os diaries.");
  }
};



