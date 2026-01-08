const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const {
  getBooster,
  addBoosterEarning,
  removeBoosterBalance
} = require("../data/walletBoosters");

const {
  getClient,
  addClientBalance,
  removeClientBalance
} = require("../data/walletClients");

const {
  getClientTotalSpent,
  getClientOpenServices
} = require("../data/services");

const {
  getClientTotalTipsSent
} = require("../data/transactions");

/* =========================
   CONFIG
========================= */
const ADMIN_ROLE_ID = "1453203651941372086";
const MANAGER_ROLE_ID = "1453203651941372086";
const LOG_CHANNEL_ID = "1454842570109878302";

/* =========================
   PERMISSION
========================= */
function isStaff(member) {
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.has(ADMIN_ROLE_ID) ||
    member.roles.cache.has(MANAGER_ROLE_ID)
  );
}

/* =========================
   LOG
========================= */
async function sendWalletLog(interaction, data) {
  const channel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("📒 Wallet Admin Update")
    .setColor(data.action === "add" ? "#2ecc71" : "#e74c3c")
    .addFields(
      { name: "👮 Staff", value: `<@${interaction.user.id}>`, inline: true },
      { name: "👤 User", value: `<@${data.userId}>`, inline: true },
      { name: "💼 Wallet", value: `\`${data.wallet}\``, inline: true },
      { name: "⚙️ Action", value: `\`${data.action.toUpperCase()}\``, inline: true },
      { name: "💰 Amount", value: `\`\`\`${data.amountText}\`\`\`` }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

/* =========================
   COMMAND
========================= */
module.exports = {
  data: new SlashCommandBuilder()
    .setName("wallet-admin")
    .setDescription("Gerenciar carteiras (USD / BRL)")

    .addStringOption(opt =>
      opt.setName("wallet")
        .setDescription("Tipo de carteira")
        .setRequired(true)
        .addChoices(
          { name: "Client", value: "client" },
          { name: "Booster", value: "booster" }
        )
    )

    .addStringOption(opt =>
      opt.setName("action")
        .setDescription("Ação")
        .setRequired(true)
        .addChoices(
          { name: "View", value: "view" },
          { name: "Add", value: "add" },
          { name: "Remove", value: "remove" }
        )
    )

    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("Usuário")
        .setRequired(true)
    )

    .addNumberOption(opt =>
      opt.setName("amount")
        .setDescription("Valor")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isStaff(interaction.member)) {
      return interaction.editReply("❌ Sem permissão.");
    }

    const wallet = interaction.options.getString("wallet");
    const action = interaction.options.getString("action");
    const user   = interaction.options.getUser("user");
    const amount = interaction.options.getNumber("amount");

    if (action !== "view" && (!amount || amount <= 0)) {
      return interaction.editReply("❌ Valor inválido.");
    }

    /* =========================
       CLIENT
    ========================= */
    if (wallet === "client") {
      const client = await getClient(user.id, user.username);

      if (action === "view") {
        const totalSpent = await getClientTotalSpent(user.id);
        const totalTips  = await getClientTotalTipsSent(user.id);
        const open       = await getClientOpenServices(user.id);

        const openIds = open.length
          ? open.map(s => `#${s.id}`).join(", ")
          : "No active services";

        const embed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle(`${user.username} • Client Wallet`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "💵 USD Balance", value: `\`\`\`$ ${client.balance.toFixed(2)}\`\`\``, inline: true },
            { name: "🎁 Tips Sent", value: `\`\`\`$ ${totalTips.toFixed(2)}\`\`\``, inline: true },
            { name: "💸 Total Spent", value: `\`\`\`$ ${totalSpent.toFixed(2)}\`\`\`` },
            { name: "🛠️ Active Services", value: `\`\`\`${openIds}\`\`\`` }
          );

        return interaction.editReply({ embeds: [embed] });
      }

      if (action === "remove" && client.balance < amount) {
        return interaction.editReply("❌ Saldo insuficiente.");
      }

      action === "add"
        ? await addClientBalance(user.id, amount)
        : await removeClientBalance(user.id, amount);

      await sendWalletLog(interaction, {
        wallet: "Client",
        action,
        userId: user.id,
        amountText: `$ ${amount.toFixed(2)}`
      });

      return interaction.editReply("✅ Carteira do cliente atualizada.");
    }

    /* =========================
       BOOSTER
    ========================= */
    if (wallet === "booster") {
      const booster = await getBooster(user.id, user.username);

      if (action === "view") {
        const embed = new EmbedBuilder()
          .setColor("#A957DE")
          .setTitle(`${user.username} • Booster Wallet`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "💰 Balance", value: `\`\`\`R$ ${booster.balance.toFixed(2)}\`\`\``, inline: true },
            { name: "📈 Total Earned", value: `\`\`\`R$ ${booster.total_earned.toFixed(2)}\`\`\``, inline: true }
          );

        return interaction.editReply({ embeds: [embed] });
      }

      if (action === "remove" && booster.balance < amount) {
        return interaction.editReply("❌ Saldo insuficiente.");
      }

      action === "add"
        ? await addBoosterEarning(user.id, amount)
        : await removeBoosterBalance(user.id, amount);

      await sendWalletLog(interaction, {
        wallet: "Booster",
        action,
        userId: user.id,
        amountText: `R$ ${amount.toFixed(2)}`
      });

      return interaction.editReply("✅ Carteira do booster atualizada.");
    }
  }
};
