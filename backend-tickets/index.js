require('dotenv').config(); // 1. Carga las variables del archivo .env para proteger datos sensibles

const express =require('express'); //El moto del servidor web
const cors = require ('cors') // el portero que permite que el front hable con el back
const sql = require('mssql'); // 4. Importa el conector oficial para hablar con Microsoft SQL Server

const app = express(); // 5. Crea la instancia de la aplicación "app" que controlará las rutas
app.use(cors()); // 6. Middleware: Activa el permiso de comunicación entre diferentes puertos
app.use(express.json()); // 7. Middleware: Permite que el servidor lea y entienda paquetes de datos en formato JSON

// 8. Objeto de configuración con las "llaves" de acceso a tu SQL Server
const dbConfig = {
  user:process.env.DB_USER, // Usuario administrador de SQL
  password:process.env.DB_PASSWORD, // Contraseña que definiste en la instalación
  server: process.env.DB_SERVER, // La dirección IP donde vive tu base de datos (tu Windows)
  database: process.env.DB_NAME, // El nombre de la base de datos que creaste en SSMS
  port: parseInt(process.env.DB_PORT),
  options: {
          encrypt: false, // VITAL PARA AZURE: Obliga a que los datos viajen encriptados
          trustServerCertificate: true // VITAL PARA AZURE: Valida que el certificado de Microsoft sea real
  }
};

//Intento de conexion validarcl
sql.connect(dbConfig)
  .then (() => {
      console.log("Exito, conectado a Azure SQL")
  })
  .catch((err) =>{
    console.error("Error de conexion a la nube:", err)
  });

// --- RUTA 1: SUMAR UN TICKET ---
app.post('/sumar-clic', async (req, res) => { // 9. Define la ruta POST para recibir nuevos tickets
  try { // 10. Bloque de seguridad: intenta ejecutar el código, si falla va al catch
    let pool = await sql.connect(dbConfig); // 11. Abre el túnel de comunicación con SQL Server

    // 12. Envía la orden de aumentar en 1 la cantidad del registro de 'Andy'
    await pool.request()
      .query("UPDATE RegistroClicks SET Cantidad = Cantidad + 1 WHERE Nombre = 'Andy'");

    // 13. Vuelve a consultar a SQL para saber cuál es el nuevo número después de la suma
    let result = await pool.request()
      .query("SELECT Cantidad FROM RegistroClicks WHERE Nombre = 'Andy'");

    // 14. Envía la respuesta de vuelta al Frontend con el número real de la base de datos
   res.json({
    mensaje: 'Clic guardado exitosamente',
    nuevaCantidad: result.recordset[0].Cantidad // <--- Aquí definimos el nombre
});

  } catch (err) { // 15. Si algo sale mal (ej: SQL apagado), entra aquí
    console.error("❌ Error en la base de datos:", err); // 16. Muestra el error técnico en tu terminal
    res.status(500).send("Hubo un error al guardar el clic"); // 17. Le avisa al navegador que hubo un error interno
  }
});

// --- RUTA 2: REINICIAR CONTADOR ---
app.post('/reiniciar-clic', async (req, res) => { // 18. Define la ruta para resetear el contador
  try {
    const pool = await sql.connect(dbConfig); // 19. Asegura la conexión usando las credenciales dbConfig

    // 20. Envía la orden de poner la columna Cantidad en 0 para el usuario 'Andy'
    await pool.request().query("UPDATE RegistroClicks SET Cantidad = 0 WHERE Nombre = 'Andy'");

    // 21. Responde al Frontend confirmando que el nuevo valor es 0
    res.json({ mensaje: "Contador reiniciado en SQL", nuevaCantidad: 0 });
  } catch (err) {
    console.error("Error al reiniciar en SQL:", err); // 22. Log de error para el programador
    res.status(500).send("Error del servidor"); // 23. Respuesta de error para el cliente
  }
});




// ==========================================
// RUTA DE LOGIN (EL CADENERO DEL ERP)
// ==========================================
app.post('/api/login', async (req, res) => {
  // Recibimos los datos que el usuario escribió en la pantalla de React
  const { usuario, password } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Consultamos a la base de datos usando "Parámetros" (.input)
    // Esto es VITAL para evitar hackeos por SQL Injection
    const result = await pool.request()
      .input('userParam', sql.VarChar, usuario)
      .input('passParam', sql.VarChar, password)
      .query(`
        SELECT ID_USUARIO, ROL, ID_CLIENTE, ESTADO
        FROM USUARIOS
        WHERE NOMBRE_USUARIO = @userParam
          AND CLAVE = @passParam
      `);

    // Verificamos si SQL encontró a alguien con esas credenciales
    if (result.recordset.length > 0) {
      const usuarioDB = result.recordset[0];

      // Verificamos que no esté despedido/dado de baja
      if (usuarioDB.ESTADO !== 'Activo') {
        return res.status(403).json({ success: false, mensaje: 'Usuario inactivo. Contacte al administrador.' });
      }

      // Si todo está perfecto, le damos luz verde
      res.json({
        success: true,
        mensaje: 'Bienvenido al ERP',
        rol: usuarioDB.ROL,
        idCliente: usuarioDB.ID_CLIENTE
      });

    } else {
      // Si la contraseña está mal o el usuario no existe, lo rebotamos
      res.status(401).json({ success: false, mensaje: 'Usuario o contraseña incorrectos.' });
    }

  } catch (err) {
    console.error("❌ Error en el Login:", err);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
  }
});






// ==========================================
// RUTA DE MÉTRICAS (EL CEREBRO DEL DASHBOARD)
// ==========================================
app.get('/api/metricas', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    // 1️⃣ CONSULTA: Vehículos totales
    const vehiculosResult = await pool.request().query("SELECT COUNT(*) AS totalVehiculos FROM VEHICULOS");
    const cantidadVehiculos = vehiculosResult.recordset[0].totalVehiculos;

    // 2️⃣ CONSULTA: Citas de hoy (Corregido a FECHA_CITA gracias a tu captura)
    const citasResult = await pool.request()
      .query("SELECT COUNT(*) AS citasHoy FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = CAST(GETDATE() AS DATE)");
    const cantidadCitas = citasResult.recordset[0].citasHoy;

    // 3️⃣ CONSULTA: Facturado este mes (Corregido a FECHA_FACTURACION gracias a tu captura)
    const facturasResult = await pool.request()
      .query("SELECT SUM(TOTAL) AS totalFacturado FROM FACTURAS WHERE MONTH(FECHA_FACTURACION) = MONTH(GETDATE()) AND YEAR(FECHA_FACTURACION) = YEAR(GETDATE())");
    const dineroFacturado = facturasResult.recordset[0].totalFacturado || 0;

    res.json({ success: true, vehiculos: cantidadVehiculos, citas: cantidadCitas, facturado: dineroFacturado });

  } catch (err) {
    console.error("❌ Error al obtener las métricas:", err);
    res.status(500).json({ success: false, mensaje: 'Error al calcular métricas.' });
  }
});





// ==========================================
// RUTA DEL GARAJE (VEHÍCULOS DEL CLIENTE)
// ==========================================
app.post('/api/garaje', async (req, res) => {
  const { usuario } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Aquí está la corrección de la Ñ (V.AÑO AS ANIO)
    const result = await pool.request()
      .input('userParam', sql.VarChar, usuario)
      .query(`
        SELECT V.MARCA, V.MODELO, V.AÑO AS ANIO, V.PLACA
        FROM VEHICULOS V
        INNER JOIN USUARIOS U ON V.ID_CLIENTE = U.ID_CLIENTE
        WHERE U.NOMBRE_USUARIO = @userParam
      `);

    res.json({ success: true, vehiculos: result.recordset });

  } catch (err) {
    console.error("❌ Error al obtener el garaje:", err);
    res.status(500).json({ success: false, mensaje: 'Error al buscar vehículos.' });
  }
});




// ==========================================
// RUTA DE REGISTRO (CREACIÓN DE CLIENTES)
// ==========================================
app.post('/api/registro', async (req, res) => {
  // 1. Recibimos el paquete de datos desde el formulario de React
  const { nombre, nit, telefono, usuario, password } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // 2. Ejecutamos un bloque de SQL inteligente
    const result = await pool.request()
      .input('nombreParam', sql.VarChar, nombre)
      .input('nitParam', sql.VarChar, nit || '') // Si dejaron el NIT vacío, mandamos texto en blanco
      .input('telefonoParam', sql.VarChar, telefono)
      .input('usuarioParam', sql.VarChar, usuario)
      .input('passParam', sql.VarChar, password)
      .query(`
        -- PASO A: Revisamos si alguien ya usa ese nombre de usuario
        IF EXISTS (SELECT 1 FROM USUARIOS WHERE NOMBRE_USUARIO = @usuarioParam)
        BEGIN
            SELECT 'ERROR_EXISTE' AS Resultado;
        END
        ELSE
        BEGIN
            -- PASO B: Insertamos al Cliente en su tabla
            DECLARE @NuevoIdCliente INT;

            INSERT INTO CLIENTES (NIT, NOMBRE_CLIENTE, TELEFONO)
            VALUES (@nitParam, @nombreParam, @telefonoParam);

            -- PASO C: Capturamos el ID_CLIENTE que SQL le acaba de asignar automáticamente
            SET @NuevoIdCliente = SCOPE_IDENTITY();

            -- PASO D: Creamos el Usuario y lo conectamos con ese ID_CLIENTE
            INSERT INTO USUARIOS (NOMBRE_USUARIO, CLAVE, ROL, ESTADO, ID_CLIENTE)
            VALUES (@usuarioParam, @passParam, 'Usuario', 'Activo', @NuevoIdCliente);

            SELECT 'EXITO' AS Resultado;
        END
      `);

    const estado = result.recordset[0].Resultado;

    // 3. Le respondemos al Frontend dependiendo de lo que dijo SQL
    if (estado === 'ERROR_EXISTE') {
      return res.status(400).json({ success: false, mensaje: 'El nombre de usuario ya está ocupado. Elige otro.' });
    }

    // ¡Luz verde! Esto activará el redireccionamiento en React
    res.json({ success: true, mensaje: 'Cuenta creada exitosamente.' });

  } catch (err) {
    console.error("❌ Error al registrar usuario:", err);
    res.status(500).json({ success: false, mensaje: 'Error al procesar el registro en la base de datos.' });
  }
});








// ==========================================
// 📅 MÓDULO DE CITAS: OBTENER HORARIOS OCUPADOS
// ==========================================
app.get('/api/citas/disponibles/:fecha', async (req, res) => {
  const fecha = req.params.fecha; // El frontend nos mandará algo como '2026-10-20'

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('fechaParam', sql.Date, fecha)
      .query(`
        -- Buscamos las citas de ese día que NO estén canceladas ni completadas
        SELECT HORA_CITA
        FROM CITAS_WEB
        WHERE CAST(FECHA_CITA AS DATE) = @fechaParam
        AND ESTADO = 'Agendada'
      `);

    // Extraemos solo las horas y las metemos en un arreglo (Ej: ['10:00 AM', '03:00 PM'])
    const horasOcupadas = result.recordset.map(cita => cita.HORA_CITA);

    res.json({ success: true, ocupadas: horasOcupadas });
  } catch (err) {
    console.error("❌ Error al consultar disponibilidad:", err);
    res.status(500).json({ success: false, mensaje: 'Error al consultar fechas.' });
  }
});







// ==========================================
// 📅 MÓDULO DE CITAS: GUARDAR NUEVA CITA
// ==========================================
app.post('/api/citas', async (req, res) => {
  const { id_cliente, placa, fecha, hora, motivo } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // 1. 🔍 Buscamos los datos reales del cliente en la DB
    const datosCliente = await pool.request()
      .input('idCP', sql.Int, id_cliente)
      .query("SELECT NOMBRE_CLIENTE, TELEFONO FROM CLIENTES WHERE ID_CLIENTE = @idCP");

    if (datosCliente.recordset.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Cliente no encontrado.' });
    }

    const { NOMBRE_CLIENTE, TELEFONO } = datosCliente.recordset[0];

    // 2. Verificamos disponibilidad (esto se queda igual)
    const check = await pool.request()
      .input('fechaParam', sql.Date, fecha)
      .input('horaParam', sql.VarChar, hora)
      .query(`SELECT 1 FROM CITAS_WEB WHERE CAST(FECHA_CITA AS DATE) = @fechaParam AND HORA_CITA = @horaParam AND ESTADO = 'Agendada'`);

    if (check.recordset.length > 0) {
      return res.status(400).json({ success: false, mensaje: 'Este horario acaba de ser ocupado.' });
    }

    // 3. ✅ INSERT Final con datos REALES del cliente
    await pool.request()
      .input('idClienteParam', sql.Int, id_cliente)
      .input('nomContacto', sql.VarChar, NOMBRE_CLIENTE) // Jala el nombre real de la DB
      .input('telContacto', sql.VarChar, TELEFONO)       // Jala el teléfono real de la DB
      .input('placaParam', sql.VarChar, placa)
      .input('fechaParam', sql.Date, fecha)
      .input('horaParam', sql.VarChar, hora)
      .input('motivoParam', sql.VarChar, motivo)
      .query(`
        INSERT INTO CITAS_WEB
        (ID_CLIENTE, NOMBRE_CONTACTO, TELEFONO_CONTACTO, PLACA, FECHA_CITA, HORA_CITA, MOTIVO_CITA, FECHA_CREACION, ESTADO)
        VALUES
        (@idClienteParam, @nomContacto, @telContacto, @placaParam, @fechaParam, @horaParam, @motivoParam, GETDATE(), 'Agendada')
      `);

    res.json({ success: true, mensaje: 'Cita agendada exitosamente.' });
  } catch (err) {
    console.error("❌ Error al guardar cita:", err);
    res.status(500).json({ success: false, mensaje: 'Error al procesar la cita.' });
  }
});






// ==========================================
// 🚗 MÓDULO DE CITAS: OBTENER VEHÍCULOS DEL CLIENTE
// ==========================================
app.get('/api/vehiculos/cliente/:id', async (req, res) => {
  const idCliente = req.params.id;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('idClienteParam', sql.Int, idCliente)
      .query(`
        -- Usamos [AÑO] porque así se llama tu columna en SQL Server
        SELECT PLACA, MARCA, MODELO, [AÑO], COLOR
        FROM VEHICULOS
        WHERE ID_CLIENTE = @idClienteParam
      `);

    res.json({ success: true, vehiculos: result.recordset });
  } catch (err) {
    console.error("❌ Error al buscar vehículos:", err);
    res.status(500).json({ success: false, mensaje: 'Error al consultar los vehículos del cliente.' });
  }
});







// ==========================================
// 🚗 MÓDULO DE CITAS: REGISTRAR NUEVO VEHÍCULO (DESDE EL MODAL)
// ==========================================
app.post('/api/vehiculos', async (req, res) => {
  const { placa, marca, modelo, anio, color, id_cliente } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // 1. Validamos que la placa no exista ya
    const check = await pool.request()
      .input('placaParam', sql.VarChar, placa)
      .query('SELECT 1 FROM VEHICULOS WHERE PLACA = @placaParam');

    if (check.recordset.length > 0) {
      return res.status(400).json({ success: false, mensaje: 'Esta placa ya está registrada en el sistema.' });
    }

    // 2. Insertamos el vehículo nuevo usando [AÑO]
    await pool.request()
      .input('placaParam', sql.VarChar, placa)
      .input('marcaParam', sql.VarChar, marca)
      .input('modeloParam', sql.VarChar, modelo)
      .input('anioParam', sql.Int, anio)
      .input('colorParam', sql.VarChar, color)
      .input('idClienteParam', sql.Int, id_cliente)
      .query(`
        INSERT INTO VEHICULOS (PLACA, MARCA, MODELO, [AÑO], COLOR, ID_CLIENTE)
        VALUES (@placaParam, @marcaParam, @modeloParam, @anioParam, @colorParam, @idClienteParam)
      `);

    res.json({ success: true, mensaje: 'Vehículo registrado exitosamente.' });
  } catch (err) {
    console.error("❌ Error al guardar vehículo:", err);
    res.status(500).json({ success: false, mensaje: 'Error al registrar el vehículo en la base de datos.' });
  }
});





// ==========================================
// 🛠️ MÓDULO DE COTIZACIONES: OBTENER CATÁLOGO DE SERVICIOS
// ==========================================
app.get('/api/servicios', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    // 🟢 Corrección: Usamos PRECIO_BASE AS PRECIO para que React no falle
    const result = await pool.request().query(`
      SELECT ID_SERVICIO, NOMBRE_SERVICIO, PRECIO_BASE AS PRECIO, DESCRIPCION
      FROM CATALOGO_SERVICIOS
      WHERE ESTADO = 'Activo'
    `);

    res.json({ success: true, servicios: result.recordset });
  } catch (err) {
    console.error("❌ Error al obtener catálogo de servicios:", err);
    res.status(500).json({ success: false, mensaje: 'Error al consultar el catálogo.' });
  }
});


// ==========================================
// 📝 MÓDULO DE COTIZACIONES: GUARDAR NUEVA COTIZACIÓN
// ==========================================
app.post('/api/cotizaciones', async (req, res) => {
  const { idCliente, placa, paqueteId, fallaDescripcion } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    let totalEstimado = 0;
    if (paqueteId) {
      // 🟢 Corrección: Buscamos PRECIO_BASE
      const precioResult = await pool.request()
        .input('idServicio', sql.Int, paqueteId)
        .query("SELECT PRECIO_BASE FROM CATALOGO_SERVICIOS WHERE ID_SERVICIO = @idServicio");

      if (precioResult.recordset.length > 0) {
        totalEstimado = precioResult.recordset[0].PRECIO_BASE;
      }
    }

    await pool.request()
      .input('idClienteParam', sql.Int, idCliente)
      .input('placaParam', sql.VarChar, placa)
      .input('idServicioParam', sql.Int, paqueteId || null)
      .input('observacionesParam', sql.VarChar, fallaDescripcion || '')
      .input('totalParam', sql.Decimal(10, 2), totalEstimado)
      .query(`
        INSERT INTO COTIZACIONES (ID_CLIENTE, PLACA, ID_SERVICIO, OBSERVACIONES, TOTAL_ESTIMADO)
        VALUES (@idClienteParam, @placaParam, @idServicioParam, @observacionesParam, @totalParam)
      `);

    res.json({ success: true, mensaje: 'Cotización guardada exitosamente en SQL.' });
  } catch (err) {
    console.error("❌ Error al guardar la cotización:", err);
    res.status(500).json({ success: false, mensaje: 'Error al registrar la cotización en la BD.' });
  }
});



























































































































// ==========================================
// 📦 MÓDULO DE INVENTARIO
// ==========================================
app.get('/api/inventario', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT * FROM INVENTARIO");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Error al leer inventario" });
    }
});

app.post('/api/inventario', async (req, res) => {
    const { NOMBRE_ITEM, STOCK_ACTUAL, PRECIO_COSTO, PRECIO_VENTA } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.VarChar, NOMBRE_ITEM)
            .input('stock', sql.Int, STOCK_ACTUAL)
            .input('costo', sql.Decimal(10, 2), PRECIO_COSTO)
            .input('venta', sql.Decimal(10, 2), PRECIO_VENTA)
            .query(`
                INSERT INTO INVENTARIO (NOMBRE_ITEM, STOCK_ACTUAL, PRECIO_COSTO, PRECIO_VENTA)
                VALUES (@nombre, @stock, @costo, @venta)
            `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar en inventario" });
    }
});

// 4. Actualizar stock manualmente
app.put('/api/inventario/stock/:id', async (req, res) => {
  const { nuevoStock } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('stock', sql.Int, nuevoStock)
      .query("UPDATE INVENTARIO SET STOCK_ACTUAL = @stock WHERE ID_ITEM = @id");
    res.json({ success: true, mensaje: "Stock actualizado" });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar stock" });
  }
});

// ==========================================
// 🛠️ MÓDULO TÉCNICOS Y SEGUIMIENTO
// ==========================================

// 1. Cargar Listas iniciales (Solo pendientes y libres)
app.get('/api/tecnicos/datos-iniciales', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const ordenes = await pool.request().query("SELECT ID_ORDEN, PLACA FROM ORDENES_TRABAJO WHERE ESTADO = 'Pendiente'");
    const mecanicos = await pool.request().query("SELECT ID_MECANICO, NOMBRE_MECANICO FROM MECANICOS WHERE ESTADO = 'libre'");
    const servicios = await pool.request().query("SELECT ID_SERVICIO, NOMBRE_SERVICIO, PRECIO_BASE FROM CATALOGO_SERVICIOS WHERE ESTADO = 'Activo'");

    res.json({
      ordenes: ordenes.recordset,
      mecanicos: mecanicos.recordset,
      servicios: servicios.recordset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Asignar Trabajo (Múltiples servicios y mecánicos)
app.post('/api/tecnicos/asignar', async (req, res) => {
  const { idOrden, idsServicios, idsMecanicos } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    for (const idServ of idsServicios) {
      const resServ = await pool.request().query(`SELECT PRECIO_BASE FROM CATALOGO_SERVICIOS WHERE ID_SERVICIO = ${idServ}`);
      const precio = resServ.recordset[0].PRECIO_BASE;

      for (const idMec of idsMecanicos) {
        await pool.request()
          .input('idO', sql.Int, idOrden)
          .input('idS', sql.Int, idServ)
          .input('idM', sql.Int, idMec)
          .input('p', sql.Decimal(10, 2), precio)
          .query(`INSERT INTO DETALLE_ORDEN_SERVICIOS (ID_ORDEN, ID_SERVICIO, ID_MECANICO, PRECIO_COBRADO, ESTADO)
                  VALUES (@idO, @idS, @idM, @p, 'En Proceso')`);
      }
    }
    await pool.request().query(`UPDATE MECANICOS SET ESTADO = 'ocupado' WHERE ID_MECANICO IN (${idsMecanicos.join(',')})`);
    await pool.request().query(`UPDATE ORDENES_TRABAJO SET ESTADO = 'En Proceso' WHERE ID_ORDEN = ${idOrden}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Ver Trabajo ACTUAL (En Proceso)
app.get('/api/tecnicos/trabajo-actual', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT
        D.ID_DETALLE_SRV,
        D.ID_ORDEN,
        D.ID_MECANICO,
        O.PLACA,
        S.NOMBRE_SERVICIO,
        M.NOMBRE_MECANICO,
        D.ESTADO -- Traemos el estado directamente de la tabla detalle
      FROM DETALLE_ORDEN_SERVICIOS D
      JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN
      JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      JOIN MECANICOS M ON D.ID_MECANICO = M.ID_MECANICO
      WHERE UPPER(D.ESTADO) = 'EN PROCESO' -- Usamos UPPER para evitar errores de mayúsculas
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Finalizar Tarea y Liberar Mecánico
app.put('/api/tecnicos/finalizar', async (req, res) => {
  const { ID_DETALLE_SRV, ID_MECANICO } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().query(`UPDATE DETALLE_ORDEN_SERVICIOS SET ESTADO = 'Finalizado' WHERE ID_DETALLE_SRV = ${ID_DETALLE_SRV}`);
    await pool.request().query(`UPDATE MECANICOS SET ESTADO = 'libre' WHERE ID_MECANICO = ${ID_MECANICO}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Historial de Trabajos Finalizados
app.get('/api/tecnicos/historial', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT D.ID_ORDEN, O.PLACA, S.NOMBRE_SERVICIO, M.NOMBRE_MECANICO, D.PRECIO_COBRADO
      FROM DETALLE_ORDEN_SERVICIOS D
      JOIN ORDENES_TRABAJO O ON D.ID_ORDEN = O.ID_ORDEN
      JOIN CATALOGO_SERVICIOS S ON D.ID_SERVICIO = S.ID_SERVICIO
      JOIN MECANICOS M ON D.ID_MECANICO = M.ID_MECANICO
      WHERE D.ESTADO = 'Finalizado'`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// --- ENCENDIDO DEL SERVIDOR ---
const PUERTO = 3000; // 24. Define el puerto 3000 como la puerta de entrada del Backend
app.listen(PUERTO, () => { // 25. Pone al servidor en modo "escucha" constante
  console.log(`🚀 Servidor Backend escuchando en el puerto ${PUERTO}`); // 26. Mensaje de éxito en terminal
  console.log(`🔗 Conectado a la base de datos en: ${dbConfig.server}`); // 27. Confirma a qué IP le estamos pegando
});