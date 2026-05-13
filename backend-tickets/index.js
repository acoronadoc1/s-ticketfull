require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 🚀 INICIALIZACIÓN DE LA APP
const app = express();
app.use(cors());
app.use(express.json());

// 🗂️ IMPORTACIÓN DE LOS ENRUTADORES (MÓDULOS)
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const vehiculosRoutes = require('./routes/vehiculos');
const citasRoutes = require('./routes/citas');
const cotizacionesRoutes = require('./routes/cotizaciones');
const ordenesRoutes = require('./routes/ordenes');
const tecnicosRoutes = require('./routes/tecnicos');
const inventarioRoutes = require('./routes/inventario');
const facturasRoutes = require('./routes/facturas');
const pagosRoutes = require('./routes/pagos');
const dashboardRoutes = require('./routes/dashboard');

// 🛤️ MONTAJE DE RUTAS (El "Director de Tráfico")
// Al poner '/api' aquí, automáticamente se le agrega a todas las rutas de adentro
app.use('/api', authRoutes);
app.use('/api', clientesRoutes);
app.use('/api', vehiculosRoutes);
app.use('/api', citasRoutes);
app.use('/api', cotizacionesRoutes);
app.use('/api', ordenesRoutes);
app.use('/api', tecnicosRoutes);
app.use('/api', inventarioRoutes);
app.use('/api', facturasRoutes);
app.use('/api', pagosRoutes);
app.use('/api', dashboardRoutes);

// ⚡ INICIO DEL SERVIDOR
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log(`🚀 Servidor ERP activo y modularizado en puerto ${PUERTO}`));