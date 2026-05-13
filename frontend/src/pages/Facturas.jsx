import React, { useState, useEffect } from 'react'; 
import { 
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, 
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent, 
  Divider, Grid, Button, Tabs, Tab
} from '@mui/material'; 
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; 
import VisibilityIcon from '@mui/icons-material/Visibility'; 
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print'; 
import PaymentsIcon from '@mui/icons-material/Payments';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios'; 

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [filtro, setFiltro] = useState(""); 
  const [openModal, setOpenModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [tabActual, setTabActual] = useState(0); // 0 = Pendientes, 1 = Pagadas

  const rol = localStorage.getItem('rol');
  const idCliente = localStorage.getItem('idCliente');

  const obtenerFacturas = async () => {
    try {
      const response = await axios.post('http://localhost:3000/api/facturas', {
        rol: rol,
        idCliente: idCliente
      });
      if (response.data.success) {
        setFacturas(response.data.facturas || []);
      }
    } catch (error) {
      console.error("Error cargando facturas:", error);
    }
  };

  useEffect(() => {
    obtenerFacturas();
  }, []);

  // --- 💰 FUNCIÓN PARA CAMBIAR ESTADO (PAGAR / REVERTIR) ---
  const cambiarEstadoPago = async (idFactura, estadoActual, numFac) => {
    const accion = estadoActual === 'Pagada' ? 'revertir a PENDIENTE' : 'marcar como PAGADA';
    if (window.confirm(`¿Deseas ${accion} la factura ${numFac}?`)) {
      try {
        const res = await axios.put(`http://localhost:3000/api/facturas/${idFactura}/cambiar-estado`, {
          estadoActual: estadoActual
        });
        if (res.data.success) {
          obtenerFacturas(); 
        }
      } catch (error) {
        alert("Error al cambiar estado");
      }
    }
  };

  // --- 🗑️ FUNCIÓN PARA ELIMINAR FACTURA ---
  const eliminarFactura = async (idFactura, numFac) => {
    if (window.confirm(`⚠️ ¿ESTÁS SEGURO? Se eliminará la factura ${numFac} permanentemente del historial.`)) {
      try {
        const res = await axios.delete(`http://localhost:3000/api/facturas/${idFactura}`);
        if (res.data.success) {
          obtenerFacturas();
        }
      } catch (error) {
        alert("Error al eliminar la factura");
      }
    }
  };

  const verDetalleFactura = (factura) => {
    setFacturaSeleccionada(factura);
    setOpenModal(true);
  };

  // --- 🔍 LÓGICA DE FILTRADO EN DOS NIVELES (Pestaña y Texto) ---
  const facturasFiltradas = facturas.filter(f => {
    // 1. Filtro de Pestaña (0 = Pendiente, 1 = Pagada)
    const estadoMatch = tabActual === 0 ? f.ESTADO === 'Pendiente' : f.ESTADO === 'Pagada';
    
    // 2. Filtro de Texto (Buscador)
    const numFac = f.NUMERO_FACTURA ? f.NUMERO_FACTURA.toLowerCase() : "";
    const placa = f.PLACA ? f.PLACA.toLowerCase() : "";
    const termino = filtro.toLowerCase();
    const textoMatch = numFac.includes(termino) || placa.includes(termino);

    // Ambas condiciones deben cumplirse
    return estadoMatch && textoMatch;
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* HEADER */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 40, color: '#1565c0', mr: 2 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {rol === 'Admin' ? 'Caja y Facturación' : 'Mis Comprobantes'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {rol === 'Admin' ? 'Gestión de cobros y liberación de vehículos.' : 'Historial de pagos de sus vehículos.'}
          </Typography>
        </Box>
      </Box>

      {/* PESTAÑAS (TABS) */}
      <Tabs 
        value={tabActual} 
        onChange={(e, nuevoValor) => setTabActual(nuevoValor)} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        textColor="primary" 
        indicatorColor="primary"
      >
        <Tab icon={<PendingActionsIcon />} iconPosition="start" label="Facturas por Cobrar" sx={{ fontWeight: 'bold' }} />
        <Tab icon={<CheckCircleIcon />} iconPosition="start" label="Historial de Pagadas" sx={{ fontWeight: 'bold' }} />
      </Tabs>

      {/* BUSCADOR */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por placa o número de factura..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* TABLA */}
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: tabActual === 0 ? '#fff3e0' : '#e8f5e9' }}>
            <TableRow>
              <TableCell><b>No. Factura</b></TableCell>
              <TableCell><b>No. Orden</b></TableCell>
              <TableCell><b>Placa</b></TableCell>
              <TableCell><b>Fecha Generación</b></TableCell>
              <TableCell><b>Monto a Pagar</b></TableCell>
              {tabActual === 0 && rol === 'Admin' && <TableCell align="center"><b>Cobrar</b></TableCell>}
              {tabActual === 1 && <TableCell align="center"><b>Acciones</b></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {facturasFiltradas.length > 0 ? (
              facturasFiltradas.map((f) => (
                <TableRow key={f.ID_FACTURA} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{f.NUMERO_FACTURA}</TableCell>
                  
                  {/* NUEVA COLUMNA: NO. ORDEN */}
                  <TableCell>
                    <Chip label={`ORD-${f.ID_ORDEN}`} size="small" variant="outlined" />
                  </TableCell>
                  
                  <TableCell>{f.PLACA || 'N/A'}</TableCell>
                  <TableCell>{f.FECHA_FACTURACION ? new Date(f.FECHA_FACTURACION).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    Q. {f.TOTAL ? f.TOTAL.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </TableCell>

                  {/* COLUMNA DE COBRO (Solo en Pestaña 0 y si es Admin) */}
                  {tabActual === 0 && rol === 'Admin' && (
                    <TableCell align="center">
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<PaymentsIcon />}
                        onClick={() => cambiarEstadoPago(f.ID_FACTURA, f.ESTADO, f.NUMERO_FACTURA)}
                        sx={{ fontWeight: 'bold', borderRadius: 2 }}
                      >
                        Registrar Pago
                      </Button>
                    </TableCell>
                  )}

                  {/* COLUMNA DE ACCIONES (Solo en Pestaña 1) */}
                  {tabActual === 1 && (
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => verDetalleFactura(f)}
                        >
                          Ver
                        </Button>

                        {rol === 'Admin' && (
                          <>
                            <IconButton 
                              size="small" 
                              color="warning" 
                              title="Revertir Pago (Devolver al Cajero)"
                              onClick={() => cambiarEstadoPago(f.ID_FACTURA, f.ESTADO, f.NUMERO_FACTURA)}
                            >
                              <SettingsBackupRestoreIcon />
                            </IconButton>
                            <IconButton color="error" title="Eliminar Factura" onClick={() => eliminarFactura(f.ID_FACTURA, f.NUMERO_FACTURA)}>
                              <DeleteForeverIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="h6">
                    {tabActual === 0 ? "¡Todo al día! No hay facturas pendientes de cobro." : "No hay facturas pagadas en el historial."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL DEL RECIBO (Sin cambios estructurales) */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', bgcolor: '#f5f5f5' }}>RECIBO DE CAJA</DialogTitle>
        <DialogContent dividers>
          {facturaSeleccionada && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" align="center" color="primary" sx={{ fontWeight: 'bold' }}>Taller ERP Automotriz</Typography>
              <Grid container spacing={1} sx={{ mt: 2, mb: 2 }}>
                <Grid item xs={6}><Typography variant="caption"><b>FACTURA:</b> {facturaSeleccionada.NUMERO_FACTURA}</Typography></Grid>
                <Grid item xs={6} align="right"><Typography variant="caption"><b>PLACA:</b> {facturaSeleccionada.PLACA}</Typography></Grid>
                <Grid item xs={12}><Typography variant="caption"><b>REF ORDEN:</b> ORD-{facturaSeleccionada.ID_ORDEN}</Typography></Grid>
              </Grid>
              <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1"><b>TOTAL PAGADO:</b></Typography>
                <Typography variant="subtitle1" color="success.main"><b>Q. {facturaSeleccionada.TOTAL?.toFixed(2)}</b></Typography>
              </Box>
              <Button fullWidth variant="contained" startIcon={<PrintIcon />} sx={{ mt: 3 }} onClick={() => window.print()}>Imprimir Recibo</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}