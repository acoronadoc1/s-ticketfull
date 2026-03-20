import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Paper, TextField, MenuItem, Button, Divider } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import axios from 'axios';

export default function Cotizaciones({ idCliente }) {
  const [paqueteId, setPaqueteId] = useState('');
  const [fallaDescripcion, setFallaDescripcion] = useState('');
  const [placa, setPlaca] = useState('');
  
  // Estados para guardar lo que viene de la Base de Datos
  const [misVehiculos, setMisVehiculos] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);

  // Buscamos el paquete en los datos reales de SQL
  const paqueteSeleccionado = catalogoServicios.find(p => p.ID_SERVICIO === paqueteId);

  // 🟢 EFECTO: Cargar Vehículos y Catálogo al abrir la pantalla
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // 1. Traemos tus carros
        if (idCliente) {
          const resVehiculos = await axios.get(`http://localhost:3000/api/vehiculos/cliente/${idCliente}`); 
          if (resVehiculos.data.success) {
            setMisVehiculos(resVehiculos.data.vehiculos);
          }
        }
        // 2. Traemos el catálogo de servicios desde Azure
        const resServicios = await axios.get('http://localhost:3000/api/servicios');
        if (resServicios.data.success) {
          setCatalogoServicios(resServicios.data.servicios);
        }
      } catch (error) {
        console.error('Error al traer datos de la BD', error);
      }
    };
    cargarDatos();
  }, [idCliente]);

  // 🟢 ACCIÓN: Enviar la cotización a Node.js
  const handleSolicitarCotizacion = async (e) => {
    e.preventDefault();
    try {
      // Usamos AXIOS POST para mandar los datos a la ruta que creamos hoy
      const respuesta = await axios.post('http://localhost:3000/api/cotizaciones', {
        idCliente,
        placa,
        paqueteId: paqueteId || null, // Si no eligió, manda nulo
        fallaDescripcion
      });

      if (respuesta.data.success) {
        alert("✅ " + respuesta.data.mensaje); // Mensaje real de éxito desde Node
        // Limpiamos el formulario
        setPaqueteId('');
        setFallaDescripcion('');
        setPlaca('');
      }
    } catch (error) {
      console.error('Error al solicitar cotización:', error);
      alert('❌ Hubo un error al guardar tu solicitud.');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" color="primary" fontWeight="bold" align="center" gutterBottom>
        Cotizador en Línea
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Selecciona tu vehículo y descubre un estimado de tu reparación antes de visitarnos.
      </Typography>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <form onSubmit={handleSolicitarCotizacion}>
          
          <Grid container spacing={4} alignItems="stretch">
            
            {/* --- COLUMNA IZQUIERDA: FORMULARIO Y CONFIRMACIÓN --- */}
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
              
              <Box sx={{ flexGrow: 1, backgroundColor: '#ffffff', p: 3, borderRadius: 2, border: '1px solid #e0e0e0', mb: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <DirectionsCarIcon sx={{ mr: 1 }} /> 1. Datos del Servicio
                </Typography>

                <TextField
                  select
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  label="Selecciona tu Vehículo"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  required
                >
                  {misVehiculos.length === 0 ? (
                    <MenuItem value="" disabled>No tienes vehículos registrados</MenuItem>
                  ) : (
                    misVehiculos.map((vehiculo) => (
                      <MenuItem key={vehiculo.PLACA} value={vehiculo.PLACA}>
                        {vehiculo.MARCA} {vehiculo.MODELO} - {vehiculo.PLACA}
                      </MenuItem>
                    ))
                  )}
                </TextField>
                
                <TextField
                  select
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  label="Servicios de Precio Fijo (Opcional)"
                  value={paqueteId}
                  onChange={(e) => setPaqueteId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Ninguno / Solo busco diagnóstico</em>
                  </MenuItem>
                  {/* Aquí mapeamos los datos reales de SQL */}
                  {catalogoServicios.map((paq) => (
                    <MenuItem key={paq.ID_SERVICIO} value={paq.ID_SERVICIO}>
                      {paq.NOMBRE_SERVICIO}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
                  ¿Presenta alguna falla específica?
                </Typography>
                <TextField
                  fullWidth
                  label="Describe el problema detalladamente"
                  multiline
                  rows={4}
                  variant="outlined"
                  value={fallaDescripcion}
                  onChange={(e) => setFallaDescripcion(e.target.value)}
                  placeholder="Ej. Vibra al frenar a más de 60km/h..."
                />
              </Box>

              <Box sx={{ backgroundColor: '#ffffff', p: 3, borderRadius: 2, border: '1px solid #e0e0e0', textAlign: 'center' }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  3. Confirmación
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Revisa tu selección en el panel derecho. Al confirmar, nuestro equipo recibirá tu solicitud para agendar la recepción.
                </Typography>
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large" 
                  fullWidth 
                  disabled={!placa || (!paqueteId && !fallaDescripcion.trim())}
                  sx={{ backgroundColor: '#af514c', '&:hover': { backgroundColor: '#8c403c' }, py: 1.5, fontSize: '1.1rem' }}
                >
                  SOLICITAR COTIZACIÓN OFICIAL
                </Button>
              </Box>

            </Grid>

            {/* --- COLUMNA DERECHA: RESUMEN DINÁMICO --- */}
            <Grid item xs={12} md={6}>
              <Box sx={{ height: '100%', backgroundColor: '#f9fafb', p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <BuildIcon sx={{ mr: 1 }} /> 2. Resumen
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {paqueteSeleccionado ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {paqueteSeleccionado.NOMBRE_SERVICIO}
                    </Typography>
                    
                    {/* 🟢 LA MAGIA AQUÍ: Convertimos el texto de SQL en un listado */}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                       ----------------------------------------------  Este paquete incluye ----------------------------------------------
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 3, color: 'text.secondary' }}>
                      {paqueteSeleccionado.DESCRIPCION
                        .replace('Incluye:', '')  // Quitamos la palabra "Incluye:" para que no estorbe
                        .split(',')               // Cortamos la oración cada vez que hay una coma
                        .map((item, index) => (   // Dibujamos una viñeta (li) por cada pedazo
                          <li key={index}><Typography variant="body2">{item.trim()}</Typography></li>
                      ))}
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">Total Estimado:</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#197f40' }}>
                        Q. {paqueteSeleccionado.PRECIO.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 5, opacity: 0.6 }}>
                    <Typography variant="body1">
                      Selecciona un paquete para ver el desglose exacto.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

          </Grid>
        </form>
      </Paper>
    </Container>
  );
}