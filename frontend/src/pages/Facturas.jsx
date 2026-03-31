import React, { useState, useEffect } from 'react'; 
import { 
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, 
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent, 
  Divider, Grid, Button 
} from '@mui/material'; 
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; 
import VisibilityIcon from '@mui/icons-material/Visibility'; 
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print'; 
import PaymentsIcon from '@mui/icons-material/Payments';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import axios from 'axios'; 

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [filtro, setFiltro] = useState(""); 
  const [openModal, setOpenModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

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

  const facturasFiltradas = facturas.filter(f => {
    const numFac = f.NUMERO_FACTURA ? f.NUMERO_FACTURA.toLowerCase() : "";
    const placa = f.PLACA ? f.PLACA.toLowerCase() : "";
    const termino = filtro.toLowerCase();
    return numFac.includes(termino) || placa.includes(termino);
  });

  const verDetalleFactura = (factura) => {
    setFacturaSeleccionada(factura);
    setOpenModal(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 40, color: '#2e7d32', mr: 2 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {rol === 'Admin' ? 'Control de Facturación' : 'Mis Comprobantes'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {rol === 'Admin' ? 'Gestión de pagos, cobros y correlativos.' : 'Historial de sus servicios realizados.'}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por placa o factura..."
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

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f1f8e9' }}>
            <TableRow>
              <TableCell><b>No. Factura</b></TableCell>
              <TableCell><b>Placa</b></TableCell>
              <TableCell><b>Fecha</b></TableCell>
              <TableCell><b>Monto Total</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {facturasFiltradas.length > 0 ? (
              facturasFiltradas.map((f) => (
                <TableRow key={f.ID_FACTURA} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{f.NUMERO_FACTURA}</TableCell>
                  <TableCell>{f.PLACA || 'N/A'}</TableCell>
                  <TableCell>{f.FECHA_FACTURACION ? new Date(f.FECHA_FACTURACION).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    Q. {f.TOTAL ? f.TOTAL.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Chip 
                        label={f.ESTADO || 'N/A'} 
                        color={f.ESTADO === 'Pagada' ? 'success' : 'warning'} 
                        size="small" 
                        sx={{ fontWeight: 'bold' }}
                      />
                      {rol === 'Admin' && (
                        <IconButton 
                          size="small" 
                          color={f.ESTADO === 'Pagada' ? 'error' : 'success'} 
                          onClick={() => cambiarEstadoPago(f.ID_FACTURA, f.ESTADO, f.NUMERO_FACTURA)}
                        >
                          {f.ESTADO === 'Pagada' ? <SettingsBackupRestoreIcon fontSize="small" /> : <PaymentsIcon fontSize="small" />}
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => verDetalleFactura(f)}>
                      <VisibilityIcon />
                    </IconButton>
                    {rol === 'Admin' && (
                      <IconButton color="error" onClick={() => eliminarFactura(f.ID_FACTURA, f.NUMERO_FACTURA)}>
                        <DeleteForeverIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', bgcolor: '#f5f5f5' }}>RECIBO DE TALLER</DialogTitle>
        <DialogContent dividers>
          {facturaSeleccionada && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" align="center" color="primary" sx={{ fontWeight: 'bold' }}>ERP Automotriz S.A.</Typography>
              <Grid container spacing={1} sx={{ mt: 2, mb: 2 }}>
                <Grid item xs={6}><Typography variant="caption"><b>FACTURA:</b> {facturaSeleccionada.NUMERO_FACTURA}</Typography></Grid>
                <Grid item xs={6} align="right"><Typography variant="caption"><b>PLACA:</b> {facturaSeleccionada.PLACA}</Typography></Grid>
              </Grid>
              <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
              {facturaSeleccionada.repuestos?.map((rep, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">{rep.CANTIDAD}x {rep.NOMBRE_ITEM}</Typography>
                  <Typography variant="caption">Q. {(rep.CANTIDAD * rep.PRECIO_UNITARIO).toFixed(2)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1"><b>TOTAL A PAGAR:</b></Typography>
                <Typography variant="subtitle1" color="primary"><b>Q. {facturaSeleccionada.TOTAL?.toFixed(2)}</b></Typography>
              </Box>
              <Button fullWidth variant="contained" startIcon={<PrintIcon />} sx={{ mt: 3 }} onClick={() => window.print()}>Imprimir</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}