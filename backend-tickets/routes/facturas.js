// routes/facturas.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 🧾 MÓDULO: FACTURACIÓN
// =====================================================

// 1. Obtener listado de facturas
router.post('/facturas', async (req, res) => {
  const { rol, idCliente } = req.body;
  try {
    const pool = await getConnection();
    let query = `
      SELECT F.ID_FACTURA, F.NUMERO_FACTURA, O.ID_ORDEN, F.FECHA_FACTURACION, 
             F.TOTAL, F.ESTADO, O.PLACA 
      FROM FACTURAS F
      INNER JOIN ORDENES_TRABAJO O ON F.ID_ORDEN = O.ID_ORDEN
    `;
    
    if (rol !== 'Admin') {
      query += ` INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA WHERE V.ID_CLIENTE = @idC`;
    }
    query += ` ORDER BY F.ID_FACTURA DESC`;

    const request = pool.request();
    if (rol !== 'Admin') request.input('idC', sql.Int, parseInt(idCliente));
    
    const result = await request.query(query);
    res.json({ success: true, facturas: result.recordset });
  } catch (err) {
    console.error("❌ Error al obtener facturas:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Cambiar estado de factura y liberar vehículo
router.put('/facturas/:id/cambiar-estado', async (req, res) => {
  const { id } = req.params;
  const { estadoActual } = req.body;
  const nuevoEstado = estadoActual === 'Pagada' ? 'Pendiente' : 'Pagada';
  
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .input('est', sql.VarChar, nuevoEstado)
      .query("UPDATE FACTURAS SET ESTADO = @est WHERE ID_FACTURA = @id");

    // LÓGICA DE NEGOCIO: Si se pagó, el carro sale del taller.
    if (nuevoEstado === 'Pagada') {
      await pool.request().input('idF', sql.Int, id)
        .query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Entregado' WHERE ID_ORDEN = (SELECT ID_ORDEN FROM FACTURAS WHERE ID_FACTURA = @idF)");
    } else {
      await pool.request().input('idF', sql.Int, id)
        .query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Listo para Entrega' WHERE ID_ORDEN = (SELECT ID_ORDEN FROM FACTURAS WHERE ID_FACTURA = @idF)");
    }
    res.json({ success: true, mensaje: `Factura marcada como ${nuevoEstado}` });
  } catch (err) { 
    console.error("❌ Error al cambiar estado de pago:", err.message);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

// 3. Eliminar Factura
router.delete('/facturas/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request().input('id', sql.Int, req.params.id).query("DELETE FROM FACTURAS WHERE ID_FACTURA = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;