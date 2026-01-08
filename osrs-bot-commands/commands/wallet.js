const TIP_LOG_CHANNEL_ID = "1454842570109878302";
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { getBooster, addBoosterEarning } = require("../data/walletBoosters");
const {
  getClient,
  removeClientBalance
} = require("../data/walletClients");

const {
  getClientTotalSpent,
  getClientOpenServices
} = require("../data/services");

const {
  getClientTotalTipsSent,
  logTransaction
} = require("../data/transactions");

const { logTipSheet } = require("../utils/sheetsLogger");

/* =====================================================
   SLASH COMMAND /wallet
===================================================== */
module.exports.data = new SlashCommandBuilder()
  .setName("wallet")
  .setDescription("Ver sua carteira")
  .addStringOption(opt =>
    opt
      .setName("wallet")
      .setDescription("Tipo de carteira")
      .setRequired(true)
      .addChoices(
        { name: "Booster", value: "booster" },
        { name: "Client", value: "client" }
      )
  );

module.exports.execute = async (interaction) => {
  const wallet = interaction.options.getString("wallet");
  const user = interaction.user;

  /* =========================
     BOOSTER
  ========================= */
  if (wallet === "booster") {
    const booster = await getBooster(user.id, user.username);

    const embed = new EmbedBuilder()
      .setColor("#A957DE")
      .setTitle(`${interaction.member.displayName} • Booster Wallet`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: "💰 Balance",
          value: `\`\`\`R$ ${booster.balance.toFixed(2)}\`\`\``,
          inline: true
        },
        {
          name: "📈 Total Earned",
          value: `\`\`\`R$ ${booster.total_earned.toFixed(2)}\`\`\``,
          inline: true
        }
      )
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL()
      });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* =========================
     CLIENT
  ========================= */
  if (wallet === "client") {
    const client = await getClient(user.id, user.username);
    const totalSpent = await getClientTotalSpent(user.id);
    const totalTips = await getClientTotalTipsSent(user.id);
    const open = await getClientOpenServices(user.id);

    const openIds = open.length
      ? open.map(s => `#${s.id}`).join(", ")
      : "No active services";

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle(`${interaction.member.displayName} • Client Wallet`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: "💵 USD Balance",
          value: `\`\`\`$ ${client.balance.toFixed(2)}\`\`\``,
          inline: true
        },
        {
          name: "🎁 Tips Sent",
          value: `\`\`\`$ ${Number(totalTips).toFixed(2)}\`\`\``,
          inline: true
        },
        {
          name: "💸 Total Spent",
          value: `\`\`\`$ ${Number(totalSpent).toFixed(2)}\`\`\``
        },
        {
          name: "🛠️ Active Services",
          value: `\`\`\`${openIds}\`\`\``
        }
      )
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL()
      });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

/* =====================================================
   PREFIX COMMAND !tip
===================================================== */
module.exports.handleTip = async (message) => {
  try {
    const args = message.content.split(" ").slice(1);

    if (args.length < 2) {
      return message.reply("❌ Use: `!tip @user valor`");
    }

    const target = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!target) {
      return message.reply("❌ Você precisa mencionar um usuário.");
    }

    if (target.bot || target.id === message.author.id) {
      return message.reply("❌ Usuário inválido.");
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply("❌ Valor inválido.");
    }

    const client = await getClient(
      message.author.id,
      message.author.username
    );

    if (client.balance < amount) {
      return message.reply("❌ Saldo insuficiente.");
    }

    // garante que o booster exista
    await getBooster(target.id, target.username);

    // =========================
    // TRANSFERÊNCIA
    // =========================
    await removeClientBalance(message.author.id, amount);
    await addBoosterEarning(target.id, amount);

    // =========================
    // LOGS NO BANCO
    // =========================
    await logTransaction({
      discordId: message.author.id,
      role: "client",
      type: "tip_sent",
      amount,
      description: `Tip to ${target.username}`
    });

    await logTransaction({
      discordId: target.id,
      role: "booster",
      type: "tip_received",
      amount,
      description: `Tip from ${message.author.username}`
    });

    // =========================
    // LOG NO GOOGLE SHEETS
    // =========================
    await logTipSheet({
      fromId: message.author.id,
      toId: target.id,
      amount
    });

    // =========================
    // LOG NO CANAL DO DISCORD
    // =========================
    const logChannel = message.guild.channels.cache.get(TIP_LOG_CHANNEL_ID);

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("💛 Tip Sent")
        .addFields(
          {
            name: "From",
            value: `<@${message.author.id}>`,
            inline: true
          },
          {
            name: "To",
            value: `<@${target.id}>`,
            inline: true
          },
          {
            name: "Amount",
            value: `\`\`\`$ ${amount.toFixed(2)}\`\`\``
          }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }

    // =========================
    // CONFIRMAÇÃO AO USUÁRIO
    // =========================
    return message.reply(
      `💛 Você enviou **$${amount.toFixed(2)}** de tip para <@${target.id}>`
    );

  } catch (err) {
    console.error("Erro no comando !tip:", err);
    return message.reply("❌ Erro ao enviar tip.");
  }
};