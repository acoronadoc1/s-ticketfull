import React, { useState, useEffect } from 'react'; 
import { 
  Box, Typography, Grid, Paper, Card, CardContent, Chip, 
  Divider, Container, Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, TextField, LinearProgress, Fade
} from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle'; 
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; 
import CarRepairIcon from '@mui/icons-material/CarRepair'; 
import EngineeringIcon from '@mui/icons-material/Engineering';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios'; 

export default function Estatusv() {
  const [ordenes, setOrdenes] = useState([]);
  const [modalPeritaje, setModalPeritaje] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [observaciones, setObservaciones] = useState("");

  // Estos son los únicos estados visibles. Cuando pase a 'Finalizado' desaparecerá automáticamente.
  const columnasKanban = ['Recibido', 'En Revisión', 'En Reparación', 'Listo para Entrega'];

  const fetchOrdenes = async () => {
    try {
      const rol = localStorage.getItem('rol');
      const idCliente = localStorage.getItem('idCliente');
      const response = await axios.post('http://localhost:3000/api/ordenes', { rol, idCliente });
      if (response.data.success) { 
        setOrdenes(response.data.ordenes);
      }
    } catch (error) { 
      console.error("Error al cargar Estatus:", error); 
    }
  };



  useEffect(() => { 
    fetchOrdenes(); 
    const intervalo = setInterval(fetchOrdenes, 15000); 
    return () => clearInterval(intervalo); 
  }, []);

  const abrirReporte = (orden) => {
    setOrdenSeleccionada(orden);
    setObservaciones(orden.OBSERVACIONES_RECEPCION || ""); 
    setModalPeritaje(true);
  };

  // Paleta de colores minimalista para el Modo Claro
  const getColumnaEstilos = (columna) => {
    switch(columna) {
      case 'Recibido': return { bg: '#f8fafc', borde: '#64b5f6', progreso: 25 }; // Azul claro
      case 'En Revisión': return { bg: '#fffdf7', borde: '#ffb74d', progreso: 50 }; // Naranja claro
      case 'En Reparación': return { bg: '#fff5f5', borde: '#e57373', progreso: 75 }; // Rojo claro
      case 'Listo para Entrega': return { bg: '#f1f8e9', borde: '#81c784', progreso: 100 }; // Verde claro
      default: return { bg: '#ffffff', borde: '#e0e0e0', progreso: 0 };
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 5, mb: 5 }}>
      {/* HEADER DEL MONITOR */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: '800', color: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', letterSpacing: '-1px' }}>
          <BuildCircleIcon sx={{ fontSize: 55, mr: 2, color: '#1976d2' }} /> 
          MONITOR DE TALLER
        </Typography>
        <Typography variant="h6" sx={{ color: '#64748b', fontWeight: '400' }}>
          Progreso de vehículos en tiempo real. Actualización automática activada.
        </Typography>
      </Box>

      {/* TABLERO KANBAN */}
      <Grid container spacing={3}>
        {columnasKanban.map((columna) => {
          const estilos = getColumnaEstilos(columna);
          
          return (
            <Grid item xs={12} sm={6} md={3} key={columna}>
              <Paper sx={{ 
                p: 2.5, 
                minHeight: '75vh', 
                bgcolor: estilos.bg, 
                borderRadius: 4, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                borderTop: `6px solid ${estilos.borde}` 
              }}>
                <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {columna}
                </Typography>
                <Divider sx={{ mb: 3, opacity: 0.6 }} />

                {/* TARJETAS DE VEHÍCULOS */}
                {ordenes.filter(o => o.ESTADO === columna).map((orden, index) => (
                  <Fade in={true} timeout={500 + (index * 200)} key={orden.ID_ORDEN}>
                    <Card sx={{ 
                      mb: 3, 
                      borderRadius: 3, 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
                      border: '1px solid #e2e8f0',
                      bgcolor: '#ffffff',
                      transition: 'transform 0.2s', 
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } 
                    }}>
                      <CardContent sx={{ p: 2.5, pb: "16px !important" }}>
                        
                        {/* ENCABEZADO: PLACA REALISTA Y CHIP */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          {/* Diseño de Placa de Auto */}
                          <Box sx={{ 
                            border: '2px solid #1e293b', 
                            borderRadius: 1, 
                            px: 1.5, 
                            py: 0.5, 
                            bgcolor: '#f8fafc',
                            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)'
                          }}>
                            <Typography variant="h6" sx={{ fontWeight: '900', color: '#0f172a', letterSpacing: '2px', fontFamily: 'monospace' }}>
                              {orden.PLACA}
                            </Typography>
                          </Box>
                          <Chip label={`#${orden.ID_ORDEN}`} size="small" sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9', color: '#475569' }} />
                        </Box>

                        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center' }}>
                          <DirectionsCarIcon sx={{ mr: 1, color: estilos.borde }} /> 
                          {orden.MARCA} {orden.MODELO}
                        </Typography>

                        {/* COMENTARIO DEL CLIENTE */}
                        <Box sx={{ mt: 2, mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, borderLeft: `4px solid ${estilos.borde}` }}>
                           <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#64748b' }}>
                            "{orden.COMENTARIO_CLIENTE || 'Evaluación general solicitada.'}"
                          </Typography>
                        </Box>

                        {/* BOTÓN DE NOTAS (Solo si existen) */}
                        {orden.OBSERVACIONES_RECEPCION && (
                          <Button 
                            fullWidth variant="outlined" size="small" startIcon={<CarRepairIcon />}
                            onClick={() => abrirReporte(orden)}
                            sx={{ mt: 1, mb: 2, borderRadius: 2, fontWeight: 'bold', color: '#1976d2', borderColor: '#1976d2', '&:hover': { bgcolor: '#e3f2fd' } }}
                          >
                            Ver Reporte Técnico
                          </Button>
                        )}




                        {/* BARRA DE PROGRESO */}
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                              <EngineeringIcon sx={{ fontSize: 14, mr: 0.5 }} /> {columna}
                            </Typography>
                            {columna === 'Listo para Entrega' && <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />}
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={estilos.progreso} 
                            sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: estilos.borde } }} 
                          />
                        </Box>
                        
                      </CardContent>
                    </Card>
                  </Fade>
                ))}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* MODAL ESTILIZADO DE NOTAS TÉCNICAS */}
      <Dialog open={modalPeritaje} onClose={() => setModalPeritaje(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: '800', bgcolor: '#f8fafc', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
          📋 Reporte de Taller
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
             <Typography variant="subtitle2" color="text.secondary">Vehículo Placa:</Typography>
             <Typography variant="subtitle2" fontWeight="bold">{ordenSeleccionada?.PLACA}</Typography>
          </Box>
          <TextField
            fullWidth multiline rows={8}
            value={observaciones}
            variant="outlined"
            InputProps={{ 
              readOnly: true,
              sx: { bgcolor: '#fdfdfd', fontFamily: 'monospace', color: '#334155' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setModalPeritaje(false)} variant="contained" disableElevation sx={{ borderRadius: 2, fontWeight: 'bold' }}>
            Cerrar Reporte
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}