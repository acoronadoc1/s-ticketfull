// routes/clientes.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 👥 MÓDULO: CLIENTES
// =====================================================

// 1. LEER CLIENTES
router.get('/clientes', async (req, res) => { 
  try {
    const pool = await getConnection(); 
    const result = await pool.request().query(`
      SELECT C.ID_CLIENTE, C.NIT, C.NOMBRE_CLIENTE, C.TELEFONO, U.NOMBRE_USUARIO
      FROM CLIENTES C 
      LEFT JOIN USUARIOS U ON C.ID_CLIENTE = U.ID_CLIENTE 
      WHERE U.ESTADO != 'Inactivo' OR U.ESTADO IS NULL
    `);
    res.json({ success: true, clientes: result.recordset });
  } catch (err) { 
    console.error("❌ Error al leer clientes:", err.message);
    res.status(500).json({ success: false }); 
  }
});

// 2. CREAR CLIENTES
router.post('/clientes', async (req, res) => {
  const { nit, nombre, telefono, usuario, password } = req.body; 
  try {
    const pool = await getConnection();
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
    res.status(500).json({ success: false }); 
  }
});

// 3. EDITAR CLIENTES
router.put('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nit, nombre, telefono, usuario, password } = req.body;
  try {
    const pool = await getConnection();
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

// 4. INACTIVAR CLIENTES
router.put('/clientes/:id/inactivar', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool.request().input('id', sql.Int, id).query("UPDATE USUARIOS SET ESTADO = 'Inactivo' WHERE ID_CLIENTE = @id");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;