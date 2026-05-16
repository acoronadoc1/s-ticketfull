// routes/cotizaciones.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 📝 MÓDULO: COTIZACIONES WEB
// =====================================================

// 1. Crear cotización
router.post('/cotizaciones', async (req, res) => {
  const { idCliente, placa, paqueteId, fallaDescripcion } = req.body;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('idC', sql.Int, idCliente)
      .input('placa', sql.VarChar, placa)
      .input('idS', sql.Int, paqueteId || null)
      .input('obs', sql.VarChar, fallaDescripcion || '')
      .query(`
        INSERT INTO COTIZACIONES 
        (ID_CLIENTE, PLACA, ID_SERVICIO, OBSERVACIONES, FECHA_COTIZACION, ESTADO)
        OUTPUT INSERTED.ID_COTIZACION 
        VALUES 
        (@idC, @placa, @idS, @obs, DATEADD(HOUR, -6, GETUTCDATE()), 'Pendiente')
      `);

    const idGenerado = result.recordset[0].ID_COTIZACION;
    res.json({ success: true, mensaje: 'Cotización solicitada correctamente', idCotizacion: idGenerado });
  } catch (err) {
    console.error("❌ Error al guardar cotización:", err.message);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
});

// 2. Obtener cotizaciones pendientes de un cliente
router.get('/cotizaciones/pendientes/:idCliente', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('idC', sql.Int, req.params.idCliente)
      .query(`
        SELECT C.*, S.NOMBRE_SERVICIO 
        FROM COTIZACIONES C
        LEFT JOIN CATALOGO_SERVICIOS S ON C.ID_SERVICIO = S.ID_SERVICIO
        WHERE C.ID_CLIENTE = @idC AND C.ESTADO = 'Pendiente'
      `);
    res.json({ success: true, cotizaciones: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Eliminar una cotización
router.delete('/cotizaciones/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM COTIZACIONES WHERE ID_COTIZACION = @id');
    res.json({ success: true, mensaje: 'Cotización eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;