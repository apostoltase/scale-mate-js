// Conectare la baza de date

const { Pool } = require("pg");

// Conectare la PostgreSQL
const pool = new Pool({
  user: "tase",
  host: "192.168.0.139",
  database: "scalemate-db",
  password: "15421542",
  port: 5432,
});

module.exports = pool;
