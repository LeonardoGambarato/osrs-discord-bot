const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

/**
 * Captura descrição do serviço e gera preview
 * ❗ NÃO DEBITA WALLET AQUI
 */
module.exports = async function previewMessageHandler(message, client) {
  const pending = client.pendingServices.get(message.author.id);
  if (!pending) return;

  // 🔐 Segurança
  if (message.author.id !== pending.adminId) return;
  if (message.channel.id !== pending.channelId) return;

  /* =========================
     CAPTURA CONTEÚDO
  ========================= */
  const image =
    message.attachments.first()?.url ??
    pending.preview?.image ??
    null;

  const description =
    message.content?.trim() ||
    pending.preview?.description ||
    "Sem descrição.";

  await message.delete().catch(() => null);

  pending.preview = { description, image };
  pending.waitingEdit = false;

  /* =========================
     PREÇO FORMATADO (CORRETO)
  ========================= */
  const priceText =
  pending.paymentMethod === "usd"
    ? `$${pending.priceUsd.toFixed(2)}`
    : `${pending.priceGp.toFixed(2)}M GP`;

  /* =========================
     EMBED PREVIEW
  ========================= */
  const previewEmbed = new EmbedBuilder()
    .setTitle("👀 Service Preview")
    .setColor("#f1c40f")
    .addFields(
      {
        name: "🛠️ Service",
        value: `\`\`\`${pending.service}\`\`\``,
        inline: true
      },
      {
        name: "📦 Quantity",
        value: `\`\`\`${pending.quantity}\`\`\``,
        inline: true
      },
      {
  name: "💵 Price",
  value: `\`\`\`${priceText}\`\`\``,
  inline: true
},
      {
        name: "📄 Description",
        value: `\`\`\`${description.length > 1024
          ? description.slice(0, 1021) + "..."
          : description}\`\`\``
      },
      {
        name: "👤 Client",
        value: `<@${pending.clientId}>`
      }
    )
    .setFooter({ text: "Confirmar, editar ou cancelar" });

  if (image) previewEmbed.setImage(image);

  /* =========================
     BOTÕES
  ========================= */
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("preview_edit")
      .setLabel("✏️ Editar")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("preview_confirm")
      .setLabel("✅ Confirmar")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("preview_cancel")
      .setLabel("❌ Cancelar")
      .setStyle(ButtonStyle.Danger)
  );

  /* =========================
     REMOVE PREVIEW ANTIGO
  ========================= */
  if (pending.previewMessageId) {
    const old = await message.channel.messages
      .fetch(pending.previewMessageId)
      .catch(() => null);
    if (old) await old.delete().catch(() => null);
  }

  const previewMsg = await message.channel.send({
    embeds: [previewEmbed],
    components: [row]
  });

  pending.previewMessageId = previewMsg.id;
};