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
// 🧾 MÓDULO: FACTURACIÓN (CORREGIDO CON LEFT JOIN)
// =====================================================
app.post('/api/facturas', async (req, res) => {
  const { rol, idCliente } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT F.*, O.PLACA 
      FROM FACTURAS F 
      LEFT JOIN ORDENES_TRABAJO O ON F.ID_ORDEN = O.ID_ORDEN 
      WHERE 1=1
    `;
    
    const request = pool.request();
    if (rol !== 'Admin' && idCliente) {
        query += ` AND O.PLACA IN (SELECT PLACA FROM VEHICULOS WHERE ID_CLIENTE = @idParam)`;
        request.input('idParam', sql.Int, parseInt(idCliente));
    }

    const result = await request.query(query);

    const facturasConRepuestos = await Promise.all(result.recordset.map(async (fac) => {
      try {
        const repuestos = await pool.request()
          .input('idOrden', sql.Int, fac.ID_ORDEN)
          .query("SELECT D.CANTIDAD, D.PRECIO_UNITARIO, I.NOMBRE_ITEM FROM DETALLE_ORDEN_REPUESTOS D INNER JOIN INVENTARIO I ON D.ID_ITEM = I.ID_ITEM WHERE D.ID_ORDEN = @idOrden");
        return { ...fac, repuestos: repuestos.recordset };
      } catch (err) { return { ...fac, repuestos: [] }; }
    }));

    res.json({ success: true, facturas: facturasConRepuestos });
  } catch (err) { 
    res.status(500).json({ success: false }); 
  }
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
// 👥 MÓDULO: CLIENTES
// =====================================================
app.get('/api/clientes', async (req, res) => { 
  try {
    const pool = await sql.connect(dbConfig); 
    const result = await pool.request().query(`
      SELECT C.ID_CLIENTE, C.NIT, C.NOMBRE_CLIENTE, C.TELEFONO, C.ESTADO, U.NOMBRE_USUARIO 
      FROM CLIENTES C LEFT JOIN USUARIOS U ON C.ID_CLIENTE = U.ID_CLIENTE 
      WHERE C.ESTADO != 'Inactivo' OR C.ESTADO IS NULL`);
    res.json({ success: true, clientes: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/clientes', async (req, res) => {
  const { nit, nombre, telefono, usuario, password } = req.body; 
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().input('n', sql.VarChar, nit || 'C/F').input('nom', sql.VarChar, nombre).input('t', sql.VarChar, telefono)
      .query("INSERT INTO CLIENTES (NIT, NOMBRE_CLIENTE, TELEFONO, ESTADO) OUTPUT INSERTED.ID_CLIENTE VALUES (@n, @nom, @t, 'Activo')");
    
    const nuevoIdCliente = result.recordset[0].ID_CLIENTE;
    if (usuario && usuario.trim() !== "" && password) {
      await pool.request().input('u', sql.VarChar, usuario).input('p', sql.VarChar, password).input('idC', sql.Int, nuevoIdCliente)
        .query("INSERT INTO USUARIOS (NOMBRE_USUARIO, CLAVE, ROL, ID_CLIENTE, ESTADO) VALUES (@u, @p, 'Usuario', @idC, 'Activo')");
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// =====================================================
// 🛠️ MÓDULO: TALLER (KANBAN)
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

app.post('/api/ordenes/:id/finalizar', async (req, res) => {
  const { id } = req.params; const { total } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const ultimo = await pool.request().query("SELECT TOP 1 NUMERO_FACTURA FROM FACTURAS ORDER BY ID_FACTURA DESC");
    let sig = 1;
    if (ultimo.recordset.length > 0) sig = parseInt(ultimo.recordset[0].NUMERO_FACTURA.replace('FAC-', '')) + 1;
    const numFac = 'FAC-' + sig.toString().padStart(3, '0');

    await pool.request().input('id', sql.Int, id).query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Entregado' WHERE ID_ORDEN = @id");
    await pool.request().input('idO', sql.Int, id).input('num', sql.VarChar, numFac).input('tot', sql.Decimal(10, 2), total)
      .query(`INSERT INTO FACTURAS (ID_ORDEN, NUMERO_FACTURA, FECHA_FACTURACION, SUBTOTAL, IMPUESTOS, TOTAL, ESTADO) VALUES (@idO, @num, GETDATE(), @tot / 1.12, (@tot / 1.12) * 0.12, @tot, 'Pendiente')`);
    res.json({ success: true, factura: numFac });
  } catch (err) { res.status(500).json({ success: false }); }
});

// =====================================================
// 🚗 OTROS MÓDULOS (GARAJE, MÉTRICAS)
// =====================================================
app.post('/api/garaje', async (req, res) => {
  const { idCliente } = req.body; 
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().input('id', sql.Int, idCliente)
      .query(`SELECT V.PLACA, V.MARCA, V.MODELO, V.COLOR, ISNULL((SELECT TOP 1 ESTADO FROM ORDENES_TRABAJO WHERE PLACA = V.PLACA ORDER BY ID_ORDEN DESC), 'Sin ingreso') AS ESTADO_ACTUAL FROM VEHICULOS V WHERE V.ID_CLIENTE = @id`);
    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/metricas', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const veh = await pool.request().query("SELECT COUNT(*) AS total FROM VEHICULOS");
    const cit = await pool.request().query("SELECT COUNT(*) AS total FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = CAST(GETDATE() AS DATE)");
    const fac = await pool.request().query("SELECT SUM(TOTAL) AS total FROM FACTURAS WHERE MONTH(FECHA_FACTURACION) = MONTH(GETDATE())");
    res.json({ success: true, vehiculos: veh.recordset[0].total, citas: cit.recordset[0].total, facturado: fac.recordset[0].total || 0 });
  } catch (err) { res.status(500).json({ success: false }); }
});

const PUERTO = 3000;
app.listen(PUERTO, () => console.log(`🚀 Servidor activo en puerto ${PUERTO}`));