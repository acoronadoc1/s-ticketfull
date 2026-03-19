//Importaciones

import React from 'react'; 
//Le avisa al archivo que vamos a utilizar el framework de React

import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Box, Divider } from '@mui/material';
//Drawer Es literalmente la "gaveta" o panel lateral que contendrá nuestro menú.
//List, ListItem, ListItemText, ListItemIcon: Trabajan en equipo. Forman la lista de opciones. List es el contenedor general, 
// ListItem es cada renglón (el botón clickeable), y adentro dividimos el espacio para poner el dibujo (ListItemIcon) y el nombre del módulo (ListItemText).

//Toolbar: Es un espaciador. Lo usamos internamente para que la primera opción de tu menú no se quede pegada al borde superior de la pantalla y respete el margen.
//Typography: El reemplazo moderno de las etiquetas HTML como <h1> o <p> MUI usa esto para asegurar que toda la tipografía del ERP tenga la misma fuente, tamaño y peso
//Box: Es el equivalente a un <div> tradicional de HTML, Nos permite crear cajas contenedoras y alinear elementos muy rápido.
//Divider: (NUEVO) Es una línea visual muy sutil que usaremos para separar el menú de arriba con el botón de salir que estará abajo.

import { useNavigate } from 'react-router-dom'; 
//useNavigate (NUEVO): Es el "chofer" de React. Nos permite cambiar de pantalla (cambiar la URL) mediante código sin que la página parpadee o se recargue.

//Material UI tiene miles de iconos. Por eso, aquí llamamos exclusivamente a los dibujitos vectoriales que usaremos
import DashboardIcon from '@mui/icons-material/Dashboard'; //DashboardIcon: Para tu pantalla principal o métricas.
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; // (NUEVO) Para la agenda de citas
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'; // (NUEVO) Para las cotizaciones
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'; // (NUEVO) Para el estatus del vehículo
import ReceiptIcon from '@mui/icons-material/Receipt'; // (NUEVO) Para las facturas
import PeopleIcon from '@mui/icons-material/People'; //PeopleIcon: El icono de usuarios para tu catálogo de Clientes.
import InventoryIcon from '@mui/icons-material/Inventory'; // (NUEVO) Para el inventario de repuestos
import EngineeringIcon from '@mui/icons-material/Engineering'; // (NUEVO) Para los mecánicos
import PaymentsIcon from '@mui/icons-material/Payments'; // (NUEVO) Para el pago de horas
import LogoutIcon from '@mui/icons-material/Logout'; // (NUEVO) Para el botón de salir


const drawerWidth = 240;
//Estamos declarando una constante para definir el ancho de nuestro menú en 240 píxeles.

// (NUEVO) { rol, open, onClose }: Ahora el componente recibe "open" (si debe mostrarse) y "onClose" (función para cerrarse)
// ¡Así el menú sabe si quien entró es Admin o Usuario, y obedece al botón hamburguesa!
export default function Sidebar({ rol, open, onClose }) {

  const navigate = useNavigate(); // (NUEVO) Despertamos al "chofer" para poder llamarlo en los clics.

  // ==========================================
  // (NUEVO) EL CEREBRO DEL MENÚ: Matriz de Permisos
  // ==========================================
  // En lugar de escribir el código visual 9 veces, hacemos una lista inteligente.
  // Cada "objeto" tiene el texto, el icono, a qué ruta nos lleva, y quién tiene derecho a verlo.
  const menuItems = [
    { texto: 'Dashboard', icono: <DashboardIcon />, ruta: '/', rolesPermitidos: ['Admin', 'Usuario', 'Mecanico'] },
    { texto: 'Agendar Cita', icono: <CalendarMonthIcon />, ruta: '/citas', rolesPermitidos: ['Admin', 'Usuario'] },
    { texto: 'Cotiza Reparaciones', icono: <RequestQuoteIcon />, ruta: '/cotizaciones', rolesPermitidos: ['Admin', 'Usuario'] },
    { texto: 'Estatus del Vehículo', icono: <DirectionsCarIcon />, ruta: '/taller', rolesPermitidos: ['Admin', 'Usuario'] },
    { texto: 'Mis Facturas', icono: <ReceiptIcon />, ruta: '/facturas', rolesPermitidos: ['Admin', 'Usuario'] },
    { texto: 'Clientes', icono: <PeopleIcon />, ruta: '/clientes', rolesPermitidos: ['Admin'] },
    // 🛑 LOS 3 BOTONES RESTRINGIDOS (Solo el Admin los verá, fíjate que 'Usuario' no está en el arreglo)
    { texto: 'Inventario', icono: <InventoryIcon />, ruta: '/inventario', rolesPermitidos: ['Admin'] },
    { texto: 'Técnicos de Turno', icono: <EngineeringIcon />, ruta: '/tecnicos', rolesPermitidos: ['Admin'] },
    { texto: 'Pago Horas', icono: <PaymentsIcon />, ruta: '/pagos', rolesPermitidos: ['Admin'] },
  ];

  // (NUEVO) MAGIA DE FILTRADO: 
  // .filter() revisa uno por uno los botones de arriba. Si el 'rol' actual del usuario está incluido (includes) 
  // en la lista de 'rolesPermitidos', el botón pasa a la lista final. Si no, ¡lo borra visualmente!
  const menuFiltrado = menuItems.filter(item => item.rolesPermitidos.includes(rol));

  // (NUEVO) Función para salir del sistema
  const handleLogout = () => {
    window.location.href = '/'; // Al recargar la página web a la fuerza, borramos el estado de React y nos expulsa al Login.
  };

  // 🟢 NUEVO: Función que ejecuta la navegación y además CIERRA el menú automáticamente
  const handleNavegacion = (ruta) => {
    navigate(ruta);
    if (onClose) onClose(); // Ejecuta la orden de cierre que le mandó App.jsx
  };

  return (
//Esta es la declaración de nuestro componente de React. Al ponerle export default, le estamos diciendo al sistema: 
// "Empaqueta esta función para que cualquier otro archivo pueda importarla y usarla". El return es simplemente lo 
// que esta función va a escupir a la pantalla  

    <Drawer
      // 🟢 MAGIA AQUÍ: Cambiamos "permanent" por "temporary". Ahora se comporta como un panel emergente.
      variant="temporary"
      open={open} // Escucha a App.jsx para saber si abrirse
      onClose={onClose} // Si el usuario hace clic fuera del menú o presiona Escape, se cierra solo
//Invocamos el componente que importamos arriba. Al ponerle variant="temporary"
// le estamos ordenando que el menú espere la orden del botón hamburguesa para salir.

      sx={{//sx es la hoja de estilos CSS inyectada directamente en Javascript. Nos ahorra tener que crear archivos .css por separado.

        width: drawerWidth, //width: drawerWidth: Le aplica los 240px que definimos arriba.

        flexShrink: 0, //flexShrink: 0: ¡Esta línea es vital! Le dice al navegador: "Si el usuario hace la ventana más pequeña, 
        // aplasta el contenido del centro, pero NUNCA me encojas el menú lateral". Protege la integridad de tu diseño.

        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', backgroundColor: '#1d1d1d', color: 'white' },
//crea un contenedor interno invisible llamado MuiDrawer-paper. Con esta línea hacemos que el fondo del contenedor sea de color 
// gris oscuro casi negro (backgroundColor: '#1d1d1d') para que contraste con el techo verde, y que todas las letras sean blancas. 

//Básicamente, con este bloque ya construimos un panel izquierdo de 240 píxeles, oscuro, con letras blancas, 
// que jamás se va a encoger aunque muevan la ventana.
      }}>


      {/* 🟢 NUEVO: Este Toolbar fantasma empuja el contenido del menú hacia abajo 
          para que no quede oculto detrás de la barra superior verde de App.jsx */}
      <Toolbar />

      {/* (NUEVO) Etiqueta sutil debajo del título para que el usuario sepa con qué rol ingresó */}
      <Typography variant="caption" sx={{ px: 3, pt: 2, pb: 2, color: '#e0e0e0', display: 'block' }}>
        Modo: {rol || 'Desconocido'}
      </Typography>

      {/* <Box>: Como vimos antes, es un contenedor (div) */}
      <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* overflow: 'auto' crea una barra de desplazamiento vertical (scroll) 
      exclusiva para el menú lateral, sin que se mueva el resto de la página. 
      (NUEVO): display 'flex' y flexDir: 'column' nos permiten apilar todo verticalmente y empujar cosas al fondo. */}

        <List sx={{ flexGrow: 1 }}> {/* <List>: Abre la lista de opciones. flexGrow: 1 ocupa todo el espacio sobrante */}

          {/* (NUEVO) El método .map() es el mejor amigo de React. 
          En lugar de repetir <ListItem> a mano, .map() recorre automáticamente nuestra matriz "menuFiltrado"
          y por cada botón que encuentra, "imprime" este bloque de código. */}
          {menuFiltrado.map((item, index) => (
            
            <ListItem 
              button 
              key={index} // (NUEVO) React exige que en ciclos .map(), cada elemento tenga una "llave" única (key)
              onClick={() => handleNavegacion(item.ruta)} // (NUEVO) Al darle clic, le ordenamos al chofer navegar a la ruta de este botón Y cerrar la gaveta
              sx={{ borderRadius: '8px', mb: 1, mx: 1, '&:hover': { backgroundColor: '#af514c'}}}
            > 
              {/* <ListItem button>: Es el renglón individual. 
              Al agregarle la palabra button, Material UI le inyecta "vida":  
              le pone el efecto de que cambia de color al pasar el mouse por encima (hover) 
              y hace el efecto de "ola" cuando le das clic. */}

              <ListItemIcon sx={{ color: 'white' }}>
                {/* <ListItemIcon>: Aquí adentro inyectamos los dibujitos. Le ponemos color 'white' porque el fondo 
                es oscuro. Ahora inyectamos dinámicamente {item.icono} */}
                {item.icono}
              </ListItemIcon>

              <ListItemText primary={item.texto} />
              {/*<ListItemText>: Es el texto que acompaña al icono. El atributo primary 
              define el texto principal. Inyectamos {item.texto} para que cambie en cada ciclo. */}
            </ListItem>
            
          ))}
          
        </List>

        {/* (NUEVO) Divider: Pone la línea rayita divisoria para el botón de salida */}
        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

        {/* (NUEVO) El botón final de Cerrar Sesión, fuera del ciclo .map() para que siempre quede hasta abajo */}
        <List>
          <ListItem 
            button 
            onClick={handleLogout}
            sx={{ borderRadius: '8px', mb: 1, mx: 1, '&:hover': { backgroundColor: '#d32f2f'}}} //Hover rojo de peligro
          >
            <ListItemIcon sx={{ color: 'white' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Cerrar Sesión" />
          </ListItem>
        </List>

      </Box>
    </Drawer>
  );
}