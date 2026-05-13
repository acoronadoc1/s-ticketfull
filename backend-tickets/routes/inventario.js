// routes/inventario.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 📦 MÓDULO: INVENTARIO Y CATÁLOGO DE SERVICIOS
// =====================================================

// 1. Obtener todo el inventario
router.get('/inventario', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM INVENTARIO ORDER BY NOMBRE_ITEM ASC");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ ERROR AL CARGAR INVENTARIO:", err.message);
    res.status(500).send([]);
  }
});

// 2. Crear nuevo repuesto
router.post('/inventario', async (req, res) => {
  const { NOMBRE_ITEM, STOCK_ACTUAL, PRECIO_COSTO, PRECIO_VENTA } = req.body;
  try {
    const pool = await getConnection();
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Actualizar stock manual (+ y -)
router.put('/inventario/stock/:id', async (req, res) => {
  const { id } = req.params;
  const { nuevoStock } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('stock', sql.Int, parseInt(nuevoStock))
      .query("UPDATE INVENTARIO SET STOCK_ACTUAL = @stock WHERE ID_ITEM = @id");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// 4. CATÁLOGO DINÁMICO (Con recetas cruzadas)
router.get('/servicios', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const resServicios = await pool.request().query(`
      SELECT ID_SERVICIO, NOMBRE_SERVICIO, PRECIO_BASE AS PRECIO_MANO_OBRA 
      FROM CATALOGO_SERVICIOS WHERE ESTADO = 'Activo'
    `);
    const servicios = resServicios.recordset;

    const resRecetas = await pool.request().query(`
      SELECT R.ID_SERVICIO, R.CANTIDAD, I.NOMBRE_ITEM, I.PRECIO_VENTA
      FROM RECETAS_SERVICIOS R
      INNER JOIN INVENTARIO I ON R.ID_ITEM = I.ID_ITEM
    `);
    const recetas = resRecetas.recordset;

    const catalogoCompleto = servicios.map(servicio => {
      const itemsReceta = recetas.filter(r => r.ID_SERVICIO === servicio.ID_SERVICIO);
      const totalRepuestos = itemsReceta.reduce((sum, item) => sum + (item.CANTIDAD * item.PRECIO_VENTA), 0);
      const precioTotal = servicio.PRECIO_MANO_OBRA + totalRepuestos;

      return {
        ID_SERVICIO: servicio.ID_SERVICIO,
        NOMBRE_SERVICIO: servicio.NOMBRE_SERVICIO,
        PRECIO: precioTotal, 
        receta: itemsReceta 
      };
    });
    
    res.json({ success: true, servicios: catalogoCompleto });
  } catch (err) {
    console.error("❌ Error al obtener el catálogo dinámico:", err.message);
    res.status(500).json({ success: false, servicios: [] });
  }
});

module.exports = router;