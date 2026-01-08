const { google } = require("googleapis");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { getExchange } = require("../data/exchange");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const QUEST_RANGE = "Quests_Data!A2:E";

const discountPath = path.join(__dirname, "../data/discounts.json");

const QUEST_THUMBNAIL =
  "https://oldschool.runescape.wiki/images/Quests.png?f5120";

const FOOTER_TEXT = "Avernic Store • Quest Services • Discount by rank";

/* =========================
   GOOGLE AUTH
========================= */
const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   CACHE
========================= */
let questCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

function isCacheValid() {
  return questCache && Date.now() - cacheTimestamp < CACHE_TTL;
}

/* =========================
   DESCONTO POR RANK
========================= */
function getUserDiscount(member) {
  if (!member || !member.roles) return 0;
  if (!fs.existsSync(discountPath)) return 0;

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
   LOAD QUESTS
========================= */
async function loadQuests(sheets) {
  if (isCacheValid()) return questCache;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: QUEST_RANGE
  });

  questCache = res.data.values || [];
  cacheTimestamp = Date.now();
  return questCache;
}

/* =========================
   COMANDO !q
========================= */
module.exports = async (message) => {
  try {
    const raw = message.content.slice(2).trim();
    if (!raw) {
      return message.reply("❌ Use: `!q quest name` ou `!q q1, q2, q3`");
    }

    const queries = raw
      .split(",")
      .map(q => q.trim().toLowerCase())
      .filter(Boolean);

    const discountPercent = getUserDiscount(message.member);

    const exchange = await getExchange();
    const gpRate = exchange.serviceGp; // USD por 1M GP

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const questRows = await loadQuests(sheets);

    let totalPriceUsd = 0;
    let totalPriceGp = 0;

    const requestedQuestLines = [];
    const invalidQuests = [];
    const requirements = new Set();

    for (const input of queries) {
      const quest = questRows.find(r => {
        if (!r || !r[0]) return false;

        const name = r[0].toLowerCase();
        const aliases = r[1]
          ? r[1].split(",").map(a => a.trim().toLowerCase())
          : [];

        return name === input || aliases.includes(input);
      });

      if (!quest) {
        invalidQuests.push(input);
        continue;
      }

      const [name, , , price, req] = quest;

      const priceUsd = Number(price);
      const priceGp = gpRate > 0 ? priceUsd / gpRate : 0;

      totalPriceUsd += priceUsd;
      totalPriceGp += priceGp;

      if (req && req.toLowerCase() !== "none") {
        requirements.add(req);
      }

      requestedQuestLines.push(
        `• *${name}* → $${priceUsd.toFixed(2)} | ${priceGp.toFixed(2)} M GP`
      );
    }

    if (requestedQuestLines.length === 0) {
      return message.reply("❌ Nenhuma quest válida encontrada.");
    }

    if (discountPercent > 0) {
      totalPriceUsd -= totalPriceUsd * (discountPercent / 100);
      totalPriceGp -= totalPriceGp * (discountPercent / 100);
    }

    /* =========================
       EMBED
    ========================= */
    const embed = new EmbedBuilder()
      .setTitle("📜 Quest Package Calculator")
      .setThumbnail(QUEST_THUMBNAIL)
      .setColor(0x9b59b6)
      .setTimestamp();

    // Requested Quests (COM PREÇO)
    embed.addFields({
      name: "**Requested Quests**",
      value: requestedQuestLines.join("\n"),
      inline: false
    });

    // Invalid Quests (se existir)
    if (invalidQuests.length > 0) {
      embed.addFields({
        name: "**Invalid Quests**",
        value: invalidQuests.map(q => `• ${q}`).join("\n"),
        inline: false
      });
    }

    // Totais
    embed.addFields(
      {
        name: "💰 Total Price",
        value: `\`\`\`$${totalPriceUsd.toFixed(2)} | ${totalPriceGp.toFixed(2)} M GP\`\`\``,
        inline: true
      },
      {
        name: "🎟️ Discount (Rank)",
        value: `\`\`\`${discountPercent > 0 ? discountPercent + "%" : "None"}\`\`\``,
        inline: true
      },
      {
        name: "📦 Requirements",
        value: `\`\`\`${requirements.size > 0 ? [...requirements].join("\n") : "None"}\`\`\``,
        inline: false
      }
    );

    embed.setFooter({
      text: `${message.guild?.name || FOOTER_TEXT}`,
      iconURL: message.guild?.iconURL({ dynamic: true, size: 128 }) || null
    });

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("Erro no comando !q:", err);
    return message.reply("❌ Erro ao calcular o pacote de quests.");
  }
};