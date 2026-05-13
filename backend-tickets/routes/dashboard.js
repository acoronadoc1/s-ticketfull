// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 📊 MÓDULO: DASHBOARD Y MÉTRICAS
// =====================================================

router.get('/metricas', async (req, res) => {
  try {
    const pool = await getConnection();
    const veh = await pool.request().query("SELECT COUNT(*) AS total FROM VEHICULOS");
    
    // FIX: Forzamos a SQL a restar 6 horas para obtener la fecha real de Guatemala
    const cit = await pool.request().query(`
      SELECT COUNT(*) AS total FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = CAST(DATEADD(HOUR, -6, GETUTCDATE()) AS DATE)
    `);

    const fac = await pool.request().query(`
      SELECT SUM(TOTAL) AS total FROM FACTURAS WHERE MONTH(FECHA_FACTURACION) = MONTH(DATEADD(HOUR, -6, GETUTCDATE()))
    `);

    res.json({ 
      success: true, 
      vehiculos: veh.recordset[0].total, 
      citas: cit.recordset[0].total, 
      facturado: fac.recordset[0].total || 0 
    });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;