const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

/* =========================
   MENU PRINCIPAL INFERNO
========================= */
function buildInfernoMenu() {
  const embed = new EmbedBuilder()
    .setTitle("🔥 Inferno Services")
    .setDescription(
      "Choose your Inferno service below:\n\n" +
      "• Maxed Account\n" +
      "• Zerker Account\n" +
      "• Pure Account\n" +
      "• 6 Jads Challenge"
    )
    .setColor(0xc0392b)
    .setThumbnail(
      "https://oldschool.runescape.wiki/images/Infernal_cape_detail.png?format=original"
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("inferno_maxed")
      .setLabel("Maxed Account")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("inferno_zerker")
      .setLabel("Zerker Account")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("inferno_pure")
      .setLabel("Pure Account")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("inferno_6jads")
      .setLabel("6 Jads")
      .setStyle(ButtonStyle.Danger)
  );

  return { embed, components: [row] };
}

/* =========================
   EXPORTA FUNÇÃO (OBRIGATÓRIO)
========================= */
module.exports = async (message) => {
  const { embed, components } = buildInfernoMenu();

  return message.reply({
    embeds: [embed],
    components
  });
};

/* =========================
   EXPORTA BUILDER (USADO NOS BOTÕES)
========================= */
module.exports.buildInfernoMenu = buildInfernoMenu;