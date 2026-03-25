import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, InputAdornment
} from '@mui/material';
import { Delete, Search, Add, Remove, Inventory } from '@mui/icons-material';
import axios from 'axios';

export default function Inventario() {
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [nuevo, setNuevo] = useState({ NOMBRE_ITEM: '', STOCK_ACTUAL: '', PRECIO_COSTO: '', PRECIO_VENTA: '' });

  useEffect(() => { cargarInventario(); }, []);

  const cargarInventario = async () => {
    const res = await axios.get('http://localhost:3000/api/inventario');
    setItems(res.data);
  };

  const handleStock = async (id, cantidadActual, cambio) => {
    const nuevoStock = cantidadActual + cambio;
    if (nuevoStock < 0) return; // No permitir stock negativo
    try {
      await axios.put(`http://localhost:3000/api/inventario/stock/${id}`, { nuevoStock });
      cargarInventario();
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:3000/api/inventario', nuevo);
    setNuevo({ NOMBRE_ITEM: '', STOCK_ACTUAL: '', PRECIO_COSTO: '', PRECIO_VENTA: '' });
    cargarInventario();
  };

  // Lógica del buscador
  const itemsFiltrados = items.filter(item =>
    item.NOMBRE_ITEM.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <Inventory sx={{ mr: 1 }} /> Gestión de Inventario
      </Typography>

      {/* Buscador y Formulario */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: '300px' }}>
          <Typography variant="h6" gutterBottom>Nuevo Repuesto</Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Nombre" size="small" value={nuevo.NOMBRE_ITEM} onChange={(e)=>setNuevo({...nuevo, NOMBRE_ITEM:e.target.value})} required />
              <TextField label="Stock" type="number" size="small" value={nuevo.STOCK_ACTUAL} onChange={(e)=>setNuevo({...nuevo, STOCK_ACTUAL:e.target.value})} required />
              <TextField label="Costo" type="number" size="small" value={nuevo.PRECIO_COSTO} onChange={(e)=>setNuevo({...nuevo, PRECIO_COSTO:e.target.value})} required />
              <TextField label="Venta" type="number" size="small" value={nuevo.PRECIO_VENTA} onChange={(e)=>setNuevo({...nuevo, PRECIO_VENTA:e.target.value})} required />
              <Button variant="contained" type="submit" sx={{ gridColumn: 'span 2' }}>Registrar</Button>
            </Box>
          </form>
        </Paper>

        <Paper sx={{ p: 2, width: { xs: '100%', md: '300px' }, display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Buscar repuesto..."
            variant="outlined"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Paper>
      </Box>

      {/* Tabla de Resultados */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#2c3e50' }}>
            <TableRow>
              <TableCell sx={{ color: 'white' }}>Producto</TableCell>
              <TableCell sx={{ color: 'white' }} align="center">Stock Manual</TableCell>
              <TableCell sx={{ color: 'white' }} align="right">Venta</TableCell>
              <TableCell sx={{ color: 'white' }} align="center">Estado</TableCell>
              <TableCell sx={{ color: 'white' }} align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsFiltrados.map((item) => (
              <TableRow key={item.ID_ITEM} sx={{ bgcolor: item.STOCK_ACTUAL <= 5 ? '#fff5f5' : 'inherit' }}>
                <TableCell>
                    <Typography variant="body1" fontWeight={item.STOCK_ACTUAL <= 5 ? "bold" : "normal"}>
                        {item.NOMBRE_ITEM}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => handleStock(item.ID_ITEM, item.STOCK_ACTUAL, -1)}><Remove /></IconButton>
                    <Typography sx={{ minWidth: '30px', textAlign: 'center' }}>{item.STOCK_ACTUAL}</Typography>
                    <IconButton size="small" color="primary" onClick={() => handleStock(item.ID_ITEM, item.STOCK_ACTUAL, 1)}><Add /></IconButton>
                  </Box>
                </TableCell>
                <TableCell align="right">Q.{item.PRECIO_VENTA}</TableCell>
                <TableCell align="center">
                  {item.STOCK_ACTUAL <= 5 ? (
                    <Chip label="STOCK BAJO" color="error" size="small" sx={{ fontWeight: 'bold' }} />
                  ) : (
                    <Chip label="Disponible" color="success" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="center">
                    <IconButton color="error" size="small"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}