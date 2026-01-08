const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createService } = require("../data/services");

const {
  removeClientBalance,
  removeClientGp
} = require("../data/walletClients");

const { logTransaction } = require("../data/transactions");

const BOOSTER_CHANNEL_ID = "1454188737075609813";
const BOOSTER_ROLE_ID = "1454202602559504624";

module.exports = async function previewService(interaction) {
  const pending = interaction.client.pendingServices.get(interaction.user.id);

  if (!pending || !pending.preview) {
    return interaction.reply({ content: "❌ Nenhum serviço em edição.", ephemeral: true });
  }

  if (interaction.customId === "preview_cancel") {
    interaction.client.pendingServices.delete(interaction.user.id);
    return interaction.update({ content: "❌ Serviço cancelado.", embeds: [], components: [] });
  }

  if (interaction.customId === "preview_edit") {
    pending.waitingEdit = true;
    return interaction.reply({ content: "✍️ Envie a **nova descrição**.", ephemeral: true });
  }

  if (interaction.customId !== "preview_confirm") return;
  await interaction.deferReply({ ephemeral: true });

  const { description, image } = pending.preview;

  /* 🔒 RESERVA (NÃO SPENT) */
  if (pending.paymentMethod === "usd") {
    await removeClientBalance(pending.clientId, pending.priceUsd);

    await logTransaction({
      discordId: pending.clientId,
      role: "client",
      type: "service_reserved_usd",
      amount: pending.priceUsd,
      description: "Service reserved (USD)"
    });
  }

  if (pending.paymentMethod === "gp") {
    await removeClientGp(pending.clientId, pending.priceGp);

    await logTransaction({
      discordId: pending.clientId,
      role: "client",
      type: "service_reserved_gp",
      amount: pending.priceGp,
      description: "Service reserved (GP)"
    });
  }

  /* === DAQUI PRA BAIXO: 100% IGUAL AO SEU === */

  const companyFeeUsd = Number(
    ((pending.priceUsd * pending.commissionPercent) / 100).toFixed(2)
  );

  const boosterPaymentBrl = Number(
    ((pending.priceUsd - companyFeeUsd) * pending.usdRate).toFixed(2)
  );

  const serviceId = await createService({
    service: pending.service,
    description,
    quantity: pending.quantity,
    paymentMethod: pending.paymentMethod,
    priceUsd: pending.priceUsd,
    priceGp: pending.priceGp,
    priceBrl: pending.priceBrl,
    boosterPaymentBrl,
    commissionPercent: pending.commissionPercent,
    clientId: pending.clientId,
    ticketChannelId: pending.channelId
  });

  const embed = new EmbedBuilder()
    .setTitle("📢 New Service Available")
    .setColor("#3498db")
    .addFields(
      { name: "🛠️ Service", value: `\`\`\`${pending.service}\`\`\``, inline: true },
      { name: "📦 Quantity", value: `\`\`\`${pending.quantity}\`\`\``, inline: true },
      {
        name: "💵 Price",
        value:
          pending.paymentMethod === "usd"
            ? `\`\`\`$${pending.priceUsd.toFixed(2)}\`\`\``
            : `\`\`\`${pending.priceGp.toFixed(2)}M GP\`\`\``,
        inline: true
      },
      { name: "📄 Description", value: `\`\`\`${description}\`\`\`` },
      { name: "👤 Client", value: `<@${pending.clientId}>` }
    )
    .setFooter({ text: `Service ID: ${serviceId}` });

  if (image) embed.setImage(image);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`take_service_${serviceId}`)
      .setLabel("Claim Service")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.guild.channels.cache
    .get(BOOSTER_CHANNEL_ID)
    .send({ content: `<@&${BOOSTER_ROLE_ID}>`, embeds: [embed], components: [row] });

  interaction.client.pendingServices.delete(interaction.user.id);
  await interaction.editReply("✅ Serviço postado com sucesso.");
};
