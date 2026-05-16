// routes/citas.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 📅 MÓDULO: CITAS
// =====================================================

// 1. Consultar disponibilidad de horarios para una fecha
router.get('/citas/disponibles/:fecha', async (req, res) => {
  const { fecha } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query("SELECT HORA_CITA FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = @fecha AND ESTADO != 'Cancelada'");
    
    // Extraemos solo las horas en un array simple
    const ocupadas = result.recordset.map(r => r.HORA_CITA);
    res.json({ success: true, ocupadas });
  } catch (err) {
    console.error("Error al consultar disponibilidad:", err);
    res.status(500).json({ success: false });
  }
});

// 2. Agendar Nueva Cita Web
router.post('/citas', async (req, res) => {
  const { id_cliente, placa, fecha, hora, motivo, id_cotizacion } = req.body;
  try {
    const pool = await getConnection();
    
    // Buscamos los datos del cliente
    const resCliente = await pool.request()
      .input('idC', sql.Int, id_cliente)
      .query('SELECT NOMBRE_CLIENTE, TELEFONO FROM CLIENTES WHERE ID_CLIENTE = @idC');
    
    const nombreUsuario = resCliente.recordset[0]?.NOMBRE_CLIENTE || 'Usuario Web';
    const telefonoUsuario = resCliente.recordset[0]?.TELEFONO || '0000-0000';

    // Insertamos en CITAS_WEB
    await pool.request()
      .input('idC', sql.Int, id_cliente)
      .input('nombre', sql.VarChar, nombreUsuario)
      .input('tel', sql.VarChar, telefonoUsuario)
      .input('placa', sql.VarChar, placa)
      .input('fecha', sql.Date, fecha)
      .input('hora', sql.VarChar, hora)
      .input('motivo', sql.VarChar, motivo)
      .input('idCot', sql.Int, id_cotizacion || null)
      .query(`
        INSERT INTO CITAS_WEB (
          ID_CLIENTE, NOMBRE_CONTACTO, TELEFONO_CONTACTO, PLACA, 
          FECHA_CITA, HORA_CITA, MOTIVO_CITA, ID_COTIZACION, ESTADO
        )
        VALUES (
          @idC, @nombre, @tel, @placa, 
          @fecha, @hora, @motivo, @idCot, 'Pendiente'
        )
      `);

    // Marcar cotización como completada (si existe)
    if (id_cotizacion) {
      await pool.request()
        .input('idCot', sql.Int, id_cotizacion)
        .query("UPDATE COTIZACIONES SET ESTADO = 'Completada' WHERE ID_COTIZACION = @idCot");
    }

    res.json({ success: true, mensaje: 'Cita agendada correctamente' });
  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN CITAS:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Obtener Citas pendientes del día
router.get('/citas/hoy', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ID_CITA, ID_CLIENTE, NOMBRE_CONTACTO, PLACA, MOTIVO_CITA, ID_COTIZACION 
      FROM CITAS_WEB 
      WHERE CAST(FECHA_CITA AS DATE) = CAST(DATEADD(HOUR, -6, GETUTCDATE()) AS DATE) 
      AND ESTADO = 'Pendiente'
    `);
    res.json({ success: true, citas: result.recordset });
  } catch (err) {
    console.error("Error al obtener citas:", err);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;