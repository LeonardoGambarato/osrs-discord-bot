const { PermissionsBitField, EmbedBuilder } = require("discord.js");

const LOG_CHANNEL_ID = "1454842570109878302";

const { getService, finishService } = require("../data/services");
const { addBoosterEarning, getBooster } = require("../data/walletBoosters");
const { logTransaction } = require("../data/transactions");

module.exports = async function finishServiceHandler(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (
    !interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    return interaction.editReply("❌ Apenas admins.");
  }

  const [, , serviceId] = interaction.customId.split("_");
  const service = await getService(serviceId);

  if (!service || service.status !== "assigned") {
    return interaction.editReply("❌ Serviço inválido.");
  }

  /* =========================
     💸 CLIENTE — SPENT REAL
     (SÓ AQUI!)
  ========================= */
  if (service.payment_method === "usd") {
    await logTransaction({
      discordId: service.client_id,
      role: "client",
      type: "service_payment_usd",
      amount: service.price_usd,
      description: `Service #${serviceId} completed`
    });
  }

  if (service.payment_method === "gp") {
    await logTransaction({
      discordId: service.client_id,
      role: "client",
      type: "service_payment_gp",
      amount: service.price_gp,
      description: `Service #${serviceId} completed`
    });
  }

  /* =========================
     💰 BOOSTER PAYMENT
  ========================= */
  const boosterPaymentBrl = Number(service.booster_payment_brl);

  await addBoosterEarning(service.booster_id, boosterPaymentBrl);
  const boosterWallet = await getBooster(service.booster_id);

  await logTransaction({
    discordId: service.booster_id,
    role: "booster",
    type: "service_payment",
    amount: boosterPaymentBrl,
    description: `Service #${serviceId} finished`
  });

  /* =========================
     FINALIZA SERVICE
  ========================= */
  await finishService(serviceId);

  /* =========================
     📩 DM BOOSTER
  ========================= */
  try {
    const boosterUser =
      await interaction.client.users.fetch(service.booster_id);

    await boosterUser.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`💼 Booster Wallet — Service #${serviceId}`)
          .setColor("#2ecc71")
          .addFields(
            {
              name: "💰 Valor recebido (BRL)",
              value: `\`\`\`txt\nR$ ${boosterPaymentBrl.toFixed(2)}\n\`\`\``
            },
            {
              name: "🏦 Novo saldo",
              value: `\`\`\`txt\nR$ ${boosterWallet.balance.toFixed(2)}\n\`\`\``
            }
          )
          .setFooter({
            text: `Confirmado por ${interaction.member.displayName}`
          })
      ]
    });
  } catch {}

  /* =========================
     📒 LOG ADMIN
  ========================= */
  const logChannel =
    interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (logChannel) {
    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🔔 Serviço Finalizado #${serviceId}`)
          .setColor("#3498db")
          .addFields(
            { name: "👤 Cliente", value: `<@${service.client_id}>` },
            { name: "⚔️ Booster", value: `<@${service.booster_id}>` },
            {
              name: "💰 Pago (BRL)",
              value: `\`\`\`txt\nR$ ${boosterPaymentBrl.toFixed(2)}\n\`\`\``
            }
          )
          .setFooter({
            text: `Finalizado por ${interaction.member.displayName}`
          })
      ]
    });
  }

  await interaction.editReply("✅ Serviço finalizado com sucesso.");
};
