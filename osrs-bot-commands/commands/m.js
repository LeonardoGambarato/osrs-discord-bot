const { google } = require("googleapis");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { getExchange } = require("../data/exchange");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const DATA_RANGE = "Minigames_Data!A2:F";

const discountPath = path.join(__dirname, "../data/discounts.json");

const MINIGAME_ICON =
  "https://oldschool.runescape.wiki/images/Minigame_icon.png?format=original";

/* =========================
   GOOGLE AUTH
========================= */
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

function parsePrice(value) {
  if (!value) return 0;
  const clean = value.toString().replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/* =========================
   DESCONTO
========================= */
function getUserDiscount(member) {
  if (!member || !member.roles || !fs.existsSync(discountPath)) return 0;

  let discounts = {};
  let max = 0;

  try {
    discounts = JSON.parse(fs.readFileSync(discountPath, "utf8"));
  } catch {
    return 0;
  }

  member.roles.cache.forEach(role => {
    if (discounts[role.name]) {
      max = Math.max(max, discounts[role.name]);
    }
  });

  return max;
}

/* =========================
   COMANDO !m
========================= */
module.exports = async (message) => {
  try {
    const args = message.content.trim().split(/\s+/).slice(1);
    if (!args.length) {
      return message.reply("❌ Use: `!m pc` ou `!m pc 1000`");
    }

    const minigameInput = normalize(args[0]);
    const amount = args[1] ? Number(args[1]) : 1;

    if (isNaN(amount) || amount <= 0) {
      return message.reply("❌ Quantidade inválida.");
    }

    const discount = getUserDiscount(message.member);

    const exchange = await getExchange();
    const gpRate = exchange.serviceGp; // USD por 1M GP

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: DATA_RANGE
    });

    const rows = res.data.values || [];

    const methods = rows.filter(r => {
      const name = normalize(r[0]);
      const aliases = r[1]
        ? r[1].split(",").map(a => normalize(a))
        : [];
      return name === minigameInput || aliases.includes(minigameInput);
    });

    if (!methods.length) {
      return message.reply("❌ Minigame não encontrado.");
    }

    const thumbnail = methods[0][5];

    /* =========================
       EMBED
    ========================= */
    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Minigames Calculator",
        iconURL: MINIGAME_ICON
      })
      .setColor(0x2ecc71)
      .setThumbnail(thumbnail || MINIGAME_ICON)
      .addFields(
        {
          name: "Minigame",
          value: `\`\`\`${methods[0][0]}\`\`\``,
          inline: true
        },
        {
          name: "Discount",
          value: `\`\`\`${discount ? discount + "%" : "None"}\`\`\``,
          inline: true
        },
        {
          name: "Amount",
          value: `\`\`\`${amount}\`\`\``,
          inline: true
        }
      );

    methods.forEach(r => {
      const [, , method, unit, price] = r;

      let costUsd = parsePrice(price) * amount;
      if (discount > 0) {
        costUsd -= costUsd * (discount / 100);
      }

      const costGp = gpRate > 0 ? costUsd / gpRate : 0;

      embed.addFields({
        name: `➡ __**${method}**__`,
        value:
          `\`Price per ${unit}\`\n` +
          `💵 **$${costUsd.toFixed(2)}** | 🪙 **${costGp.toFixed(2)} M GP**`,
        inline: false
      });
    });

    embed
      .setFooter({
        text: `${message.guild?.name || "Avernic Store"} by Enele and Neto.`,
        iconURL: message.guild?.iconURL({ dynamic: true }) || null
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("Erro no comando !m:", err);
    return message.reply("❌ Erro ao calcular minigame.");
  }
};
