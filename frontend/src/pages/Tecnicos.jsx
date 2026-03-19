import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function Tecnicos() { // 🟢 Cambia este nombre en cada archivo (Cotizaciones, Facturas, etc.)
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          Módulo de Tecnicos 
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Esta pantalla está siendo programada por un miembro del equipo...
        </Typography>
      </Paper>
    </Box>
  );
}