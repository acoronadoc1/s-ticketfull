// routes/ordenes.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');
const upload = require('../config/upload'); // ☁️ Importamos Multer/Cloudinary

// =====================================================
// 🛠️ MÓDULO: TALLER (KANBAN Y RECEPCIÓN)
// =====================================================

// 1. Obtener órdenes para el monitor
router.post('/ordenes', async (req, res) => {
  const { rol, idCliente } = req.body; 
  try {
    const pool = await getConnection();
    let query = `SELECT O.*, V.MARCA, V.MODELO FROM ORDENES_TRABAJO O INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA WHERE O.ESTADO != 'Entregado'`;
    if (rol !== 'Admin') { query += ` AND V.ID_CLIENTE = ${parseInt(idCliente)}`; }
    const result = await pool.request().query(query);
    res.json({ success: true, ordenes: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 2. Mover tarjeta en el Kanban (Actualizar Estado)
router.put('/ordenes/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .input('estado', sql.VarChar, nuevoEstado)
      .query("UPDATE ORDENES_TRABAJO SET ESTADO = @estado WHERE ID_ORDEN = @id");
    res.json({ success: true, mensaje: 'Estado actualizado correctamente' });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 3. Guardar peritaje (Observaciones de recepción)
router.put('/ordenes/:id/peritaje', async (req, res) => {
  const { id } = req.params;
  const { observacionesRecepcion } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .input('obs', sql.VarChar, observacionesRecepcion)
      .query("UPDATE ORDENES_TRABAJO SET OBSERVACIONES_RECEPCION = @obs WHERE ID_ORDEN = @id");
    res.json({ success: true, mensaje: 'Observaciones guardadas' });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 4. Ingresar vehículo desde una cita
router.post('/ordenes/ingreso-desde-cita', async (req, res) => {
  const { idCita, placa, comentario, idCotizacion } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('placa', sql.VarChar, placa)
      .input('comentario', sql.VarChar, comentario)
      .input('idCita', sql.Int, idCita)
      .input('idCot', sql.Int, idCotizacion || null)
      .query(`
        INSERT INTO ORDENES_TRABAJO (PLACA, FECHA_INGRESO, COMENTARIO_CLIENTE, ESTADO, ID_CITA, ID_COTIZACION) 
        VALUES (@placa, GETDATE(), @comentario, 'Recibido', @idCita, @idCot)
      `);
    await pool.request().input('idCita', sql.Int, idCita).query("UPDATE CITAS_WEB SET ESTADO = 'Ingresado' WHERE ID_CITA = @idCita");
    res.json({ success: true, mensaje: 'Vehículo ingresado con éxito' });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 5. Recepción Fotográfica (Usa 'upload' middleware)
router.put('/ordenes/:id/recepcion-imagenes', upload.fields([
  { name: 'fotoFrente', maxCount: 1 }, { name: 'fotoTrasera', maxCount: 1 },
  { name: 'fotoLateralDerecho', maxCount: 1 }, { name: 'fotoLateralIzquierdo', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.body; 
  const files = req.files;

  try {
    const pool = await getConnection();
    let idOrdenFinal = id;

    if (tipo === 'CITA') {
      const cita = await pool.request().input('idC', sql.Int, id).query("SELECT * FROM CITAS_WEB WHERE ID_CITA = @idC");
      const c = cita.recordset[0];
      const nuevaOrden = await pool.request()
        .input('placa', sql.VarChar, c.PLACA).input('coment', sql.VarChar, c.MOTIVO_CITA || 'Sin observaciones')
        .input('idCita', sql.Int, c.ID_CITA).input('idCot', sql.Int, c.ID_COTIZACION || null)
        .query(`INSERT INTO ORDENES_TRABAJO (PLACA, FECHA_INGRESO, ESTADO, COMENTARIO_CLIENTE, ID_CITA, ID_COTIZACION) OUTPUT INSERTED.ID_ORDEN VALUES (@placa, GETDATE(), 'Recibido', @coment, @idCita, @idCot)`);
      idOrdenFinal = nuevaOrden.recordset[0].ID_ORDEN;
      await pool.request().input('idC', sql.Int, id).query("UPDATE CITAS_WEB SET ESTADO = 'Atendida' WHERE ID_CITA = @idC");
    }

    await pool.request().input('id', sql.Int, idOrdenFinal)
      .input('f', sql.VarChar, files['fotoFrente'] ? files['fotoFrente'][0].path : null)
      .input('t', sql.VarChar, files['fotoTrasera'] ? files['fotoTrasera'][0].path : null)
      .input('d', sql.VarChar, files['fotoLateralDerecho'] ? files['fotoLateralDerecho'][0].path : null)
      .input('i', sql.VarChar, files['fotoLateralIzquierdo'] ? files['fotoLateralIzquierdo'][0].path : null)
      .query(`UPDATE ORDENES_TRABAJO SET FOTO_FRENTE = COALESCE(@f, FOTO_FRENTE), FOTO_TRASERA = COALESCE(@t, FOTO_TRASERA), FOTO_LATERAL_DERECHO = COALESCE(@d, FOTO_LATERAL_DERECHO), FOTO_LATERAL_IZQUIERDO = COALESCE(@i, FOTO_LATERAL_IZQUIERDO) WHERE ID_ORDEN = @id`);
    
    res.json({ success: true, message: 'Imágenes guardadas', nuevoIdOrden: tipo === 'CITA' ? idOrdenFinal : null });
  } catch (err) { res.status(500).json({ success: false }); }
});



module.exports = router;