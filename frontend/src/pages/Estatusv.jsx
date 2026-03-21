import React, { useState, useEffect } from 'react'; 
import { 
  Box, Typography, Grid, Paper, Card, CardContent, Chip, Button, 
  Divider, Container, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField 
} from '@mui/material'; 
import BuildCircleIcon from '@mui/icons-material/BuildCircle'; 
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; 
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; 
import CarRepairIcon from '@mui/icons-material/CarRepair'; 
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import axios from 'axios'; 

export default function Estatusv() {
  const [ordenes, setOrdenes] = useState([]);
  
  // --- ESTADOS PARA REPORTES GENERALES ---
  const [modalPeritaje, setModalPeritaje] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [textoFisico, setTextoFisico] = useState("");
  const [textoInterno, setTextoInterno] = useState("");

  const columnasKanban = ['Recibido', 'En Revisión', 'En Reparación', 'Listo para Entrega'];

  const fetchOrdenes = async () => {
    try {
      const rol = localStorage.getItem('rol');
      const idCliente = localStorage.getItem('idCliente');
      const response = await axios.post('http://localhost:3000/api/ordenes', { rol, idCliente });
      if (response.data.success) { setOrdenes(response.data.ordenes); }
    } catch (error) { console.error("Error al cargar Kanban:", error); }
  };

  useEffect(() => { fetchOrdenes(); }, []);

  // --- ABRIR MODAL DE REPORTES GENERALES (FÍSICO E INTERNO) ---
  const abrirReporte = (orden) => {
    setOrdenSeleccionada(orden);
    setTextoFisico(orden.ESTADO_VISUAL || "");
    setTextoInterno(orden.ESTADO_INTERNO || ""); 
    setModalPeritaje(true);
  };

  const guardarPeritaje = async () => {
    try {
      await axios.put(`http://localhost:3000/api/ordenes/${ordenSeleccionada.ID_ORDEN}/peritaje`, {
        estadoVisual: textoFisico,
        estadoInterno: textoInterno
      });
      setModalPeritaje(false);
      fetchOrdenes();
    } catch (error) { alert("No se pudo guardar el reporte."); }
  };

  // --- FUNCIÓN PARA MOVER TARJETAS (AVANZAR Y RETROCEDER) ---
  const cambiarEstado = async (idOrden, nuevoEstado) => {
    try {
      await axios.put(`http://localhost:3000/api/ordenes/${idOrden}/estado`, {
        nuevoEstado: nuevoEstado
      });
      fetchOrdenes();
    } catch (error) { console.error("Error moviendo tarjeta:", error); }
  };

  const finalizarProceso = async (idOrden) => {
    const monto = prompt("Ingrese el monto total a cobrar (Q):", "500");
    if (monto && !isNaN(monto)) {
      try {
        await axios.post(`http://localhost:3000/api/ordenes/${idOrden}/finalizar`, { total: parseFloat(monto) });
        alert("✅ Vehículo entregado. Factura generada.");
        fetchOrdenes();
      } catch (error) { alert("Error al procesar la salida."); }
    }
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1565c0', display: 'flex', alignItems: 'center' }}>
          <BuildCircleIcon sx={{ fontSize: 40, mr: 1 }} /> Seguimiento de Vehículo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {localStorage.getItem('rol') === 'Admin' ? "Gestiona el flujo de trabajo del taller." : "Consulta el progreso en tiempo real de tu reparación."}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {columnasKanban.map((columna, indexColumna) => (
          <Grid item xs={12} sm={6} md={3} key={columna}>
            <Paper sx={{ p: 2, minHeight: '70vh', bgcolor: getColorColumna(columna), borderRadius: 3, boxShadow: 2 }}>
              <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 'bold', color: '#424242' }}>{columna}</Typography>
              <Divider sx={{ mb: 2 }} />

              {ordenes.filter(o => o.ESTADO === columna).map(orden => (
                <Card key={orden.ID_ORDEN} sx={{ mb: 2, borderRadius: 2, boxShadow: 3 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: '900', color: '#1976d2' }}>{orden.PLACA}</Typography>
                      <Chip label={`#${orden.ID_ORDEN}`} size="small" />
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <DirectionsCarIcon fontSize="small" sx={{ mr: 0.5 }} /> {orden.MARCA} {orden.MODELO}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic', minHeight: '40px' }}>
                      "{orden.COMENTARIO_CLIENTE || 'Sin notas'}"
                    </Typography>

                    {/* BOTÓN REPORTES GENERALES (Muestra estado si ya está lleno) */}
                    <Button 
                      fullWidth size="small" variant="outlined" startIcon={<CarRepairIcon />}
                      onClick={() => abrirReporte(orden)}
                      sx={{ mb: 2, textTransform: 'none', fontWeight: 'bold' }}
                      color={(orden.ESTADO_VISUAL || orden.ESTADO_INTERNO) ? "success" : "inherit"}
                    >
                      {(orden.ESTADO_VISUAL || orden.ESTADO_INTERNO) ? "Ver Reportes Generales" : "Reportes Generales"}
                    </Button>

                    {/* CONTROLES DE AVANCE Y RETROCESO (SOLO ADMIN) */}
                    {localStorage.getItem('rol') === 'Admin' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        
                        {/* 🔴 BOTÓN VOLVER: Aparece en todas las columnas excepto en la primera */}
                        {columna !== 'Recibido' && (
                          <Button 
                            variant="outlined" color="secondary" size="small" sx={{ minWidth: '45px' }}
                            onClick={() => cambiarEstado(orden.ID_ORDEN, columnasKanban[indexColumna - 1])}
                          >
                            <ArrowBackIosNewIcon fontSize="small" />
                          </Button>
                        )}

                        {/* 🟢 BOTÓN AVANZAR / FINALIZAR */}
                        {columna !== 'Listo para Entrega' ? (
                          <Button 
                            fullWidth variant="contained" size="small" endIcon={<ArrowForwardIosIcon fontSize="small"/>}
                            color={columna === 'Recibido' ? 'info' : columna === 'En Revisión' ? 'warning' : 'error'}
                            onClick={() => cambiarEstado(orden.ID_ORDEN, columnasKanban[indexColumna + 1])}
                          >
                            Avanzar
                          </Button>
                        ) : (
                          <Button fullWidth variant="contained" color="success" size="small" startIcon={<CheckCircleIcon />} onClick={() => finalizarProceso(orden.ID_ORDEN)}>
                            Finalizar
                          </Button>
                        )}
                      </Box>
                    )}

                    {localStorage.getItem('rol') !== 'Admin' && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1565c0' }}>ESTADO: {columna.toUpperCase()}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* MODAL DE REPORTES GENERALES (DIVIDIDO) */}
      <Dialog open={modalPeritaje} onClose={() => setModalPeritaje(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
          Reportes Generales: {ordenSeleccionada?.PLACA}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            
            {/* SECCIÓN FÍSICA */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>📋 DAÑOS FÍSICOS EXTERNOS</Typography>
              <TextField
                fullWidth multiline rows={6}
                disabled={localStorage.getItem('rol') !== 'Admin'}
                placeholder="Golpes, rayones, llantas..."
                value={textoFisico}
                onChange={(e) => setTextoFisico(e.target.value)}
              />
            </Grid>

            {/* SECCIÓN INTERNA */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="error" sx={{ fontWeight: 'bold', mb: 1 }}>⚙️ DAÑOS INTERNOS / ELÉCTRICOS</Typography>
              <TextField
                fullWidth multiline rows={6}
                disabled={localStorage.getItem('rol') !== 'Admin'}
                placeholder="Luces, ruidos, testigos tablero..."
                value={textoInterno}
                onChange={(e) => setTextoInterno(e.target.value)}
              />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalPeritaje(false)} color="inherit">Cerrar</Button>
          {localStorage.getItem('rol') === 'Admin' && (
            <Button variant="contained" onClick={guardarPeritaje} color="primary">Guardar Reportes</Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}