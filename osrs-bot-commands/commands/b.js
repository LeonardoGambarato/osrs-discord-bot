const { google } = require("googleapis");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { getExchange } = require("../data/exchange");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const DATA_RANGE = "Pvm_Data!A2:G";

const discountPath = path.join(__dirname, "../data/discounts.json");

const DEFAULT_THUMBNAIL =
  "https://oldschool.runescape.wiki/images/Boss_icon.png?format=original";

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
let pvmCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

function isCacheValid() {
  return pvmCache && Date.now() - cacheTimestamp < CACHE_TTL;
}

async function loadPvmData(sheets) {
  if (isCacheValid()) return pvmCache;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: DATA_RANGE
  });

  pvmCache = res.data.values || [];
  cacheTimestamp = Date.now();
  return pvmCache;
}

/* =========================
   HELPERS
========================= */
function safeThumbnail(url, fallback) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return fallback;
  }
  return url;
}

function matchesBoss(input, bossName, aliases) {
  const i = input.toLowerCase();
  if (bossName.toLowerCase() === i) return true;

  if (!aliases) return false;

  return aliases
    .split(",")
    .map(a => a.trim().toLowerCase())
    .includes(i);
}

/* =========================
   DISCOUNT
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
   COMMAND !b
========================= */
module.exports = async (message) => {
  try {
    const raw = message.content.slice(2).trim();
    if (!raw) {
      return message.reply("❌ Use: `!b zulrah` ou `!b zulrah kc 50`");
    }

    const discount = getUserDiscount(message.member);

    const exchange = await getExchange();
    const gpRate = exchange.serviceGp;

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const rows = await loadPvmData(sheets);

    const parts = raw.split(" ").filter(Boolean);

    const bossInput = parts[0].toLowerCase();
    const amount =
      parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))
        ? Number(parts[parts.length - 1])
        : 1;

    const methods = rows.filter(r =>
      matchesBoss(bossInput, r[0], r[6])
    );

    if (!methods.length) {
      return message.reply("❌ Boss não encontrado.");
    }

    const bossName = methods[0][0];
    const thumbnail = safeThumbnail(methods[0][5], DEFAULT_THUMBNAIL);
    const bossNotes =
      methods.map(r => r[4]).find(n => n && n.trim()) || null;

    /* =========================
       EMBED (ÚNICO MODELO)
    ========================= */
    const embed = new EmbedBuilder()
      .setAuthor({
        name: "PvM Calculator",
        iconURL: thumbnail
      })
      .setColor(0xe74c3c)
      .setThumbnail(thumbnail)
      .addFields(
        {
          name: "👑 Boss",
          value: `\`\`\`${bossName}\`\`\``,
          inline: true
        },
        {
          name: "🎟️ Discount",
          value: `\`\`\`${discount ? discount + "%" : "None"}\`\`\``,
          inline: true
        },
        {
          name: "📦 Amount",
          value: `\`\`\`${amount}\`\`\``,
          inline: true
        }
      );

    methods.forEach(r => {
      const [, method, unit, price] = r;

      let priceUsd = Number(price) * amount;
      if (discount > 0) priceUsd -= priceUsd * (discount / 100);

      const priceGp = gpRate > 0 ? priceUsd / gpRate : 0;

      embed.addFields({
        name: `**${method}**`,
        value:
          "`Price per " +
          unit.toLowerCase() +
          "`\n💰 **$" +
          priceUsd.toFixed(2) +
          "** | 🪙 **" +
          priceGp.toFixed(2) +
          " M GP**",
        inline: false
      });
    });

    if (bossNotes) {
      embed.addFields({
        name: "Upcharge Information",
        value: bossNotes,
        inline: false
      });
    }

    embed
      .setFooter({
        text: `${message.guild?.name || "Avernic Store"} • PvM Services`,
        iconURL:
          message.guild?.iconURL({ dynamic: true, size: 128 }) || undefined
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("Erro no comando !b:", err);
    return message.reply("❌ Erro ao calcular PvM.");
  }
};
