import React, { useState, useEffect } from 'react'; 
import { Box, Typography, Button, Paper, Grid, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; 
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; 
import BuildIcon from '@mui/icons-material/Build'; 
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'; 
import TimeToLeaveIcon from '@mui/icons-material/TimeToLeave'; // Ícono para el garaje

export default function Dashboard() {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState({ vehiculos: 0, citas: 0, facturado: 0 });
  const [miGaraje, setMiGaraje] = useState([]); 
  
  // Obtenemos los datos de la sesión guardada
  const rol = localStorage.getItem('rol');
  const idCliente = localStorage.getItem('idCliente');

  useEffect(() => {
    const cargarDatos = async () => {
      // --- LÓGICA PARA ADMINISTRADOR ---
      if (rol === 'Admin') {
        try {
          const respuesta = await axios.get('http://localhost:3000/api/metricas');
          if (respuesta.data.success) {
            setMetricas({ vehiculos: respuesta.data.vehiculos, citas: respuesta.data.citas, facturado: respuesta.data.facturado || 0 });
          }
        } catch (error) {
          console.error("Error al cargar las métricas:", error);
        }
      } 
      // --- LÓGICA PARA CLIENTE (USUARIO) ---
      else if (rol === 'Usuario' && idCliente) {
        try {
          const respuesta = await axios.post('http://localhost:3000/api/garaje', { idCliente: idCliente });
          if (respuesta.data.success) {
            setMiGaraje(respuesta.data.vehiculos); 
          }
        } catch (error) {
          console.error("Error al cargar el garaje:", error);
        }
      }
    };

    cargarDatos();
  }, [rol, idCliente]); 

  return (
    <Box sx={{ p: 3 }}>
      
      {/* SECCIÓN 1: BIENVENIDA GENERAL */}
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mb: 4, borderRadius: 4, backgroundColor: '#ffffff' }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: '#197f40' }}>
          ¡Bienvenido a ERP Automotriz!
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic' }}>
          {rol === 'Admin' ? '- Panel de Control Principal -' : '- ¿Agendamos tu próxima cita? -'}
        </Typography>
        
        {rol !== 'Admin' && (
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<CalendarMonthIcon />} 
            onClick={() => navigate('/citas')} 
            sx={{ backgroundColor: '#af514c', fontSize: '1.2rem', padding: '10px 30px', borderRadius: '50px', textTransform: 'none', '&:hover': { backgroundColor: '#8c403c' } }}
          >
            Agendar una Cita
          </Button>
        )}
      </Paper>

      {/* SECCIÓN 2: KPI'S (SOLO ADMIN) */}
      {rol === 'Admin' && (
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>Resumen Gerencial</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #197f40' }}> 
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <DirectionsCarIcon sx={{ fontSize: 50, color: '#197f40', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="subtitle1">Vehículos Activos</Typography>
                    <Typography variant="h4" fontWeight="bold">{metricas.vehiculos}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #af514c' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarMonthIcon sx={{ fontSize: 50, color: '#af514c', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="subtitle1">Citas de Hoy</Typography>
                    <Typography variant="h4" fontWeight="bold">{metricas.citas}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #2196f3' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoneyIcon sx={{ fontSize: 50, color: '#2196f3', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="subtitle1">Facturación del Mes</Typography>
                    <Typography variant="h4" fontWeight="bold">Q. {metricas.facturado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* SECCIÓN 3: EL GARAJE (SOLO PARA CLIENTES) */}
      {rol !== 'Admin' && (
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#333', display: 'flex', alignItems: 'center' }}>
             <TimeToLeaveIcon sx={{ mr: 1, color: '#f57c00' }}/> Mi Garaje
          </Typography>
          
          <Grid container spacing={3}>
            {miGaraje.length > 0 ? (
              miGaraje.map((carro, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card elevation={3} sx={{ borderRadius: 3, backgroundColor: '#fafafa', borderTop: '4px solid #f57c00' }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                      <Box sx={{ bgcolor: '#ffe0b2', p: 2, borderRadius: '50%', mr: 3 }}>
                        <BuildIcon sx={{ fontSize: 40, color: '#f57c00' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">{carro.MARCA} {carro.MODELO} {carro.ANIO || ''}</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>Placa: <b>{carro.PLACA}</b></Typography>
                        <Typography variant="subtitle2" sx={{ 
                          color: carro.ESTADO_ACTUAL === 'Sin ingreso activo' ? 'gray' : '#1976d2', 
                          fontWeight: 'bold', 
                          bgcolor: carro.ESTADO_ACTUAL === 'Sin ingreso activo' ? '#eeeeee' : '#e3f2fd',
                          px: 1.5, py: 0.5, borderRadius: 1, display: 'inline-block'
                        }}>
                          Estado: {carro.ESTADO_ACTUAL}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No tienes vehículos registrados en tu garaje por el momento.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

    </Box>
  );
}