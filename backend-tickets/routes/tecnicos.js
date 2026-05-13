// routes/tecnicos.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');
const transporter = require('../config/mailer'); // 📧 Importamos Nodemailer

// =====================================================
// 👨‍🔧 MÓDULO: GESTIÓN DE TÉCNICOS Y TAREAS
// =====================================================

// 1. Cargar datos iniciales (Órdenes, Mecánicos, Servicios)
router.get('/tecnicos/datos-iniciales', async (req, res) => {
  try {
    const pool = await getConnection();
    const ordenes = await pool.request().query("SELECT ID_ORDEN as ID, PLACA, 'ORDEN' as TIPO FROM ORDENES_TRABAJO WHERE ESTADO = 'Recibido' UNION ALL SELECT ID_CITA as ID, PLACA, 'CITA' as TIPO FROM CITAS_WEB WHERE ESTADO = 'Pendiente'");
    const mecanicos = await pool.request().query("SELECT M.ID_MECANICO, M.NOMBRE_MECANICO + ' (' + CAST((SELECT COUNT(*) FROM DETALLE_ORDEN_SERVICIOS D WHERE D.ID_USUARIO_TECNICO = M.ID_MECANICO AND D.ESTADO NOT IN ('Finalizado', 'Liquidado')) AS VARCHAR) + ' activas)' AS NOMBRE_MECANICO FROM MECANICOS M");
    const servicios = await pool.request().query("SELECT ID_SERVICIO, NOMBRE_SERVICIO, PRECIO_BASE AS PRECIO_ESTANDAR FROM CATALOGO_SERVICIOS WHERE ESTADO = 'Activo'");
    res.json({ ordenes: ordenes.recordset, mecanicos: mecanicos.recordset, servicios: servicios.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 2. Asignar Tareas
router.post('/tecnicos/asignar', async (req, res) => {
  const { idSeleccionado, tipo, idsServicios, idsMecanicos } = req.body; 
  try {
    const pool = await getConnection();
    let idOrdenFinal = idSeleccionado;
    if (tipo === 'CITA') {
      const cita = await pool.request().input('idC', sql.Int, idSeleccionado).query("SELECT * FROM CITAS_WEB WHERE ID_CITA = @idC");
      const c = cita.recordset[0];
      const nuevaOrden = await pool.request()
        .input('placa', sql.VarChar, c.PLACA).input('coment', sql.VarChar, c.MOTIVO_CITA || 'Sin observaciones previas')
        .input('idCita', sql.Int, c.ID_CITA).input('idCot', sql.Int, c.ID_COTIZACION || null)
        .query("INSERT INTO ORDENES_TRABAJO (PLACA, FECHA_INGRESO, ESTADO, COMENTARIO_CLIENTE, ID_CITA, ID_COTIZACION) OUTPUT INSERTED.ID_ORDEN VALUES (@placa, GETDATE(), 'En Revisión', @coment, @idCita, @idCot)");
      idOrdenFinal = nuevaOrden.recordset[0].ID_ORDEN;
      await pool.request().input('idC', sql.Int, idSeleccionado).query("UPDATE CITAS_WEB SET ESTADO = 'Atendida' WHERE ID_CITA = @idC");
    }

    for (let idServicio of idsServicios) {
      for (let idMecanico of idsMecanicos) {
        await pool.request()
          .input('idO', sql.Int, idOrdenFinal).input('idS', sql.Int, idServicio).input('idM', sql.Int, idMecanico)
          .query("INSERT INTO DETALLE_ORDEN_SERVICIOS (ID_ORDEN, ID_SERVICIO, ID_USUARIO_TECNICO, ESTADO) VALUES (@idO, @idS, @idM, 'Asignado')");
      }
    }
    res.json({ success: true, message: 'Vehículo recibido y orden generada' });
  } catch (err) { res.status(500).send(err.message); }
});

// 3. Ver Trabajo Actual (Tarjetas Kanban de mecánicos)
router.get('/tecnicos/trabajo-actual', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT D.ID_DETALLE_SRV, D.ID_ORDEN, O.PLACA, S.NOMBRE_SERVICIO, M.NOMBRE_MECANICO, D.ESTADO, D.ID_USUARIO_TECNICO AS ID_MECANICO FROM DETALLE_ORDEN_SERVICIOS D INNER JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO WHERE D.ESTADO NOT IN ('Finalizado', 'Liquidado')");
    res.json(result.recordset);
  } catch (err) { res.status(500).send([]); }
});

// 4. Actualizar Estado de Tarea y ENVIAR CORREO
router.put('/tecnicos/actualizar-estado', async (req, res) => {
  const { idDetalle, idOrden, nuevoEstado } = req.body; 
  try {
    const pool = await getConnection();
    await pool.request().input('est', sql.VarChar, nuevoEstado).input('idD', sql.Int, idDetalle).query("UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = @est WHERE ID_DETALLE_SRV = @idD");
    await pool.request().input('est', sql.VarChar, nuevoEstado).input('idO', sql.Int, idOrden).query("UPDATE ORDENES_TRABAJO SET ESTADO = @est WHERE ID_ORDEN = @idO");

    const infoCliente = await pool.request().input('idO', sql.Int, idOrden).query("SELECT C.CORREO, C.NOMBRE_CLIENTE, V.MARCA, V.MODELO, V.PLACA FROM ORDENES_TRABAJO O INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA INNER JOIN CLIENTES C ON V.ID_CLIENTE = C.ID_CLIENTE WHERE O.ID_ORDEN = @idO");
    const datos = infoCliente.recordset[0];

    if (datos && datos.CORREO) {
      const mailOptions = {
        from: `"Taller Automotriz" <${process.env.EMAIL_USER}>`, to: datos.CORREO, subject: `🚘 Actualización Orden #${idOrden}`,
        html: `<h3>Hola ${datos.NOMBRE_CLIENTE}, el estado de tu ${datos.MARCA} es: ${nuevoEstado}</h3>`
      };
      transporter.sendMail(mailOptions).catch(console.error);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 5. Finalizar Tarea (Inventario + Factura)
router.put('/tecnicos/finalizar', async (req, res) => {
  const { idDetalle, idOrden } = req.body;
  try {
    const pool = await getConnection();
    const infoServicio = await pool.request().input('idD', sql.Int, idDetalle).query("SELECT ID_SERVICIO FROM DETALLE_ORDEN_SERVICIOS WHERE ID_DETALLE_SRV = @idD");
    const idServicio = infoServicio.recordset[0].ID_SERVICIO;

    const receta = await pool.request().input('idS', sql.Int, idServicio).query("SELECT ID_ITEM, CANTIDAD FROM RECETAS_SERVICIOS WHERE ID_SERVICIO = @idS");
    for (let item of receta.recordset) {
      await pool.request().input('idItem', sql.Int, item.ID_ITEM).input('cant', sql.Int, item.CANTIDAD).query("UPDATE INVENTARIO SET STOCK_ACTUAL = STOCK_ACTUAL - @cant WHERE ID_ITEM = @idItem");
    }

    await pool.request().input('idD', sql.Int, idDetalle).query("UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = 'Finalizado', FECHA_FIN = GETDATE(), PRECIO_COBRADO = ISNULL(CAST(DATEDIFF(MINUTE, FECHA_INICIO, GETDATE()) AS FLOAT) / 60.0 * 125.00, 0) WHERE ID_DETALLE_SRV = @idD");
    await pool.request().input('idO', sql.Int, idOrden).query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Listo para Entrega' WHERE ID_ORDEN = @idO");

    const resTotales = await pool.request().input('idO', sql.Int, idOrden).query("SELECT ISNULL((SELECT SUM(PRECIO_COBRADO) FROM DETALLE_ORDEN_SERVICIOS WHERE ID_ORDEN = @idO), 0) + ISNULL((SELECT SUM(SUBTOTAL) FROM DETALLE_ORDEN_REPUESTOS WHERE ID_ORDEN = @idO), 0) AS TotalFinal");
    const totalFinal = resTotales.recordset[0].TotalFinal;

    const ultimo = await pool.request().query("SELECT TOP 1 NUMERO_FACTURA FROM FACTURAS ORDER BY ID_FACTURA DESC");
    let sig = 1; if (ultimo.recordset.length > 0) sig = parseInt(ultimo.recordset[0].NUMERO_FACTURA.replace('FAC-', '')) + 1;
    const numFac = 'FAC-' + sig.toString().padStart(3, '0');

    await pool.request().input('idO', sql.Int, idOrden).input('num', sql.VarChar, numFac).input('tot', sql.Decimal(10, 2), totalFinal)
      .query("INSERT INTO FACTURAS (ID_ORDEN, NUMERO_FACTURA, FECHA_FACTURACION, SUBTOTAL, IMPUESTOS, TOTAL, ESTADO) VALUES (@idO, @num, GETDATE(), @tot / 1.12, (@tot / 1.12) * 0.12, @tot, 'Pendiente')");

    res.json({ success: true, message: "Tarea finalizada." });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 6. Agregar repuestos extra
router.post('/tecnicos/repuestos-extra', async (req, res) => {
  const { idOrden, idItem, cantidad } = req.body;
  try {
    const pool = await getConnection();
    const infoItem = await pool.request().input('id', sql.Int, idItem).query("SELECT PRECIO_VENTA FROM INVENTARIO WHERE ID_ITEM = @id");
    const precio = infoItem.recordset[0].PRECIO_VENTA;
    await pool.request().input('idO', sql.Int, idOrden).input('idI', sql.Int, idItem).input('cant', sql.Int, cantidad).input('precio', sql.Decimal(10,2), precio).input('sub', sql.Decimal(10,2), precio * cantidad)
      .query("INSERT INTO DETALLE_ORDEN_REPUESTOS (ID_ORDEN, ID_ITEM, CANTIDAD, PRECIO_UNITARIO, SUBTOTAL) VALUES (@idO, @idI, @cant, @precio, @sub)");
    await pool.request().input('idI', sql.Int, idItem).input('cant', sql.Int, cantidad).query("UPDATE INVENTARIO SET STOCK_ACTUAL = STOCK_ACTUAL - @cant WHERE ID_ITEM = @idI");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 7. Historial
router.get('/tecnicos/historial', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT D.ID_ORDEN, O.PLACA, S.NOMBRE_SERVICIO, M.NOMBRE_MECANICO, D.FECHA_FIN, (S.PRECIO_BASE + ISNULL((SELECT SUM(SUBTOTAL) FROM DETALLE_ORDEN_REPUESTOS WHERE ID_ORDEN = D.ID_ORDEN), 0)) AS PRECIO_COBRADO FROM DETALLE_ORDEN_SERVICIOS D INNER JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO WHERE D.ESTADO = 'Finalizado' ORDER BY D.FECHA_FIN DESC");
    res.json(result.recordset);
  } catch (err) { res.status(500).send([]); }
});

module.exports = router;