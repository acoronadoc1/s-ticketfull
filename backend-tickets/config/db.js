// config/db.js
const sql = require('mssql');
require('dotenv').config();

// ⚙️ CONFIGURACIÓN CENTRAL DE LA BASE DE DATOS
const dbConfig = {
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  server: process.env.DB_SERVER, 
  database: process.env.DB_NAME, 
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// Función para obtener la conexión a la base de datos
const getConnection = async () => {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error("❌ Error de conexión a SQL Server:", err.message);
    throw err;
  }
};

module.exports = { sql, getConnection };