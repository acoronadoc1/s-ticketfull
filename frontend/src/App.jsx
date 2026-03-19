import React, { useState } from 'react';
// 🟢 NUEVO: Importamos AppBar (la barra superior), Toolbar, IconButton y Typography para el techo
import { Box, CssBaseline, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
// 🟢 NUEVO: Importamos el ícono clásico de las 3 rayitas (hamburguesa)
import MenuIcon from '@mui/icons-material/Menu';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Estatusv from './pages/Estatusv';
import Clientes from './pages/Clientes';
import Citas from './pages/Citas';
import Cotizaciones from './pages/Cotizaciones';
import Facturas from './pages/Facturas';
import Inventario from './pages/Inventario';
import Tecnicos from './pages/Tecnicos';
import Pagos from './pages/Pagos';
import Registro from './pages/Registro';

export default function App() {
const [userSession, setUserSession] = useState({ auth: false, rol: null, usuario: null, idCliente: null });

  // 🟢 NUEVO ESTADO: Un interruptor para saber si el menú lateral está abierto (true) o cerrado (false)
  const [menuAbierto, setMenuAbierto] = useState(false);

  // 🟢 NUEVA FUNCIÓN: Al hacer clic en el botón hamburguesa, invierte el estado (si está abierto lo cierra, y viceversa)
  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  return (
    <BrowserRouter>
      <CssBaseline />

      {/* ==========================================
          ZONA PÚBLICA (Sin Iniciar Sesión)
          ========================================== */}
      
      {!userSession.auth ? (
        <Routes>
          <Route path="/login" element={<Login onLogin={setUserSession} />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (

        
        <Box sx={{ display: 'flex' }}>
          
          {/* ==========================================
              🟢 NUEVO: EL TECHO DE LA APLICACIÓN (AppBar)
              ========================================== */}
          <AppBar 
            position="fixed" 
            sx={{ 
              zIndex: (theme) => theme.zIndex.drawer + 1, // Esto asegura que la barra superior siempre esté por ENCIMA del menú lateral
              backgroundColor: '#197f40' // El mismo verde elegante que elegiste
            }}
          >
            <Toolbar>
              {/* Este es el botón de la hamburguesa */}
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={toggleMenu} // Al hacer clic, ejecuta la función que abre/cierra el menú
                sx={{ marginRight: 2 }}
              >
                <MenuIcon />
              </IconButton>
              
              {/* El título que antes estaba dentro del menú, ahora vive en el techo */}
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
                ERP Automotriz
              </Typography>
            </Toolbar>
          </AppBar>

          {/* 🟢 NUEVO: Le pasamos al Sidebar el estado "menuAbierto" y una función para cerrarse a sí mismo */}
          <Sidebar 
            rol={userSession.rol} 
            open={menuAbierto} 
            onClose={() => setMenuAbierto(false)} 
          />
          
          {/* Contenido Principal */}
          <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
            {/* 🟢 NUEVO: Este Toolbar vacío funciona como un "fantasma" que empuja el contenido hacia abajo 
                para que la barra superior (AppBar) no tape tu Dashboard */}
            <Toolbar /> 
            
            <Routes>
              <Route path="/" element={<Dashboard rol={userSession.rol} usuario={userSession.usuario} />} />
              <Route path="/taller" element={<Estatusv />} />
              <Route path="/clientes" element={<Clientes />} />
              
              {/* 🟢 NUEVAS RUTAS PARA EL EQUIPO */}
             <Route path="/citas" element={<Citas idCliente={userSession.idCliente} />} />
              <Route path="/cotizaciones" element={<Cotizaciones idCliente={userSession.idCliente} />} />
              <Route path="/facturas" element={<Facturas />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/tecnicos" element={<Tecnicos />} />
              <Route path="/pagos" element={<Pagos />} />

              <Route path="/login" element={<Navigate to="/" />} />
              <Route path="/registro" element={<Registro />} /> 
              <Route path="*" element={<Navigate to="/login" />} />

            </Routes>



          </Box>
        </Box>
      )}
    </BrowserRouter>
  );
}