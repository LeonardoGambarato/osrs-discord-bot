const { google } = require("googleapis");
const { EmbedBuilder } = require("discord.js");
const { getExchange } = require("../data/exchange");

/* =========================
   CONFIG
========================= */

const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const RANGE = "Skills_Data!A2:F";

const ROLE_DISCOUNTS = {
  VIP: 10,
  ELITE: 15,
  PARTNER: 20
};

/* =========================
   SKILL ALIASES
========================= */
const SKILL_ALIASES = {
  attack: ["atk", "att"],
  strength: ["str"],
  defence: ["def"],
  hitpoints: ["hp"],
  ranged: ["range", "rng"],
  prayer: ["pray"],
  magic: ["mage", "mag"],
  runecraft: ["rc", "rune"],
  agility: ["agi"],
  thieving: ["thiev", "thief"],
  slayer: ["slay"],
  farming: ["farm"],
  woodcutting: ["wc", "wood"],
  firemaking: ["fm", "fire"],
  fishing: ["fish"],
  mining: ["mine"],
  smithing: ["smith"],
  crafting: ["craft"],
  herblore: ["herb"],
  fletching: ["fletch"],
  cooking: ["cook"],
  hunter: ["hunt"],
  construction: ["con"],
  sailing: ["sailing"]
};

function normalizeSkill(input) {
  input = input.toLowerCase();
  if (SKILL_ALIASES[input]) return input;

  for (const skill in SKILL_ALIASES) {
    if (SKILL_ALIASES[skill].includes(input)) {
      return skill;
    }
  }
  return null;
}

/* =========================
   IMAGENS
========================= */

// GIF no author (lado esquerdo)
const SKILL_GIFS = {
  attack: "https://oldschool.runescape.wiki/images/Attack_icon.png?format=original",
  strength: "https://oldschool.runescape.wiki/images/Strength_icon.png?format=original",
  defence: "https://oldschool.runescape.wiki/images/Defence_icon.png?format=original",
  hitpoints: "https://oldschool.runescape.wiki/images/Hitpoints_icon.png?format=original",
  ranged: "https://oldschool.runescape.wiki/images/Ranged_icon.png?format=original",
  prayer: "https://oldschool.runescape.wiki/images/Prayer_icon.png?format=original",
  magic: "https://oldschool.runescape.wiki/images/Magic_icon.png?format=original",
  cooking: "https://oldschool.runescape.wiki/images/Cooking_icon.png?format=original",
  woodcutting: "https://oldschool.runescape.wiki/images/Woodcutting_icon.png?format=original",
  fletching: "https://oldschool.runescape.wiki/images/Fletching_icon.png?format=original",
  fishing: "https://oldschool.runescape.wiki/images/Fishing_icon.png?format=original",
  firemaking: "https://oldschool.runescape.wiki/images/Firemaking_icon.png?format=original",
  crafting: "https://oldschool.runescape.wiki/images/Crafting_icon.png?format=original",
  smithing: "https://oldschool.runescape.wiki/images/Smithing_icon.png?format=original",
  mining: "https://oldschool.runescape.wiki/images/Mining_icon.png?format=original",
  herblore: "https://oldschool.runescape.wiki/images/Herblore_icon.png?format=original",
  agility: "https://oldschool.runescape.wiki/images/Agility_icon.png?format=original",
  thieving: "https://oldschool.runescape.wiki/images/Thieving_icon.png?format=original",
  slayer: "https://oldschool.runescape.wiki/images/Slayer_icon.png?format=original",
  farming: "https://oldschool.runescape.wiki/images/Farming_icon.png?format=original",
  runecraft: "https://oldschool.runescape.wiki/images/Runecraft_icon.png?format=original",
  hunter: "https://oldschool.runescape.wiki/images/Hunter_icon.png?format=original",
  construction: "https://oldschool.runescape.wiki/images/Construction_icon.png?format=original",
  sailing: "https://oldschool.runescape.wiki/images/Sailing_icon.png?format=original"
};

// Thumbnail (lado direito)
const SKILL_ICONS = {
  attack: "https://oldschool.runescape.wiki/images/Attack_cape_emote.gif?ca355",
  strength: "https://oldschool.runescape.wiki/images/Strength_cape_emote.gif?62d1a",
  defence: "https://oldschool.runescape.wiki/images/Defence_cape_emote.gif?fc8fe",
  ranged: "https://oldschool.runescape.wiki/images/Ranging_cape_emote.gif?566b2",
  prayer: "https://oldschool.runescape.wiki/images/Prayer_cape_emote.gif?4ba50",
  magic: "https://oldschool.runescape.wiki/images/Magic_cape_emote.gif?79885",
  runecraft: "https://oldschool.runescape.wiki/images/Runecraft_cape_emote.gif?ba5a9",
  construction: "https://oldschool.runescape.wiki/images/Construction_cape_emote.gif?c2bae",
  hitpoints: "https://oldschool.runescape.wiki/images/Hitpoints_cape_emote.gif?8f71c",
  agility: "https://oldschool.runescape.wiki/images/Agility_cape_emote.gif?3af39",
  herblore: "https://oldschool.runescape.wiki/images/Herblore_cape_emote.gif?5e829",
  thieving: "https://oldschool.runescape.wiki/images/Thieving_cape_emote.gif?44d24",
  crafting: "https://oldschool.runescape.wiki/images/Crafting_cape_emote.gif?9d103",
  fletching: "https://oldschool.runescape.wiki/images/Fletching_cape_emote.gif?c6c6f",
  slayer: "https://oldschool.runescape.wiki/images/Slayer_cape_emote.gif?82a25",
  hunter: "https://oldschool.runescape.wiki/images/Hunter_cape_emote.gif?d736a",
  mining: "https://oldschool.runescape.wiki/images/Mining_cape_emote.gif?df949",
  smithing: "https://oldschool.runescape.wiki/images/Smithing_cape_emote.gif?cb6e1",
  fishing: "https://oldschool.runescape.wiki/images/Fishing_cape_emote.gif?41d0c",
  cooking: "https://oldschool.runescape.wiki/images/Cooking_cape_emote.gif?f45fd",
  firemaking: "https://oldschool.runescape.wiki/images/Firemaking_cape_emote.gif?5c8a5",
  woodcutting: "https://oldschool.runescape.wiki/images/Woodcutting_cape_emote.gif?1b924",
  farming: "https://oldschool.runescape.wiki/images/Farming_cape_emote.gif?16a65",
  sailing: "https://oldschool.runescape.wiki/images/Sailing_cape_emote.gif?31f70"
};

/* =========================
   GOOGLE AUTH
========================= */
const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   XP OSRS
========================= */
function getXpForLevel(level) {
  let points = 0;
  let xp = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    xp = Math.floor(points / 4);
  }
  return xp;
}

/* =========================
   DESCONTO POR CARGO
========================= */
const fs = require("fs");
const path = require("path");

const discountPath = path.join(__dirname, "../data/discounts.json");

function getUserDiscount(member) {
  if (!member || !member.roles) return 0;
  if (!fs.existsSync(discountPath)) return 0;

  let discounts = {};
  let maxDiscount = 0;

  try {
    const file = fs.readFileSync(discountPath, "utf8");
    if (!file.trim()) return 0;
    discounts = JSON.parse(file);
  } catch {
    return 0;
  }

  member.roles.cache.forEach(role => {
    if (discounts[role.name]) {
      maxDiscount = Math.max(maxDiscount, discounts[role.name]);
    }
  });

  return maxDiscount;
}

/* =========================
   COMANDO !s
========================= */
module.exports = async (message) => {
  try {
    const args = message.content.trim().split(" ");
    if (args.length < 3) {
      return message.reply("❌ Use: `!s attack 1-99`");
    }

    const skill = normalizeSkill(args[1]);
    if (!skill) {
      return message.reply("❌ Skill inválida ou não reconhecida.");
    }

    const [startLevel, endLevel] = args[2].split("-").map(Number);
    if (
      isNaN(startLevel) ||
      isNaN(endLevel) ||
      startLevel < 1 ||
      endLevel > 99 ||
      startLevel >= endLevel
    ) {
      return message.reply("❌ Levels inválidos.");
    }

    const discountPercent = getUserDiscount(message.member);
    const exchange = await getExchange();
    const gpRate = exchange.serviceGp;

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    });

    const rows = res.data.values || [];
    const methods = {};

    rows.forEach(([rowSkill, method, rowStart, rowEnd, price, description]) => {
      if (!rowSkill || !method || !rowStart || !rowEnd || !price) return;
      if (rowSkill.trim().toLowerCase() !== skill) return;

      const s = Number(rowStart);
      const e = Number(rowEnd);
      const p = Number(price);
      if (isNaN(s) || isNaN(e) || isNaN(p)) return;

      if (startLevel < e && endLevel > s) {
        const cs = Math.max(startLevel, s);
        const ce = Math.min(endLevel, e);
        const xp = getXpForLevel(ce) - getXpForLevel(cs);

        let cost = xp * p;
        cost -= cost * (discountPercent / 100);

        if (!methods[method]) {
          methods[method] = { lines: [], total: 0 };
        }

        const usdPerXp = p;
const gpPerXp = gpRate > 0 ? (p / gpRate) : 0;

methods[method].lines.push(
  `<:skill_icon:1456031159027892224> **${cs}–${ce}** – ${description || method} – **$${usdPerXp.toFixed(6)}** \`${xp.toLocaleString()} XP\``
);

        methods[method].total += cost;
      }
    });

    if (Object.keys(methods).length === 0) {
      return message.reply("❌ Nenhum método encontrado.");
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${skill.charAt(0).toUpperCase() + skill.slice(1)} Calculator`,
        iconURL: SKILL_GIFS[skill] || SKILL_GIFS.attack
      })
      .setColor(0x00b3ff)
      .setThumbnail(SKILL_ICONS[skill] || SKILL_ICONS.attack)
      .addFields(
        { name: "🟢 Start Level", value: "```" + startLevel + "```", inline: true },
        { name: "🔴 End Level", value: "```" + endLevel + "```", inline: true },
        {
          name: "🎟️ Discount",
          value: "```" + (discountPercent > 0 ? discountPercent + "%" : "None") + "```",
          inline: true
        }
      )
      .setFooter({
        text: `${message.guild?.name || "Avernic Store"} by Enele and Neto.`,
        iconURL: message.guild?.iconURL({ dynamic: true })
      })
      .setTimestamp();

    for (const method in methods) {
      const totalUsd = methods[method].total;
      const totalGp = gpRate > 0 ? (totalUsd / gpRate) : 0;

      embed.addFields({
        name: `➡ __**${method}**__`,
        value:
          `${methods[method].lines.join("\n")}\n\n` +
          `💵  **TOTAL:** **$${totalUsd.toFixed(2)} | ${totalGp.toFixed(2)} M GP**`,
        inline: false
      });
    }

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("ERRO REAL:", err);
    return message.reply("❌ Erro ao calcular.");
  }
};
