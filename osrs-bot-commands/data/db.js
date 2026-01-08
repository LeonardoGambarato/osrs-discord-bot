const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dbPromise = open({
  filename: "./data/wallet.db",
  driver: sqlite3.Database
});

async function initDatabase() {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_clients (
      discord_id TEXT PRIMARY KEY,
      username TEXT,
      balance REAL DEFAULT 0,      -- USD
      balance_gp REAL DEFAULT 0,   -- GP em M
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallet_boosters (
      discord_id TEXT PRIMARY KEY,
      username TEXT,
      balance REAL DEFAULT 0,      -- BRL
      total_earned REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT,
      role TEXT,
      type TEXT,
      amount REAL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      usd_brl REAL NOT NULL DEFAULT 0,
      service_gp_rate REAL NOT NULL DEFAULT 0,
      buy_gp_rate REAL NOT NULL DEFAULT 0,
      sell_gp_rate REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT,
      description TEXT,
      quantity INTEGER,

      price_usd REAL DEFAULT 0,
      price_gp REAL DEFAULT 0,
      price_brl REAL DEFAULT 0,

      payment_method TEXT DEFAULT 'usd', -- usd | gp

      booster_payment_brl REAL,
      commission_percent REAL,

      client_id TEXT,
      booster_id TEXT,
      ticket_channel_id TEXT,

      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    );
    
  `
);

  await db.run(`
    INSERT OR IGNORE INTO exchange_rates
    (id, usd_brl, service_gp_rate, buy_gp_rate, sell_gp_rate)
    VALUES (1, 0, 0, 0, 0)
  `);
  /* =========================
   MIGRAÇÃO SERVICES (SAFE)
========================= */
const safeAlter = async (sql) => {
  try {
    await db.exec(sql);
  } catch {
    // coluna já existe
  }
};

await safeAlter(`ALTER TABLE services ADD COLUMN price_gp REAL DEFAULT 0`);
await safeAlter(`ALTER TABLE services ADD COLUMN payment_method TEXT DEFAULT 'usd'`);

  console.log("✅ Banco iniciado (USD + GP)");
}

module.exports = { dbPromise, initDatabase };
