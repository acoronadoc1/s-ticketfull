import { useState } from 'react'; 
import { Button, Typography, Container, Card, CardContent, Box } from '@mui/material';

function App() { 
  const [tickets, setTickets] = useState(0); 

  // --- FUNCIÓN 1: SUMAR ---
  const sumarTicket = async () => { 
    try { 
      const respuesta = await fetch('http://localhost:3000/sumar-clic', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' } 
      });
      const datos = await respuesta.json();
      setTickets(datos.nuevaCantidad);
    } catch (error) {  
      console.error("Error conectando al servidor:", error);
      alert("No se pudo conectar con el Backend. ¿Está encendido?");
    }
  };

  // --- FUNCIÓN 2: REINICIAR ---
  const reiniciarContador = async () => {
  try {
    // 1. Enviamos la petición al nuevo punto de acceso (endpoint)
    const respuesta = await fetch('http://localhost:3000/reiniciar-clic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const datos = await respuesta.json();

    // 2. Si el servidor dice que todo OK, ponemos el 0 en la pantalla
    setTickets(datos.nuevaCantidad);
    
    alert("¡Base de datos reiniciada con éxito!");

  } catch (error) {
    console.error("Error al reiniciar:", error);
    alert("No se pudo borrar la base de datos.");
  }

};


  // --- SOLO UN RETURN PARA TODO EL DISEÑO ---
  return (
    <Box sx={{ 
      backgroundColor: '#fdf3e3', 
      minHeight: '100vh',    // Ocupa el 100% del alto
      width: '100vw',       // Ocupa el 100% del ancho
      display: 'flex',       // Activa el modo de alineación inteligente
      justifyContent: 'center', // Centra horizontalmente 
      alignItems: 'center',     // Centra verticalmente
      margin: 0,
      padding: 0 }}>
      <Container maxWidth="sm">
        <Card elevation={24} style={{borderRadius: '15px'}}>
          <CardContent style={{textAlign: 'center', padding: '40px'}}>
            
            <Typography variant='h2' gutterBottom style={{fontWeight: 'bold', color: '#1e5c3c'}}>
              Sistema Tickets
            </Typography>

            <Typography variant="h6" color="text.secondary" paragraph> 
              Tickets resueltos (SQL): <strong style={{ color: '#d21919', fontSize: '1.2em' }}>{tickets}</strong>
            </Typography>

            <Button 
              variant="outlined" 
              color="info" 
              size="large"
              onClick={sumarTicket}
              style={{ marginTop: '15px', borderRadius: '8px', textTransform: 'none', fontSize: '1.1rem' }}
            >
              ¡Resolver un Ticket!
            </Button>

            <Button 
              variant="outlined" 
              color="error"  
              size="large"
              onClick={reiniciarContador}
              style={{ marginTop: '15px', marginLeft: '10px', borderRadius: '8px', textTransform: 'none', fontSize: '1.1rem' }}
            >
              Reiniciar Contador
            </Button>

          </CardContent>
        </Card> 
      </Container>
    </Box>
  );
}

export default App;