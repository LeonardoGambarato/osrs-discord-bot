console.log("🔥 TRANSACTIONS.JS CARREGADO 🔥");

const { dbPromise } = require("./db");
const { logTransactionSheet } = require("../utils/sheetsLogger");


/* =========================
   LOG TRANSACTION
========================= */
async function logTransaction({
  discordId,
  role,
  type,
  amount,
  description
}) {
  const db = await dbPromise;

  await db.run(`
    INSERT INTO transactions (
      discord_id,
      role,
      type,
      amount,
      description
    ) VALUES (?, ?, ?, ?, ?)
  `,
    discordId,
    role,
    type,
    amount,
    description
  );
}

await logTransactionSheet({
  discordId,
  role,
  type,
  amount,
  description
});

/* =========================
   CLIENT SPENT
========================= */
async function getClientTotalSpent(clientId) {
  const db = await dbPromise;

  const row = await db.get(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE discord_id = ?
      AND role = 'client'
      AND type = 'service_payment_usd'
  `, clientId);

  return Number(row.total);
}

async function getClientTotalGpSpent(clientId) {
  const db = await dbPromise;

  const row = await db.get(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE discord_id = ?
      AND role = 'client'
      AND type = 'service_payment_gp'
  `, clientId);

  return Number(row.total);
}

/* =========================
   BOOSTER OF THE MONTH
========================= */
async function getBoosterOfTheMonth() {
  const db = await dbPromise;

  return db.get(`
    SELECT
      discord_id,
      SUM(amount) AS total
    FROM transactions
    WHERE role = 'booster'
      AND type = 'service_payment'
      AND created_at >= date('now', 'start of month')
    GROUP BY discord_id
    ORDER BY total DESC
    LIMIT 1
  `);
}
  /* =========================
   TIPS
========================= */
async function getClientTotalTipsSent(discordId) {
  const db = await dbPromise;

  const row = await db.get(
    `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE discord_id = ?
      AND role = 'client'
      AND type = 'tip_sent'
    `,
    discordId
  );

  return row.total || 0;
}

/* =========================
   EXPORTS (CRÍTICO)
========================= */
module.exports = {
  logTransaction,

  getClientTotalSpent,
  getClientTotalGpSpent,


  getBoosterOfTheMonth,
  getClientTotalTipsSent
};

console.log("EXPORTS transactions:", module.exports);