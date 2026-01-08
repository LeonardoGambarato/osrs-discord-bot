const { EmbedBuilder } = require("discord.js");
const {
  getExchange,
  buyMtoUsd,
  sellMtoUsd
} = require("../data/exchange");

// thumbnail fixa
const GP_THUMBNAIL =
  "https://oldschool.runescape.wiki/images/Mounted_coins_built.png?c6984";

module.exports = async (message) => {
  try {
    // remove "!"
    const parts = message.content.slice(1).trim().split(/\s+/);
    // parts = ["gp", "buy", "10"]

    const sub = parts[1];              // buy | sell | undefined
    const amountM = Number(parts[2]);  // quantidade em M

    const ex = await getExchange();

    /* =========================
       !gp (VISÃO GERAL)
    ========================= */
    if (!sub) {
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("💰 OSRS GP EXCHANGE")
        .setThumbnail(GP_THUMBNAIL)
        .setDescription("**Current prices per 1M GP**")
        .addFields(
          {
            name: "BUY",
            value: "```$" + ex.buyGp.toFixed(2) + " / 1M GP```",
            inline: true
          },
          {
            name: "SELL",
            value: "```$" + ex.sellGp.toFixed(2) + " / 1M GP```",
            inline: true
          },
          {
            name: "📌 How to use",
            value:
              "`!gp buy <M>`\n" +
              "`!gp sell <M>`"
          }
        )
        .setFooter({
          text: message.guild?.name || "OSRS GP Exchange",
          iconURL: message.guild?.iconURL({ dynamic: true })
        })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    /* =========================
       !gp buy <M>
    ========================= */
    if (sub === "buy") {
      if (!amountM || amountM <= 0) {
        return message.reply("❌ Use: `!gp buy <M>`");
      }

      const usd = await buyMtoUsd(amountM);

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("GP BUY")
        .setThumbnail(GP_THUMBNAIL)
        .addFields(
          {
            name: "Amount",
            value: "```" + amountM + "M GP```",
            inline: true
          },
          {
            name: "Price",
            value: "```$" + usd.toFixed(2) + "```",
            inline: true
          }
        )
        .setFooter({
          text: message.guild?.name || "OSRS GP Exchange",
          iconURL: message.guild?.iconURL({ dynamic: true })
        })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    /* =========================
       !gp sell <M>
    ========================= */
    if (sub === "sell") {
      if (!amountM || amountM <= 0) {
        return message.reply("❌ Use: `!gp sell <M>`");
      }

      const usd = await sellMtoUsd(amountM);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle(" GP SELL")
        .setThumbnail(GP_THUMBNAIL)
        .addFields(
          {
            name: "Amount",
            value: "```" + amountM + "M GP```",
            inline: true
          },
          {
            name: "You Receive",
            value: "```$" + usd.toFixed(2) + "```",
            inline: true
          }
        )
        .setFooter({
          text: message.guild?.name || "OSRS GP Exchange",
          iconURL: message.guild?.iconURL({ dynamic: true })
        })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    return message.reply("❌ Comando inválido. Use `!gp`");

  } catch (err) {
    console.error("Erro !gp:", err);
    return message.reply("❌ Erro ao executar o comando GP.");
  }
};

