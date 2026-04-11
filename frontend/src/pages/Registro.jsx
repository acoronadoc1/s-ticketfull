import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios'; 

export default function Registro() {
  const navigate = useNavigate();

  // Variables para guardar los datos
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleRegistro = async (e) => {
    e.preventDefault(); 
    setMensaje({ texto: '', tipo: '' }); 

    try {
      const respuesta = await axios.post('http://localhost:3000/api/registro', {
        nombre, nit, telefono, usuario, password
      });

      if (respuesta.data.success) {
        setMensaje({ texto: '¡Cuenta creada con éxito! Redirigiendo...', tipo: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMensaje({ texto: error.response.data.mensaje, tipo: 'error' });
      } else {
        setMensaje({ texto: 'Error al conectar con el servidor.', tipo: 'error' });
      }
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 450, borderRadius: 3 }}>
        
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#197f40', mb: 1, textAlign: 'center' }}>
          Crear una Cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Regístrate como cliente para agendar citas y ver tu garaje.
        </Typography>

        {mensaje.texto && (
          <Alert severity={mensaje.tipo} sx={{ mb: 2 }}>
            {mensaje.texto}
          </Alert>
        )}

        <form onSubmit={handleRegistro}>
          
          {/* SECCIÓN: DATOS PERSONALES */}
          <Typography variant="subtitle2" sx={{ color: '#197f40', mt: 1, mb: 1, fontWeight: 'bold' }}>
            Datos Personales
          </Typography>
          <TextField fullWidth label="Nombre Completo" variant="outlined" margin="dense" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <TextField fullWidth label="NIT (Opcional)" variant="outlined" margin="dense" value={nit} onChange={(e) => setNit(e.target.value)} />
          <TextField fullWidth label="Teléfono" variant="outlined" margin="dense" required value={telefono} onChange={(e) => setTelefono(e.target.value)} />

          <Divider sx={{ my: 3 }} />

          {/* SECCIÓN: DATOS DE USUARIO */}
          <Typography variant="subtitle2" sx={{ color: '#197f40', mb: 1, fontWeight: 'bold' }}>
            Datos de Acceso
          </Typography>
          <TextField fullWidth label="Nombre de Usuario (Login)" variant="outlined" margin="dense" required value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <TextField fullWidth type="password" label="Contraseña" variant="outlined" margin="dense" required value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 4, mb: 2, backgroundColor: '#af514c', '&:hover': { backgroundColor: '#8c403c' } }}>
            Registrarme
          </Button>

          <Button fullWidth variant="text" onClick={() => navigate('/login')} sx={{ textTransform: 'none', color: '#555' }}>
            Ya tengo cuenta. Volver al inicio.
          </Button>

        </form>
      </Paper>
    </Box>
  );
}