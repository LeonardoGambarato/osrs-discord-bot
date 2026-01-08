const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { google } = require("googleapis");

const { buildQuiverMenu } = require("./quiver");

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
  "https://oldschool.runescape.wiki/images/Dizana%27s_quiver.png?format=original";

const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const RANGE = "Quiver_Products!A2:G";
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

  /* =========================
     BOTÃO BACK (MENU)
  ========================= */
  if (interaction.isButton() && interaction.customId === "quiver_menu") {
    const { embed, components } = buildQuiverMenu();
    return interaction.update({ embeds: [embed], components });
  }

  /* =========================
     BOTÃO PRODUTO
  ========================= */
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("quiver_") &&
    interaction.customId !== "quiver_menu"
  ) {
    const key = interaction.customId.replace("quiver_", "");

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
      .setCustomId(`quiver_select_${key}`)
      .setPlaceholder("Select your account type");

    products.forEach(p => {
      const gear = p[2];
      const price = parsePrice(p[3]);

      select.addOptions({
        label: gear,
        description: `$${price.toFixed(2)}`,
        value: `${key}|${gear}`
      });
    });

    const embed = new EmbedBuilder()
      .setTitle(productName)
      .setColor(0x2ecc71)
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
            .setCustomId("quiver_menu")
            .setLabel("⬅️ Back")
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });
  }

  /* =========================
     SELECT MENU (ACCOUNT TYPE)
  ========================= */
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("quiver_select_")
  ) {
    const value = interaction.values[0];

    if (!value.includes("|")) {
      return interaction.reply({
        content: "❌ Invalid selection.",
        ephemeral: true
      });
    }

    const [key, gear] = value.split("|");

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
        content: "❌ Option not found.",
        ephemeral: true
      });
    }

    const [, productName, , priceRaw, notes, thumbnail, image] = product;
    const price = parsePrice(priceRaw);

    const embed = new EmbedBuilder()
      .setTitle(productName)
      .setColor(0x16a085)
      .setThumbnail(safeUrl(thumbnail, DEFAULT_THUMBNAIL))
      .setImage(safeUrl(image))
      .addFields(
        {
          name: "⚙️ Account Type",
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
