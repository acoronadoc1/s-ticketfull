import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, 
  Select, MenuItem, Checkbox, ListItemText, Button, OutlinedInput, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tab, 
  Tabs, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Card, CardContent, Divider
} from '@mui/material';
import axios from 'axios';
import EngineeringIcon from '@mui/icons-material/Engineering';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import BuildIcon from '@mui/icons-material/Build';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton } from '@mui/material';

export default function Tecnicos() {
  const [tab, setTab] = useState(0);
  const [datos, setDatos] = useState({ ordenes: [], mecanicos: [], servicios: [] });
  const [trabajoActual, setTrabajoActual] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccion, setSeleccion] = useState({ id: '', tipo: '', idsServicios: [], idsMecanicos: [] });

  // --- LÓGICA PARA REPUESTOS EXTRAS ---
  const [abrirModalExtra, setAbrirModalExtra] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [extraData, setExtraData] = useState({ idOrden: null, idItem: '', cantidad: 1, motivo: '', manoObra: '' });
  // --- LÓGICA PARA RECEPCIÓN FOTOGRÁFICA ---
  const [abrirModalFotos, setAbrirModalFotos] = useState(false);
  const [ordenParaFotos, setOrdenParaFotos] = useState(null);
  const [fotosUpload, setFotosUpload] = useState({
    frente: null,
    trasera: null,
    lateralDerecho: null,
    lateralIzquierdo: null
  });
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [previews, setPreviews] = useState({ frente: null, trasera: null, lateralDerecho: null, lateralIzquierdo: null });

  const handleFileChange = (e, angulo) => {
    const file = e.target.files[0];
    if (file) {
      setFotosUpload({ ...fotosUpload, [angulo]: file });
      setPreviews({ ...previews, [angulo]: URL.createObjectURL(file) });
    }
  };

  const quitarFoto = (angulo) => {
    setFotosUpload({ ...fotosUpload, [angulo]: null });
    setPreviews({ ...previews, [angulo]: null });
  };

  const handleSubirFotos = async () => {
    if (!ordenParaFotos) return;
    setSubiendoFotos(true);

    const formData = new FormData();
    formData.append('tipo', seleccion.tipo); 

    if (fotosUpload.frente) formData.append('fotoFrente', fotosUpload.frente);
    if (fotosUpload.trasera) formData.append('fotoTrasera', fotosUpload.trasera);
    if (fotosUpload.lateralDerecho) formData.append('fotoLateralDerecho', fotosUpload.lateralDerecho);
    if (fotosUpload.lateralIzquierdo) formData.append('fotoLateralIzquierdo', fotosUpload.lateralIzquierdo);

    try {
      const res = await axios.put(`http://localhost:3000/api/ordenes/${ordenParaFotos}/recepcion-imagenes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        alert("¡Fotos subidas a la nube correctamente!");
        setAbrirModalFotos(false);
        setFotosUpload({ frente: null, trasera: null, lateralDerecho: null, lateralIzquierdo: null });
        setPreviews({ frente: null, trasera: null, lateralDerecho: null, lateralIzquierdo: null });

        if (res.data.nuevoIdOrden) {
          await cargarDatos(); 
          setSeleccion({ ...seleccion, id: res.data.nuevoIdOrden, tipo: 'ORDEN' });
        }
      }
    } catch (error) {
      console.error("Error al subir fotos:", error);
      alert("Hubo un error al subir las imágenes.");
    } finally {
      setSubiendoFotos(false);
    }
  };

// Función para abrir el modal y cargar lo que hay en bodega
  const handleAbrirModalExtra = async (idOrden) => {
    // 🛠️ FIX AQUÍ: Reseteamos incluyendo 'motivo' y 'manoObra'
    setExtraData({ idOrden, idItem: '', cantidad: 1, motivo: '', manoObra: '' });
    try {
      const res = await axios.get('http://localhost:3000/api/inventario');
      setInventario(res.data);
      setAbrirModalExtra(true);
    } catch (err) {
      console.error("Error cargando inventario", err);
    }
  };

  const handleGuardarExtra = async () => {
    try {
      await axios.post('http://localhost:3000/api/tecnicos/repuestos-extra', extraData);
      alert("✅ Repuesto extra agregado y descontado de bodega");
      setAbrirModalExtra(false);
    } catch (err) {
      alert("Error al agregar repuesto extra");
      console.error(err);
    }
  };

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
    if (!seleccion.id || seleccion.idsServicios.length === 0 || seleccion.idsMecanicos.length === 0) {
      return alert("Faltan datos");
    }
    try {
      await axios.post('http://localhost:3000/api/tecnicos/asignar', {
        idSeleccionado: seleccion.id,
        tipo: seleccion.tipo,
        idsServicios: seleccion.idsServicios,
        idsMecanicos: seleccion.idsMecanicos
      });

      alert("✅ Vehículo recibido y orden generada");
      setSeleccion({ id: '', tipo: '', idsServicios: [], idsMecanicos: [] });
      cargarDatos(); 
      cargarTrabajoActual(); 
    } catch (err) { 
      alert("Error al procesar la recepción"); 
    }
  };

  const avanzarEstado = async (idDet, idOrd, nuevoEst) => {
    try {
      const res = await axios.put('http://localhost:3000/api/tecnicos/actualizar-estado', { 
        idDetalle: idDet, 
        idOrden: idOrd, 
        nuevoEstado: nuevoEst 
      });
      
      if (res.data.success) {
        alert(`¡Estado actualizado a: ${nuevoEst}!`);
        cargarTrabajoActual(); 
      }
    } catch (err) { 
      console.error("Error en la petición:", err);
      alert("Error al actualizar: " + (err.response?.data?.error || "Error de red")); 
    }
  };

  const finalizarTareaTecnica = async (idDet, idOrd) => {
    try {
      await axios.put('http://localhost:3000/api/tecnicos/finalizar', { 
        idDetalle: idDet,
        idOrden: idOrd 
      });
      alert("✅ Tarea enviada al historial con éxito.");
      cargarTrabajoActual(); 
      cargarHistorial();     
    } catch (err) { 
      console.error(err);
      alert("Error al finalizar la tarea."); 
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ color: '#1565c0', mb: 1, display: 'flex', alignItems: 'center' }}>
        <BuildIcon sx={{ fontSize: 35, mr: 1 }} /> Centro de Mando Técnico
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona la recepción de vehículos, asignación de tareas y monitoreo del taller en vivo.
      </Typography>

      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)} 
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        textColor="primary" 
        indicatorColor="primary"
      >
        <Tab icon={<AssignmentIndIcon />} iconPosition="start" label="1. Check-in & Asignación" sx={{ fontWeight: 'bold' }} />
        <Tab icon={<EngineeringIcon />} iconPosition="start" label="2. Taller en Vivo" sx={{ fontWeight: 'bold' }} />
        <Tab icon={<CheckCircleIcon />} iconPosition="start" label="3. Historial Finalizados" sx={{ fontWeight: 'bold' }} />
      </Tabs>

      {/* PESTAÑA 0: CHECK-IN Y ASIGNACIÓN */}
      {tab === 0 && (
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8} lg={6}>
            <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 3 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#424242' }}>
                Recepción de Vehículo
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Paso 1: Selecciona el Vehículo (Cita u Orden)</InputLabel>
                <Select 
                      value={seleccion.id} 
                      onChange={(e) => {
                        const item = datos.ordenes.find(o => o.ID === e.target.value);
                        
                        // 🌟 MAGIA AQUÍ: Si trae un servicio de la cotización, lo metemos en un arreglo.
                        const serviciosPreCargados = item.ID_SERVICIO_PREVIO ? [item.ID_SERVICIO_PREVIO] : [];

                        setSeleccion({ 
                          ...seleccion, 
                          id: e.target.value, 
                          tipo: item.TIPO,
                          idsServicios: serviciosPreCargados // <--- Auto-llenamos el Dropdown del Paso 3
                        });
                      }}
                      label="Paso 1: Selecciona el Vehículo (Cita u Orden)"
                    >
                  {datos.ordenes.map(o => (
                    <MenuItem key={`${o.TIPO}-${o.ID}`} value={o.ID}>
                      <Chip label={o.TIPO} size="small" color={o.TIPO === 'CITA' ? 'warning' : 'primary'} sx={{ mr: 1, fontWeight: 'bold' }} />
                      #{o.ID} - Placa: {o.PLACA}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> 

              {seleccion.id && (
                <Box sx={{ mt: 2, p: 3, bgcolor: '#f8fafd', borderRadius: 2, border: '2px dashed #90caf9' }}>
                  
                  <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                    Paso 2: Fotografías de Recepción
                  </Typography>
                  <Button 
                    fullWidth variant="outlined" color="primary" sx={{ mb: 4, py: 1.5, borderWidth: 2, fontWeight: 'bold' }}
                    startIcon={<PhotoCameraIcon />}
                    onClick={() => { setOrdenParaFotos(seleccion.id); setAbrirModalFotos(true); }}
                  >
                    Tomar / Adjuntar Fotos del Vehículo
                  </Button>

                  <Divider sx={{ mb: 3 }} />

                  <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                    Paso 3: Asignar Tareas
                  </Typography>
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Servicios a Realizar</InputLabel>
                    <Select 
                      multiple 
                      value={seleccion.idsServicios} 
                      onChange={(e) => setSeleccion({...seleccion, idsServicios: e.target.value})} 
                      input={<OutlinedInput label="Servicios a Realizar" />} 
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((id) => {
                            const srv = datos.servicios.find(x => x.ID_SERVICIO === id);
                            return <Chip key={id} label={srv ? srv.NOMBRE_SERVICIO : 'Cargando...'} color="primary" variant="outlined" size="small"/>;
                          })}
                        </Box>
                      )}
                    >
                      {datos.servicios.map(s => (
                        <MenuItem key={s.ID_SERVICIO} value={s.ID_SERVICIO}>
                          <Checkbox checked={seleccion.idsServicios.indexOf(s.ID_SERVICIO) > -1} />
                          <ListItemText primary={s.NOMBRE_SERVICIO} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 4 }}>
                    <InputLabel>Técnico Encargado</InputLabel>
                    <Select 
                      multiple 
                      value={seleccion.idsMecanicos} 
                      onChange={(e) => setSeleccion({...seleccion, idsMecanicos: e.target.value})} 
                      input={<OutlinedInput label="Técnico Encargado" />} 
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((id) => {
                            const mec = datos.mecanicos.find(x => x.ID_MECANICO === id);
                            return <Chip key={id} label={mec ? mec.NOMBRE_MECANICO : 'Cargando...'} color="warning" size="small"/>;
                          })}
                        </Box>
                      )}
                    >
                      {datos.mecanicos.map(m => (
                        <MenuItem key={m.ID_MECANICO} value={m.ID_MECANICO}>
                          <Checkbox checked={seleccion.idsMecanicos.indexOf(m.ID_MECANICO) > -1} />
                          <ListItemText primary={m.NOMBRE_MECANICO} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button variant="contained" color="success" fullWidth sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }} onClick={enviarAsignacion}>
                    <AssignmentIndIcon sx={{ mr: 1 }} /> Confirmar Asignación
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* PESTAÑA 1: TALLER EN VIVO */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {trabajoActual.length === 0 ? (
            <Grid item xs={12}>
              <Typography align="center" variant="h6" sx={{ mt: 5, color: 'text.secondary' }}>
                No hay vehículos en proceso en este momento.
              </Typography>
            </Grid>
          ) : (
            trabajoActual.map((t) => (
              <Grid item xs={12} sm={6} md={4} key={t.ID_DETALLE_SRV}>
                <Card sx={{ 
                  borderRadius: 3, boxShadow: 3, 
                  borderTop: `6px solid ${t.ESTADO === 'Asignado' ? '#9e9e9e' : t.ESTADO === 'En Revisión' ? '#0288d1' : t.ESTADO === 'En Reparación' ? '#ed6c02' : '#2e7d32'}` 
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h5" fontWeight="900" color="primary">{t.PLACA}</Typography>
                      <Chip label={`Orden #${t.ID_ORDEN}`} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                      <EngineeringIcon fontSize="small" sx={{ mr: 1, color: '#ff9800' }} /> {t.NOMBRE_MECANICO}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                      <BuildIcon fontSize="small" sx={{ mr: 1 }} /> {t.NOMBRE_SERVICIO}
                    </Typography>
                    <Box sx={{ textAlign: 'center', mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">ESTADO ACTUAL</Typography><br/>
                      <Chip 
                        label={t.ESTADO?.toUpperCase() || 'SIN ESTADO'} size="small" sx={{ fontWeight: 'bold', mt: 0.5 }} 
                        color={t.ESTADO === 'Asignado' ? 'default' : t.ESTADO === 'En Revisión' ? 'info' : t.ESTADO === 'En Reparación' ? 'warning' : 'success'} 
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {t.ESTADO === 'Asignado' && (
                        <Button fullWidth variant="contained" color="info" startIcon={<PlayArrowIcon />} onClick={() => avanzarEstado(t.ID_DETALLE_SRV, t.ID_ORDEN, 'En Revisión')}>
                          Iniciar Revisión
                        </Button>
                      )}
                      {t.ESTADO === 'En Revisión' && (
                        <>
                          <Button variant="contained" color="warning" sx={{ flexGrow: 1 }} startIcon={<PlayArrowIcon />} onClick={() => avanzarEstado(t.ID_DETALLE_SRV, t.ID_ORDEN, 'En Reparación')}>Reparar</Button>
                          <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={() => handleAbrirModalExtra(t.ID_ORDEN)}>Extra</Button>
                        </>
                      )}
                      {t.ESTADO === 'En Reparación' && (
                        <>
                          <Button variant="contained" color="success" sx={{ flexGrow: 1 }} startIcon={<CheckCircleIcon />} onClick={() => avanzarEstado(t.ID_DETALLE_SRV, t.ID_ORDEN, 'Listo para Entrega')}>Terminar</Button>
                          <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={() => handleAbrirModalExtra(t.ID_ORDEN)}>Extra</Button>
                        </>
                      )}
                      {t.ESTADO === 'Listo para Entrega' && (
                        <Button fullWidth variant="contained" sx={{ bgcolor: '#388e3c', color: 'white' }} onClick={() => finalizarTareaTecnica(t.ID_DETALLE_SRV, t.ID_ORDEN)}>
                          Enviar a Historial
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* PESTAÑA 2: HISTORIAL FINALIZADOS */}
      {tab === 2 && (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#2e7d32' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Orden</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Placa</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Servicio Realizado</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Mecánico</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Repuestos Extra y Justificación</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Precio Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historial && historial.length > 0 ? (
                historial.map((h, i) => (
                  <TableRow key={i} hover>
                    <TableCell>#{h.ID_ORDEN}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{h.PLACA}</TableCell>
                    <TableCell>{h.NOMBRE_SERVICIO}</TableCell>
                    <TableCell>{h.NOMBRE_MECANICO}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 300 }}>{h.EXTRAS_USADOS}</TableCell>
                    <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold' }}>Q{h.PRECIO_COBRADO}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay historial disponible aún</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* MODAL DE RECEPCIÓN FOTOGRÁFICA */}
      <Dialog open={abrirModalFotos} onClose={() => { setAbrirModalFotos(false); setPreviews({ frente: null, trasera: null, lateralDerecho: null, lateralIzquierdo: null }); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white', mb: 2, display: 'flex', alignItems: 'center' }}>
          <PhotoCameraIcon sx={{ mr: 1 }} /> Recepción Fotográfica - Orden #{ordenParaFotos}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Adjunte las fotografías del estado actual del vehículo haciendo clic en cada recuadro.
          </Typography>
          <Grid container spacing={3}>
            {[
              { id: 'frente', label: '📸 Vista Frontal' },
              { id: 'trasera', label: '📸 Vista Trasera' },
              { id: 'lateralDerecho', label: '📸 Lateral Derecho' },
              { id: 'lateralIzquierdo', label: '📸 Lateral Izquierdo' }
            ].map((angulo) => (
              <Grid item xs={12} sm={6} key={angulo.id}>
                <Paper variant="outlined" sx={{ height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: previews[angulo.id] ? '2px solid #4caf50' : '2px dashed #90caf9', bgcolor: previews[angulo.id] ? '#f1f8e9' : '#f8fafd', position: 'relative', overflow: 'hidden' }}>
                  {previews[angulo.id] ? (
                    <>
                      <img src={previews[angulo.id]} alt={angulo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton onClick={() => quitarFoto(angulo.id)} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}><DeleteIcon color="error" /></IconButton>
                    </>
                  ) : (
                    <Button component="label" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', color: '#1565c0' }}>
                      <CloudUploadIcon sx={{ fontSize: 50, mb: 1, color: '#64b5f6' }} />
                      <Typography variant="subtitle1" fontWeight="bold">{angulo.label}</Typography>
                      <Typography variant="caption" color="text.secondary">Clic para subir imagen</Typography>
                      <input type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, angulo.id)} />
                    </Button>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
          {subiendoFotos && (
            <Box sx={{ mt: 4, p: 2, bgcolor: '#fff3e0', borderRadius: 2, borderLeft: '5px solid #ff9800' }}>
              <Typography variant="body1" color="warning.dark" fontWeight="bold" textAlign="center">⏳ Subiendo imágenes a la nube de forma segura...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setAbrirModalFotos(false)} color="inherit" disabled={subiendoFotos} sx={{ fontWeight: 'bold' }}>Cancelar</Button>
          <Button variant="contained" color="primary" size="large" onClick={handleSubirFotos} disabled={subiendoFotos} sx={{ fontWeight: 'bold', px: 4 }}>{subiendoFotos ? "SUBIENDO..." : "GUARDAR EN LA NUBE"}</Button>
        </DialogActions>
      </Dialog>

     {/* ================= MODAL DE REPUESTOS EXTRAS (ACTUALIZADO) ================= */}
      <Dialog open={abrirModalExtra} onClose={() => setAbrirModalExtra(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', mb: 2 }}>
          ➕ Agregar Repuesto Extra (Orden #{extraData.idOrden})
        </DialogTitle>
        <DialogContent dividers>
          
          <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
            <InputLabel>1. Seleccionar Repuesto de Bodega</InputLabel>
            <Select 
              value={extraData.idItem} 
              label="1. Seleccionar Repuesto de Bodega" 
              onChange={(e) => setExtraData({ ...extraData, idItem: e.target.value })}
            >
              {inventario.filter(item => item.STOCK_ACTUAL > 0).map(item => (
                <MenuItem key={item.ID_ITEM} value={item.ID_ITEM}>
                  {item.NOMBRE_ITEM} (Disponible: {item.STOCK_ACTUAL} | Precio Repuesto: Q{item.PRECIO_VENTA})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField 
                fullWidth label="2. Cantidad a usar" type="number" InputProps={{ inputProps: { min: 1 } }} 
                value={extraData.cantidad} 
                onChange={(e) => setExtraData({ ...extraData, cantidad: e.target.value })} 
              />
            </Grid>
          </Grid>

          <TextField 
            fullWidth label="4. Motivo / Justificación" multiline rows={3} required
            value={extraData.motivo} 
            onChange={(e) => setExtraData({ ...extraData, motivo: e.target.value })} 
            placeholder="Ej: Al desmontar la llanta, se detectó que la pastilla de freno estaba cristalizada y requería cambio inmediato."
          />

        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setAbrirModalExtra(false)} color="inherit">Cancelar</Button>
          <Button 
            variant="contained" color="success" onClick={handleGuardarExtra} 
            disabled={!extraData.idItem || extraData.cantidad < 1 || !extraData.motivo.trim()}
          >
            Guardar Extra en Orden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}