import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, TextField, MenuItem, 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Divider, Tab, Tabs, IconButton, Dialog, DialogTitle, DialogContent 
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PaymentsIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

export default function Pagos() {
  const [tab, setTab] = useState(0); // 0: Pendientes, 1: Historial
  const [mecanicos, setMecanicos] = useState([]);
  const [filtro, setFiltro] = useState({ tecnico: 'todos', inicio: '', fin: '' });
  
  const [datos, setDatos] = useState([]);
  const [totales, setTotales] = useState({ horasText: '0h 0m', bonoCalculado: 0 });
  
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null); 
  const [openModal, setOpenModal] = useState(false);

  const TARIFA_HORA = 16.67;

  // Cargar lista de mecánicos para el combo
  const cargarMecanicos = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/pagos/mecanicos');
      if (res.data.success) setMecanicos(res.data.mecanicos);
    } catch (e) { console.error(e); }
  };

  // Cargar tabla y calcular KPIs dinámicamente
  const cargarDatos = async () => {
    const url = tab === 0 ? 'http://localhost:3000/api/pagos/nomina' : 'http://localhost:3000/api/pagos/historial';
    try {
      const res = await axios.post(url, {
        idMecanico: filtro.tecnico,
        fechaInicio: filtro.inicio,
        fechaFin: filtro.fin
      });
      
      const dataArray = tab === 0 ? res.data.detalles : res.data.historial;
      setDatos(dataArray || []);

      // 🧮 Calcular las tarjetas (KPIs) basado en los datos mostrados
      let tMinutos = 0;
      let tBono = 0;
      (dataArray || []).forEach(d => {
        tBono += parseFloat(d.generado || 0);
        // Extraer horas y minutos del texto (ej. "2h 15m")
        const match = d.tiempo?.match(/(\d+)h\s*(\d+)m/);
        if (match) {
          tMinutos += parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      });
      
      setTotales({
        horasText: `${Math.floor(tMinutos / 60)}h ${tMinutos % 60}m`,
        bonoCalculado: tBono
      });

    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarMecanicos(); }, []);
  useEffect(() => { cargarDatos(); }, [tab, filtro]); // Se recarga si cambias de pestaña o filtro

  // --- ACCIONES DE LIQUIDACIÓN ---
  const liquidarLinea = async (idServicio, mecanico) => {
    if (window.confirm(`¿Confirmas el pago a ${mecanico} por este servicio?`)) {
      try {
        const res = await axios.put(`http://localhost:3000/api/pagos/liquidar/${idServicio}`);
        if (res.data.success) cargarDatos(); 
      } catch (error) { alert("Error al liquidar pago."); }
    }
  };

  const liquidarTodo = async () => {
    if (datos.length === 0) return alert("No hay datos para liquidar.");
    if (window.confirm(`⚠️ ¿Estás seguro de liquidar TODOS los ${datos.length} servicios listados?`)) {
      try {
        const ids = datos.map(d => d.id);
        const res = await axios.put('http://localhost:3000/api/pagos/liquidar-masivo', { ids });
        if (res.data.success) {
          alert("Todos los pagos fueron liquidados exitosamente.");
          cargarDatos(); 
        }
      } catch (error) { alert("Error al liquidar pagos masivamente."); }
    }
  };

  // --- PREPARAR IMPRESIÓN ---
  const imprimirIndividual = (fila) => {
    setPagoSeleccionado([fila]); 
    setOpenModal(true);
  };

  const imprimirReporteCompleto = () => {
    setPagoSeleccionado(datos);
    setOpenModal(true);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
        Gestión Financiera de Técnicos
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<PaymentsIcon />} label="Pendientes de Liquidar" />
        <Tab icon={<HistoryIcon />} label="Bóveda de Historial" />
      </Tabs>

      {/* --- ÁREA DE FILTROS --- */}
      <Paper elevation={2} sx={{ p: 2, display: 'flex', gap: 2, borderRadius: 3, alignItems: 'center', mb: 4, flexWrap: 'wrap' }}>
        <TextField type="date" label="Desde" value={filtro.inicio} onChange={(e) => setFiltro({...filtro, inicio: e.target.value})} InputLabelProps={{ shrink: true }} size="small" />
        <TextField type="date" label="Hasta" value={filtro.fin} onChange={(e) => setFiltro({...filtro, fin: e.target.value})} InputLabelProps={{ shrink: true }} size="small" />
        <TextField select label="Mecánico" value={filtro.tecnico} onChange={(e) => setFiltro({...filtro, tecnico: e.target.value})} size="small" sx={{ minWidth: 200 }}>
          <MenuItem value="todos">Todos los técnicos</MenuItem>
          {mecanicos.map((m) => (
            <MenuItem key={m.ID_MECANICO} value={m.ID_MECANICO}>{m.NOMBRE_MECANICO}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" color="primary" onClick={cargarDatos}>
          Filtrar
        </Button>
      </Paper>

      {/* --- TARJETAS DE KPIs DINÁMICAS --- */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '5px solid #2196f3' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Tareas en Tabla</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TaskAltIcon color="action" />
                <Typography variant="h5" fontWeight="bold">{datos.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '5px solid #ff9800' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Horas Efectivas Totales</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon color="action" />
                <Typography variant="h5" fontWeight="bold">{totales.horasText}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '5px solid #9c27b0' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Tarifa Fija por Hora</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoneyIcon color="action" />
                <Typography variant="h5" fontWeight="bold">Q. {TARIFA_HORA.toFixed(2)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '5px solid #4caf50', bgcolor: '#f1f8e9' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>{tab === 0 ? 'Total a Liquidar' : 'Total Pagado'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWalletIcon color="success" />
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  Q. {totales.bonoCalculado.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* --- TABLA DE DATOS --- */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2, bgcolor: tab === 0 ? '#fff3e0' : '#e3f2fd', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight="bold" color={tab === 0 ? '#e65100' : '#1565c0'}>
            {tab === 0 ? '⏳ Operaciones Pendientes de Pago' : '✅ Historial de Operaciones Liquidadas'}
          </Typography>
        </Box>
        <Divider />
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Fecha Fin</b></TableCell>
              <TableCell><b>Mecánico / Orden</b></TableCell>
              <TableCell><b>Servicio</b></TableCell>
              <TableCell align="center"><b>Tiempo</b></TableCell>
              <TableCell align="right"><b>Monto</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datos.length > 0 ? datos.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell>{d.fecha}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold" color="primary">{d.mecanico}</Typography>
                  <Typography variant="caption" color="text.secondary">{d.orden}</Typography>
                </TableCell>
                <TableCell>{d.servicio}</TableCell>
                <TableCell align="center">{d.tiempo}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>Q. {d.generado}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => imprimirIndividual(d)} title="Imprimir Recibo Individual">
                    <PrintIcon />
                  </IconButton>
                  {tab === 0 && (
                    <Button size="small" variant="outlined" color="success" sx={{ ml: 1 }} onClick={() => liquidarLinea(d.id, d.mecanico)}>
                      Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No se encontraron registros para estos filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- BOTONES DE ACCIÓN MASIVA (Solo se ven si hay datos) --- */}
      {datos.length > 0 && (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: '#f9f9f9', mt: 2, borderRadius: 2 }}>
          <Button variant="outlined" color="primary" startIcon={<PrintIcon />} onClick={imprimirReporteCompleto}>
            Imprimir Reporte Completo
          </Button>
          {tab === 0 && (
            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={liquidarTodo}>
              Liquidar Todo lo Filtrado
            </Button>
          )}
        </Box>
      )}

      {/* --- MODAL DE IMPRESIÓN DINÁMICO --- */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>VOUCHER DE PAGO</DialogTitle>
        <DialogContent dividers>
          {pagoSeleccionado && (
            <Box id="recibo-print" sx={{ p: 2 }}>
              <Typography variant="h6" align="center" color="primary" fontWeight="bold">ERP AUTOMOTRIZ</Typography>
              <Typography variant="caption" display="block" align="center" gutterBottom>
                Recibo de Honorarios por Productividad ({tab === 0 ? 'Pendiente' : 'Liquidado'})
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Fecha de Emisión: {new Date().toLocaleDateString()}
              </Typography>
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">DETALLE DE SERVICIOS:</Typography>
              </Box>

              {pagoSeleccionado.map((p, i) => (
                <Box key={i} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', pb: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{p.mecanico}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.orden} - {p.servicio} ({p.tiempo})</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold" color="success.main">Q. {parseFloat(p.generado).toFixed(2)}</Typography>
                </Box>
              ))}
              
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Typography variant="subtitle1"><b>TOTAL A PAGAR:</b></Typography>
                 <Typography variant="h6" color="success.main">
                   <b>Q. {pagoSeleccionado.reduce((s, x) => s + parseFloat(x.generado), 0).toFixed(2)}</b>
                 </Typography>
              </Box>

              <Box sx={{ mt: 8, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <Box>
                  <Divider sx={{ width: 150, mb: 1, borderColor: 'black' }} />
                  <Typography variant="caption">Firma Administrador</Typography>
                </Box>
                <Box>
                  <Divider sx={{ width: 150, mb: 1, borderColor: 'black' }} />
                  <Typography variant="caption">Firma de Recibido</Typography>
                </Box>
              </Box>
              
              <Button fullWidth variant="contained" sx={{ mt: 5 }} onClick={() => window.print()}>
                Confirmar e Imprimir
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}