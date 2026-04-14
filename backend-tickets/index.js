require('dotenv').config();
const express = require('express');
const cors = require('cors');

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ☁️ CONFIGURACIÓN DE CLOUDINARY
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// 📦 CONFIGURACIÓN DE MULTER (El intermediario que recibe la foto de React)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'taller_recepcion', // Así se llamará la carpeta en tu nube
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const upload = multer({ storage: storage });

const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());




///CONFIGURACION NODEMAILER
const nodemailer = require('nodemailer');

// 📧 CONFIGURACIÓN DE NODEMAILER (Motor de notificaciones)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo desde donde saldrán los avisos
    pass: process.env.EMAIL_PASS  // Tu Contraseña de Aplicación de Google
  }
});




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
    encrypt:true,
    trustServerCertificate: false
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
// 📅 MÓDULO: CITAS (Para Citas.jsx)
// =====================================================

// 1. Consultar disponibilidad de horarios para una fecha
app.get('/api/citas/disponibles/:fecha', async (req, res) => {
  const { fecha } = req.params;
  try {
    const pool = await sql.connect(dbConfig);
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

// =====================================================
// 📅 MÓDULO: CITAS (Versión Final Corregida)
// =====================================================

app.post('/api/citas', async (req, res) => {
  const { id_cliente, placa, fecha, hora, motivo, id_cotizacion } = req.body;
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // 🔍 1. Buscamos los datos con los nombres EXACTOS de tu tabla CLIENTES
    const resCliente = await pool.request()
      .input('idC', sql.Int, id_cliente)
      .query('SELECT NOMBRE_CLIENTE, TELEFONO FROM CLIENTES WHERE ID_CLIENTE = @idC'); // ✅ NOMBRE_CLIENTE corregido
    
    const nombreUsuario = resCliente.recordset[0]?.NOMBRE_CLIENTE || 'Usuario Web';
    const telefonoUsuario = resCliente.recordset[0]?.TELEFONO || '0000-0000';

    // 📝 2. Insertamos en CITAS_WEB usando tus columnas NOT NULL
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

    // ⚡ 3. Marcar cotización como completada
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


// =====================================================
// 🚗 MÓDULO: VEHICULOS (Para Agendar Cita)
// =====================================================

// 1. Obtener vehículos de un cliente específico
app.get('/api/vehiculos/cliente/:id', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query("SELECT * FROM VEHICULOS WHERE ID_CLIENTE = @id");
    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) { 
    console.error("Error al obtener vehículos:", err);
    res.status(500).json({ success: false }); 
  }
});

// 🚗 Registrar un nuevo vehículo (Para el modal de Citas.jsx)
app.post('/api/vehiculos', async (req, res) => {
  const { placa, marca, modelo, anio, color, id_cliente } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('p', sql.VarChar, placa)
      .input('m', sql.VarChar, marca)
      .input('mo', sql.VarChar, modelo)
      .input('a', sql.Int, anio)
      .input('c', sql.VarChar, color)
      .input('idC', sql.Int, id_cliente)
      .query(`
        INSERT INTO VEHICULOS (PLACA, MARCA, MODELO, [AÑO], COLOR, ID_CLIENTE)
        VALUES (@p, @m, @mo, @a, @c, @idC)
      `);
    res.json({ success: true, mensaje: 'Vehículo registrado exitosamente' });
  } catch (err) {
    console.error("Error al registrar vehículo:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});



// =====================================================
// 📝 MÓDULO: COTIZACIONES WEB
// =====================================================

app.post('/api/cotizaciones', async (req, res) => {
  const { idCliente, placa, paqueteId, fallaDescripcion } = req.body;
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // Insertamos usando TU tabla existente: COTIZACIONES
    const result = await pool.request()
      .input('idC', sql.Int, idCliente)
      .input('placa', sql.VarChar, placa)
      .input('idS', sql.Int, paqueteId || null)
      .input('obs', sql.VarChar, fallaDescripcion || '')
      .query(`
        INSERT INTO COTIZACIONES 
        (ID_CLIENTE, PLACA, ID_SERVICIO, OBSERVACIONES, FECHA_COTIZACION, ESTADO)
        OUTPUT INSERTED.ID_COTIZACION -- ⚡ TRUCO: Devuelve el ID recién creado
        VALUES 
        (@idC, @placa, @idS, @obs, DATEADD(HOUR, -6, GETUTCDATE()), 'Pendiente')
      `);

    const idGenerado = result.recordset[0].ID_COTIZACION;

    res.json({ 
      success: true, 
      mensaje: 'Cotización solicitada correctamente',
      idCotizacion: idGenerado // Mandamos el pasaporte de vuelta a React
    });

  } catch (err) {
    console.error("❌ Error al guardar cotización:", err.message);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
});

// 1. Obtener cotizaciones pendientes de un cliente
app.get('/api/cotizaciones/pendientes/:idCliente', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
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

// 2. Eliminar una cotización
app.delete('/api/cotizaciones/:id', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM COTIZACIONES WHERE ID_COTIZACION = @id');
    res.json({ success: true, mensaje: 'Cotización eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



/// =====================================================
// 📖 CATÁLOGO DE SERVICIOS (Dinámico con Inventario y Filtro Activo)
// =====================================================

app.get('/api/servicios', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // 1. Traemos SOLO los servicios básicos que están ACTIVOS
    const resServicios = await pool.request().query(`
      SELECT ID_SERVICIO, NOMBRE_SERVICIO, PRECIO_BASE AS PRECIO_MANO_OBRA 
      FROM CATALOGO_SERVICIOS
      WHERE ESTADO = 'Activo'
    `);
    const servicios = resServicios.recordset;

    // 2. Traemos TODAS las recetas cruzadas con los precios de bodega
    const resRecetas = await pool.request().query(`
      SELECT 
        R.ID_SERVICIO, 
        R.CANTIDAD, 
        I.NOMBRE_ITEM, 
        I.PRECIO_VENTA
      FROM RECETAS_SERVICIOS R
      INNER JOIN INVENTARIO I ON R.ID_ITEM = I.ID_ITEM
    `);
    const recetas = resRecetas.recordset;

    // 3. Armamos el objeto final emparejando cada servicio con su receta
    const catalogoCompleto = servicios.map(servicio => {
      // Filtramos los items de inventario que pertenecen a este servicio
      const itemsReceta = recetas.filter(r => r.ID_SERVICIO === servicio.ID_SERVICIO);
      
      // Sumamos el total del inventario + la mano de obra para dar el Total Estimado
      const totalRepuestos = itemsReceta.reduce((sum, item) => sum + (item.CANTIDAD * item.PRECIO_VENTA), 0);
      const precioTotal = servicio.PRECIO_MANO_OBRA + totalRepuestos;

      return {
        ID_SERVICIO: servicio.ID_SERVICIO,
        NOMBRE_SERVICIO: servicio.NOMBRE_SERVICIO,
        PRECIO: precioTotal, // El total real calculado
        receta: itemsReceta  // La lista detallada para dibujar en React
      };
    });
    
    res.json({ success: true, servicios: catalogoCompleto });
  } catch (err) {
    console.error("❌ Error al obtener el catálogo dinámico:", err.message);
    res.status(500).json({ success: false, servicios: [] });
  }
});


// =====================================================
// 💳 CAMBIAR ESTADO DE FACTURA Y LIBERAR VEHÍCULO: MÓDULO: FACTURACIÓN 
// =====================================================
app.put('/api/facturas/:id/cambiar-estado', async (req, res) => {
  const { id } = req.params;
  const { estadoActual } = req.body;
  // Si estaba pagada, la revierte a Pendiente, y viceversa
  const nuevoEstado = estadoActual === 'Pagada' ? 'Pendiente' : 'Pagada';
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // 1. Actualizamos el estado de la Factura
    await pool.request()
      .input('id', sql.Int, id)
      .input('est', sql.VarChar, nuevoEstado)
      .query("UPDATE FACTURAS SET ESTADO = @est WHERE ID_FACTURA = @id");

    // 2. ⚡ LÓGICA DE NEGOCIO: Si se pagó, el carro sale del taller.
    if (nuevoEstado === 'Pagada') {
      await pool.request()
        .input('idF', sql.Int, id)
        .query(`
          UPDATE ORDENES_TRABAJO 
          SET ESTADO = 'Entregado' 
          WHERE ID_ORDEN = (SELECT ID_ORDEN FROM FACTURAS WHERE ID_FACTURA = @idF)
        `);
    } else {
      // Opcional: Si reviertes el pago por error, el carro regresa a la sala de espera
      await pool.request()
        .input('idF', sql.Int, id)
        .query(`
          UPDATE ORDENES_TRABAJO 
          SET ESTADO = 'Listo para Entrega' 
          WHERE ID_ORDEN = (SELECT ID_ORDEN FROM FACTURAS WHERE ID_FACTURA = @idF)
        `);
    }

    res.json({ success: true, mensaje: `Factura marcada como ${nuevoEstado}` });
  } catch (err) { 
    console.error("❌ Error al cambiar estado de pago:", err.message);
    res.status(500).json({ success: false, error: err.message }); 
  }
});



// =====================================================
// 🧾 MÓDULO: FACTURACIÓN 
// =====================================================


app.delete('/api/facturas/:id', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input('id', sql.Int, req.params.id).query("DELETE FROM FACTURAS WHERE ID_FACTURA = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});




// =====================================================
// 👥 MÓDULO: CLIENTES (SOLO LÓGICA DE CÓDIGO - SIN TOCAR BD)
// =====================================================

// 1. LEER: Filtramos usando el ESTADO de la tabla USUARIOS (U.ESTADO)
app.get('/api/clientes', async (req, res) => { 
  try {
    const pool = await sql.connect(dbConfig); 
    const result = await pool.request().query(`
      SELECT 
        C.ID_CLIENTE, 
        C.NIT, 
        C.NOMBRE_CLIENTE, 
        C.TELEFONO, 
        U.NOMBRE_USUARIO
      FROM CLIENTES C 
      LEFT JOIN USUARIOS U ON C.ID_CLIENTE = U.ID_CLIENTE 
      -- Usamos U.ESTADO porque es la que sí existe en tu DB
      WHERE U.ESTADO != 'Inactivo' OR U.ESTADO IS NULL
    `);
    res.json({ success: true, clientes: result.recordset });
  } catch (err) { 
    console.error("❌ Error al leer clientes:", err.message);
    res.status(500).json({ success: false }); 
  }
});

// 2. CREAR: Solo mandamos ESTADO a la tabla de USUARIOS
app.post('/api/clientes', async (req, res) => {
  const { nit, nombre, telefono, usuario, password } = req.body; 
  try {
    const pool = await sql.connect(dbConfig);
    
    // Insertamos en CLIENTES (Sin columna ESTADO)
    const result = await pool.request()
      .input('n', sql.VarChar, nit || 'C/F')
      .input('nom', sql.VarChar, nombre)
      .input('t', sql.VarChar, telefono)
      .query(`
        INSERT INTO CLIENTES (NIT, NOMBRE_CLIENTE, TELEFONO) 
        OUTPUT INSERTED.ID_CLIENTE 
        VALUES (@n, @nom, @t)
      `);
    
    const nuevoIdCliente = result.recordset[0].ID_CLIENTE;

    if (usuario && usuario.trim() !== "" && password) {
      await pool.request()
        .input('u', sql.VarChar, usuario)
        .input('p', sql.VarChar, password)
        .input('idC', sql.Int, nuevoIdCliente)
        .query(`
          INSERT INTO USUARIOS (NOMBRE_USUARIO, CLAVE, ROL, ID_CLIENTE, ESTADO) 
          VALUES (@u, @p, 'Usuario', @idC, 'Activo')
        `);
    }
    res.json({ success: true });
  } catch (err) { 
    console.error("❌ Error al crear:", err.message);
    res.status(500).json({ success: false }); 
  }
});

// 3. EDITAR: Igual que antes, pero sin tocar C.ESTADO
app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nit, nombre, telefono, usuario, password } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, id)
      .input('n', sql.VarChar, nit)
      .input('nom', sql.VarChar, nombre)
      .input('t', sql.VarChar, telefono)
      .query("UPDATE CLIENTES SET NIT = @n, NOMBRE_CLIENTE = @nom, TELEFONO = @t WHERE ID_CLIENTE = @id");

    if (usuario && usuario.trim() !== "") {
      const userCheck = await pool.request().input('id', sql.Int, id).query("SELECT ID_USUARIO FROM USUARIOS WHERE ID_CLIENTE = @id");
      if (userCheck.recordset.length > 0) {
        let queryU = "UPDATE USUARIOS SET NOMBRE_USUARIO = @u";
        if (password) queryU += ", CLAVE = @p";
        queryU += " WHERE ID_CLIENTE = @id";
        const reqU = pool.request().input('u', sql.VarChar, usuario).input('id', sql.Int, id);
        if (password) reqU.input('p', sql.VarChar, password);
        await reqU.query(queryU);
      } else if (password) {
        await pool.request()
          .input('u', sql.VarChar, usuario).input('p', sql.VarChar, password).input('id', sql.Int, id)
          .query("INSERT INTO USUARIOS (NOMBRE_USUARIO, CLAVE, ROL, ID_CLIENTE, ESTADO) VALUES (@u, @p, 'Usuario', @id, 'Activo')");
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 4. INACTIVAR: Solo afectamos el acceso web del usuario
app.put('/api/clientes/:id/inactivar', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(dbConfig);
    // Como no hay ESTADO en Clientes, inactivamos el USUARIO. 
    // Al hacerlo, el WHERE del paso 1 lo sacará de la lista.
    await pool.request().input('id', sql.Int, id).query("UPDATE USUARIOS SET ESTADO = 'Inactivo' WHERE ID_CLIENTE = @id");
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



// --- ACTUALIZAR ESTADO DE LA ORDEN (MOVER EN KANBAN) ---
app.put('/api/ordenes/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, id)
      .input('estado', sql.VarChar, nuevoEstado)
      .query("UPDATE ORDENES_TRABAJO SET ESTADO = @estado WHERE ID_ORDEN = @id");
      
    res.json({ success: true, mensaje: 'Estado actualizado correctamente' });
  } catch (err) { 
    console.error("Error al actualizar estado:", err);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' }); 
  }
});

// --- GUARDAR OBSERVACIONES DE RECEPCIÓN (PERITAJE) ---
app.put('/api/ordenes/:id/peritaje', async (req, res) => {
  const { id } = req.params;
  const { observacionesRecepcion } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, id)
      .input('obs', sql.VarChar, observacionesRecepcion)
      .query("UPDATE ORDENES_TRABAJO SET OBSERVACIONES_RECEPCION = @obs WHERE ID_ORDEN = @id");
      
    res.json({ success: true, mensaje: 'Observaciones guardadas' });
  } catch (err) { 
    console.error("Error al guardar peritaje:", err);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' }); 
  }
});



// --- OBTENER CITAS PENDIENTES DEL DÍA ---
app.get('/api/citas/hoy', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    // ⚡ FIX: Cambiamos GETDATE() por el ajuste de zona horaria (-6 horas)
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

// --- INGRESAR VEHÍCULO DESDE CITA (EL PUENTE) ---
app.post('/api/ordenes/ingreso-desde-cita', async (req, res) => {
  const { idCita, placa, comentario, idCotizacion } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    
    // 1. Insertamos la nueva orden de trabajo (Nace en la columna 'Recibido')
    // Nota: Usamos los campos exactos de tu esquema Azure
    await pool.request()
      .input('placa', sql.VarChar, placa)
      .input('comentario', sql.VarChar, comentario)
      .input('idCita', sql.Int, idCita)
      .input('idCot', sql.Int, idCotizacion || null)
      .query(`
        INSERT INTO ORDENES_TRABAJO 
        (PLACA, FECHA_INGRESO, COMENTARIO_CLIENTE, ESTADO, ID_CITA, ID_COTIZACION) 
        VALUES 
        (@placa, GETDATE(), @comentario, 'Recibido', @idCita, @idCot)
      `);
    
    // 2. Actualizamos la Cita para marcarla como ingresada y que desaparezca del modal
    await pool.request()
      .input('idCita', sql.Int, idCita)
      .query("UPDATE CITAS_WEB SET ESTADO = 'Ingresado' WHERE ID_CITA = @idCita");

    res.json({ success: true, mensaje: 'Vehículo ingresado con éxito' });
  } catch (err) {
    console.error("Error en puente Cita-Orden:", err);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
});









 // =====================================================
// 📸 MÓDULO: RECEPCIÓN FOTOGRÁFICA (CON AUTO-CONVERSIÓN)
// =====================================================
app.put('/api/ordenes/:id/recepcion-imagenes', upload.fields([
  { name: 'fotoFrente', maxCount: 1 },
  { name: 'fotoTrasera', maxCount: 1 },
  { name: 'fotoLateralDerecho', maxCount: 1 },
  { name: 'fotoLateralIzquierdo', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.body; // 🕵️‍♂️ Recibimos si es CITA u ORDEN
  const files = req.files;

  try {
    const urlFrente = files['fotoFrente'] ? files['fotoFrente'][0].path : null;
    const urlTrasera = files['fotoTrasera'] ? files['fotoTrasera'][0].path : null;
    const urlDer = files['fotoLateralDerecho'] ? files['fotoLateralDerecho'][0].path : null;
    const urlIzq = files['fotoLateralIzquierdo'] ? files['fotoLateralIzquierdo'][0].path : null;

    const pool = await sql.connect(dbConfig);
    let idOrdenFinal = id;

    // ✨ MAGIA: Si viene de una CITA, la convertimos en ORDEN antes de guardar la foto
    if (tipo === 'CITA') {
      const cita = await pool.request().input('idC', sql.Int, id).query("SELECT * FROM CITAS_WEB WHERE ID_CITA = @idC");
      const c = cita.recordset[0];

      const nuevaOrden = await pool.request()
        .input('placa', sql.VarChar, c.PLACA)
        .input('coment', sql.VarChar, c.MOTIVO_CITA || 'Sin observaciones')
        .input('idCita', sql.Int, c.ID_CITA)
        .input('idCot', sql.Int, c.ID_COTIZACION || null)
        .query(`
          INSERT INTO ORDENES_TRABAJO (PLACA, FECHA_INGRESO, ESTADO, COMENTARIO_CLIENTE, ID_CITA, ID_COTIZACION)
          OUTPUT INSERTED.ID_ORDEN
          VALUES (@placa, GETDATE(), 'Recibido', @coment, @idCita, @idCot)
        `);

      idOrdenFinal = nuevaOrden.recordset[0].ID_ORDEN;

      // Desactivamos la cita
      await pool.request().input('idC', sql.Int, id).query("UPDATE CITAS_WEB SET ESTADO = 'Atendida' WHERE ID_CITA = @idC");
    }

    // 2. Guardamos las URLs usando el ID correcto (el nuevo o el que ya existía)
    await pool.request()
      .input('id', sql.Int, idOrdenFinal)
      .input('f', sql.VarChar, urlFrente)
      .input('t', sql.VarChar, urlTrasera)
      .input('d', sql.VarChar, urlDer)
      .input('i', sql.VarChar, urlIzq)
      .query(`
        UPDATE ORDENES_TRABAJO 
        SET 
          FOTO_FRENTE = COALESCE(@f, FOTO_FRENTE),
          FOTO_TRASERA = COALESCE(@t, FOTO_TRASERA),
          FOTO_LATERAL_DERECHO = COALESCE(@d, FOTO_LATERAL_DERECHO),
          FOTO_LATERAL_IZQUIERDO = COALESCE(@i, FOTO_LATERAL_IZQUIERDO)
        WHERE ID_ORDEN = @id
      `);

    res.json({ 
      success: true, 
      message: 'Recepción fotográfica guardada con éxito',
      nuevoIdOrden: tipo === 'CITA' ? idOrdenFinal : null // Le enviamos el nuevo ID a React
    });
  } catch (err) {
    console.error("❌ Error al subir imágenes:", err.message);
    res.status(500).json({ success: false, message: 'Error en el servidor al subir imágenes' });
  }
});







// =====================================================
// 🏁 FINALIZAR ORDEN Y GENERAR FACTURA (Cobro por Hora Real)
// =====================================================
app.post('/api/ordenes/:id/finalizar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(dbConfig);

    // ⏱️ 1. Calculamos la Mano de Obra (Horas Reales x Q125.00)
    // Usamos DATEDIFF para sacar los minutos, lo volvemos FLOAT para no perder decimales,
    // lo dividimos entre 60 para tener horas y lo multiplicamos por la tarifa del taller.
    const resServicios = await pool.request()
      .input('idO', sql.Int, id)
      .query(`
        SELECT ISNULL(SUM(CAST(DATEDIFF(MINUTE, FECHA_INICIO, FECHA_FIN) AS FLOAT) / 60.0 * 125.00), 0) AS totalMO 
        FROM DETALLE_ORDEN_SERVICIOS 
        WHERE ID_ORDEN = @idO 
        AND FECHA_INICIO IS NOT NULL 
        AND FECHA_FIN IS NOT NULL
      `);

    // 📦 2. Sumamos los Repuestos utilizados en esta orden
    const resRepuestos = await pool.request()
      .input('idO', sql.Int, id)
      .query(`
        SELECT ISNULL(SUM(SUBTOTAL), 0) AS totalRep 
        FROM DETALLE_ORDEN_REPUESTOS 
        WHERE ID_ORDEN = @idO
      `);

    const totalManoObra = resServicios.recordset[0].totalMO;
    const totalRepuestos = resRepuestos.recordset[0].totalRep;
    const totalFinal = totalManoObra + totalRepuestos;

    // 🧾 3. Generamos el correlativo (Ej. FAC-001)
    const ultimo = await pool.request().query("SELECT TOP 1 NUMERO_FACTURA FROM FACTURAS ORDER BY ID_FACTURA DESC");
    let sig = 1;
    if (ultimo.recordset.length > 0) {
       sig = parseInt(ultimo.recordset[0].NUMERO_FACTURA.replace('FAC-', '')) + 1;
    }
    const numFac = 'FAC-' + sig.toString().padStart(3, '0');

    // 💰 4. Guardamos la factura (Calculando el IVA del 12% apegado a la ley)
    await pool.request()
      .input('idO', sql.Int, id)
      .input('num', sql.VarChar, numFac)
      .input('tot', sql.Decimal(10, 2), totalFinal)
      .query(`
        INSERT INTO FACTURAS (ID_ORDEN, NUMERO_FACTURA, FECHA_FACTURACION, SUBTOTAL, IMPUESTOS, TOTAL, ESTADO) 
        VALUES (@idO, @num, GETDATE(), @tot / 1.12, (@tot / 1.12) * 0.12, @tot, 'Pendiente')
      `);

    // 🚗 5. El auto pasa a la sala de espera (Listo para Entrega)
    await pool.request()
      .input('id', sql.Int, id)
      .query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Listo para Entrega' WHERE ID_ORDEN = @id");

    res.json({ success: true, factura: numFac });
    
  } catch (err) {
    console.error("❌ Error al finalizar orden y facturar:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// =====================================================
// 👨‍🔧 MÓDULO: GESTIÓN DE TÉCNICOS
// =====================================================

/// 1. Datos iniciales usando la tabla MECANICOS de la BD
app.get('/api/tecnicos/datos-iniciales', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

   // Query Híbrido: Trae Órdenes abiertas Y Citas pendientes
const ordenes = await pool.request().query(`
  SELECT ID_ORDEN as ID, PLACA, 'ORDEN' as TIPO 
  FROM ORDENES_TRABAJO 
  WHERE ESTADO = 'Recibido'
  
  UNION ALL
  
  SELECT ID_CITA as ID, PLACA, 'CITA' as TIPO 
  FROM CITAS_WEB 
  WHERE ESTADO = 'Pendiente' 
  -- 🚀 Eliminamos el filtro de GETDATE() para ver todas las citas
`);


  // CAMBIO CLAVE: Carga Inteligente de Mecánicos (Máximo 4 tareas)
const mecanicos = await pool.request().query(`
      SELECT 
        M.ID_MECANICO, 
        M.NOMBRE_MECANICO + ' (' + CAST(
          (SELECT COUNT(*) 
           FROM DETALLE_ORDEN_SERVICIOS D 
           WHERE D.ID_USUARIO_TECNICO = M.ID_MECANICO 
           AND D.ESTADO NOT IN ('Finalizado', 'Liquidado')
          ) AS VARCHAR
        ) + ' activas)' AS NOMBRE_MECANICO
      FROM MECANICOS M
    `);


    // Catálogo de servicios
    // Cambia la línea de servicios por esta:
    const servicios = await pool.request().query("SELECT ID_SERVICIO, NOMBRE_SERVICIO, PRECIO_BASE AS PRECIO_ESTANDAR FROM CATALOGO_SERVICIOS WHERE ESTADO = 'Activo'");



    res.json({ 
      ordenes: ordenes.recordset, 
      mecanicos: mecanicos.recordset, 
      servicios: servicios.recordset 
    });
  } catch (err) { 
    console.error("Error en datos iniciales:", err);
    res.status(500).json({ success: false }); 
  }
});


// =====================================================
// 🔄 4. ACTUALIZAR ESTADO DE LA TAREA (Y ENVIAR CORREO)
// =====================================================
app.put('/api/tecnicos/actualizar-estado', async (req, res) => {
  // 🐛 FIX: Extraemos 'nuevoEstado' exactamente como lo envía React
  const { idDetalle, idOrden, nuevoEstado } = req.body; 
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // 1. Actualizamos el estado en las tablas
    await pool.request()
      .input('est', sql.VarChar, nuevoEstado)
      .input('idD', sql.Int, idDetalle)
      .query("UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = @est WHERE ID_DETALLE_SRV = @idD");

    await pool.request()
      .input('est', sql.VarChar, nuevoEstado)
      .input('idO', sql.Int, idOrden)
      .query("UPDATE ORDENES_TRABAJO SET ESTADO = @est WHERE ID_ORDEN = @idO");

    // 2. 📧 Buscar datos para el correo de notificación
    const infoCliente = await pool.request()
      .input('idO', sql.Int, idOrden)
      .query(`
        SELECT C.CORREO, C.NOMBRE_CLIENTE, V.MARCA, V.MODELO, V.PLACA 
        FROM ORDENES_TRABAJO O
        INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA
        INNER JOIN CLIENTES C ON V.ID_CLIENTE = C.ID_CLIENTE
        WHERE O.ID_ORDEN = @idO
      `);

    const datos = infoCliente.recordset[0];

    // 3. Disparar el correo si el cliente existe y tiene email
    if (datos && datos.CORREO) {
      const mailOptions = {
        from: `"Taller Automotriz" <${process.env.EMAIL_USER}>`,
        to: datos.CORREO,
        subject: `🚘 Actualización de tu vehículo - Orden #${idOrden}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #1565c0; text-align: center;">¡Hola, ${datos.NOMBRE_CLIENTE}!</h2>
            <p style="font-size: 16px; color: #333;">Te informamos que hay novedades con tu <strong>${datos.MARCA} ${datos.MODELO} (Placas: ${datos.PLACA})</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #666; margin-bottom: 5px;">El nuevo estado de tu vehículo es:</p>
              <span style="background-color: #ff9800; color: white; padding: 10px 20px; border-radius: 20px; font-size: 18px; font-weight: bold;">
                ${nuevoEstado}
              </span>
            </div>
            <p style="font-size: 14px; color: #555;">Puedes revisar el progreso en vivo y las fotos de recepción desde nuestro portal web.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        `
      };
      
      transporter.sendMail(mailOptions)
        .then(() => console.log(`📧 Correo enviado a ${datos.CORREO} (Estado: ${nuevoEstado})`))
        .catch(err => console.error("❌ Error enviando correo:", err));
    }

    res.json({ success: true, message: 'Estado actualizado y notificación enviada' });
  } catch (err) {
    console.error("❌ Error al actualizar estado:", err.message);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});




// =====================================================
// 2. Asignar Tareas (VERSIÓN MAESTRA Y BLINDADA)
// =====================================================
app.post('/api/tecnicos/asignar', async (req, res) => {
  const { idSeleccionado, tipo, idsServicios, idsMecanicos } = req.body; 
  
  try {
    const pool = await sql.connect(dbConfig);
    let idOrdenFinal = idSeleccionado;

    // ✨ SI ES UNA CITA, LA CONVERTIMOS EN ORDEN PRIMERO
    if (tipo === 'CITA') {
      // 1. Buscamos los datos en CITAS_WEB
      const cita = await pool.request()
        .input('idC', sql.Int, idSeleccionado)
        .query("SELECT * FROM CITAS_WEB WHERE ID_CITA = @idC");
      
      const c = cita.recordset[0];

      // 2. Insertamos en ORDENES_TRABAJO (Blindado contra nulos)
      const nuevaOrden = await pool.request()
        .input('placa', sql.VarChar, c.PLACA)
        .input('coment', sql.VarChar, c.MOTIVO_CITA || 'Sin observaciones previas')
        .input('idCita', sql.Int, c.ID_CITA)
        .input('idCot', sql.Int, c.ID_COTIZACION || null)
        .query(`
          INSERT INTO ORDENES_TRABAJO 
          (PLACA, FECHA_INGRESO, ESTADO, COMENTARIO_CLIENTE, ID_CITA, ID_COTIZACION)
          OUTPUT INSERTED.ID_ORDEN
          VALUES (@placa, GETDATE(), 'En Revisión', @coment, @idCita, @idCot)
        `);
        
      idOrdenFinal = nuevaOrden.recordset[0].ID_ORDEN;

      // 3. Marcamos la cita como 'Atendida'
      await pool.request()
        .input('idC', sql.Int, idSeleccionado)
        .query("UPDATE CITAS_WEB SET ESTADO = 'Atendida' WHERE ID_CITA = @idC");
    }

    // 🔨 CONTINUAMOS CON LA ASIGNACIÓN NORMAL
    // Iteramos para guardar cada servicio a cada mecánico seleccionado
    for (let idServicio of idsServicios) {
      for (let idMecanico of idsMecanicos) {
        await pool.request()
          .input('idO', sql.Int, idOrdenFinal)
          .input('idS', sql.Int, idServicio)
          .input('idM', sql.Int, idMecanico)
          .query(`
            INSERT INTO DETALLE_ORDEN_SERVICIOS 
            (ID_ORDEN, ID_SERVICIO, ID_USUARIO_TECNICO, ESTADO) 
            VALUES (@idO, @idS, @idM, 'Asignado')
          `);
      }
    }

    res.json({ success: true, message: 'Vehículo recibido y orden generada' });
  } catch (err) {
    console.error("❌ Error en asignación:", err.message);
    res.status(500).send(err.message);
  }
});





// =====================================================
// 📋 3. VER TRABAJO ACTUAL (TARJETAS DEL TALLER EN VIVO)
// =====================================================
app.get('/api/tecnicos/trabajo-actual', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        D.ID_DETALLE_SRV, 
        D.ID_ORDEN, 
        O.PLACA, 
        S.NOMBRE_SERVICIO, 
        M.NOMBRE_MECANICO,
        D.ESTADO, 
        D.ID_USUARIO_TECNICO AS ID_MECANICO
      FROM DETALLE_ORDEN_SERVICIOS D
      INNER JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN
      INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO
      WHERE D.ESTADO NOT IN ('Finalizado', 'Liquidado')
    `);
    
    res.json(result.recordset);
  } catch (err) { 
    console.error("❌ ERROR EN TRABAJO ACTUAL:", err.message);
    res.status(500).send([]); 
  }
});







// 5. Finalizar Tarea con DESCUENTO AUTOMÁTICO DE INVENTARIO
// =====================================================
// ✅ 5. FINALIZAR TAREA (INVENTARIO, RELOJ Y FACTURACIÓN INTEGRADA)
// =====================================================
app.put('/api/tecnicos/finalizar', async (req, res) => {
  const { idDetalle, idOrden } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    
    // A. Obtener el ID del servicio
    const infoServicio = await pool.request()
      .input('idD', sql.Int, idDetalle)
      .query("SELECT ID_SERVICIO FROM DETALLE_ORDEN_SERVICIOS WHERE ID_DETALLE_SRV = @idD");
    
    if (infoServicio.recordset.length === 0) return res.status(404).send("Detalle no encontrado");
    const idServicio = infoServicio.recordset[0].ID_SERVICIO;

    // B. Proceso de Inventario (Recetas)
    const receta = await pool.request()
      .input('idS', sql.Int, idServicio)
      .query("SELECT ID_ITEM, CANTIDAD FROM RECETAS_SERVICIOS WHERE ID_SERVICIO = @idS");

    for (let item of receta.recordset) {
      await pool.request()
        .input('idItem', sql.Int, item.ID_ITEM)
        .input('cant', sql.Int, item.CANTIDAD)
        .query("UPDATE INVENTARIO SET STOCK_ACTUAL = STOCK_ACTUAL - @cant WHERE ID_ITEM = @idItem");
    }

    // C. ⏱️ CIERRE DE CRONÓMETRO Y CÁLCULO DE COBRO
    await pool.request()
      .input('idD', sql.Int, idDetalle)
      .query(`
        UPDATE DETALLE_ORDEN_SERVICIOS 
        SET ESTADO = 'Finalizado', 
            FECHA_FIN = GETDATE(),
            PRECIO_COBRADO = ISNULL(CAST(DATEDIFF(MINUTE, FECHA_INICIO, GETDATE()) AS FLOAT) / 60.0 * 125.00, 0)
        WHERE ID_DETALLE_SRV = @idD
      `);

    // D. 🔄 Sincronizar con la Orden Principal (Para el Kanban)
    await pool.request()
      .input('idO', sql.Int, idOrden)
      .query("UPDATE ORDENES_TRABAJO SET ESTADO = 'Listo para Entrega' WHERE ID_ORDEN = @idO");

    // =======================================================
    // E. 🧾 LA MAGIA: GENERAR LA FACTURA AUTOMÁTICAMENTE AQUÍ
    // =======================================================
    
    // 1. Sumamos todo (Mano de obra + Repuestos extra si hubo)
    const resTotales = await pool.request()
      .input('idO', sql.Int, idOrden)
      .query(`
        SELECT 
          ISNULL((SELECT SUM(PRECIO_COBRADO) FROM DETALLE_ORDEN_SERVICIOS WHERE ID_ORDEN = @idO), 0) +
          ISNULL((SELECT SUM(SUBTOTAL) FROM DETALLE_ORDEN_REPUESTOS WHERE ID_ORDEN = @idO), 0) AS TotalFinal
      `);
    
    const totalFinal = resTotales.recordset[0].TotalFinal;

    // 2. Generamos el correlativo (FAC-001)
    const ultimo = await pool.request().query("SELECT TOP 1 NUMERO_FACTURA FROM FACTURAS ORDER BY ID_FACTURA DESC");
    let sig = 1;
    if (ultimo.recordset.length > 0) {
       sig = parseInt(ultimo.recordset[0].NUMERO_FACTURA.replace('FAC-', '')) + 1;
    }
    const numFac = 'FAC-' + sig.toString().padStart(3, '0');

    // 3. Guardamos la factura en estado 'Pendiente'
    await pool.request()
      .input('idO', sql.Int, idOrden)
      .input('num', sql.VarChar, numFac)
      .input('tot', sql.Decimal(10, 2), totalFinal)
      .query(`
        INSERT INTO FACTURAS (ID_ORDEN, NUMERO_FACTURA, FECHA_FACTURACION, SUBTOTAL, IMPUESTOS, TOTAL, ESTADO) 
        VALUES (@idO, @num, GETDATE(), @tot / 1.12, (@tot / 1.12) * 0.12, @tot, 'Pendiente')
      `);

    res.json({ success: true, message: "Tarea finalizada, inventario descontado y FACTURA GENERADA." });
  } catch (err) {
    console.error("❌ ERROR AL FINALIZAR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Obtener Historial para la Pestaña 2
app.get('/api/tecnicos/historial', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        D.ID_ORDEN, 
        O.PLACA, 
        S.NOMBRE_SERVICIO, 
        M.NOMBRE_MECANICO, 
        D.FECHA_FIN,
        -- 💰 MAGIA: Precio base del catálogo + Total de repuestos extras usados
        (S.PRECIO_BASE + ISNULL((
            SELECT SUM(SUBTOTAL) 
            FROM DETALLE_ORDEN_REPUESTOS 
            WHERE ID_ORDEN = D.ID_ORDEN
        ), 0)) AS PRECIO_COBRADO
      FROM DETALLE_ORDEN_SERVICIOS D
      INNER JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN
      INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO
      WHERE D.ESTADO = 'Finalizado'
      ORDER BY D.FECHA_FIN DESC
    `);
    res.json(result.recordset);
  } catch (err) { 
    console.error("❌ Error cargando el historial:", err.message);
    res.status(500).send([]); 
  }
});


// =====================================================
// 🧾 OBTENER LISTADO DE FACTURAS (Para la tabla)
// =====================================================
app.post('/api/facturas', async (req, res) => {
  const { rol, idCliente } = req.body;
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // Consulta base: Traemos la factura y la Placa 
    let query = `
      SELECT F.ID_FACTURA, F.NUMERO_FACTURA, F.FECHA_FACTURACION, 
             F.TOTAL, F.ESTADO, O.PLACA 
      FROM FACTURAS F
      INNER JOIN ORDENES_TRABAJO O ON F.ID_ORDEN = O.ID_ORDEN
    `;
    
    // Filtro de seguridad para que el cliente solo vea sus carros
    if (rol !== 'Admin') {
      query += `
        INNER JOIN VEHICULOS V ON O.PLACA = V.PLACA 
        WHERE V.ID_CLIENTE = @idC
      `;
    }
    
    query += ` ORDER BY F.ID_FACTURA DESC`;

    const request = pool.request();
    if (rol !== 'Admin') {
      request.input('idC', sql.Int, parseInt(idCliente));
    }
    
    const result = await request.query(query);
    res.json({ success: true, facturas: result.recordset });
    
  } catch (err) {
    console.error("❌ Error al obtener facturas:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// =====================================================
// 🔧 AGREGAR REPUESTO EXTRA A UNA ORDEN: MÓDULO: GESTIÓN DE TÉCNICOS
// =====================================================
app.post('/api/tecnicos/repuestos-extra', async (req, res) => {
  const { idOrden, idItem, cantidad } = req.body;
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // 1. Obtenemos el precio de venta actual del inventario
    const infoItem = await pool.request()
      .input('id', sql.Int, idItem)
      .query("SELECT PRECIO_VENTA FROM INVENTARIO WHERE ID_ITEM = @id");
      
    const precioUnitario = infoItem.recordset[0].PRECIO_VENTA;
    const subtotal = precioUnitario * cantidad;

    // 2. Insertamos el repuesto en la cuenta de la orden
    await pool.request()
      .input('idO', sql.Int, idOrden)
      .input('idI', sql.Int, idItem)
      .input('cant', sql.Int, cantidad)
      .input('precio', sql.Decimal(10,2), precioUnitario)
      .input('sub', sql.Decimal(10,2), subtotal)
      .query(`
        INSERT INTO DETALLE_ORDEN_REPUESTOS (ID_ORDEN, ID_ITEM, CANTIDAD, PRECIO_UNITARIO, SUBTOTAL) 
        VALUES (@idO, @idI, @cant, @precio, @sub)
      `);

    // 3. Descontamos el repuesto de la bodega (Inventario)
    await pool.request()
      .input('idI', sql.Int, idItem)
      .input('cant', sql.Int, cantidad)
      .query("UPDATE INVENTARIO SET STOCK_ACTUAL = STOCK_ACTUAL - @cant WHERE ID_ITEM = @idI");

    res.json({ success: true, mensaje: "Repuesto extra agregado y descontado de bodega" });
  } catch (err) {
    console.error("❌ ERROR AL AGREGAR EXTRA:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});




// =====================================================
// 📦 MÓDULO: GESTIÓN DE INVENTARIO (TICKET 013)
// =====================================================

// 1. OBTENER TODO EL INVENTARIO (Para llenar la tabla)
app.get('/api/inventario', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT * FROM INVENTARIO ORDER BY NOMBRE_ITEM ASC");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ ERROR AL CARGAR INVENTARIO:", err.message);
    res.status(500).send([]);
  }
});

// 2. CREAR NUEVO REPUESTO (El formulario de la izquierda)
app.post('/api/inventario', async (req, res) => {
  const { NOMBRE_ITEM, STOCK_ACTUAL, PRECIO_COSTO, PRECIO_VENTA } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('nombre', sql.VarChar, NOMBRE_ITEM)
      .input('stock', sql.Int, parseInt(STOCK_ACTUAL))
      .input('costo', sql.Decimal(10,2), parseFloat(PRECIO_COSTO))
      .input('venta', sql.Decimal(10,2), parseFloat(PRECIO_VENTA))
      .query(`
        INSERT INTO INVENTARIO (NOMBRE_ITEM, STOCK_ACTUAL, PRECIO_COSTO, PRECIO_VENTA)
        VALUES (@nombre, @stock, @costo, @venta)
      `);
    res.json({ success: true, message: "Repuesto guardado" });
  } catch (err) {
    console.error("❌ ERROR AL GUARDAR REPUESTO:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. ACTUALIZAR STOCK MANUAL (Los botoncitos de + y -)
app.put('/api/inventario/stock/:id', async (req, res) => {
  const { id } = req.params;
  const { nuevoStock } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('stock', sql.Int, parseInt(nuevoStock))
      .query("UPDATE INVENTARIO SET STOCK_ACTUAL = @stock WHERE ID_ITEM = @id");
    
    res.json({ success: true });
  } catch (err) {
    console.error("❌ ERROR AL ACTUALIZAR STOCK:", err.message);
    res.status(500).json({ success: false });
  }
});




// =====================================================
// 💰 MÓDULO: NÓMINA Y PAGO DE HORAS (MODO DEBUGGER)
// =====================================================
app.post('/api/pagos/nomina', async (req, res) => {
  const { fechaInicio, fechaFin, idMecanico } = req.body;
  
  // 🕵️‍♂️ 1. El Chismoso de Entrada (Veremos qué manda React)
  console.log("🔍 Recibiendo petición de Nómina:", { fechaInicio, fechaFin, idMecanico });

  try {
    const pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT 
        D.ID_DETALLE_SRV AS id,
        CONVERT(VARCHAR, D.FECHA_FIN, 23) AS fecha,
        'ORD-' + CAST(O.ID_ORDEN AS VARCHAR) AS orden,
        O.PLACA AS placa,
        S.NOMBRE_SERVICIO AS servicio,
        CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60 AS VARCHAR) + 'h ' +
        CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) % 60 AS VARCHAR) + 'm' AS tiempo,
        DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) AS minutosReales,
        CAST((DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60.0) * 16.67 AS DECIMAL(10,2)) AS generado,
        M.NOMBRE_MECANICO AS mecanico
      FROM DETALLE_ORDEN_SERVICIOS D
      INNER JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN
      INNER JOIN FACTURAS F ON O.ID_ORDEN = F.ID_ORDEN
      INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO
      WHERE D.ESTADO = 'Finalizado' 
      AND F.ESTADO = 'Pagada'
      AND D.FECHA_INICIO IS NOT NULL 
      AND D.FECHA_FIN IS NOT NULL
    `;

    if (fechaInicio && fechaFin) {
      query += ` AND D.FECHA_FIN >= @inicio AND D.FECHA_FIN <= @fin + ' 23:59:59'`;
    }
    if (idMecanico && idMecanico !== 'todos') {
      query += ` AND D.ID_USUARIO_TECNICO = @idM`;
    }
    
    query += ` ORDER BY D.FECHA_FIN DESC`;

    const request = pool.request();
    if (fechaInicio) request.input('inicio', sql.VarChar, fechaInicio);
    if (fechaFin) request.input('fin', sql.VarChar, fechaFin);
    if (idMecanico && idMecanico !== 'todos') request.input('idM', sql.Int, parseInt(idMecanico));

    const result = await request.query(query);
    
    // 🕵️‍♂️ 2. El Chismoso de Salida (Veremos cuántos datos encontró SQL)
    console.log(`✅ SQL devolvió ${result.recordset.length} registros para la nómina.`);

    // 🛡️ FIX CRÍTICO: Aseguramos que 'generado' sea un Número real y no un texto para que React no explote.
    const detalles = result.recordset.map(fila => ({
      ...fila,
      generado: parseFloat(fila.generado) || 0 
    }));

    const totalGenerado = detalles.reduce((sum, fila) => sum + fila.generado, 0);
    const totalMinutos = detalles.reduce((sum, fila) => sum + fila.minutosReales, 0);
    
    const horasCompletas = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;
    const horasString = `${horasCompletas}h ${minutosRestantes}m`;

    res.json({ 
      success: true, 
      detalles: detalles,
      totales: { horasText: horasString, bonoCalculado: totalGenerado }
    });

  } catch (err) {
    console.error("❌ Error al calcular nómina:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});




// =====================================================
// 👥 OBTENER LISTA DE MECÁNICOS PARA EL FILTRO DE NÓMINA
// =====================================================
app.get('/api/pagos/mecanicos', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT ID_MECANICO, NOMBRE_MECANICO FROM MECANICOS");
    res.json({ success: true, mecanicos: result.recordset });
  } catch (err) { res.status(500).json({ success: false }); }
});





// =====================================================
// 💸 LIQUIDAR PAGO DE HORAS (INDIVIDUAL)
// =====================================================
app.put('/api/pagos/liquidar/:id', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    // Cambiamos el estado a 'Liquidado' para que ya no salga en la nómina pendiente
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query("UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = 'Liquidado' WHERE ID_DETALLE_SRV = @id");
    
    res.json({ success: true, message: 'Línea liquidada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});




// =====================================================
// 💸 LIQUIDAR PAGOS (MASIVO / TODOS LOS FILTRADOS)
// =====================================================
app.put('/api/pagos/liquidar-masivo', async (req, res) => {
  const { ids } = req.body; 
  if (!ids || ids.length === 0) return res.json({ success: true });
  
  try {
    const pool = await sql.connect(dbConfig);
    const idList = ids.join(','); // Convertimos el arreglo [1,2,3] en texto "1,2,3"
    
    await pool.request()
      .query(`UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = 'Liquidado' WHERE ID_DETALLE_SRV IN (${idList})`);
      
    res.json({ success: true, message: 'Nómina liquidada masivamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// =====================================================
// 🏛️ BÓVEDA: OBTENER HISTORIAL DE PAGOS LIQUIDADOS
// =====================================================
app.post('/api/pagos/historial', async (req, res) => {
  const { idMecanico, fechaInicio, fechaFin } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    let query = `
      SELECT 
        D.ID_DETALLE_SRV AS id,
        CONVERT(VARCHAR, D.FECHA_FIN, 23) AS fecha,
        'ORD-' + CAST(D.ID_ORDEN AS VARCHAR) AS orden,
        M.NOMBRE_MECANICO AS mecanico,
        S.NOMBRE_SERVICIO AS servicio,
        CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60 AS VARCHAR) + 'h ' +
        CAST(DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) % 60 AS VARCHAR) + 'm' AS tiempo,
        CAST((DATEDIFF(MINUTE, D.FECHA_INICIO, D.FECHA_FIN) / 60.0) * 16.67 AS DECIMAL(10,2)) AS generado
      FROM DETALLE_ORDEN_SERVICIOS D
      INNER JOIN MECANICOS M ON D.ID_USUARIO_TECNICO = M.ID_MECANICO
      INNER JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      WHERE D.ESTADO = 'Liquidado'
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

    // ⚡ FIX: Forzamos a SQL a restar 6 horas para obtener la fecha real de Guatemala
    const cit = await pool.request().query(`
      SELECT COUNT(*) AS total 
      FROM CITAS_WEB 
      WHERE CAST(FECHA_CITA AS DATE) = CAST(DATEADD(HOUR, -6, GETUTCDATE()) AS DATE)
    `);

    const fac = await pool.request().query(`
      SELECT SUM(TOTAL) AS total 
      FROM FACTURAS 
      WHERE MONTH(FECHA_FACTURACION) = MONTH(DATEADD(HOUR, -6, GETUTCDATE()))
    `);

    res.json({ 
      success: true, 
      vehiculos: veh.recordset[0].total, 
      citas: cit.recordset[0].total, 
      facturado: fac.recordset[0].total || 0 
    });
  } catch (err) { res.status(500).json({ success: false }); }
});

const PUERTO = 3000;
app.listen(PUERTO, () => console.log(`🚀 Servidor activo en puerto ${PUERTO}`));