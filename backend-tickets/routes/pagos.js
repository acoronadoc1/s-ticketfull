// routes/pagos.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 💰 MÓDULO: NÓMINA Y PAGO DE HORAS
// =====================================================

router.post('/pagos/nomina', async (req, res) => {
  const { fechaInicio, fechaFin, idMecanico } = req.body;
  try {
    const pool = await getConnection();
    let query = `
      SELECT 
        D.ID_DETALLE_SRV AS id, CONVERT(VARCHAR, D.FECHA_FIN, 23) AS fecha,
        'ORD-' + CAST(O.ID_ORDEN AS VARCHAR) AS orden, O.PLACA AS placa,
        S.NOMBRE_SERVICIO AS servicio,
        CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60 AS VARCHAR) + 'h ' + CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) % 60 AS VARCHAR) + 'm' AS tiempo,
        DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) AS minutosReales,
        CAST((DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60.0) * 16.67 AS DECIMAL(10,2)) AS generado,
        M.NOMBRE_MECANICO AS mecanico
      FROM DETALLE_ORDEN_SERVICIOS D
      INNER JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN
      INNER JOIN FACTURAS F ON O.ID_ORDEN = F.ID_ORDEN
      INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO
      WHERE D.ESTADO = 'Finalizado' AND F.ESTADO = 'Pagada' AND D.FECHA_INICIO IS NOT NULL AND D.FECHA_FIN IS NOT NULL
    `;
    if (fechaInicio && fechaFin) query += ` AND D.FECHA_FIN >= @inicio AND D.FECHA_FIN <= @fin + ' 23:59:59'`;
    if (idMecanico && idMecanico !== 'todos') query += ` AND D.ID_USUARIO_TECNICO = @idM`;
    query += ` ORDER BY D.FECHA_FIN DESC`;

    const request = pool.request();
    if (fechaInicio) request.input('inicio', sql.VarChar, fechaInicio);
    if (fechaFin) request.input('fin', sql.VarChar, fechaFin);
    if (idMecanico && idMecanico !== 'todos') request.input('idM', sql.Int, parseInt(idMecanico));

    const result = await request.query(query);
    const detalles = result.recordset.map(fila => ({ ...fila, generado: parseFloat(fila.generado) || 0 }));
    const totalGenerado = detalles.reduce((sum, fila) => sum + fila.generado, 0);
    const totalMinutos = detalles.reduce((sum, fila) => sum + fila.minutosReales, 0);
    const horasString = `${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}m`;

    res.json({ success: true, detalles, totales: { horasText: horasString, bonoCalculado: totalGenerado } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/pagos/mecanicos', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT ID_MECANICO, NOMBRE_MECANICO FROM MECANICOS");
    res.json({ success: true, mecanicos: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.put('/pagos/liquidar/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request().input('id', sql.Int, req.params.id).query("UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = 'Liquidado' WHERE ID_DETALLE_SRV = @id");
    res.json({ success: true, message: 'Línea liquidada correctamente' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/pagos/liquidar-masivo', async (req, res) => {
  const { ids } = req.body; 
  if (!ids || ids.length === 0) return res.json({ success: true });
  try {
    const pool = await getConnection();
    await pool.request().query(`UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = 'Liquidado' WHERE ID_DETALLE_SRV IN (${ids.join(',')})`);
    res.json({ success: true, message: 'Nómina liquidada masivamente' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/pagos/historial', async (req, res) => {
  const { idMecanico, fechaInicio, fechaFin } = req.body;
  try {
    const pool = await getConnection();
    let query = `
      SELECT D.ID_DETALLE_SRV AS id, CONVERT(VARCHAR, D.FECHA_FIN, 23) AS fecha, 'ORD-' + CAST(D.ID_ORDEN AS VARCHAR) AS orden, M.NOMBRE_MECANICO AS mecanico, S.NOMBRE_SERVICIO AS servicio, CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60 AS VARCHAR) + 'h ' + CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) % 60 AS VARCHAR) + 'm' AS tiempo, CAST((DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60.0) * 16.67 AS DECIMAL(10,2)) AS generado FROM DETALLE_ORDEN_SERVICIOS D INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO WHERE D.ESTADO = 'Liquidado'
    `;
    if (idMecanico !== 'todos') query += ` AND D.ID_USUARIO_TECNICO = @idM`;
    if (fechaInicio && fechaFin) query += ` AND D.FECHA_FIN BETWEEN @inicio AND @fin`;
    
    const request = pool.request();
    if (idMecanico !== 'todos') request.input('idM', sql.Int, idMecanico);
    if (fechaInicio) request.input('inicio', sql.VarChar, fechaInicio);
    if (fechaFin) request.input('fin', sql.VarChar, fechaFin);
    
    const result = await request.query(query + " ORDER BY D.FECHA_FIN DESC");
    res.json({ success: true, historial: result.recordset });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;