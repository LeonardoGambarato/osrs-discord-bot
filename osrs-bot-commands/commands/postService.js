const {
  SlashCommandBuilder,
  PermissionsBitField
} = require("discord.js");

const { getClient } = require("../data/walletClients");
const { getExchange } = require("../data/exchange");

const DEFAULT_COMMISSION_PERCENT = 25;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("post-service")
    .setDescription("Postar um novo serviço")
    .addStringOption(o =>
      o.setName("service").setDescription("Serviço").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("quantity").setDescription("Quantidade").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("payment")
        .setDescription("Forma de pagamento")
        .setRequired(true)
        .addChoices(
          { name: "USD", value: "usd" },
          { name: "GP", value: "gp" }
        )
    )
    .addNumberOption(o =>
      o.setName("price")
        .setDescription("Preço (USD ou M GP)")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("client").setDescription("Cliente").setRequired(true)
    )
    .addNumberOption(o =>
      o.setName("commission").setDescription("Comissão (%)")
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

    const service = interaction.options.getString("service");
    const quantity = interaction.options.getInteger("quantity");
    const payment = interaction.options.getString("payment");
    const priceInput = interaction.options.getNumber("price");
    const clientUser = interaction.options.getUser("client");

    const commissionPercent =
      interaction.options.getNumber("commission") ??
      DEFAULT_COMMISSION_PERCENT;

    const clientWallet = await getClient(
      clientUser.id,
      clientUser.username
    );

    const exchange = await getExchange();

    let priceUsd = 0;
let priceGp = 0;
let priceBrl = 0;

/* =========================
   VALIDAR SALDO (SEM DEBITAR)
========================= */
if (payment === "usd") {
  priceUsd = Number(priceInput);
  priceGp = 0;
  priceBrl = Number((priceUsd * exchange.usdBrl).toFixed(2));

  if (priceUsd <= 0) {
    return interaction.editReply("❌ Valor USD inválido.");
  }

  if (clientWallet.balance < priceUsd) {
    return interaction.editReply("❌ Saldo USD insuficiente.");
  }
}

if (payment === "gp") {
  priceGp = Number(priceInput); // EM M
  priceUsd = Number((priceGp * exchange.serviceGp).toFixed(2));
  priceBrl = Number((priceUsd * exchange.usdBrl).toFixed(2));

  if (priceGp <= 0) {
    return interaction.editReply("❌ Valor GP inválido.");
  }

  if (clientWallet.balance_gp < priceGp) {
    return interaction.editReply("❌ Saldo GP insuficiente.");
  }
}

    /* =========================
       SALVA ESTADO (PENDING)
    ========================= */
    interaction.client.pendingServices.set(interaction.user.id, {
      adminId: interaction.user.id,
      channelId: interaction.channelId,

      service,
      quantity,

      paymentMethod: payment,
      priceUsd,
      priceGp,
      priceBrl,

      usdRate: exchange.usdBrl,
      commissionPercent,

      clientId: clientUser.id,
      preview: null,
      waitingEdit: false
    });

    await interaction.editReply(
      "✍️ Envie agora a **descrição do serviço**."
    );
  }
};
