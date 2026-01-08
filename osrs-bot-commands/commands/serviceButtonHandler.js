const {
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { google } = require("googleapis");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

/* =========================
   HANDLER (BOTÕES)
========================= */
module.exports = async (interaction, client) => {
  if (!interaction.isButton()) return;

  // inferno_maxed → ["inferno", "maxed"]
  const [type, key] = interaction.customId.split("_");
  if (!type || !key) return;

  const sheetName =
    type === "inferno" ? "Inferno_Products" :
    type === "quiver" ? "Quiver_Products" :
    null;

  if (!sheetName) return;

  await interaction.deferReply({ ephemeral: true });

  // ⚠️ NÃO usar "client" aqui
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:I`
  });

  const rows = res.data.values || [];
  const items = rows.filter(r => r[0] === key);

  if (!items.length) {
    return interaction.editReply("❌ Serviço não encontrado no Sheets.");
  }

  /* =========================
     SELECT MENU
  ========================= */
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`submenu_${key}`)
    .setPlaceholder("Select an option");

  items.forEach(r => {
    const [, label, gear, price, notes] = r;

    menu.addOptions({
      label: `${label} (${gear})`,
      value: `${key}:${gear}`,
      description: `$${price}${notes ? " • " + notes : ""}`.slice(0, 100)
    });
  });

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.editReply({
    components: [row]
  });
};
