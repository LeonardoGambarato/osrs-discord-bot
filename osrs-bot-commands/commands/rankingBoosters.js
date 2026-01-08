const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopBoosters } = require("../data/walletBoosters");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Mostrar rankings")
    .addSubcommand(sub =>
      sub
        .setName("boosters")
        .setDescription("Ranking dos boosters por ganhos")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const boosters = await getTopBoosters(10);

    if (!boosters || boosters.length === 0) {
      return interaction.editReply(
        "❌ Nenhum booster encontrado no ranking."
      );
    }

    let description = "";
    const medals = ["🥇", "🥈", "🥉"];

    boosters.forEach((b, index) => {
      const medal = medals[index] ?? `#${index + 1}`;
      description +=
        `${medal} <@${b.discord_id}> — **R$${Number(b.total_earned).toFixed(2)}**\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏆 Ranking dos Boosters")
      .setColor("#f1c40f")
      .setDescription(description)
      .setFooter({
        text: `Atualizado em tempo real`
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
