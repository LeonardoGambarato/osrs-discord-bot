const { dbPromise } = require("./db");

/* =========================
   GET CLIENT
========================= */
async function getClient(discordId, username = null) {
  const db = await dbPromise;

  let client = await db.get(
    "SELECT * FROM wallet_clients WHERE discord_id = ?",
    discordId
  );

  if (!client) {
    await db.run(
      "INSERT INTO wallet_clients (discord_id, username) VALUES (?, ?)",
      discordId,
      username
    );

    client = await db.get(
      "SELECT * FROM wallet_clients WHERE discord_id = ?",
      discordId
    );
  }

  return client;
}

/* =========================
   USD
========================= */
async function addClientBalance(discordId, amountUsd) {
  const db = await dbPromise;

  await db.run(
    "UPDATE wallet_clients SET balance = balance + ? WHERE discord_id = ?",
    amountUsd,
    discordId
  );
}

async function removeClientBalance(discordId, amountUsd) {
  const db = await dbPromise;

  await db.run(
    "UPDATE wallet_clients SET balance = balance - ? WHERE discord_id = ?",
    amountUsd,
    discordId
  );
}

/* =========================
   GP (EM M)
========================= */
async function addClientGp(discordId, amountM) {
  const db = await dbPromise;

  await db.run(
    "UPDATE wallet_clients SET balance_gp = balance_gp + ? WHERE discord_id = ?",
    amountM,
    discordId
  );
}

async function removeClientGp(discordId, amountM) {
  const db = await dbPromise;

  await db.run(
    "UPDATE wallet_clients SET balance_gp = balance_gp - ? WHERE discord_id = ?",
    amountM,
    discordId
  );
}

module.exports = {
  getClient,
  addClientBalance,
  removeClientBalance,
  addClientGp,
  removeClientGp
};
