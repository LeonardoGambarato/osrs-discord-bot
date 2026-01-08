require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { initDatabase } = require("./data/db");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================
   SLASH COMMANDS
========================= */
client.slashCommands = new Collection();

const slashCommandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter(file => file.endsWith(".js"));

for (const file of slashCommandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.execute) {
    client.slashCommands.set(command.data.name, command);
  }
}

/* =========================
   PENDING SERVICES (MAP)
========================= */
client.pendingServices = new Map();

/* =========================
   DATABASE
========================= */
initDatabase();

/* =========================
   READY
========================= */
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

/* =========================
   MESSAGE CREATE
========================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  /* =========================
     🧾 DESCRIÇÃO DO SERVIÇO
  ========================= */
  const pending = client.pendingServices.get(message.author.id);

// 🔒 só intercepta se NÃO for comando
if (
  pending &&
  message.channel.id === pending.channelId &&
  !message.content.startsWith("!")
) {
  return require("./commands/previewMessageHandler")(message, client);
}
  /* =========================
     PREFIX COMMANDS (!)
  ========================= */
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const commandsMap = {
    b: "./commands/b",
    q: "./commands/q",
    m: "./commands/m",
    s: "./commands/s",
    gp: "./commands/gp",
    inferno: "./commands/inferno",
    quiver: "./commands/quiver",
    im: "./commands/im",
    d: "./commands/d",
    dropdown: "./commands/dropdown",
  };

  if (commandsMap[command]) {
    return require(commandsMap[command])(message);
  }
  if (command === "tip") {
  return require("./commands/wallet").handleTip(message);
}
});

/* =========================
   INTERACTIONS
========================= */
client.on("interactionCreate", async (interaction) => {

  /* =========================
     SLASH COMMANDS
  ========================= */
  if (interaction.isChatInputCommand()) {
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error("Erro no slash command:", err);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Erro ao executar o comando.",
          ephemeral: true
        });
      }
    }
    return;
  }

  /* =========================
     BUTTONS
  ========================= */
  /* =========================
   BUTTONS
========================= */
if (interaction.isButton()) {

  if (interaction.customId.startsWith("take_service_")) {
    return require("./commands/takeService")(interaction);
  }

  if (interaction.customId.startsWith("finish_service_")) {
    return require("./commands/finishService")(interaction);
  }

  if (interaction.customId.startsWith("cancel_service_")) {
    return require("./commands/cancelService")(interaction);
  }

  if (interaction.customId.startsWith("preview_")) {
    return require("./commands/previewService")(interaction);
  }
  // 🔥 INFERNO (BOTÕES)
  if (interaction.customId.startsWith("inferno_")) {
    return require("./commands/infernoButtons")(interaction);
  }
   // 🏹 QUIVER
  if (interaction.customId.startsWith("quiver_")) {
    return require("./commands/quiverButtons")(interaction);
  }
  // 📘 ACHIEVEMENT DIARY  ✅ (FALTAVA ISSO)
  if (interaction.customId.startsWith("diary_")) {
    return require("./commands/diarybuttons").handleButton(interaction);
  }
}

  /* =========================
     SELECT MENUS
  ========================= */
  if (interaction.isStringSelectMenu()) {

  // 🔥 INFERNO (SELECT MENU)
  if (interaction.customId.startsWith("inferno_select_")) {
    return require("./commands/infernoButtons")(interaction);
  }
  // 🏹 QUIVER
  if (interaction.customId.startsWith("quiver_select_")) {
    return require("./commands/quiverButtons")(interaction);
  }

  return require("./commands/dropdownHandler")(interaction);
}
});

/* =========================
   LOGIN
========================= */

client.login("MTQ1MDkwODMxMTc1ODMxMTUxNQ.GaW4Vi.jqXy5pEMyqSQWAhM70WlsuslZh4Z0_CUoCVNl0");