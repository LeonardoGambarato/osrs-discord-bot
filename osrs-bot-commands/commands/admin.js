const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const {
  listServices,
  getService,
  deleteService,
  getFinancialSummary,
  getHistoryByDays
} = require("../data/services");

const {
  getBoosterOfTheMonth,
  logTransaction
} = require("../data/transactions");

const {
  addClientBalance,
  addClientGp
} = require("../data/walletClients");

const {
  getExchange,
  getExchangeRate,
  setExchangeRate,
  setServiceGp,
  setBuyGp,
  setSellGp
} = require("../data/exchange");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Comandos administrativos")

    /* =========================
       SYSTEM
    ========================= */
    .addSubcommand(sub =>
      sub
        .setName("dashboard")
        .setDescription("Resumo financeiro do sistema")
    )

    .addSubcommand(sub =>
      sub
        .setName("history")
        .setDescription("Histórico financeiro por período")
        .addIntegerOption(opt =>
          opt
            .setName("days")
            .setDescription("Número de dias (1 a 365)")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("booster-of-the-month")
        .setDescription("Exibe o booster do mês")
    )

    /* =========================
       SERVICES
    ========================= */
    .addSubcommandGroup(group =>
      group
        .setName("services")
        .setDescription("Gerenciar serviços")

        .addSubcommand(sub =>
          sub
            .setName("list")
            .setDescription("Listar serviços recentes")
        )

        .addSubcommand(sub =>
          sub
            .setName("info")
            .setDescription("Ver detalhes de um serviço")
            .addIntegerOption(opt =>
              opt
                .setName("id")
                .setDescription("ID do serviço")
                .setRequired(true)
            )
        )

        .addSubcommand(sub =>
          sub
            .setName("delete")
            .setDescription("Cancelar serviço e reembolsar em USD")
            .addIntegerOption(opt =>
              opt
                .setName("id")
                .setDescription("ID do serviço")
                .setRequired(true)
            )
        )
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

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    /* =========================
       DASHBOARD
    ========================= */
/* =========================
   DASHBOARD
========================= */
if (!group && sub === "dashboard") {
  const d = await getFinancialSummary();

  const embed = new EmbedBuilder()
    .setTitle("📊 System Financial Dashboard")
    .setColor("#27ae60")
    .addFields(
      {
        name: "💵 Total Revenue (USD)",
        value: `\`\`\`$${d.revenueUsd.toFixed(2)}\`\`\``,
        inline: true
      },
      {
        name: "💸 Paid to Boosters (BRL)",
        value: `\`\`\`R$ ${d.paidBoosters.toFixed(2)}\`\`\``,
        inline: true
      },
      {
        name: "🏦 PROFIT (BRL)",
        value: `\`\`\`R$ ${d.profitBrl.toFixed(2)}\`\`\``,
        inline: true
      },
      {
        name: "📦 Total Services",
        value: `\`\`\`${d.totalServices}\`\`\``,
        inline: true
      },
      {
        name: "🛠️ Open / Assigned",
        value: `\`\`\`${d.openServices}\`\`\``,
        inline: true
      }
    )
    .setFooter({
      text: interaction.guild.name,
      iconURL: interaction.guild.iconURL()
    })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

    /* =========================
       HISTORY
    ========================= */
    if (!group && sub === "history") {
  const days = interaction.options.getInteger("days");
  const h = await getHistoryByDays(days);

  const revenueUsd = Number(h.revenueUsd || 0);
  const paidBoosters = Number(h.paidBoosters || 0);
  const totalServices = Number(h.totalServices || 0);

  const exchange = await require("../data/exchange").getExchange();
  const profitBrl = (revenueUsd * exchange.usdBrl) - paidBoosters;

  const embed = new EmbedBuilder()
    .setTitle(`📆 Financial History — Last ${days} days`)
    .setColor("#8e44ad")
    .addFields(
      {
        name: "💵 Revenue (USD)",
        value: `\`\`\`$${revenueUsd.toFixed(2)}\`\`\``,
        inline: true
      },
      {
        name: "💸 Paid Boosters (BRL)",
        value: `\`\`\`R$ ${paidBoosters.toFixed(2)}\`\`\``,
        inline: true
      },
      {
        name: "🏦 Profit (BRL)",
        value: `\`\`\`R$ ${profitBrl.toFixed(2)}\`\`\``,
        inline: true
      },
      {
        name: "📦 Services",
        value: `\`\`\`${totalServices}\`\`\``,
        inline: true
      }
    )
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}


    /* =========================
       BOOSTER
    ========================= */
    if (!group && sub === "booster-of-the-month") {
      const r = await getBoosterOfTheMonth();
      if (!r) return interaction.editReply("❌ Nenhum booster encontrado.");

      return interaction.editReply(
        "```txt\n" +
        `Booster: ${r.discord_id}\n` +
        `Total ganho: R$ ${Number(r.total).toFixed(2)}\n` +
        "```"
      );
    }

    /* =========================
       SERVICES
    ========================= */
    if (group === "services") {

      if (sub === "list") {
        const services = await listServices(15);
        if (!services.length) {
          return interaction.editReply("📭 Nenhum serviço encontrado.");
        }

        const text = services.map(s =>
          `${s.id} | ${s.service} | ${
  s.payment_method === "usd"
    ? `$${Number(s.price_usd).toFixed(2)}`
    : `${Number(s.price_gp).toFixed(2)}M GP`
} | ${s.status}`
        ).join("\n");

        return interaction.editReply(
          "```txt\nID | Service | Price | Status\n" +
          text +
          "\n```"
        );
      }

      if (sub === "info") {
        const id = interaction.options.getInteger("id");
        const s = await getService(id);
        if (!s) return interaction.editReply("❌ Serviço não encontrado.");

        return interaction.editReply(
          "```txt\n" +
          `ID: ${s.id}\n` +
          `Service: ${s.service}\n` +
          `USD: $${s.price_usd.toFixed(2)}\n` +
          `BRL: R$ ${s.price_brl.toFixed(2)}\n` +
          `Status: ${s.status}\n` +
          "```"
        );
      }

      if (sub === "delete") {
  const id = interaction.options.getInteger("id");
  const s = await getService(id);
  if (!s) return interaction.editReply("❌ Serviço não encontrado.");

  // 🔁 REEMBOLSO SEMPRE EM USD
  await addClientBalance(s.client_id, s.price_usd);

  await logTransaction({
    discordId: s.client_id,
    role: "client",
    type: "service_refund_usd",
    amount: s.price_usd,
    description: `Refund service #${s.id}`
  });

  await deleteService(id);

  return interaction.editReply(
    "✅ Serviço cancelado e reembolsado em **USD**."
  );
}
    }

    return interaction.editReply("❌ Comando não reconhecido.");
  }
};
