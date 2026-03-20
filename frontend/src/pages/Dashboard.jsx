// --- IMPORTACIONES ---
import React, { useState, useEffect } from 'react'; 
import { Box, Typography, Button, Paper, Grid, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; 
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; 
import BuildIcon from '@mui/icons-material/Build'; 
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'; 

// 🟢 NUEVO: Recibimos el "usuario" que nos mandó App.jsx
export default function Dashboard({ rol, usuario }) {
  const navigate = useNavigate();

  const [metricas, setMetricas] = useState({ vehiculos: 0, citas: 0, facturado: 0 });
  const [miGaraje, setMiGaraje] = useState([]); // 🟢 Aquí guardaremos los carros de SQL

  useEffect(() => {
    const cargarDatos = async () => {
      if (rol === 'Admin') {
        try {
          const respuesta = await axios.get('http://localhost:3000/api/metricas');
          if (respuesta.data.success) {
            setMetricas({ vehiculos: respuesta.data.vehiculos, citas: respuesta.data.citas, facturado: respuesta.data.facturado });
          }
        } catch (error) {
          console.error("Error al cargar las métricas:", error);
        }
      } 
      // 🟢 NUEVO: Si es Cliente, buscamos su garaje usando su nombre de usuario
      else if (rol === 'Usuario' && usuario) {
        try {
          const respuesta = await axios.post('http://localhost:3000/api/garaje', { usuario: usuario });
          if (respuesta.data.success) {
            setMiGaraje(respuesta.data.vehiculos); // Metemos el Honda a la variable
          }
        } catch (error) {
          console.error("Error al cargar el garaje:", error);
        }
      }
    };

    cargarDatos();
  }, [rol, usuario]); 


  return (
    <Box sx={{ p: 3 }}>
      
      {/* SECCIÓN 1: BIENVENIDA GENERAL */}
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mb: 4, borderRadius: 4, backgroundColor: '#ffffff' }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: '#197f40' }}>
          ¡Bienvenido al taller Auto Motriz!
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic' }}>
          - ¿Agendamos tu cita? -
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<CalendarMonthIcon />} 
          onClick={() => navigate('/citas')} 
          sx={{ backgroundColor: '#af514c', fontSize: '1.2rem', padding: '10px 30px', borderRadius: '50px', textTransform: 'none', '&:hover': { backgroundColor: '#8c403c' } }}
        >
          Agendar una Cita
        </Button>
      </Paper>

      {/* SECCIÓN 2: KPI'S (SOLO ADMIN) */}
      {rol === 'Admin' && (
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>Panel de Control Gerencial</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card elevation={2} sx={{ borderRadius: 3, borderLeft: '5px solid #197f40' }}> 
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <DirectionsCarIcon sx={{ fontSize: 50, color: '#197f40', mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" variant="subtitle1">Vehículos en Taller</Typography>
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
                    <Typography color="text.secondary" variant="subtitle1">Citas para Hoy</Typography>
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
                    <Typography color="text.secondary" variant="subtitle1">Facturado este Mes</Typography>
                    <Typography variant="h4" fontWeight="bold">Q. {metricas.facturado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ==========================================
          SECCIÓN 3: EL GARAJE (SOLO PARA CLIENTES)
          ========================================== */}
      {rol === 'Usuario' && (
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>
            Mi Garaje
          </Typography>
          
          {/* 🟢 MAGIA: Iteramos sobre los carros reales que trajo SQL */}
          {miGaraje.length > 0 ? (
            miGaraje.map((carro, index) => (
              <Card key={index} elevation={2} sx={{ borderRadius: 3, backgroundColor: '#f5f5f5', mb: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                  <BuildIcon sx={{ fontSize: 50, color: '#f57c00', mr: 3 }} />
                  <Box>
                    {/* Imprimimos las variables conectadas a SQL */}
                    <Typography variant="h6" fontWeight="bold">{carro.MARCA} {carro.MODELO} {carro.ANIO}</Typography>
                    <Typography variant="body1" color="text.secondary">Placa: {carro.PLACA}</Typography>
                    <Typography variant="subtitle1" sx={{ color: '#f57c00', fontWeight: 'bold', mt: 1 }}>
                      Estatus Actual: En Revisión
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography variant="body1" color="text.secondary">
              Cargando tu garaje o no tienes vehículos registrados...
            </Typography>
          )}
        </Box>
      )}

    </Box>
  );
}