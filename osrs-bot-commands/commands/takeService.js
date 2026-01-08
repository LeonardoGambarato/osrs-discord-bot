const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { assignService, getService } = require("../data/services");

module.exports = async function takeService(interaction) {
  try {
    // reconhece o clique sem resposta pública
    await interaction.deferUpdate();

    const [, , serviceId] = interaction.customId.split("_");
    const booster = interaction.user;

    const service = await getService(serviceId);

    if (!service) {
      return interaction.followUp({
        content: "❌ Serviço não encontrado.",
        ephemeral: true
      });
    }

    if (service.status !== "open") {
      return interaction.followUp({
        content: "❌ Este serviço já foi assumido.",
        ephemeral: true
      });
    }

    // 🔒 trava o serviço no banco
    await assignService(serviceId, booster.id);

    // 📌 canal do ticket onde o /post-service foi usado
    const ticketChannel =
      interaction.guild.channels.cache.get(service.ticket_channel_id);

    if (!ticketChannel) {
      return interaction.followUp({
        content: "❌ Canal do ticket não encontrado.",
        ephemeral: true
      });
    }

    // 🔓 adiciona SOMENTE este booster ao ticket
    await ticketChannel.permissionOverwrites.edit(booster.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });

    // 🧾 botão de finalizar serviço (SOMENTE ADMIN FUNCIONA)
    const finishRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`finish_service_${serviceId}`)
    .setLabel("✅ Finalizar Serviço")
    .setStyle(ButtonStyle.Success),

  new ButtonBuilder()
    .setCustomId(`cancel_service_${serviceId}`)
    .setLabel("❌ Cancelar Serviço")
    .setStyle(ButtonStyle.Danger)
);

    // 📨 mensagem no ticket + botão
    await ticketChannel.send({
      content:
        `🔔 **Service accepted**\n\n` +
        `👤 Cliente: <@${service.client_id}>\n` +
        `🛠️ Booster: <@${booster.id}>\n\n` +
        `When the service is complete, an **admin** should confirm below.`,
      components: [finishRow]
    });

    // 🧹 remove anúncio do canal dos boosters
    await interaction.message.delete();

    // 🔒 resposta SOMENTE para o booster
    await interaction.followUp({
      content: "✅ Você assumiu o serviço e já foi adicionado ao ticket.",
      ephemeral: true
    });

  } catch (err) {
    console.error("ERRO NO takeService:", err);

    if (!interaction.replied) {
      await interaction.followUp({
        content: "❌ Erro ao assumir o serviço.",
        ephemeral: true
      });
    }
  }
};

