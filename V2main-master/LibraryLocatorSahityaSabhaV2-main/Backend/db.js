require("dotenv").config();
const mysql = require("mysql2");

 codex/analyze-yii_book-repo-and-database-schema-x3a3sb
const DB_ENV_ALIASES = {
  DB_HOST: ["DB_HOST", "DB_Host", "db_host"],
  DB_USER: ["DB_USER", "DB_User", "db_user"],
  DB_PASS: ["DB_PASS", "DB_Pass", "db_pass"],
  DB_NAME: ["DB_NAME", "DB_Name", "db_name"],
};

function resolveEnvValue(keys = []) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

const dbConfig = {
  host: resolveEnvValue(DB_ENV_ALIASES.DB_HOST),
  user: resolveEnvValue(DB_ENV_ALIASES.DB_USER),
  password: resolveEnvValue(DB_ENV_ALIASES.DB_PASS),
  database: resolveEnvValue(DB_ENV_ALIASES.DB_NAME),
};

const missingDbEnv = Object.entries({
  DB_HOST: dbConfig.host,
  DB_USER: dbConfig.user,
  DB_PASS: dbConfig.password,
  DB_NAME: dbConfig.database,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingDbEnv.length > 0) {
  console.error("[Startup] Missing required database environment variables:");
  missingDbEnv.forEach((key) => {
    console.error(` - ${key} (accepted aliases: ${DB_ENV_ALIASES[key].join(", ")})`);
  });
  console.error(
    "[Startup] Create Backend/.env from Backend/.env.example and set DB_HOST/DB_USER/DB_PASS/DB_NAME before running npm start."

const REQUIRED_DB_ENV = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"];
const missingDbEnv = REQUIRED_DB_ENV.filter((key) => !process.env[key]);

if (missingDbEnv.length > 0) {
  console.error("[Startup] Missing required database environment variables:");
  missingDbEnv.forEach((key) => console.error(` - ${key}`));
  console.error(
    "[Startup] Create Backend/.env from Backend/.env.example and fill all DB_* values before running npm start."
 main
  );
  process.exit(1);
}

const db = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Optional pool events for logging
db.on("connection", () => {
  console.log("[DB] New connection created");
});

db.on("acquire", () => {
  console.log("[DB] Connection acquired");
});

db.on("release", () => {
  console.log("[DB] Connection released");
});

db.on("enqueue", () => {
  console.log("[DB] Waiting for available connection");
});

// Simple startup test
async function testDbConnection() {
  try {
    const [rows] = await db.promise().query("SELECT 1 AS ok");
    if (!rows?.length || rows[0].ok !== 1) {
      throw new Error("Test query failed");
    }
    console.log("[DB] Pool connected successfully");
  } catch (err) {
    console.error("[DB] Pool connection failed:", err.message);
    throw err;
  }
}

// Graceful shutdown
async function closeDbPool() {
  try {
    await db.promise().end();
    console.log("[DB] Pool closed");
  } catch (err) {
    console.error("[DB] Error while closing pool:", err.message);
  }
}

module.exports = {
  db,
  testDbConnection,
  closeDbPool
};
