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


// 4. Obtener detalle completo de una factura (Cliente + Servicios + Repuestos)
router.get('/facturas/:id/detalle', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    // A. Datos Generales de Factura, Cliente y Vehículo
    const infoGeneral = await pool.request().input('id', sql.Int, id).query(`
      SELECT F.NUMERO_FACTURA, F.FECHA_FACTURACION, F.SUBTOTAL, F.IMPUESTOS, F.TOTAL, F.ESTADO,
             O.ID_ORDEN, O.PLACA, O.COMENTARIO_CLIENTE,
             V.MARCA, V.MODELO,
             C.NOMBRE_CLIENTE, C.CORREO
      FROM FACTURAS F
      INNER JOIN ORDENES_TRABAJO O ON F.ID_ORDEN = O.ID_ORDEN
      INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA
      INNER JOIN CLIENTES C ON V.ID_CLIENTE = C.ID_CLIENTE
      WHERE F.ID_FACTURA = @id
    `);

    if (infoGeneral.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Factura no encontrada" });
    }

    // B. Servicios mano de obra consumidos
    const servicios = await pool.request().input('id', sql.Int, id).query(`
      SELECT S.NOMBRE_SERVICIO, D.PRECIO_COBRADO AS TOTAL_LINEA
      FROM DETALLE_ORDEN_SERVICIOS D
      INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      WHERE D.ID_ORDEN = (SELECT ID_ORDEN FROM FACTURAS WHERE ID_FACTURA = @id)
    `);

    // C. Repuestos extras utilizados
    const repuestos = await pool.request().input('id', sql.Int, id).query(`
      SELECT I.NOMBRE_ITEM, DR.CANTIDAD, DR.PRECIO_UNITARIO, DR.SUBTOTAL as TOTAL_LINEA
      FROM DETALLE_ORDEN_REPUESTOS DR
      INNER JOIN INVENTARIO I ON DR.ID_ITEM = I.ID_ITEM
      WHERE DR.ID_ORDEN = (SELECT ID_ORDEN FROM FACTURAS WHERE ID_FACTURA = @id)
    `);

    res.json({
      success: true,
      general: infoGeneral.recordset[0],
      servicios: servicios.recordset,
      repuestos: repuestos.recordset
    });

  } catch (err) {
    console.error("Error al obtener detalle de factura:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;