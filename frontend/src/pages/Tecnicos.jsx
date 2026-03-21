import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Button, OutlinedInput, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tab, Tabs } from '@mui/material';
import axios from 'axios';

export default function Tecnicos() {
  const [tab, setTab] = useState(0);
  const [datos, setDatos] = useState({ ordenes: [], mecanicos: [], servicios: [] });
  const [trabajoActual, setTrabajoActual] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccion, setSeleccion] = useState({ idOrden: '', idsServicios: [], idsMecanicos: [] });

  useEffect(() => {
    cargarDatos();
    cargarTrabajoActual();
    cargarHistorial();
  }, []);

  const cargarDatos = async () => {
    const res = await axios.get('http://localhost:3000/api/tecnicos/datos-iniciales');
    setDatos(res.data);
  };

  const cargarTrabajoActual = async () => {
    const res = await axios.get('http://localhost:3000/api/tecnicos/trabajo-actual');
    setTrabajoActual(res.data);
  };

  const cargarHistorial = async () => {
    const res = await axios.get('http://localhost:3000/api/tecnicos/historial');
    setHistorial(res.data);
  };

  const enviarAsignacion = async () => {
    if (!seleccion.idOrden || seleccion.idsServicios.length === 0 || seleccion.idsMecanicos.length === 0) return alert("Faltan datos");
    try {
      await axios.post('http://localhost:3000/api/tecnicos/asignar', seleccion);
      alert("✅ Asignado");
      setSeleccion({ idOrden: '', idsServicios: [], idsMecanicos: [] });
      cargarDatos(); cargarTrabajoActual();
    } catch (err) { alert("Error"); }
  };

  const finalizarTarea = async (idDet, idMec) => {
    try {
      await axios.put('http://localhost:3000/api/tecnicos/finalizar', { ID_DETALLE_SRV: idDet, ID_MECANICO: idMec });
      cargarDatos(); cargarTrabajoActual(); cargarHistorial();
    } catch (err) { alert("Error al finalizar"); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Módulo de Técnicos</Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Asignación y Proceso" />
        <Tab label="Historial Finalizados" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Nueva Asignación</Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Orden</InputLabel>
                <Select value={seleccion.idOrden} onChange={(e) => setSeleccion({...seleccion, idOrden: e.target.value})}>
                  {datos.ordenes.map(o => <MenuItem key={o.ID_ORDEN} value={o.ID_ORDEN}>#{o.ID_ORDEN} - {o.PLACA}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Servicios</InputLabel>
                <Select multiple value={seleccion.idsServicios} onChange={(e) => setSeleccion({...seleccion, idsServicios: e.target.value})} input={<OutlinedInput label="Servicios" />} renderValue={(s) => s.map(id => datos.servicios.find(x => x.ID_SERVICIO === id)?.NOMBRE_SERVICIO).join(', ')}>
                  {datos.servicios.map(s => (
                    <MenuItem key={s.ID_SERVICIO} value={s.ID_SERVICIO}>
                      <Checkbox checked={seleccion.idsServicios.indexOf(s.ID_SERVICIO) > -1} />
                      <ListItemText primary={s.NOMBRE_SERVICIO} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Mecánicos</InputLabel>
                <Select multiple value={seleccion.idsMecanicos} onChange={(e) => setSeleccion({...seleccion, idsMecanicos: e.target.value})} input={<OutlinedInput label="Mecánicos" />} renderValue={(s) => s.map(id => datos.mecanicos.find(x => x.ID_MECANICO === id)?.NOMBRE_MECANICO).join(', ')}>
                  {datos.mecanicos.map(m => (
                    <MenuItem key={m.ID_MECANICO} value={m.ID_MECANICO}>
                      <Checkbox checked={seleccion.idsMecanicos.indexOf(m.ID_MECANICO) > -1} />
                      <ListItemText primary={m.NOMBRE_MECANICO} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" fullWidth onClick={enviarAsignacion}>Asignar</Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ bgcolor: '#eee' }}><TableRow>
                  <TableCell>Orden</TableCell><TableCell>Placa</TableCell><TableCell>Servicio</TableCell><TableCell>Mecánico</TableCell><TableCell>Acción</TableCell>
                </TableRow></TableHead>
                <TableBody>
                {trabajoActual.map((t) => (
                  <TableRow key={t.ID_DETALLE_SRV}>
                    <TableCell>#{t.ID_ORDEN}</TableCell>
                    <TableCell><b>{t.PLACA}</b></TableCell>
                    <TableCell>{t.NOMBRE_SERVICIO}</TableCell>
                    <TableCell>{t.NOMBRE_MECANICO}</TableCell>
                    <TableCell>
                      {/* Esto mostrará el estado actual que viene de la base de datos */}
                      <Chip
                        label={t.ESTADO}
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => finalizarTarea(t.ID_DETALLE_SRV, t.ID_MECANICO)}
                      >
                        Terminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: '#388e3c' }}><TableRow>
              <TableCell sx={{ color: 'white' }}>Orden</TableCell>
              <TableCell sx={{ color: 'white' }}>Placa</TableCell>
              <TableCell sx={{ color: 'white' }}>Servicio Realizado</TableCell>
              <TableCell sx={{ color: 'white' }}>Mecánico</TableCell>
              <TableCell sx={{ color: 'white' }}>Precio</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {historial.map((h, i) => (
                <TableRow key={i}>
                  <TableCell>#{h.ID_ORDEN}</TableCell><TableCell>{h.PLACA}</TableCell>
                  <TableCell>{h.NOMBRE_SERVICIO}</TableCell><TableCell>{h.NOMBRE_MECANICO}</TableCell>
                  <TableCell>Q{h.PRECIO_COBRADO}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}