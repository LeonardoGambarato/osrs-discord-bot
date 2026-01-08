const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/discounts.json");

function loadDiscounts() {
  if (!fs.existsSync(filePath)) return {};
  const data = fs.readFileSync(filePath, "utf8");
  if (!data.trim()) return {};
  return JSON.parse(data);
}

function saveDiscounts(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("discount")
    .setDescription("Manage role discounts")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add or update a role discount")
        .addRoleOption(opt =>
          opt.setName("role").setDescription("Discord role").setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName("percent").setDescription("Discount %").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a role discount")
        .addRoleOption(opt =>
          opt.setName("role").setDescription("Discord role").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("list").setDescription("List all discounts")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const discounts = loadDiscounts();

    // /discount list
    if (sub === "list") {
      if (Object.keys(discounts).length === 0) {
        return interaction.reply({ content: "📭 No discounts configured.", ephemeral: true });
      }

      const list = Object.entries(discounts)
        .map(([role, value]) => `• **${role}** → ${value}%`)
        .join("\n");

      return interaction.reply({ content: `🎟️ **Role Discounts:**\n${list}`, ephemeral: true });
    }

    // /discount add
    if (sub === "add") {
      const role = interaction.options.getRole("role");
      const percent = interaction.options.getInteger("percent");

      discounts[role.name] = percent;
      saveDiscounts(discounts);

      return interaction.reply({
        content: `✅ Discount set: **${role.name}** → **${percent}%**`,
        ephemeral: true
      });
    }

    // /discount remove
    if (sub === "remove") {
      const role = interaction.options.getRole("role");

      if (!discounts[role.name]) {
        return interaction.reply({ content: "❌ This role has no discount.", ephemeral: true });
      }

      delete discounts[role.name];
      saveDiscounts(discounts);

      return interaction.reply({
        content: `🗑️ Discount removed from **${role.name}**`,
        ephemeral: true
      });
    }
  }
};

