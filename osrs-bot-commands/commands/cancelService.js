const { PermissionsBitField, EmbedBuilder } = require("discord.js");

const LOG_CHANNEL_ID = "1454842570109878302";

const { getService, deleteService } = require("../data/services");
const {
  addClientBalance,
  addClientGp
} = require("../data/walletClients");

const { logTransaction } = require("../data/transactions");

module.exports = async function cancelService(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (
    !interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    return interaction.editReply("❌ Apenas administradores.");
  }

  const [, , serviceId] = interaction.customId.split("_");
  const service = await getService(serviceId);

  if (!service) {
    return interaction.editReply("❌ Serviço não encontrado.");
  }

  /* =========================
     REEMBOLSO CORRETO
  ========================= */
  let refundText = "";

  if (service.payment_method === "usd") {
  await addClientBalance(service.client_id, service.price_usd);

  await logTransaction({
    discordId: service.client_id,
    role: "client",
    type: "service_refund_usd",
    amount: service.price_usd,
    description: "Service cancelled"
  });
}

if (service.payment_method === "gp") {
  await addClientGp(service.client_id, service.price_gp);

  await logTransaction({
    discordId: service.client_id,
    role: "client",
    type: "service_refund_gp",
    amount: service.price_gp,
    description: "Service cancelled"
  });
}

  await deleteService(serviceId);

  /* =========================
     LOG ADMIN
  ========================= */
  const logChannel =
    interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (logChannel) {
    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`❌ Serviço Cancelado #${serviceId}`)
          .setColor("#e74c3c")
          .addFields(
            { name: "👤 Cliente", value: `<@${service.client_id}>` },
            { name: "💰 Reembolso", value: `\`\`\`txt\n${refundText}\n\`\`\`` }
          )
          .setFooter({
            text: `Cancelado por ${interaction.member.displayName}`
          })
      ]
    });
  }

  await interaction.editReply(
    "❌ Serviço cancelado e **reembolsado corretamente**."
  );
};
