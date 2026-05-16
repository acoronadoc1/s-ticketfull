import React, { useState, useEffect } from 'react'; 
import { 
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, 
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent, 
  Divider, Grid, Button, Tabs, Tab
} from '@mui/material'; 
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; 
import VisibilityIcon from '@mui/icons-material/Visibility'; 
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print'; 
import PaymentsIcon from '@mui/icons-material/Payments';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios'; 

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [filtro, setFiltro] = useState(""); 
  const [openModal, setOpenModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [tabActual, setTabActual] = useState(0); // 0 = Pendientes, 1 = Pagadas

  const rol = localStorage.getItem('rol');
  const idCliente = localStorage.getItem('idCliente');

  const obtenerFacturas = async () => {
    try {
      const response = await axios.post('http://localhost:3000/api/facturas', {
        rol: rol,
        idCliente: idCliente
      });
      if (response.data.success) {
        setFacturas(response.data.facturas || []);
      }
    } catch (error) {
      console.error("Error cargando facturas:", error);
    }
  };

  useEffect(() => {
    obtenerFacturas();
  }, []);

  // --- 💰 FUNCIÓN PARA CAMBIAR ESTADO (PAGAR / REVERTIR) ---
  const cambiarEstadoPago = async (idFactura, estadoActual, numFac) => {
    let mensajeConfirmacion = "";
    
    // Evaluamos el mensaje dinámico según el rol y estado
    if (estadoActual === 'Pagada') {
      mensajeConfirmacion = `¿Deseas revertir a PENDIENTE la factura ${numFac}?`;
    } else {
      mensajeConfirmacion = rol === 'Admin' 
        ? `¿Deseas marcar como PAGADA la factura ${numFac}?`
        : `¿Deseas proceder con el pago seguro en línea de la factura ${numFac}?`;
    }

    if (window.confirm(mensajeConfirmacion)) {
      try {
        const res = await axios.put(`http://localhost:3000/api/facturas/${idFactura}/cambiar-estado`, {
          estadoActual: estadoActual
        });
        if (res.data.success) {
          // Si es un cliente el que pagó, le regalamos una alerta de confirmación agradable
          if (rol !== 'Admin' && estadoActual !== 'Pagada') {
            alert("🎉 ¡Pago procesado con éxito! Su vehículo ha sido liberado para entrega.");
          }
          obtenerFacturas(); 
        }
      } catch (error) {
        alert("Error al cambiar estado");
      }
    }
  };

  // --- 🗑️ FUNCIÓN PARA ELIMINAR FACTURA ---
  const eliminarFactura = async (idFactura, numFac) => {
    if (window.confirm(`⚠️ ¿ESTÁS SEGURO? Se eliminará la factura ${numFac} permanentemente del historial.`)) {
      try {
        const res = await axios.delete(`http://localhost:3000/api/facturas/${idFactura}`);
        if (res.data.success) {
          obtenerFacturas();
        }
      } catch (error) {
        alert("Error al eliminar la factura");
      }
    }
  };

 const verDetalleFactura = async (factura) => {
    try {
      // Jalamos el reporte detallado desde el nuevo endpoint antes de abrir el modal
      const res = await axios.get(`http://localhost:3000/api/facturas/${factura.ID_FACTURA}/detalle`);
      if (res.data.success) {
        setFacturaSeleccionada(res.data); // Guardamos todo el objeto compuesto
        setOpenModal(true);
      }
    } catch (error) {
      console.error("Error al cargar detalles de la factura:", error);
      alert("No se pudo cargar el desglose de la factura.");
    }
  };

  // --- 🔍 LÓGICA DE FILTRADO EN DOS NIVELES (Pestaña y Texto) ---
  const facturasFiltradas = facturas.filter(f => {
    const estadoMatch = tabActual === 0 ? f.ESTADO === 'Pendiente' : f.ESTADO === 'Pagada';
    
    const numFac = f.NUMERO_FACTURA ? f.NUMERO_FACTURA.toLowerCase() : "";
    const placa = f.PLACA ? f.PLACA.toLowerCase() : "";
    const termino = filtro.toLowerCase();
    const textoMatch = numFac.includes(termino) || placa.includes(termino);

    return estadoMatch && textoMatch;
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* HEADER DEDICADO POR ROL */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 40, color: '#1565c0', mr: 2 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {rol === 'Admin' ? 'Caja y Facturación' : 'Mis Comprobantes'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {rol === 'Admin' ? 'Gestión de cobros y liberación de vehículos.' : 'Historial de pagos de sus vehículos.'}
          </Typography>
        </Box>
      </Box>

      {/* PESTAÑAS (TABS) */}
      <Tabs 
        value={tabActual} 
        onChange={(e, nuevoValor) => setTabActual(nuevoValor)} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        textColor="primary" 
        indicatorColor="primary"
      >
        <Tab icon={<PendingActionsIcon />} iconPosition="start" label={rol === 'Admin' ? "Facturas por Cobrar" : "Pendientes de Pago"} sx={{ fontWeight: 'bold' }} />
        <Tab icon={<CheckCircleIcon />} iconPosition="start" label="Historial de Pagadas" sx={{ fontWeight: 'bold' }} />
      </Tabs>

      {/* BUSCADOR */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por placa o número de factura..."
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

      {/* TABLA DE CONTENIDO UNIFICADA */}
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: tabActual === 0 ? '#fff3e0' : '#e8f5e9' }}>
            <TableRow>
              <TableCell><b>No. Factura</b></TableCell>
              <TableCell><b>No. Orden</b></TableCell>
              <TableCell><b>Placa</b></TableCell>
              <TableCell><b>Fecha Generación</b></TableCell>
              <TableCell><b>Monto a Pagar</b></TableCell>
              {/* 🛠️ ENCABEZADO CORREGIDO: Aparece para ambos roles si está pendiente */}
              {tabActual === 0 && <TableCell align="center"><b>Acción</b></TableCell>}
              {tabActual === 1 && <TableCell align="center"><b>Acciones</b></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {facturasFiltradas.length > 0 ? (
              facturasFiltradas.map((f) => (
                <TableRow key={f.ID_FACTURA} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{f.NUMERO_FACTURA}</TableCell>
                  
                  <TableCell>
                    <Chip label={`ORD-${f.ID_ORDEN}`} size="small" variant="outlined" />
                  </TableCell>
                  
                  <TableCell>{f.PLACA || 'N/A'}</TableCell>
                  <TableCell>{f.FECHA_FACTURACION ? new Date(f.FECHA_FACTURACION).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    Q. {f.TOTAL ? f.TOTAL.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </TableCell>

                  {/* 🛠️ CELDA DE COBRO/PAGO CORREGIDA (Dinámica por rol) */}
                  {tabActual === 0 && (
                    <TableCell align="center">
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<PaymentsIcon />}
                        onClick={() => cambiarEstadoPago(f.ID_FACTURA, f.ESTADO, f.NUMERO_FACTURA)}
                        sx={{ fontWeight: 'bold', borderRadius: 2, textTransform: 'none' }}
                      >
                        {rol === 'Admin' ? 'Registrar Pago' : '💳 Pagar en Línea'}
                      </Button>
                    </TableCell>
                  )}

                  {/* COLUMNA DE ACCIONES (Pestaña Historial) */}
                  {tabActual === 1 && (
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => verDetalleFactura(f)}
                        >
                          Ver
                        </Button>

                        {rol === 'Admin' && (
                          <>
                            <IconButton 
                              size="small" 
                              color="warning" 
                              title="Revertir Pago (Devolver al Cajero)"
                              onClick={() => cambiarEstadoPago(f.ID_FACTURA, f.ESTADO, f.NUMERO_FACTURA)}
                            >
                              <SettingsBackupRestoreIcon />
                            </IconButton>
                            <IconButton color="error" title="Eliminar Factura" onClick={() => eliminarFactura(f.ID_FACTURA, f.NUMERO_FACTURA)}>
                              <DeleteForeverIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <Typography variant="h6">
                    {tabActual === 0 ? "¡Todo al día! No tiene facturas pendientes de cobro." : "No hay facturas pagadas en el historial."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

     {/* ================= MODAL DEL RECIBO DETALLADO (DISEÑO E IMPRESIÓN PROFESIONAL) ================= */}
      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {/* 🖨️ INYECCIÓN DE ESTILOS CSS MEDIANTE HOJA DE IMPRESIÓN EXCLUSIVA */}
        <style>{`
          @media print {
            /* 1. Ocultamos absolutamente todo lo que esté en el cuerpo del HTML */
            body * {
              visibility: hidden !important;
            }
            /* 2. Hacemos que únicamente nuestra área de factura y sus hijos sean visibles */
            #invoice-print-area, #invoice-print-area * {
              visibility: visible !important;
            }
            /* 3. Forzamos al contenedor a posicionarse en las coordenadas cero de la hoja física */
            #invoice-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 10px !important;
              box-shadow: none !important;
              background-color: #ffffff !important;
            }
            /* 4. Escondemos elementos innecesarios para el cliente como botones de control */
            .no-print {
              display: none !important;
            }
            /* 5. Aseguramos que los navegadores rendericen los colores de fondo e iconos correctamente */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Agrupamos todo en un contenedor único con ID para el aislamiento CSS */}
        <Box id="invoice-print-area" sx={{ p: 1 }}>
          <DialogContent sx={{ p: 3, border: 'none' }}>
            {facturaSeleccionada && (
              <Box>
                {/* Encabezado Principal */}
                <Typography variant="h5" align="center" color="primary" sx={{ fontWeight: '900', mb: 0.5, letterSpacing: '-0.5px' }}>
                  TALLER ERP AUTOMOTRIZ
                </Typography>
                <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mb: 3, lineHeight: 1.4 }}>
                  PBX: 2200-0000 | Villa Nueva, Guatemala<br />
                  <b>REGISTRO COMERCIAL NO:</b> {facturaSeleccionada.general.NUMERO_FACTURA}
                </Typography>

                {/* Bloque de Información del Cliente, Vehículo y Estatus */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', mb: 3, borderRadius: 2, borderColor: '#e2e8f0' }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>DATOS DEL CLIENTE:</Typography>
                      <Typography variant="body2" fontWeight="700" color="#1e293b">{facturaSeleccionada.general.NOMBRE_CLIENTE}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{facturaSeleccionada.general.CORREO}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} align="right" className="no-print">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>ESTADO DE CUENTA:</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          label={facturaSeleccionada.general.ESTADO?.toUpperCase()} 
                          color={facturaSeleccionada.general.ESTADO === 'Pagada' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}><Divider sx={{ opacity: 0.5, my: 0.5 }} /></Grid>

                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary"><b>VEHÍCULO:</b></Typography>
                      <Typography variant="body2" fontWeight="600">{facturaSeleccionada.general.MARCA} {facturaSeleccionada.general.MODELO}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary"><b>PLACA:</b></Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a' }}>{facturaSeleccionada.general.PLACA}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary"><b>REFERENCIA:</b></Typography>
                      <Typography variant="body2" color="primary" fontWeight="600">ORD-{facturaSeleccionada.general.ID_ORDEN}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="subtitle2" sx={{ fontWeight: '700', mb: 1, color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  Desglose de Consumos Realizados
                </Typography>
                
                {/* Tabla Detallada con Estilos Limpios */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3, borderColor: '#e2e8f0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', color: '#334155' }}>Descripción del Concepto</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: '#334155' }}>Cant.</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#334155' }}>Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Líneas de Mano de Obra / Servicios base */}
                      {facturaSeleccionada.servicios.map((srv, idx) => (
                        <TableRow key={`srv-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontSize: '0.85rem', color: '#334155' }}>🛠️ {srv.NOMBRE_SERVICIO} (Servicio + Mano de Obra)</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.85rem' }}>1</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: '600' }}>Q.{srv.TOTAL_LINEA?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Líneas de Repuestos Adicionales / Extras */}
                      {facturaSeleccionada.repuestos.map((rep, idx) => (
                        <TableRow key={`rep-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontSize: '0.85rem', color: '#334155' }}>⚙️ {rep.NOMBRE_ITEM} (Repuesto Adicional)</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.85rem' }}>{rep.CANTIDAD}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: '600' }}>Q.{rep.TOTAL_LINEA?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Bloque Financiero Desglosado */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', px: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '220px', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal Neto (Sin IVA):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: '500' }}>Q.{facturaSeleccionada.general.SUBTOTAL?.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '220px', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Impuestos Recaudados (12%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: '500' }}>Q.{facturaSeleccionada.general.IMPUESTOS?.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ width: '220px', my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '220px' }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#0f172a">TOTAL NETO:</Typography>
                    <Typography variant="subtitle1" color="success.main" fontWeight="900">
                      Q.{facturaSeleccionada.general.TOTAL?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>

                {/* Pie de Página de Certificación Digital Opcional */}
                <Box sx={{ mt: 4, textAlign: 'center', opacity: 0.7 }} className="no-print">
                  <Typography variant="caption" color="text.secondary" display="block">
                    🔒 Documento Tributario Electrónico Verificado mediante Sistema ERP del Taller.
                  </Typography>
                </Box>

                {/* Botón de Impresión de la Interfaz */}
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  startIcon={<PrintIcon />} 
                  className="no-print"
                  sx={{ mt: 3, borderRadius: 2, fontWeight: 'bold', py: 1.2, textTransform: 'none', boxShadow: 2 }} 
                  onClick={() => window.print()}
                >
                  Imprimir Factura Oficial
                </Button>
              </Box>
            )}
          </DialogContent>
        </Box>
      </Dialog>
    </Container>
  );
}