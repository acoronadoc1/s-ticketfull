import React, { useState, useEffect } from 'react';

import { Box, Paper, Typography, Grid, TextField, Button, Alert, Chip, Divider, Container, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import axios from 'axios';



import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

import dayjs from 'dayjs';

import 'dayjs/locale/es';



dayjs.locale('es');



const HORARIOS_BASE = ['08:00 AM', '10:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];



export default function Citas({ idCliente }) {

  const [fecha, setFecha] = useState(dayjs());

  const [horasOcupadas, setHorasOcupadas] = useState([]);

  const [horaSeleccionada, setHoraSeleccionada] = useState('');

 

  const [misVehiculos, setMisVehiculos] = useState([]);

  const [placa, setPlaca] = useState('');

  const [motivo, setMotivo] = useState('');

  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });



  const [modalAbierto, setModalAbierto] = useState(false);

  const [nuevoAuto, setNuevoAuto] = useState({ placa: '', marca: '', modelo: '', anio: '', color: '' });

  const [mensajeModal, setMensajeModal] = useState({ texto: '', tipo: '' });



  const cargarMisVehiculos = async () => {

    try {

      const respuesta = await axios.get(`http://localhost:3000/api/vehiculos/cliente/${idCliente}`);

      if (respuesta.data.success) {

        setMisVehiculos(respuesta.data.vehiculos);

      }

    } catch (error) {

      console.error('Error al traer vehículos');

    }

  };



  useEffect(() => {

    cargarMisVehiculos();

  }, [idCliente]);



  useEffect(() => {

    const obtenerDisponibilidad = async () => {

      const fechaFormateada = fecha.format('YYYY-MM-DD');

      setHoraSeleccionada('');

      try {

        const respuesta = await axios.get(`http://localhost:3000/api/citas/disponibles/${fechaFormateada}`);

        if (respuesta.data.success) {

          setHorasOcupadas(respuesta.data.ocupadas);

        }

      } catch (error) {

        console.error('Error al consultar disponibilidad');

      }

    };

    obtenerDisponibilidad();

  }, [fecha]);



  const handleGuardarAuto = async () => {

    setMensajeModal({ texto: '', tipo: '' });

    try {

      const respuesta = await axios.post('http://localhost:3000/api/vehiculos', {

        ...nuevoAuto,

        id_cliente: idCliente

      });



      if (respuesta.data.success) {

        setModalAbierto(false);

        cargarMisVehiculos();

        setPlaca(nuevoAuto.placa);

        setNuevoAuto({ placa: '', marca: '', modelo: '', anio: '', color: '' });

        setMensaje({ texto: '¡Vehículo agregado y seleccionado!', tipo: 'info' });

      }

    } catch (error) {

      if (error.response && error.response.data) {

        setMensajeModal({ texto: error.response.data.mensaje, tipo: 'error' });

      } else {

        setMensajeModal({ texto: 'Error al registrar el auto.', tipo: 'error' });

      }

    }

  };



  // 🟢 FUNCIÓN ACTUALIZADA: Agenda cita y envía al Estatus (Kanban)

  const handleAgendar = async (e) => {

    e.preventDefault();

    if (!horaSeleccionada) {

      setMensaje({ texto: 'Por favor, selecciona un horario disponible.', tipo: 'warning' });

      return;

    }



    try {

      // 1. Guardar la cita

      const respuesta = await axios.post('http://localhost:3000/api/citas', {

        id_cliente: idCliente,

        placa: placa,

        fecha: fecha.format('YYYY-MM-DD'),

        hora: horaSeleccionada,

        motivo: motivo

      });



      if (respuesta.data.success) {

        // 2. 🚀 REGISTRO AUTOMÁTICO EN EL KANBAN (ESTATUS)

        await axios.post('http://localhost:3000/api/ordenes-desde-cita', {

          placa: placa,

          motivo: motivo

        });



        setMensaje({ texto: '¡Cita agendada con éxito! Ya puedes ver tu vehículo en el estatus.', tipo: 'success' });

        setHorasOcupadas([...horasOcupadas, horaSeleccionada]);

        setHoraSeleccionada('');

        setPlaca('');

        setMotivo('');

      }

    } catch (error) {

      setMensaje({ texto: 'Error al agendar la cita.', tipo: 'error' });

    }

  };



  return (

    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

        <Typography variant="h4" color="primary" fontWeight="bold" align="center" gutterBottom>

          Agendar Cita en Taller

        </Typography>

        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>

          Selecciona el día, horario y el vehículo que deseas traer a revisión.

        </Typography>



        {mensaje.texto && <Alert severity={mensaje.tipo} sx={{ mb: 3 }}>{mensaje.texto}</Alert>}



        <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>

          <Grid container spacing={4}>

            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', borderRight: { md: '1px solid #eee' } }}>

              <Box>

                <Typography variant="h6" align="center" color="primary" gutterBottom>1. Elige el Día</Typography>

                <DateCalendar value={fecha} onChange={(nuevaFecha) => setFecha(nuevaFecha)} disablePast />

              </Box>

            </Grid>



            <Grid item xs={12} md={6}>

              <Typography variant="h6" color="primary" gutterBottom>2. Elige el Horario</Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>

                {HORARIOS_BASE.map((hora) => {

                  const estaOcupada = horasOcupadas.includes(hora);

                  const estaSeleccionada = horaSeleccionada === hora;

                  return (

                    <Chip

                      key={hora}

                      label={estaOcupada ? `${hora} (Ocupado)` : hora}

                      clickable={!estaOcupada}

                      color={estaSeleccionada ? 'primary' : 'default'}

                      onClick={() => !estaOcupada && setHoraSeleccionada(hora)}

                      sx={{

                        opacity: estaOcupada ? 0.5 : 1,

                        cursor: estaOcupada ? 'not-allowed' : 'pointer',

                        fontWeight: estaSeleccionada ? 'bold' : 'normal',

                        p: 1

                      }}

                    />

                  );

                })}

              </Box>



              <Divider sx={{ mb: 3 }} />



              <Typography variant="h6" color="primary" gutterBottom>3. Datos del Vehículo</Typography>

             

              <form onSubmit={handleAgendar}>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                  <FormControl fullWidth margin="normal" required>

                    <InputLabel id="label-placa">Selecciona tu Vehículo</InputLabel>

                    <Select labelId="label-placa" value={placa} label="Selecciona tu Vehículo" onChange={(e) => setPlaca(e.target.value)}>

                      {misVehiculos.length === 0 ? (

                        <MenuItem value="" disabled>No tienes vehículos registrados</MenuItem>

                      ) : (

                        misVehiculos.map((vehiculo) => (

                          <MenuItem key={vehiculo.PLACA} value={vehiculo.PLACA}>

                            {vehiculo.MARCA} {vehiculo.MODELO} - Placa: {vehiculo.PLACA}

                          </MenuItem>

                        ))

                      )}

                    </Select>

                  </FormControl>

                 

                  <Button variant="outlined" color="primary" sx={{ height: 56, mt: 1, whiteSpace: 'nowrap' }} onClick={() => setModalAbierto(true)}>

                    + Agregar

                  </Button>

                </Box>



                <TextField fullWidth label="Motivo de la Cita" variant="outlined" margin="normal" multiline rows={3} required value={motivo} onChange={(e) => setMotivo(e.target.value)} />

                <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 3, backgroundColor: '#197f40', '&:hover': { backgroundColor: '#125c2e' } }} disabled={!horaSeleccionada || !placa}>

                  Confirmar Cita

                </Button>

              </form>

            </Grid>

          </Grid>

        </Paper>



        <Dialog open={modalAbierto} onClose={() => setModalAbierto(false)} maxWidth="sm" fullWidth>

          <DialogTitle sx={{ color: '#197f40', fontWeight: 'bold' }}>Registrar Nuevo Vehículo</DialogTitle>

          <DialogContent dividers>

            {mensajeModal.texto && <Alert severity={mensajeModal.tipo} sx={{ mb: 2 }}>{mensajeModal.texto}</Alert>}

            <Grid container spacing={2}>

              <Grid item xs={12} sm={6}>

                <TextField fullWidth label="Placa (Ej. P-123ABC)" required value={nuevoAuto.placa} onChange={(e) => setNuevoAuto({ ...nuevoAuto, placa: e.target.value })} />

              </Grid>

              <Grid item xs={12} sm={6}>

                <TextField fullWidth label="Marca (Ej. Toyota)" required value={nuevoAuto.marca} onChange={(e) => setNuevoAuto({ ...nuevoAuto, marca: e.target.value })} />

              </Grid>

              <Grid item xs={12} sm={6}>

                <TextField fullWidth label="Modelo (Ej. Corolla)" required value={nuevoAuto.modelo} onChange={(e) => setNuevoAuto({ ...nuevoAuto, modelo: e.target.value })} />

              </Grid>

              <Grid item xs={12} sm={6}>

                <TextField fullWidth label="Año" type="number" required value={nuevoAuto.anio} onChange={(e) => setNuevoAuto({ ...nuevoAuto, anio: e.target.value })} />

              </Grid>

              <Grid item xs={12}>

                <TextField fullWidth label="Color" required value={nuevoAuto.color} onChange={(e) => setNuevoAuto({ ...nuevoAuto, color: e.target.value })} />

              </Grid>

            </Grid>

          </DialogContent>

          <DialogActions sx={{ p: 2 }}>

            <Button onClick={() => setModalAbierto(false)} color="inherit">Cancelar</Button>

            <Button onClick={handleGuardarAuto} variant="contained" sx={{ backgroundColor: '#197f40' }}>

              Guardar y Seleccionar

            </Button>

          </DialogActions>

        </Dialog>



      </Container>

    </LocalizationProvider>

  );

}