import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, Divider } from '@mui/material'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMensaje, setErrorMensaje] = useState(''); 
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMensaje(''); 

    try {
      const respuesta = await axios.post('http://localhost:3000/api/login', {
        usuario: usuario,
        password: password
      });

      // 🟢 CÓDIGO CORREGIDO
      if (respuesta.data.success) {
        onLogin({ 
          auth: true, 
          rol: respuesta.data.rol, 
          usuario: usuario,
          idCliente: respuesta.data.idCliente // 👈 AQUÍ ATRAPAMOS EL ID
        }); 
        navigate('/'); 
      }

    } catch (error) {
      if (error.response && error.response.data) {
        setErrorMensaje(error.response.data.mensaje);
      } else {
        setErrorMensaje('No se pudo conectar con el servidor.');
      }
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        width: '100vw',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f4f6f8' 
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center', margin: 'auto', borderRadius: 3 }}>
        {/* 🟢 Título en color verde */}
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: '#197f40' }}>
          ERP Automotriz
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Ingresa tus credenciales para continuar
        </Typography>

        {errorMensaje && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMensaje}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField 
            fullWidth 
            label="Usuario" 
            variant="outlined" 
            margin="normal"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
          <TextField 
            fullWidth 
            label="Contraseña" 
            type="password" 
            variant="outlined" 
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {/* 🟢 Botón verde */}
          <Button 
            fullWidth 
            type="submit" 
            variant="contained" 
            size="large" 
            sx={{ mt: 3, mb: 2, backgroundColor: '#197f40', '&:hover': { backgroundColor: '#125c2e' } }}
          >
            Iniciar Sesión
          </Button>

          {/* ==========================================
              🟢 NUEVA SECCIÓN DE REGISTRO
              ========================================== */}
          <Divider sx={{ my: 2 }}>o</Divider> 

          <Typography variant="body2" color="text.secondary">
            ¿No tienes una cuenta?
          </Typography>
          
          <Button 
            variant="text" 
            sx={{ color: '#af514c', fontWeight: 'bold', textTransform: 'none' }}
            onClick={() => navigate('/registro')} 
          >
            Regístrate aquí
          </Button>

        </form>
      </Paper>
    </Box>
  );
}