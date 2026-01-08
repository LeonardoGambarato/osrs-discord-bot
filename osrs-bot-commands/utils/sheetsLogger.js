const { google } = require("googleapis");

/* =========================
   CONFIG
========================= */
const SPREADSHEET_ID = "1Hp05DT76tx4Mkl29gxypKs4_LyZgvrTJJVaijiQ6VLc";
// ⚠️ use o MESMO credentials.json que você já usa
const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

/* =========================
   APPEND ROW (GENÉRICO)
========================= */
async function appendRow(range, values) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values]
      }
    });
  } catch (err) {
    console.error("❌ Erro ao enviar dados para o Sheets:", err.message);
  }
}

/* =========================
   HELPERS ESPECÍFICOS
========================= */

// 🔹 LOG DE TRANSAÇÕES
async function logTransactionSheet({
  discordId,
  role,
  type,
  amount,
  description
}) {
  await appendRow("Transactions_Log!A:F", [
    new Date().toISOString(),
    discordId,
    role,
    type,
    amount,
    description
  ]);
}

// 🔹 LOG DE SERVIÇOS
async function logServiceSheet({
  serviceId,
  service,
  clientId,
  boosterId,
  usd,
  brl,
  status
}) {
  await appendRow("Services_Log!A:H", [
    new Date().toISOString(),
    serviceId,
    service,
    clientId,
    boosterId || "N/A",
    usd,
    brl,
    status
  ]);
}

// 🔹 LOG DE TIPS
async function logTipSheet({
  fromId,
  toId,
  amount
}) {
  await appendRow("Tips_Log!A:D", [
    new Date().toISOString(),
    fromId,
    toId,
    amount
  ]);
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  appendRow,
  logTransactionSheet,
  logServiceSheet,
  logTipSheet
};
