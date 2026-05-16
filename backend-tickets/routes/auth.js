// routes/auth.js
const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/db');

// =====================================================
// 🔑 MÓDULO: SEGURIDAD (LOGIN)
// =====================================================
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const pool = await getConnection();
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
  } catch (err) { 
    console.error("Error en login:", err);
    res.status(500).json({ success: false }); 
  }
});

module.exports = router;