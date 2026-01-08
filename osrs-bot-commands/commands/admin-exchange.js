const {
  SlashCommandBuilder,
  PermissionsBitField
} = require("discord.js");

const {
  getExchange,
  setExchangeRate,
  setServiceGp,
  setBuyGp,
  setSellGp
} = require("../data/exchange");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin-exchange")
    .setDescription("Gerenciar cotações do sistema")

    .addStringOption(opt =>
      opt
        .setName("action")
        .setDescription("Ação desejada")
        .setRequired(true)
        .addChoices(
          { name: "View", value: "view" },
          { name: "Set USD → BRL", value: "set" },
          { name: "Set SERVICE GP", value: "service" },
          { name: "Set BUY GP", value: "buy" },
          { name: "Set SELL GP", value: "sell" }
        )
    )

    .addNumberOption(opt =>
      opt
        .setName("rate")
        .setDescription("Valor da cotação (obrigatório para set/buy/sell/service)")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.editReply("❌ Apenas administradores.");
    }

    const action = interaction.options.getString("action");
    const rate   = interaction.options.getNumber("rate");

    const safe = v => Number(v || 0).toFixed(2);

    /* =========================
       VIEW
    ========================= */
    if (action === "view") {
      const ex = await getExchange();

      return interaction.editReply(
        "```txt\n" +
        `USD → BRL : R$ ${safe(ex.usdBrl)}\n\n` +
        `SERVICE GP: $${safe(ex.serviceGp)} / 1M\n` +
        `BUY GP:     $${safe(ex.buyGp)} / 1M\n` +
        `SELL GP:    $${safe(ex.sellGp)} / 1M\n` +
        "```"
      );
    }

    /* =========================
       SET / BUY / SELL / SERVICE
    ========================= */
    if (!rate || rate <= 0) {
      return interaction.editReply("❌ Informe um valor válido em `rate`.");
    }

    if (action === "set") {
      await setExchangeRate(rate);
      return interaction.editReply(`✅ USD → BRL atualizado para R$ ${rate}`);
    }

    if (action === "service") {
      await setServiceGp(rate);
      return interaction.editReply(`✅ SERVICE GP definido: $${rate} / 1M`);
    }

    if (action === "buy") {
      await setBuyGp(rate);
      return interaction.editReply(`✅ BUY GP definido: $${rate} / 1M`);
    }

    if (action === "sell") {
      await setSellGp(rate);
      return interaction.editReply(`✅ SELL GP definido: $${rate} / 1M`);
    }

    return interaction.editReply("❌ Ação inválida.");
  }
};
