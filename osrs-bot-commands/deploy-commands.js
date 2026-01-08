require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);

    if (!command.data) {
      console.warn(`⚠️ ${file} ignorado (sem data)`);
      continue;
    }

    // 🔍 valida o comando AQUI
    const json = command.data.toJSON();

    commands.push(json);
    console.log(`✅ Comando carregado: /${json.name}`);
  } catch (err) {
    console.error(`❌ ERRO NO COMANDO: ${file}`);
    throw err; // para o deploy e mostra o erro exato
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ Registrando slash commands (GUILD)...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Slash commands registrados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:");
    console.error(error);
  }
})();