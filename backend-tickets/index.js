require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------
// ⚙️ CONFIGURACIÓN DE LA BASE DE DATOS
// -----------------------------------------------------
const dbConfig = {
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  server: process.env.DB_SERVER, 
  database: process.env.DB_NAME, 
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: false, 
    trustServerCertificate: true 
  }
};

// Conexión inicial
sql.connect(dbConfig)
  .then(() => console.log("✅ Conectado exitosamente a SQL Server"))
  .catch((err) => console.error("❌ Error de conexión:", err));

// =====================================================
// 🔑 MÓDULO: SEGURIDAD (LOGIN)
// =====================================================
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('u', sql.VarChar, usuario)
      .input('p', sql.VarChar, password)
      .query("SELECT ID_USUARIO, ROL, ID_CLIENTE, ESTADO FROM USUARIOS WHERE NOMBRE_USUARIO = @u AND CLAVE = @p");

    if (result.recordset.length > 0) {
      const u = result.recordset[0];
      if (u.ESTADO !== 'Activo') return res.status(403).json({ success: false, mensaje: 'Usuario inactivo.' });
      res.json({ success: true, rol: u.ROL, idCliente: u.ID_CLIENTE });
    } else {
      res.status(401).json({ success: false, mensaje: 'Credenciales inválidas.' });
    }
  } catch (err) { res.status(500).json({ success: false }); }
});

// =====================================================
// 📈 MÓDULO: DASHBOARD (MÉTRICAS Y GARAJE)
// =====================================================
app.get('/api/metricas', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const veh = await pool.request().query("SELECT COUNT(*) AS total FROM VEHICULOS");
    const cit = await pool.request().query("SELECT COUNT(*) AS total FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = CAST(GETDATE() AS DATE)");
    const fac = await pool.request().query("SELECT SUM(TOTAL) AS total FROM FACTURAS WHERE MONTH(FECHA_FACTURACION) = MONTH(GETDATE())");
    res.json({ success: true, vehiculos: veh.recordset[0].total, citas: cit.recordset[0].total, facturado: fac.recordset[0].total || 0 });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/garaje', async (req, res) => {
  const { idCliente } = req.body; 
  if (!idCliente) return res.status(400).json({ success: false, mensaje: "ID no proporcionado." });
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().input('id', sql.Int, idCliente)
      .query(`SELECT V.PLACA, V.MARCA, V.MODELO, ISNULL((SELECT TOP 1 ESTADO FROM ORDENES_TRABAJO WHERE PLACA = V.PLACA ORDER BY ID_ORDEN DESC), 'Sin ingreso activo') AS ESTADO_ACTUAL FROM VEHICULOS V WHERE V.ID_CLIENTE = @id`);
    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

// =====================================================
// 🚗 MÓDULO: VEHÍCULOS (GESTIÓN)
// =====================================================
app.get('/api/vehiculos/cliente/:id', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().input('id', sql.Int, req.params.id).query("SELECT * FROM VEHICULOS WHERE ID_CLIENTE = @id");
    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/vehiculos', async (req, res) => {
  const { placa, marca, modelo, anio, color, id_cliente } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('p', sql.VarChar, placa).input('m', sql.VarChar, marca)
      .input('mod', sql.VarChar, modelo).input('a', sql.Int, anio)
      .input('c', sql.VarChar, color).input('id', sql.Int, id_cliente)
      .query("INSERT INTO VEHICULOS (PLACA, MARCA, MODELO, ANIO, COLOR, ID_CLIENTE) VALUES (@p, @m, @mod, @a, @c, @id)");
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

// =====================================================
// 🛠️ MÓDULO: TALLER (KANBAN COMPLETO)
// =====================================================
app.post('/api/ordenes', async (req, res) => {
  const { rol, idCliente } = req.body; 
  try {
    const pool = await sql.connect(dbConfig);
    let query = `SELECT O.*, V.MARCA, V.MODELO FROM ORDENES_TRABAJO O INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA WHERE O.ESTADO != 'Entregado'`;
    if (rol !== 'Admin') { query += ` AND V.ID_CLIENTE = ${parseInt(idCliente)}`; }
    const result = await pool.request().query(query);
    res.json({ success: true, ordenes: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/ordenes/:id/estado', async (req, res) => {
  const { id } = req.params; const { nuevoEstado } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input('id', sql.Int, id).input('est', sql.VarChar, nuevoEstado).query("UPDATE ORDENES_TRABAJO SET ESTADO = @est WHERE ID_ORDEN = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/ordenes/:id/peritaje', async (req, res) => {
  const { id } = req.params; const { estadoVisual, estadoInterno } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input('id', sql.Int, id).input('v', sql.VarChar, estadoVisual).input('i', sql.VarChar, estadoInterno).query("UPDATE ORDENES_TRABAJO SET ESTADO_VISUAL = @v, ESTADO_INTERNO = @i WHERE ID_ORDEN = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// FINALIZAR ORDEN CON FACTURA AUTOINCREMENTAL
app.post('/api/ordenes/:id/finalizar', async (req, res) => {
  const { id } = req.params;
  const { total } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const ultimoRegistro = await pool.request().query("SELECT TOP 1 NUMERO_FACTURA FROM FACTURAS ORDER BY ID_FACTURA DESC");
    let siguienteNumero = 1;
    if (ultimoRegistro.recordset.length > 0) {
      const ultimoNumStr = ultimoRegistro.recordset[0].NUMERO_FACTURA.replace('FAC-', '');
      siguienteNumero = parseInt(ultimoNumStr) + 1;
    }
    const numFac = 'FAC-' + siguienteNumero.toString().padStart(3, '0');

    await pool.request().input('id', sql.Int, id).query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Entregado' WHERE ID_ORDEN = @id");
    await pool.request()
      .input('idO', sql.Int, id).input('num', sql.VarChar, numFac).input('tot', sql.Decimal(10, 2), total)
      .query(`INSERT INTO FACTURAS (ID_ORDEN, NUMERO_FACTURA, FECHA_FACTURACION, SUBTOTAL, IMPUESTOS, TOTAL, ESTADO)
              VALUES (@idO, @num, GETDATE(), @tot / 1.12, (@tot / 1.12) * 0.12, @tot, 'Pendiente')`);
    res.json({ success: true, factura: numFac });
  } catch (err) { res.status(500).json({ success: false }); }
});

// =====================================================
// 🧾 MÓDULO: FACTURACIÓN (GESTIÓN PRO)
// =====================================================
app.post('/api/facturas', async (req, res) => {
  const { rol, idCliente } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    let query = `SELECT F.*, O.PLACA FROM FACTURAS F LEFT JOIN ORDENES_TRABAJO O ON F.ID_ORDEN = O.ID_ORDEN LEFT JOIN VEHICULOS V ON O.PLACA = V.PLACA WHERE 1=1`;
    const request = pool.request();
    if (rol !== 'Admin') { query += ` AND V.ID_CLIENTE = @idParam`; request.input('idParam', sql.Int, parseInt(idCliente) || 0); }
    const result = await request.query(query);

    const facturasConRepuestos = await Promise.all(result.recordset.map(async (fac) => {
      try {
        const repuestos = await pool.request().input('idOrden', sql.Int, fac.ID_ORDEN).query("SELECT D.CANTIDAD, D.PRECIO_UNITARIO, I.NOMBRE_ITEM FROM DETALLE_ORDEN_REPUESTOS D INNER JOIN INVENTARIO I ON D.ID_ITEM = I.ID_ITEM WHERE D.ID_ORDEN = @idOrden");
        return { ...fac, repuestos: repuestos.recordset };
      } catch (err) { return { ...fac, repuestos: [] }; }
    }));
    res.json({ success: true, facturas: facturasConRepuestos });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.put('/api/facturas/:id/cambiar-estado', async (req, res) => {
  const { id } = req.params;
  const { estadoActual } = req.body;
  const nuevoEstado = estadoActual === 'Pagada' ? 'Pendiente' : 'Pagada';
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input('id', sql.Int, id).input('est', sql.VarChar, nuevoEstado)
      .query("UPDATE FACTURAS SET ESTADO = @est WHERE ID_FACTURA = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/facturas/:id', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input('id', sql.Int, req.params.id).query("DELETE FROM FACTURAS WHERE ID_FACTURA = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// =====================================================
// 📅 MÓDULO: CITAS Y CONEXIÓN AL KANBAN
// =====================================================
app.get('/api/citas/disponibles/:fecha', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().input('f', sql.Date, req.params.fecha).query("SELECT HORA_CITA FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = @f AND ESTADO != 'Cancelada'");
    res.json({ success: true, ocupadas: result.recordset.map(r => r.HORA_CITA) });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/citas', async (req, res) => {
  const { id_cliente, placa, fecha, hora, motivo } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const cliRes = await pool.request().input('id', sql.Int, id_cliente).query("SELECT NOMBRE_CLIENTE FROM CLIENTES WHERE ID_CLIENTE = @id");
    const nombreC = cliRes.recordset[0]?.NOMBRE_CLIENTE || 'Cliente Web';

    await pool.request()
      .input('id', sql.Int, id_cliente).input('p', sql.VarChar, placa).input('f', sql.Date, fecha)
      .input('h', sql.VarChar, hora).input('m', sql.VarChar, motivo).input('nom', sql.VarChar, nombreC)
      .query(`INSERT INTO CITAS_WEB (ID_CLIENTE, PLACA, FECHA_CITA, HORA_CITA, MOTIVO, NOMBRE_CONTACTO, ESTADO, FECHA_CREACION) 
              VALUES (@id, @p, @f, @h, @m, @nom, 'Pendiente', GETDATE())`);

    await pool.request().input('p', sql.VarChar, placa).input('m', sql.VarChar, motivo)
      .query("INSERT INTO ORDENES_TRABAJO (PLACA, FECHA_INGRESO, ESTADO, COMENTARIO_CLIENTE) VALUES (@p, GETDATE(), 'Recibido', @m)");

    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

// 🚀 ENCENDIDO DEL SERVIDOR
const PUERTO = 3000;
app.listen(PUERTO, () => console.log(`🚀 API activa en http://localhost:${PUERTO}`));