import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Container, Button, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, Grid, InputAdornment, Divider 
} from '@mui/material'; 
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search'; 
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; 
import axios from 'axios'; 

export default function Clientes() {
  const [clientes, setClientes] = useState([]); 
  const [filtro, setFiltro] = useState(""); 
  const [openModal, setOpenModal] = useState(false); 
  const [isEditing, setIsEditing] = useState(false); 
  
  const [clienteActivo, setClienteActivo] = useState({ 
    id: null, nit: '', nombre: '', telefono: '', usuario: '', password: '' 
  }); 

  const fetchClientes = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/clientes');
      if (response.data.success) { 
        setClientes(response.data.clientes || []); 
      }
    } catch (error) { 
      console.error("Error al cargar clientes:", error); 
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  // 🔍 Filtro mejorado para evitar errores con valores nulos
  const clientesFiltrados = clientes.filter(cliente => {
    const nombre = cliente.NOMBRE_CLIENTE ? cliente.NOMBRE_CLIENTE.toLowerCase() : "";
    const nit = cliente.NIT ? cliente.NIT.toString() : "";
    const termino = filtro.toLowerCase();
    return nombre.includes(termino) || nit.includes(termino);
  });

  const handleOpenNuevo = () => {
    setIsEditing(false); 
    setClienteActivo({ id: null, nit: '', nombre: '', telefono: '', usuario: '', password: '' }); 
    setOpenModal(true); 
  };

  const handleOpenEditar = (cliente) => {
    setIsEditing(true); 
    setClienteActivo({ 
      id: cliente.ID_CLIENTE, 
      nit: cliente.NIT || '', 
      nombre: cliente.NOMBRE_CLIENTE || '', 
      telefono: cliente.TELEFONO || '',
      usuario: cliente.NOMBRE_USUARIO || '', 
      password: '' 
    });
    setOpenModal(true); 
  };

  const handleClose = () => setOpenModal(false);

  const handleChange = (e) => {
    setClienteActivo({ ...clienteActivo, [e.target.name]: e.target.value });
  };

  const handleGuardar = async () => {
    try {
      if (isEditing) {
        await axios.put(`http://localhost:3000/api/clientes/${clienteActivo.id}`, clienteActivo);
      } else {
        await axios.post('http://localhost:3000/api/clientes', clienteActivo);
      }
      setOpenModal(false); 
      fetchClientes();
    } catch (error) { 
      console.error("Error al guardar:", error); 
      alert("Error al procesar la solicitud");
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de inactivar este cliente y revocar su acceso web?")) {
      try { 
        await axios.put(`http://localhost:3000/api/clientes/${id}/inactivar`); 
        fetchClientes(); 
      } 
      catch (error) { console.error(error); }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
          Directorio de Clientes
        </Typography>
        <Button variant="contained" color="success" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenNuevo}>
          Nuevo Cliente
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por nombre o NIT..."
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
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>ID</b></TableCell>
              <TableCell><b>NIT</b></TableCell>
              <TableCell><b>Nombre</b></TableCell>
              <TableCell><b>Teléfono</b></TableCell>
              <TableCell><b>Usuario Web</b></TableCell> 
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientesFiltrados.map((cliente) => (
              <TableRow key={cliente.ID_CLIENTE} hover>
                <TableCell>{cliente.ID_CLIENTE}</TableCell>
                <TableCell>{cliente.NIT || 'C/F'}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{cliente.NOMBRE_CLIENTE}</TableCell>
                <TableCell>{cliente.TELEFONO}</TableCell>
                <TableCell>
                  {cliente.NOMBRE_USUARIO ? (
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <AccountCircleIcon fontSize="small" sx={{ mr: 0.5 }}/> {cliente.NOMBRE_USUARIO}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">Sin acceso web</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpenEditar(cliente)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleEliminar(cliente.ID_CLIENTE)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
          {isEditing ? 'Editar Perfil de Cliente' : 'Registrar Nuevo Cliente'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            DATOS PERSONALES / FACTURACIÓN
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="NIT" name="nit" value={clienteActivo.nit} onChange={handleChange} size="small"/>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Teléfono" name="telefono" value={clienteActivo.telefono} onChange={handleChange} size="small"/>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre Completo" name="nombre" value={clienteActivo.nombre} onChange={handleChange} size="small" required/>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountCircleIcon sx={{ mr: 1 }} fontSize="small" /> ACCESO A PORTAL WEB (Opcional)
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Nombre de Usuario" 
                name="usuario" 
                value={clienteActivo.usuario} 
                onChange={handleChange} 
                size="small"
                placeholder="Ej. jorge99"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label={isEditing ? "Nueva Contraseña" : "Contraseña"} 
                name="password" 
                type="password"
                value={clienteActivo.password} 
                onChange={handleChange} 
                size="small"
                helperText={isEditing ? "Deje en blanco para mantener la actual" : ""}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" color="success">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}