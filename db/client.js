require("dotenv").config();
pgPassword = process.env.Postgres_Password;

const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: pgPassword,
  database: "3047",
});

module.exports = {
  pool
};
