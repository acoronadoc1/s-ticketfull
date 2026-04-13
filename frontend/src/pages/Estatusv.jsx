import React, { useState, useEffect } from 'react'; 
import { 
  Box, Typography, Grid, Paper, Card, CardContent, Chip, 
  Divider, Container, Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, TextField 
} from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle'; 
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; 
import CarRepairIcon from '@mui/icons-material/CarRepair'; 
import EngineeringIcon from '@mui/icons-material/Engineering';
import axios from 'axios'; 

export default function Estatusv() {
  const [ordenes, setOrdenes] = useState([]);
  const [modalPeritaje, setModalPeritaje] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [observaciones, setObservaciones] = useState("");

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

  // 🕒 EFECTO DE AUTO-REFRESCO (Cada 15 segundos)
  useEffect(() => { 
    fetchOrdenes(); // Carga inicial
    const intervalo = setInterval(fetchOrdenes, 15000); 
    return () => clearInterval(intervalo); // Limpieza al cerrar pestaña
  }, []);

  const abrirReporte = (orden) => {
    setOrdenSeleccionada(orden);
    setObservaciones(orden.OBSERVACIONES_RECEPCION || ""); 
    setModalPeritaje(true);
  };

  const getColorColumna = (columna) => {
    switch(columna) {
      case 'Recibido': return '#e3f2fd';
      case 'En Revisión': return '#fff3e0'; 
      case 'En Reparación': return '#fbe9e7'; 
      case 'Listo para Entrega': return '#e8f5e9'; 
      default: return '#f5f5f5';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1565c0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <BuildCircleIcon sx={{ fontSize: 50, mr: 2 }} /> Monitor de Taller en Vivo
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Consulta el progreso de tu vehículo en tiempo real. La pantalla se actualiza automáticamente.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {columnasKanban.map((columna) => (
          <Grid item xs={12} sm={6} md={3} key={columna}>
            <Paper sx={{ p: 2, minHeight: '75vh', bgcolor: getColorColumna(columna), borderRadius: 4, boxShadow: 4, border: '1px solid #ddd' }}>
              <Typography variant="h5" align="center" sx={{ mb: 2, fontWeight: 'bold', color: '#1a237e' }}>{columna}</Typography>
              <Divider sx={{ mb: 3, bgcolor: '#1a237e', height: 2 }} />

              {ordenes.filter(o => o.ESTADO === columna).map(orden => (
                <Card key={orden.ID_ORDEN} sx={{ mb: 3, borderRadius: 3, boxShadow: 5, transition: '0.3s', '&:hover': { transform: 'scale(1.02)' } }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: '900', color: '#d32f2f' }}>{orden.PLACA}</Typography>
                      <Chip label={`ID #${orden.ID_ORDEN}`} color="primary" variant="outlined" size="small" />
                    </Box>

                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <DirectionsCarIcon fontSize="medium" sx={{ mr: 1, color: '#455a64' }} /> {orden.MARCA} {orden.MODELO}
                    </Typography>

                    <Box sx={{ mt: 2, mb: 2, p: 1.5, bgcolor: '#fafafa', borderRadius: 2, borderLeft: '5px solid #1565c0' }}>
                       <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        "{orden.COMENTARIO_CLIENTE || 'Sin observaciones del cliente'}"
                      </Typography>
                    </Box>

                    {/* BOTÓN SOLO PARA VER OBSERVACIONES DEL TALLER */}
                    {orden.OBSERVACIONES_RECEPCION && (
                      <Button 
                        fullWidth variant="contained" color="success" startIcon={<CarRepairIcon />}
                        onClick={() => abrirReporte(orden)}
                        sx={{ mt: 1, borderRadius: 2, fontWeight: 'bold' }}
                      >
                        Ver Notas Técnicas
                      </Button>
                    )}

                    <Box sx={{ mt: 2, p: 1, bgcolor: '#e8eaf6', borderRadius: 1, textAlign: 'center' }}>
                       <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1a237e', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         <EngineeringIcon sx={{ fontSize: 16, mr: 0.5 }} /> ESTADO: {columna.toUpperCase()}
                       </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* MODAL DE NOTAS TÉCNICAS (SOLO LECTURA PARA EL CLIENTE) */}
      <Dialog open={modalPeritaje} onClose={() => setModalPeritaje(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#1565c0', color: 'white' }}>
          Notas del Taller: Vehículo {ordenSeleccionada?.PLACA}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
            📋 REPORTE TÉCNICO DE RECEPCIÓN
          </Typography>
          <TextField
            fullWidth multiline rows={10}
            value={observaciones}
            variant="outlined"
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalPeritaje(false)} variant="contained" color="primary">Entendido</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}