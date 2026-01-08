const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { google } = require("googleapis");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
const SUB_RANGE = "panel_sub!A2:H";
const MAIN_RANGE = "panel_main!A2:D";

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   HELPERS
========================= */
function safeUrl(url) {
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

function parseEmoji(emoji) {
  if (!emoji) return undefined;

  emoji = emoji.trim();

  const match = emoji.match(/^<a?:\w+:(\d+)>$/);
  if (match) return { id: match[1] };

  if (emoji.length <= 2) return emoji;

  return undefined;
}

/* =========================
   HANDLER
========================= */
module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.customId.startsWith("submenu_")) return;

  await interaction.deferUpdate();

  // value = parent:item
  const [menuId, itemValue] = interaction.values[0].split(":");

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const [subRes, mainRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SUB_RANGE
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: MAIN_RANGE
    })
  ]);

  const subs = subRes.data.values || [];
  const mains = mainRes.data.values || [];

  const menuInfo = mains.find(r => r[0] === menuId);
  if (!menuInfo) return;

  const [, menuLabel] = menuInfo;

  const items = subs.filter(r => r[0] === menuId);
  const selectedItem = items.find(r => r[1] === itemValue);
  if (!selectedItem) return;

  /* =========================
     🔁 RECRIA MENU (PLACEHOLDER FIXO)
  ========================= */
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`submenu_${menuId}`)
    .setPlaceholder(`${menuLabel} - Click Here`);

  items.forEach(r => {
    const [, value, label, desc, emoji] = r;

    menu.addOptions({
      label,
      value: `${menuId}:${value}`,
      description: desc || undefined,
      emoji: parseEmoji(emoji)
    });
  });

  const row = new ActionRowBuilder().addComponents(menu);

  /* =========================
     📄 EMBED EPHEMERAL
  ========================= */
  const [
    ,
    ,
    label,
    shortDesc,
    ,
    embedTitle,
    embedDescription,
    thumbnail,
    footer
  ] = selectedItem;

  const embed = new EmbedBuilder()
    .setTitle(embedTitle || label)
    .setDescription(embedDescription || shortDesc || "No description.")
    .setThumbnail(safeUrl(thumbnail))
    .setImage(
    interaction.guild?.bannerURL({ size: 1024 }) ||
    "https://media.discordapp.net/attachments/1359227461254254642/1360285806572470392/banner_advertisement.gif?ex=69554ae1&is=6953f961&hm=d42e08f58db8f68c2e0940f7b806a2833f5d9c969c536e314cbd6a12a653e4b9&="
  )
    .setColor(0x9b59b6)
    .setFooter({
  text: interaction.guild?.name || "Avernic Store",
  iconURL: interaction.guild?.iconURL({ dynamic: true })
});

  await interaction.followUp({
    embeds: [embed],
    ephemeral: true
  });

  /* =========================
     🔒 ATUALIZA MENU (SEM TROCAR TEXTO)
  ========================= */
  return interaction.editReply({
    components: interaction.message.components.map(c =>
      c.components[0].customId === `submenu_${menuId}` ? row : c
    )
  });
};