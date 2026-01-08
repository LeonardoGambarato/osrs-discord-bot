console.log("🔥 services.js carregado corretamente");

const { dbPromise } = require("./db");

/* =========================
   CREATE
========================= */
async function createService(data) {
  const db = await dbPromise;

  const result = await db.run(`
    INSERT INTO services (
      service, description, quantity,
      price_usd, price_gp, price_brl,
      payment_method,
      booster_payment_brl, commission_percent,
      client_id, ticket_channel_id,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `,
    data.service,
    data.description,
    data.quantity,
    data.priceUsd ?? 0,
    data.priceGp ?? 0,
    data.priceBrl ?? 0,
    data.paymentMethod,
    data.boosterPaymentBrl,
    data.commissionPercent,
    data.clientId,
    data.ticketChannelId
  );

  return result.lastID;
}

/* =========================
   READ
========================= */
async function getService(id) {
  const db = await dbPromise;
  return db.get(`SELECT * FROM services WHERE id = ?`, id);
}

async function listServices(limit = 15) {
  const db = await dbPromise;

  return db.all(`
    SELECT
      id,
      service,
      payment_method,
      price_usd,
      price_gp,
      price_brl,
      status,
      created_at
    FROM services
    ORDER BY created_at DESC
    LIMIT ?
  `, limit);
}

async function getClientOpenServices(clientId) {
  const db = await dbPromise;

  return db.all(`
    SELECT id
    FROM services
    WHERE client_id = ?
      AND status IN ('open', 'assigned')
  `, clientId);
}

/* =========================
   UPDATE
========================= */
async function assignService(id, boosterId) {
  const db = await dbPromise;
  await db.run(
    `UPDATE services SET booster_id = ?, status = 'assigned' WHERE id = ?`,
    boosterId, id
  );
}

async function finishService(id) {
  const db = await dbPromise;
  await db.run(
    `UPDATE services
     SET status = 'finished',
         finished_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    id
  );
}

/* =========================
   DELETE
========================= */
async function deleteService(id) {
  const db = await dbPromise;
  await db.run(`DELETE FROM services WHERE id = ?`, id);
}

/* =========================
   DASHBOARD
========================= */
async function getFinancialSummary() {
  const db = await dbPromise;

  const revenue = await db.get(`
    SELECT COALESCE(SUM(price_usd), 0) AS total
    FROM services
    WHERE status = 'finished'
  `);

  const paidBoosters = await db.get(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE role = 'booster'
      AND type = 'service_payment'
  `);

  const usdRate = await db.get(`
    SELECT usd_brl FROM exchange_rates WHERE id = 1
  `);

  const revenueUsd = Number(revenue.total);
  const revenueBrl = revenueUsd * Number(usdRate.usd_brl);
  const paid = Number(paidBoosters.total);
  const profit = revenueBrl - paid;

  const totalServices = await db.get(`SELECT COUNT(*) AS total FROM services`);
  const openServices = await db.get(`
    SELECT COUNT(*) AS total FROM services WHERE status IN ('open','assigned')
  `);

  return {
    revenueUsd,
    revenueBrl,
    paidBoosters: paid,
    profitBrl: profit,
    totalServices: totalServices.total,
    openServices: openServices.total
  };
}

/* =========================
   HISTORY
========================= */
async function getHistoryByDays(days) {
  const db = await dbPromise;

  const revenue = await db.get(`
    SELECT COALESCE(SUM(price_usd), 0) AS total
    FROM services
    WHERE status = 'finished'
      AND created_at >= datetime('now', ?)
  `, `-${days} days`);

  const paid = await db.get(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE role = 'booster'
      AND type = 'service_payment'
      AND created_at >= datetime('now', ?)
  `, `-${days} days`);

  return {
    revenueUsd: Number(revenue.total),
    paidBoosters: Number(paid.total)
  };
}

/* =========================
   CLIENT TOTAL SPENT
========================= */
async function getClientTotalSpent(clientId) {
  const db = await dbPromise;

  const row = await db.get(`
    SELECT COALESCE(SUM(price_usd), 0) AS total
    FROM services
    WHERE client_id = ?
      AND status = 'finished'
      AND payment_method = 'usd'
  `, clientId);

  return Number(row.total);
}

async function getClientTotalGpSpent(clientId) {
  const db = await dbPromise;

  const row = await db.get(`
    SELECT COALESCE(SUM(price_gp), 0) AS total
    FROM services
    WHERE client_id = ?
      AND status = 'finished'
      AND payment_method = 'gp'
  `, clientId);

  return Number(row.total);
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  createService,
  getService,
  listServices,
  getClientOpenServices,
  assignService,
  finishService,
  deleteService,
  getFinancialSummary,
  getHistoryByDays,
  getClientTotalSpent,
  getClientTotalGpSpent
};