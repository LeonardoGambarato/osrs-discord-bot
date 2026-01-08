console.log("🔥 WALLET BOOSTERS CARREGADO 🔥");

const { dbPromise } = require("./db");

/* =========================
   GET BOOSTER
========================= */
async function getBooster(discordId, username = null) {
  const db = await dbPromise;

  let booster = await db.get(
    `SELECT * FROM wallet_boosters WHERE discord_id = ?`,
    discordId
  );

  if (!booster) {
    await db.run(
      `INSERT INTO wallet_boosters (discord_id, username, balance, total_earned)
       VALUES (?, ?, 0, 0)`,
      discordId,
      username ?? "Unknown"
    );

    booster = await db.get(
      `SELECT * FROM wallet_boosters WHERE discord_id = ?`,
      discordId
    );
  }

  return booster;
}

/* =========================
   BALANCE (BRL)
========================= */
async function addBoosterEarning(discordId, amount) {
  const db = await dbPromise;

  await db.run(
    `UPDATE wallet_boosters
     SET balance = balance + ?,
         total_earned = total_earned + ?
     WHERE discord_id = ?`,
    amount,
    amount,
    discordId
  );
}

async function removeBoosterBalance(discordId, amount) {
  const db = await dbPromise;

  await db.run(
    `UPDATE wallet_boosters
     SET balance = balance - ?
     WHERE discord_id = ?`,
    amount,
    discordId
  );
}

/* =========================
   TOP BOOSTERS
========================= */
async function getTopBoosters(limit = 10) {
  const db = await dbPromise;

  return db.all(
    `
    SELECT
      discord_id,
      SUM(amount) AS total_earned
    FROM transactions
    WHERE role = 'booster'
      AND type = 'service_payment'
    GROUP BY discord_id
    ORDER BY total_earned DESC
    LIMIT ?
    `,
    limit
  );
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  getBooster,
  addBoosterEarning,
  removeBoosterBalance,
  getTopBoosters
};

console.log("EXPORTS walletBoosters:", module.exports);

