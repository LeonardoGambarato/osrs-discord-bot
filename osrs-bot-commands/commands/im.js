const { google } = require("googleapis");
const { EmbedBuilder } = require("discord.js");

const { getExchange } = require("../data/exchange");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const RANGE = "Ironman_Gathering!A2:F";

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   HELPERS
========================= */
function normalize(str) {
  return str.toLowerCase().trim();
}

/* =========================
   COMANDO !im
========================= */
module.exports = async (message) => {
  try {
    const args = message.content.slice(3).trim().split(" ");

    if (args.length < 2) {
      return message.reply(
        "❌ Use: `!im <item> <quantity>`\nEx: `!im teak 5000`"
      );
    }

    const inputItem = normalize(args[0]);
    const quantity = Number(args[1].replace(/\./g, ""));

    if (isNaN(quantity) || quantity <= 0) {
      return message.reply("❌ Quantidade inválida.");
    }

    /* ===== EXCHANGE (GP RATE) ===== */
    const exchange = await getExchange();
    const gpRate = exchange.serviceGp; // USD por 1M GP

    /* ===== GOOGLE SHEETS ===== */
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    });

    const rows = res.data.values || [];

    const matchedRows = rows.filter(r => {
      const item = normalize(r[0]);
      const aliases = r[1]
        ? r[1].split(",").map(a => normalize(a))
        : [];

      return item === inputItem || aliases.includes(inputItem);
    });

    if (!matchedRows.length) {
      return message.reply("❌ Item não encontrado no Ironman Gathering.");
    }

    const mainItem = matchedRows[0][0];
    const thumbnail = matchedRows[0][5] || null;

    /* ===== EMBED ===== */
    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .addFields(
        {
          name: "📦 Item",
          value: `\`\`\`${mainItem}\`\`\``,
          inline: true
        },
        {
          name: "📊 Quantity",
          value: `\`\`\`${quantity.toLocaleString()}\`\`\``,
          inline: true
        }
      );

    if (thumbnail && thumbnail.startsWith("http")) {
      embed
        .setThumbnail(thumbnail)
        .setAuthor({
          name: "Ironman Gathering Calculator",
          iconURL: thumbnail
        })
    }

    matchedRows.forEach(r => {
      const [, , method, pricePerItem, notes] = r;

      const unitUsd = Number(pricePerItem);
      const totalUsd = unitUsd * quantity;

      const unitGp = gpRate > 0 ? unitUsd / gpRate : 0;
      const totalGp = gpRate > 0 ? totalUsd / gpRate : 0;

      embed.addFields({
        name: `➡ ${method}`,
        value:
          `• Price per item: **$${unitUsd.toFixed(2)} | ${unitGp.toFixed(2)} M GP**\n` +
          `• Total: **💵 $${totalUsd.toFixed(2)} |💵 ${totalGp.toFixed(2)}  M GP**\n` +
          (notes ? ` *Notes: ${notes}*` : ""),
        inline: false
      });
    });

    /* ===== FOOTER ===== */
    embed.setFooter({
      text: message.guild?.name || "Ironman Gathering",
      iconURL: message.guild?.iconURL({ dynamic: true }) || null
    });

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("Erro no comando !im:", err);
    return message.reply("❌ Erro ao calcular Ironman Gathering.");
  }
};
