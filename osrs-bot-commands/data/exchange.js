const { dbPromise } = require("./db");

/* =========================
   CORE
========================= */
async function getExchange() {
  const db = await dbPromise;

  const row = await db.get(`
    SELECT
      usd_brl,
      service_gp_rate,
      buy_gp_rate,
      sell_gp_rate
    FROM exchange_rates
    WHERE id = 1
  `);

  if (!row) throw new Error("Cotações não configuradas.");

  return {
    usdBrl: Number(row.usd_brl),

    serviceGp: Number(row.service_gp_rate), // serviços
    buyGp: Number(row.buy_gp_rate),         // compra
    sellGp: Number(row.sell_gp_rate)        // venda
  };
}

/* =========================
   SETTERS
========================= */
const setUsdBrl = rate =>
  dbPromise.then(db =>
    db.run(`UPDATE exchange_rates SET usd_brl = ? WHERE id = 1`, rate)
  );

const setServiceGp = rate =>
  dbPromise.then(db =>
    db.run(`UPDATE exchange_rates SET service_gp_rate = ? WHERE id = 1`, rate)
  );

const setBuyGp = rate =>
  dbPromise.then(db =>
    db.run(`UPDATE exchange_rates SET buy_gp_rate = ? WHERE id = 1`, rate)
  );

const setSellGp = rate =>
  dbPromise.then(db =>
    db.run(`UPDATE exchange_rates SET sell_gp_rate = ? WHERE id = 1`, rate)
  );

/* =========================
   CONVERSÕES (EM M)
========================= */
async function buyMtoUsd(m) {
  const { buyGp } = await getExchange();
  return m * buyGp;
}

async function sellMtoUsd(m) {
  const { sellGp } = await getExchange();
  return m * sellGp;
}

/* =========================
   COMPAT (ADMIN ANTIGO)
========================= */
async function getExchangeRate() {
  const { usdBrl } = await getExchange();
  return usdBrl;
}

async function setExchangeRate(rate) {
  return setUsdBrl(rate);
}

module.exports = {
  getExchange,

  setUsdBrl,
  setServiceGp,
  setBuyGp,
  setSellGp,

  buyMtoUsd,
  sellMtoUsd,

  getExchangeRate,
  setExchangeRate
};