import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Grid, Paper, TextField, 
  MenuItem, Button, Divider, Table, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// 🚗 DICCIONARIO ESTÁTICO DE VEHÍCULOS (Cero Base de Datos)
const HORARIOS_BASE = ['08:00 AM', '10:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];
const LISTA_COLORES = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Otro'];
const LISTA_ANIOS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const CATALOGO_VEHICULOS = {
  'Toyota': ['Corolla', 'Yaris', 'Hilux', 'RAV4', 'Tacoma'],
  'Honda': ['Civic', 'CR-V', 'Fit', 'HR-V', 'Accord'],
  'Nissan': ['Sentra', 'Versa', 'Frontier', 'Kicks', 'March'],
  'Hyundai': ['Elantra', 'Tucson', 'Accent', 'Santa Fe'],
  'Kia': ['Rio', 'Picanto', 'Sportage', 'Sorento'],
  'Mazda': ['Mazda3', 'Mazda2', 'CX-5', 'BT-50'],
  'Suzuki': ['Swift', 'Vitara', 'Jimny', 'Fronx']
};
const LISTA_MARCAS = Object.keys(CATALOGO_VEHICULOS);


export default function Cotizaciones({ idCliente }) {

  // ESTADOS PARA CATÁLOGOS DINÁMICOS
  const [modelosFiltrados, setModelosFiltrados] = useState([]);


  const navigate = useNavigate();
  const [paqueteId, setPaqueteId] = useState('');
  const [fallaDescripcion, setFallaDescripcion] = useState('');
  const [placa, setPlaca] = useState('');
  
  const [misVehiculos, setMisVehiculos] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);

  // ESTADOS PARA EL MODAL DE NUEVO VEHÍCULO
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoAuto, setNuevoAuto] = useState({ placa: '', marca: '', modelo: '', anio: '', color: '' });
  const [mensajeModal, setMensajeModal] = useState({ texto: '', tipo: '' });

  const paqueteSeleccionado = catalogoServicios.find(p => p.ID_SERVICIO === paqueteId);

  const cargarMisVehiculos = async () => {
    if (!idCliente) return;
    try {
      const resVehiculos = await axios.get(`http://localhost:3000/api/vehiculos/cliente/${idCliente}`); 
      if (resVehiculos.data.success) setMisVehiculos(resVehiculos.data.vehiculos);
    } catch (error) { console.error('Error al traer vehículos', error); }
  };


  // 🟢 EFECTO REPARADO: Cargar Vehículos y Catálogo de Servicios
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // 1. Traemos los carros del cliente (si está logueado)
        if (idCliente) {
          const resVehiculos = await axios.get(`http://localhost:3000/api/vehiculos/cliente/${idCliente}`); 
          if (resVehiculos.data.success) {
            setMisVehiculos(resVehiculos.data.vehiculos);
          }
        }
        
        // 2. Traemos el catálogo de reparaciones / servicios
        const resServicios = await axios.get('http://localhost:3000/api/servicios');
        if (resServicios.data.success) {
          setCatalogoServicios(resServicios.data.servicios);
        }
      } catch (error) {
        console.error('Error al traer datos de la BD', error);
      }
    };
    cargarDatos();
  }, [idCliente]);




  useEffect(() => {
  if (idCliente) {
      cargarMisVehiculos();
    }
    
    // 👇 NUEVO: Traer marcas y modelos de la BD
    const cargarCatalogos = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/vehiculos/catalogos');
        if (res.data.success) {
          setMarcasBD(res.data.marcas);
          setModelosBD(res.data.modelos);
        }
      } catch (error) { console.error("Error al cargar catálogos"); }
    };
    cargarCatalogos();
  }, [idCliente]);


  // FUNCIÓN PARA GUARDAR AUTO NUEVO DESDE COTIZADOR
  const handleGuardarAuto = async () => {
    setMensajeModal({ texto: '', tipo: '' });
    try {
      const respuesta = await axios.post('http://localhost:3000/api/vehiculos', { ...nuevoAuto, id_cliente: idCliente });
      if (respuesta.data.success) {
        setModalAbierto(false);
        cargarMisVehiculos();
        setPlaca(nuevoAuto.placa);
        setNuevoAuto({ placa: '', marca: '', modelo: '', anio: '', color: '' });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.mensaje || 'Error al registrar el auto.';
      setMensajeModal({ texto: errorMsg, tipo: 'error' });
    }
  };

  const handleSolicitarCotizacion = async (e) => {
    e.preventDefault();
    try {
      // ⚡ Si paqueteId es 'ninguno', mandamos null al backend
      const paqueteFinal = paqueteId === 'ninguno' ? null : paqueteId;

      const respuesta = await axios.post('http://localhost:3000/api/cotizaciones', {
        idCliente, placa, paqueteId: paqueteFinal, fallaDescripcion
      });
      if (respuesta.data.success) {
        const idCotizacionGenerada = respuesta.data.idCotizacion;
        alert(`✅ Cotización #${idCotizacionGenerada} solicitada con éxito.`); 
        navigate('/citas', { state: { cotizacionPrevia: idCotizacionGenerada, placaPrevia: placa, fallaPrevia: fallaDescripcion } });
      }
    } catch (error) { alert('❌ Hubo un error al guardar tu solicitud.'); }
  };



// Estado para guardar los modelos que dependen de la marca seleccionada
  const [modelosDisponibles, setModelosDisponibles] = useState([]);

// Función que hace la cascada
  const handleMarcaChange = (e) => {
    const marcaSelec = e.target.value;
    setNuevoAuto({ ...nuevoAuto, marca: marcaSelec, modelo: '' });
    // Busca en el diccionario y carga solo los modelos de esa marca
    setModelosDisponibles(CATALOGO_VEHICULOS[marcaSelec] || []);
  };



  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" color="primary" fontWeight="bold" align="center" gutterBottom>Cotizador en Línea</Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>Selecciona tu vehículo y descubre un estimado de tu reparación antes de visitarnos.</Typography>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <form onSubmit={handleSolicitarCotizacion}>
          <Grid container spacing={4} alignItems="stretch">
            
            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flexGrow: 1, backgroundColor: '#ffffff', p: 3, borderRadius: 2, border: '1px solid #e0e0e0', mb: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <DirectionsCarIcon sx={{ mr: 1 }} /> 1. Datos del Servicio
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField select fullWidth margin="normal" variant="outlined" label="Selecciona tu Vehículo" value={placa} onChange={(e) => setPlaca(e.target.value)} required>
                    {misVehiculos.length === 0 ? (
                      <MenuItem value="" disabled>No tienes vehículos registrados</MenuItem>
                    ) : (
                      misVehiculos.map((vehiculo) => (
                        <MenuItem key={vehiculo.PLACA} value={vehiculo.PLACA}>{vehiculo.MARCA} {vehiculo.MODELO} - {vehiculo.PLACA}</MenuItem>
                      ))
                    )}
                  </TextField>
                  <Button variant="outlined" color="primary" sx={{ height: 56, mt: 1, whiteSpace: 'nowrap' }} onClick={() => setModalAbierto(true)}>
                    + Agregar
                  </Button>
                </Box>
                  
              <TextField
                  select
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  label="Servicios de Precio Fijo (Opcional)"
                  value={paqueteId}
                  onChange={(e) => setPaqueteId(e.target.value)}
                >
                  {/* 🛠️ CORRECCIÓN 1: El value debe decir "ninguno" */}
                  <MenuItem value="ninguno">
                    <em>Ninguno / Solo busco diagnóstico</em>
                  </MenuItem>
                  
                  {/* 🛠️ CORRECCIÓN 2: Filtramos el registro en 0 que viene de la BD */}
                  {catalogoServicios
                    .filter((paq) => paq.NOMBRE_SERVICIO !== 'Otros / Diagnóstico General')
                    .map((paq) => (
                      <MenuItem key={paq.ID_SERVICIO} value={paq.ID_SERVICIO}>
                        {paq.NOMBRE_SERVICIO}
                      </MenuItem>
                  ))}
                </TextField>

                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>¿Presenta alguna falla específica?</Typography>
                <TextField fullWidth label="Describe el problema detalladamente" multiline rows={4} variant="outlined" value={fallaDescripcion} onChange={(e) => setFallaDescripcion(e.target.value)} placeholder="Ej. Vibra al frenar a más de 60km/h..." />
              </Box>

              <Box sx={{ backgroundColor: '#ffffff', p: 3, borderRadius: 2, border: '1px solid #e0e0e0', textAlign: 'center' }}>
                <Typography variant="h6" color="primary" gutterBottom>3. Confirmación</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Revisa tu selección en el panel derecho. Al confirmar, nuestro equipo recibirá tu solicitud para agendar la recepción.</Typography>
                <Button type="submit" variant="contained" size="large" fullWidth disabled={!placa || (!paqueteId && !fallaDescripcion.trim())} sx={{ backgroundColor: '#af514c', '&:hover': { backgroundColor: '#8c403c' }, py: 1.5, fontSize: '1.1rem' }}>
                  SOLICITAR COTIZACIÓN OFICIAL
                </Button>
              </Box>
            </Grid>

            {/* COLUMNA DERECHA: RESUMEN DINÁMICO */}
            <Grid item xs={12} md={6}>
              <Box sx={{ height: '100%', backgroundColor: '#f9fafb', p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><BuildIcon sx={{ mr: 1 }} /> 2. Resumen</Typography>
                <Divider sx={{ mb: 2 }} />

                {/* ⚡ SOLUCIÓN AL BUG "NINGUNO" */}
                {paqueteId === 'ninguno' ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Diagnóstico General en Taller</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom align="center">------------------- Este paquete incluye -------------------</Typography>
                    <Box sx={{ mb: 3, mt: 2 }}>
                       <Typography variant="body2" color="text.secondary" align="center">Revisión exhaustiva por nuestros técnicos y </Typography>
                         <Typography variant="body2" color="text.secondary" align="center">escaneo por computadora para determinar el origen de la falla descrita.</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">Costo del Diagnóstico:</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#197f40' }}>Q. 150.00</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" align="right" sx={{ mt: 1 }}>* El costo puede ser abonado a la reparación final.</Typography>
                  </Box>
                ) : paqueteSeleccionado ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{paqueteSeleccionado.NOMBRE_SERVICIO}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom align="center">------------------- Este paquete incluye -------------------</Typography>
                    <Box sx={{ mb: 3 }}>
                      <Table size="small">
                        <TableBody>
                          {paqueteSeleccionado.receta && paqueteSeleccionado.receta.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ borderBottom: '1px dashed #e0e0e0', py: 1, color: 'text.secondary' }}>x{item.CANTIDAD} {item.NOMBRE_ITEM}</TableCell>
                              <TableCell align="right" sx={{ borderBottom: '1px dashed #e0e0e0', py: 1, color: 'text.secondary' }}>Q{(item.CANTIDAD * item.PRECIO_VENTA).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">Total Estimado:</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#197f40' }}>Q. {paqueteSeleccionado.PRECIO.toFixed(2)}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 5, opacity: 0.6 }}>
                    <Typography variant="body1">Selecciona un paquete para ver el desglose exacto.</Typography>
                  </Box>
                )}
              </Box>
            </Grid>

          </Grid>
        </form>
      </Paper>

      {/* MODAL DE VEHÍCULO INCORPORADO EN COTIZACIONES */}
      <Dialog open={modalAbierto} onClose={() => setModalAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#197f40', fontWeight: 'bold' }}>Registrar Nuevo Vehículo</DialogTitle>
        <DialogContent dividers>
            {mensajeModal.texto && <Alert severity={mensajeModal.tipo} sx={{ mb: 2 }}>{mensajeModal.texto}</Alert>}
            
            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              {/* FILA 1: Placa ocupará todo el ancho (xs=12) */}
              <Grid item xs={12}>
                <TextField fullWidth label="Placa (Ej. P-123ABC)" required value={nuevoAuto.placa} onChange={(e) => setNuevoAuto({ ...nuevoAuto, placa: e.target.value })} />
              </Grid>
              
              {/* FILA 2: Marca y Modelo (Mitad y mitad: xs=12 en celular, sm=6 en PC) */}
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Marca" required value={nuevoAuto.marca} onChange={handleMarcaChange}>
                  {LISTA_MARCAS.map((marca) => (
                    <MenuItem key={marca} value={marca}>{marca}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Modelo" required value={nuevoAuto.modelo} disabled={!nuevoAuto.marca} onChange={(e) => setNuevoAuto({ ...nuevoAuto, modelo: e.target.value })}>
                  {modelosDisponibles.length === 0 ? (
                    <MenuItem value="" disabled>Seleccione marca primero</MenuItem>
                  ) : (
                    modelosDisponibles.map((mod) => (
                      <MenuItem key={mod} value={mod}>{mod}</MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>

              {/* FILA 3: Año y Color (Mitad y mitad) */}
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Año" required value={nuevoAuto.anio} onChange={(e) => setNuevoAuto({ ...nuevoAuto, anio: e.target.value })}>
                  {LISTA_ANIOS.map((anio) => (<MenuItem key={anio} value={anio}>{anio}</MenuItem>))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Color" required value={nuevoAuto.color} onChange={(e) => setNuevoAuto({ ...nuevoAuto, color: e.target.value })}>
                  {LISTA_COLORES.map((color) => (<MenuItem key={color} value={color}>{color}</MenuItem>))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalAbierto(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleGuardarAuto} variant="contained" sx={{ backgroundColor: '#197f40' }}>Guardar y Seleccionar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}