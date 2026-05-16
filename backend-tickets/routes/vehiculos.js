// routes/vehiculos.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 🚗 MÓDULO: VEHICULOS Y GARAJE
// =====================================================

// 1. Obtener vehículos de un cliente específico
router.get('/vehiculos/cliente/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query("SELECT * FROM VEHICULOS WHERE ID_CLIENTE = @id");
    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) { 
    console.error("Error al obtener vehículos:", err);
    res.status(500).json({ success: false }); 
  }
});

// 2. Registrar un nuevo vehículo
router.post('/vehiculos', async (req, res) => {
  const { placa, marca, modelo, anio, color, id_cliente } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('p', sql.VarChar, placa)
      .input('m', sql.VarChar, marca)
      .input('mo', sql.VarChar, modelo)
      .input('a', sql.Int, anio)
      .input('c', sql.VarChar, color)
      .input('idC', sql.Int, id_cliente)
      .query(`
        INSERT INTO VEHICULOS (PLACA, MARCA, MODELO, [AÑO], COLOR, ID_CLIENTE)
        VALUES (@p, @m, @mo, @a, @c, @idC)
      `);
    res.json({ success: true, mensaje: 'Vehículo registrado exitosamente' });
  } catch (err) {
    console.error("Error al registrar vehículo:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Módulo Garaje (Ver vehículos y su estado actual en el taller)
router.post('/garaje', async (req, res) => {
  const { idCliente } = req.body; 
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, idCliente)
      .query(`
        SELECT V.PLACA, V.MARCA, V.MODELO, V.COLOR, 
        ISNULL((SELECT TOP 1 ESTADO FROM ORDENES_TRABAJO WHERE PLACA = V.PLACA ORDER BY ID_ORDEN DESC), 'Sin ingreso') AS ESTADO_ACTUAL 
        FROM VEHICULOS V WHERE V.ID_CLIENTE = @id
      `);
    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) { 
    res.status(500).json({ success: false }); 
  }
});


// =====================================================
// 📋 RUTAS DE CATÁLOGOS PARA SELECTS EN CASCADA
// =====================================================
router.get('/vehiculos/catalogos', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Traemos todas las marcas activas
    const marcas = await pool.request().query("SELECT ID_MARCA, NOMBRE_MARCA FROM CATALOGO_MARCAS WHERE ESTADO = 'Activo' ORDER BY NOMBRE_MARCA ASC");
    
    // Traemos todos los modelos activos
    const modelos = await pool.request().query("SELECT ID_MODELO, ID_MARCA, NOMBRE_MODELO FROM CATALOGO_MODELOS WHERE ESTADO = 'Activo' ORDER BY NOMBRE_MODELO ASC");
    
    res.json({ 
      success: true, 
      marcas: marcas.recordset, 
      modelos: modelos.recordset 
    });
  } catch (err) {
    console.error("❌ Error al obtener catálogos:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});




module.exports = router;