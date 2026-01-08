const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

/* =========================
   MENU PRINCIPAL – QUIVER
========================= */
function buildQuiverMenu() {
  const embed = new EmbedBuilder()
    .setTitle("🏹 Quiver Services")
    .setColor(0x27ae60)
    .setDescription(
      "Choose your **Quiver service** below:\n\n" +
      "• Main Account\n" +
      "• Zerker Account\n" +
      "• Pure Account"
    )
    .setThumbnail(
      "https://oldschool.runescape.wiki/images/Dizana%27s_quiver.png?format=original"
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("quiver_main")
      .setLabel("Main account")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("quiver_zerker")
      .setLabel("Zerker Account")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("quiver_pure")
      .setLabel("Pure Account")
      .setStyle(ButtonStyle.Success)
  );

  return { embed, components: [row] };
}

/* =========================
   COMANDO !quiver
========================= */
module.exports = async (message) => {
  const { embed, components } = buildQuiverMenu();

  return message.reply({
    embeds: [embed],
    components
  });
};

/* =========================
   EXPORTA BUILDER (BOTÕES)
========================= */
module.exports.buildQuiverMenu = buildQuiverMenu;

