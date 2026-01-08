const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { google } = require("googleapis");

const { getExchange } = require("../data/exchange");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const RANGE = "Diaries_Data!A2:G";

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
  if (diaryCache && Date.now() - cacheTime < CACHE_TTL) {
    return diaryCache;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE
  });

  diaryCache = res.data.values || [];
  cacheTime = Date.now();
  return diaryCache;
}

/* =========================
   BUTTON HANDLER
========================= */
module.exports.handleButton = async (interaction) => {
  const diaryKey = interaction.customId.replace("diary_", "").toLowerCase();

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const rows = await loadDiaryData(sheets);

  const diaries = rows.filter(r => r[0]?.toLowerCase() === diaryKey);

  if (!diaries.length) {
    return interaction.reply({
      content: "❌ Diary not found.",
      ephemeral: true
    });
  }

  const exchange = await getExchange();
  const gpRate = exchange.serviceGp; // USD por 1M GP

  const diaryName = diaries[0][0];
  const thumbnail = diaries[0][5];

  /* =========================
     EMBED
  ========================= */
  const embed = new EmbedBuilder()
    .setAuthor({
      name: diaryName,
      iconURL: thumbnail
    })
    .setThumbnail(thumbnail)
    .setColor(0x3498db);

  diaries.forEach(r => {
    const [, tier, , price, notes] = r;

    const priceUsd = Number(price);
    const priceGp = gpRate > 0 ? priceUsd / gpRate : 0;

    let value =
      `💵 **$${priceUsd.toFixed(2)}**` +
      ` | 🪙 **${priceGp.toFixed(2)} M **`;

    if (notes && notes.trim().toLowerCase() !== "none") {
      value += `\n *${notes}*`;
    }

    embed.addFields({
      name: ` ${tier.toUpperCase()}`,
      value,
      inline: false
    });
  });

  embed.setFooter({
    text: `${interaction.guild?.name || "Avernic Store"} • Diary Services`,
    iconURL: interaction.guild?.iconURL({ dynamic: true, size: 128 })
  });

  /* =========================
     BOTÕES (4 POR LINHA)
  ========================= */
  const diaryNames = [...new Set(rows.map(r => r[0]))];

  const components = [];
  let row = new ActionRowBuilder();

  diaryNames.forEach((name, index) => {
    if (index > 0 && index % 4 === 0) {
      components.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`diary_${name.toLowerCase()}`)
        .setLabel(name)
        .setStyle(
          name.toLowerCase() === diaryKey
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        )
    );
  });

  if (row.components.length) {
    components.push(row);
  }

  return interaction.update({
    embeds: [embed],
    components
  });
};
