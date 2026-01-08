const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { google } = require("googleapis");

const { buildInfernoMenu } = require("./inferno");

/* =========================
   HELPERS
========================= */
function safeUrl(url, fallback = null) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return fallback;
  }
  return url;
}

function parsePrice(value) {
  if (!value) return 0;
  const clean = value
    .toString()
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/* =========================
   CONFIG
========================= */
const DEFAULT_THUMBNAIL =
  "https://oldschool.runescape.wiki/images/Infernal_cape_detail.png?format=original";

const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const RANGE = "Inferno_Products!A2:G";
/*
A key
B product_name
C gear
D price
E notes
F thumbnail
G image
*/

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   HANDLER
========================= */
module.exports = async (interaction) => {

  /* ===== BOTÃO BACK ===== */
  if (interaction.isButton() && interaction.customId === "inferno_menu") {
    const { embed, components } = buildInfernoMenu();
    return interaction.update({ embeds: [embed], components });
  }

  /* ===== BOTÃO PRODUTO ===== */
  if (interaction.isButton() && interaction.customId.startsWith("inferno_")) {
    const key = interaction.customId.replace("inferno_", "");

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    });

    const rows = res.data.values || [];
    const products = rows.filter(r => r[0] === key);

    if (!products.length) {
      return interaction.reply({
        content: "❌ Product not found.",
        ephemeral: true
      });
    }

    const [, productName, , , notes, thumbnail, image] = products[0];

    /* ===== SELECT MENU ===== */
    const select = new StringSelectMenuBuilder()
      .setCustomId(`inferno_select_${key}`)
      .setPlaceholder("Select your gear");

    products.forEach(p => {
      const gear = p[2];
      const price = parsePrice(p[3]);

      select.addOptions({
        label: gear,
        description: `$${price.toFixed(2)}`,
        value: `${key}|${gear}` // ✅ FIX
      });
    });

    const embed = new EmbedBuilder()
      .setTitle(productName)
      .setColor(0xc0392b)
      .setThumbnail(safeUrl(thumbnail, DEFAULT_THUMBNAIL))
      .setImage(safeUrl(image))
      .addFields({
        name: "⚠️ Notes",
        value: `\`\`\`${notes || "None"}\`\`\``,
        inline: false
      });

    return interaction.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("inferno_menu")
            .setLabel("⬅️ Back")
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });
  }

  /* ===== SELECT MENU (GEAR) ===== */
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("inferno_select_")
  ) {
    const [key, gear] = interaction.values[0].split("|");

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    });

    const rows = res.data.values || [];
    const product = rows.find(
      r => r[0] === key && r[2] === gear
    );

    if (!product) {
      return interaction.reply({
        content: "❌ Gear not found.",
        ephemeral: true
      });
    }

    const [, productName, , priceRaw, notes, thumbnail, image] = product;
    const price = parsePrice(priceRaw);

    const embed = new EmbedBuilder()
      .setTitle(productName)
      .setColor(0xe67e22)
      .setThumbnail(safeUrl(thumbnail, DEFAULT_THUMBNAIL))
      .setImage(safeUrl(image))
      .addFields(
        {
          name: "⚙️ Gear",
          value: `\`\`\`${gear}\`\`\``,
          inline: true
        },
        {
          name: "💰 Price",
          value: `\`\`\`$${price.toFixed(2)}\`\`\``,
          inline: true
        },
        {
          name: "⚠️ Notes",
          value: `\`\`\`${notes || "None"}\`\`\``,
          inline: false
        }
      );

    return interaction.update({
      embeds: [embed],
      components: interaction.message.components
    });
  }
};
