/**
 * URL del backend. En desarrollo local apunta directo al NestJS que
 * corre en el puerto 3000 (ver apps/api). En producción, esto se
 * reemplaza por una variable de entorno real (NEXT_PUBLIC_API_URL) — no
 * se hardcodea la URL de producción aquí porque todavía no existe.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface PuntoOperacion {
  id: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  tipo: string;
}

export interface ResultadoViaje {
  viajeId: string;
  cooperativaNombre: string;
  cooperativaLogoUrl: string | null;
  cooperativaCalificacionPromedio: number | null;
  cooperativaCalificacionCantidad: number;
  rutaId: string;
  horaSalidaProgramada: string;
  horaLlegadaEstimada: string | null;
  precioBase: string;
  tipoVehiculoNombre: string;
  asientosDisponibles: number;
}

export async function buscarPuntosOperacion(texto: string): Promise<PuntoOperacion[]> {
  if (texto.trim().length < 2) return [];
  const res = await fetch(`${API_URL}/puntos-operacion/buscar?texto=${encodeURIComponent(texto)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function buscarViajes(
  origenId: string,
  destinoId: string,
  fecha: string,
  pasajeros: number,
): Promise<ResultadoViaje[]> {
  const params = new URLSearchParams({ origenId, destinoId, fecha, pasajeros: String(pasajeros) });
  const res = await fetch(`${API_URL}/viajes/buscar?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudo completar la búsqueda. Intenta de nuevo en un momento.");
  }
  return res.json();
}

/**
 * Vacío real de diseño encontrado el 29-jul-2026: el backend ya
 * enviaba esto, sin tipo definido y sin que el frontend lo usara.
 * Un "piso" con filas; cada celda es un número de asiento o `null`
 * (pasillo). `categoria` es opcional, solo para mostrar una etiqueta
 * distinta (ej. "VIP") en el frontend.
 */
export interface PisoDistribucionAsientos {
  nombre: string;
  categoria?: string;
  filas: Array<{ celdas: Array<string | null> }>;
}

export interface DistribucionAsientos {
  pisos: PisoDistribucionAsientos[];
}

export interface MapaAsientos {
  viajeId: string;
  capacidadTotal: number;
  distribucionAsientos: DistribucionAsientos | null;
  asientosNoDisponibles: { numeroAsiento: string; estado: string; holdExpiraEn: string | null }[];
  /** Política de cancelación/reprogramación (29-jul-2026) — el pasajero debe saberlo ANTES de comprar. */
  permiteCancelacion: boolean;
  permiteReprogramacion: boolean;
}

export async function obtenerMapaAsientos(viajeId: string): Promise<MapaAsientos> {
  const res = await fetch(`${API_URL}/viajes/${viajeId}/asientos`, { cache: "no-store" });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.message ?? "No se pudo cargar el mapa de asientos.");
  }
  return res.json();
}

export async function bloquearAsiento(viajeId: string, numeroAsiento: string, token: string) {
  const res = await fetch(`${API_URL}/viajes/${viajeId}/asientos/${numeroAsiento}/bloquear`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo bloquear el asiento.");
  }
  return cuerpo as { estado: string; expiraEn: string };
}

export interface FilaVentaDelDia {
  rutaNombre: string;
  vendedorNombre: string | null;
  totalBoletos: number;
  totalVentas: number;
}

export async function obtenerDashboardCoop(token: string): Promise<FilaVentaDelDia[]> {
  const res = await fetch(`${API_URL}/coop/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo cargar el dashboard.");
  }
  return cuerpo as FilaVentaDelDia[];
}

export interface ConfiguracionFiscal {
  ivaPorcentaje: number;
  ivaVisibleEnBoleto: boolean;
  ivaSigueTasaNacional: boolean;
}

export async function obtenerConfiguracionFiscal(token: string): Promise<ConfiguracionFiscal> {
  const res = await fetch(`${API_URL}/coop/configuracion-fiscal`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo cargar la configuración fiscal.");
  }
  return cuerpo as ConfiguracionFiscal;
}

export async function actualizarConfiguracionFiscal(
  token: string,
  datos: ConfiguracionFiscal,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/configuracion-fiscal`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo guardar la configuración fiscal.");
  }
}

/**
 * Política de cancelación/reprogramación (29-jul-2026, hallazgo real
 * de negocio) — Transportes Occidental (Machala) no permite cambios ni
 * devoluciones. Cada cooperativa configura por separado.
 */
export interface PoliticaCancelacionReprogramacion {
  permiteCancelacion: boolean;
  horasLimiteCancelacion: number | null;
  permiteReprogramacion: boolean;
  horasLimiteReprogramacion: number | null;
}

export async function obtenerPoliticaCancelacionReprogramacion(
  token: string,
): Promise<PoliticaCancelacionReprogramacion> {
  const res = await fetch(`${API_URL}/coop/politica-cancelacion-reprogramacion`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar la política.");
  return cuerpo as PoliticaCancelacionReprogramacion;
}

export async function actualizarPoliticaCancelacionReprogramacion(
  token: string,
  datos: Partial<PoliticaCancelacionReprogramacion>,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/politica-cancelacion-reprogramacion`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo guardar la política.");
  }
}

/**
 * Métodos de pago manuales (29-jul-2026) — mientras no hay pasarela
 * real conectada, cada cooperativa configura los que ya usa hoy en
 * Ecuador (transferencia, efectivo, DeUna, PayPhone) con sus propios
 * datos para recibir el pago.
 */
export type TipoMetodoPago = "transferencia_bancaria" | "efectivo" | "deuna" | "payphone" | "tarjeta_pasarela";

export interface MetodoPagoCooperativa {
  id: string;
  tipo: TipoMetodoPago;
  activo: boolean;
  datosCuenta: Record<string, string>;
}

export async function listarMetodosPago(token: string): Promise<MetodoPagoCooperativa[]> {
  const res = await fetch(`${API_URL}/coop/metodos-pago`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los métodos de pago.");
  return cuerpo as MetodoPagoCooperativa[];
}

export async function guardarMetodoPago(
  token: string,
  tipo: TipoMetodoPago,
  datosCuenta: Record<string, string>,
  activo: boolean,
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/metodos-pago`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tipo, datosCuenta, activo }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo guardar el método de pago.");
  }
  return cuerpo;
}

export async function eliminarMetodoPago(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/coop/metodos-pago/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo eliminar el método de pago.");
}

/** Lado cooperativa: revisar y confirmar/rechazar pagos manuales pendientes. */
export interface PagoManualPendiente {
  pagoId: string;
  compraId: string;
  proveedor: string;
  monto: number;
  comprobanteUrl: string | null;
  compradorNombre: string;
  creadoEn: string;
}

export async function listarPagosPendientes(token: string): Promise<PagoManualPendiente[]> {
  const res = await fetch(`${API_URL}/coop/pagos-pendientes`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los pagos pendientes.");
  return cuerpo as PagoManualPendiente[];
}

export async function confirmarPagoManual(token: string, pagoId: string): Promise<void> {
  const res = await fetch(`${API_URL}/coop/pagos-pendientes/${pagoId}/confirmar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo confirmar el pago.");
}

export async function rechazarPagoManual(token: string, pagoId: string, motivo?: string): Promise<void> {
  const res = await fetch(`${API_URL}/coop/pagos-pendientes/${pagoId}/rechazar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ motivo }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo rechazar el pago.");
}

/** Lado pasajero: iniciar un pago manual y subir el comprobante. */
export interface ResultadoPagoManual {
  compraId: string;
  estado: "pendiente_confirmacion";
}

export async function iniciarPagoManual(
  token: string,
  pasajeros: PasajeroCompraInput[],
  tipoMetodoPago: TipoMetodoPago,
  idempotencyKey: string,
): Promise<ResultadoPagoManual> {
  const res = await fetch(`${API_URL}/compras/pago-manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pasajeros, tipoMetodoPago, idempotencyKey }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo iniciar el pago manual.");
  }
  return cuerpo;
}

export async function subirComprobantePago(
  token: string,
  compraId: string,
  archivo: File,
): Promise<{ comprobanteUrl: string }> {
  const formData = new FormData();
  formData.append("comprobante", archivo);
  const res = await fetch(`${API_URL}/compras/${compraId}/comprobante`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo subir el comprobante.");
  }
  return cuerpo;
}

export interface MetodoPagoDisponible {
  tipo: TipoMetodoPago;
  datosCuenta: Record<string, string>;
}

export async function listarMetodosPagoPorViaje(
  token: string,
  viajeId: string,
): Promise<MetodoPagoDisponible[]> {
  const res = await fetch(`${API_URL}/compras/metodos-pago/${viajeId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los métodos de pago.");
  return cuerpo as MetodoPagoDisponible[];
}

export interface RutaResumen {
  id: string;
  nombre: string | null;
  origenCiudad: string;
  destinoCiudad: string;
  precioBaseReferencia: number;
}

export async function listarRutasCoop(token: string): Promise<RutaResumen[]> {
  const res = await fetch(`${API_URL}/coop/rutas`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudieron cargar las rutas.");
  }
  return cuerpo as RutaResumen[];
}

export async function crearRutaCoop(
  token: string,
  datos: { origenPuntoOperacionId: string; destinoPuntoOperacionId: string; precioBaseReferencia: number; nombre?: string },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/rutas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear la ruta.");
  }
  return cuerpo as { id: string };
}

export interface TipoVehiculoResumen {
  id: string;
  nombre: string;
  categoria: "bus" | "buseta" | "van" | "auto" | null;
  capacidadTotal: number;
}

export async function listarTiposVehiculoCoop(token: string): Promise<TipoVehiculoResumen[]> {
  const res = await fetch(`${API_URL}/coop/tipos-vehiculo`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los tipos de vehículo.");
  return cuerpo as TipoVehiculoResumen[];
}

export async function crearTipoVehiculoCoop(
  token: string,
  datos: { nombre: string; categoria?: "bus" | "buseta" | "van" | "auto"; capacidadTotal: number },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/tipos-vehiculo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el tipo de vehículo.");
  }
  return cuerpo as { id: string };
}

export interface UnidadResumen {
  id: string;
  placa: string;
  identificadorOperativo: string;
  tipoVehiculoId: string;
  tipoVehiculoNombre: string;
  activo: boolean;
}

export async function actualizarEstadoUnidadCoop(
  token: string,
  unidadId: string,
  activo: boolean,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/unidades/${unidadId}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activo }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo actualizar la unidad.");
  }
}

export async function listarUnidadesCoop(token: string): Promise<UnidadResumen[]> {
  const res = await fetch(`${API_URL}/coop/unidades`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las unidades.");
  return cuerpo as UnidadResumen[];
}

export async function crearUnidadCoop(
  token: string,
  datos: { tipoVehiculoId: string; placa: string; identificadorOperativo: string },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/unidades`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear la unidad.");
  }
  return cuerpo as { id: string };
}

export interface ViajeCoopResumen {
  id: string;
  rutaNombre: string;
  origenCiudad: string;
  destinoCiudad: string;
  fechaSalida: string;
  horaSalidaProgramada: string;
  precioBase: number;
  estado: string;
  unidadPlaca: string;
  tipoVehiculoNombre: string;
}

export async function listarViajesCoop(token: string): Promise<ViajeCoopResumen[]> {
  const res = await fetch(`${API_URL}/coop/viajes`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los viajes.");
  return cuerpo as ViajeCoopResumen[];
}

export async function crearViajeCoop(
  token: string,
  datos: { rutaId: string; unidadId: string; fechaSalida: string; horaSalidaProgramada: string; precioBase: number },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/viajes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el viaje.");
  }
  return cuerpo as { id: string };
}

export interface InfoMenor {
  boletoId: string;
  tipoAcompanamiento: "con_padre_madre_tutor" | "con_autorizacion";
  adultoAcompananteNombre: string | null;
  adultoResponsableNombre: string | null;
  adultoResponsableDocumento: string | null;
  adultoResponsableTelefono: string | null;
  documentoAutorizacionUrl: string | null;
  yaVerificado: boolean;
}

export interface ResultadoValidacionQr {
  valido: boolean;
  mensaje: string;
  pasajeroNombre?: string;
  menor?: InfoMenor;
}

export async function verificarMenorCoop(
  token: string,
  boletoId: string,
  documentoIdentidadVerificado: boolean,
  documentoAutorizacionVerificado: boolean,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/verificar-menor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ boletoId, documentoIdentidadVerificado, documentoAutorizacionVerificado }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo registrar la verificación.");
  }
}

export async function validarQrCoop(token: string, codigoQr: string): Promise<ResultadoValidacionQr> {
  const res = await fetch(`${API_URL}/coop/validar-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ codigoQr }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo validar el boleto.");
  }
  return cuerpo as ResultadoValidacionQr;
}

export interface AutorizacionMenorInput {
  tipoAcompanamiento: "con_padre_madre_tutor" | "con_autorizacion";
  adultoAcompananteIndice?: number;
  adultoResponsableNombre?: string;
  adultoResponsableDocumento?: string;
  adultoResponsableTelefono?: string;
  documentoAutorizacionUrl?: string;
}

export interface PasajeroCompraInput {
  viajeId: string;
  numeroAsiento: string;
  nombreCompleto: string;
  documento: string;
  tipoTarifa: "adulto" | "nino" | "tercera_edad" | "discapacidad";
  fechaNacimiento?: string;
  autorizacionMenor?: AutorizacionMenorInput;
}

export interface BoletoEmitido {
  id: string;
  codigoQr: string;
  numeroAsiento: string;
  precioPagado: number;
  tasaTerminal: number;
  cargoPlataforma: number;
  ivaMonto: number;
}

export interface ResultadoCompra {
  compraId: string;
  estado: "aprobado" | "rechazado";
  boletos?: BoletoEmitido[];
  motivo?: string;
  montoTotal?: number;
  montoPagado?: number;
  creditoAplicado?: number;
  ivaTotal?: number;
  ivaVisible?: boolean;
}

export async function crearCompra(
  pasajeros: PasajeroCompraInput[],
  token: string,
  idempotencyKey: string,
  creditoIdAUsar?: string,
): Promise<ResultadoCompra> {
  const res = await fetch(`${API_URL}/compras`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pasajeros, idempotencyKey, creditoIdAUsar }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo completar la compra.");
  }
  return cuerpo;
}

export async function login(correo: string, password: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo iniciar sesión.");
  }
  return cuerpo;
}

export async function registrar(datos: {
  correo: string;
  password: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
}): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_URL}/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo completar el registro.");
  }
  return cuerpo;
}

// ---------------------------------------------------------------------
// Panel Admin (admin_plataforma) — cooperativas y puntos de operación,
// ver 22-jul-2026.
// ---------------------------------------------------------------------

export interface CooperativaResumen {
  id: string;
  nombreComercial: string;
  estado: string;
}

export async function listarCooperativasAdmin(token: string): Promise<CooperativaResumen[]> {
  const res = await fetch(`${API_URL}/admin/cooperativas`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las cooperativas.");
  return cuerpo as CooperativaResumen[];
}

export interface DatosNuevaCooperativa {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  modeloIntegracion: string;
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
}

export interface DatosPrimerUsuarioCooperativa {
  correo: string;
  password: string;
  nombreCompleto: string;
}

export async function crearCooperativaAdmin(
  token: string,
  cooperativa: DatosNuevaCooperativa,
  usuario: DatosPrimerUsuarioCooperativa,
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/cooperativas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ cooperativa, usuario }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear la cooperativa.");
  }
}

export interface PuntoOperacionResumen {
  id: string;
  tipo: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  tasaMonto: number | null;
  cooperativaPropietariaNombre: string | null;
}

export async function listarPuntosOperacionAdmin(token: string): Promise<PuntoOperacionResumen[]> {
  const res = await fetch(`${API_URL}/admin/puntos-operacion`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los puntos de operación.");
  return cuerpo as PuntoOperacionResumen[];
}

export interface FilaVentaNacional {
  cooperativaNombre: string;
  totalVentas: number;
  totalBoletos: number;
}

export async function dashboardNacionalAdmin(token: string): Promise<FilaVentaNacional[]> {
  const res = await fetch(`${API_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar el dashboard nacional.");
  return cuerpo as FilaVentaNacional[];
}

export interface DatosNuevoPuntoOperacion {
  tipo: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  cooperativaPropietariaId?: string;
  tasaMonto?: number;
}

export async function crearPuntoOperacionAdmin(
  token: string,
  datos: DatosNuevoPuntoOperacion,
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/puntos-operacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el punto de operación.");
  }
}

export async function actualizarPuntoOperacionAdmin(
  token: string,
  id: string,
  datos: Partial<DatosNuevoPuntoOperacion>,
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/puntos-operacion/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo actualizar el punto de operación.");
  }
}

// ---------------------------------------------------------------------
// Cargo fijo de plataforma por pasajero — hallazgo cerrado 22-jul-2026.
// ---------------------------------------------------------------------

export async function obtenerCargoPlataforma(token: string): Promise<number> {
  const res = await fetch(`${API_URL}/admin/cargo-plataforma`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar el cargo de plataforma.");
  return cuerpo.monto as number;
}

export async function actualizarCargoPlataforma(token: string, monto: number): Promise<void> {
  const res = await fetch(`${API_URL}/admin/cargo-plataforma`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ monto }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo guardar el cargo de plataforma.");
  }
}

// ---------------------------------------------------------------------
// Perfil de cooperativa (logo) — ver 22-jul-2026.
// ---------------------------------------------------------------------

export interface PerfilCoop {
  logoUrl: string | null;
}

export async function obtenerPerfilCoop(token: string): Promise<PerfilCoop> {
  const res = await fetch(`${API_URL}/coop/perfil`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar el perfil.");
  return cuerpo as PerfilCoop;
}

export async function actualizarPerfilCoop(token: string, logoUrl: string): Promise<void> {
  const res = await fetch(`${API_URL}/coop/perfil`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ logoUrl }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo guardar el logo.");
  }
}

// ---------------------------------------------------------------------
// Banners propios — promoción interna (DevX, Surebets24/7, etc.), NO
// parte del sistema comercial de terceros. Ver 22-jul-2026.
// ---------------------------------------------------------------------

export interface BannerPropio {
  id: string;
  titulo: string;
  imagenUrl: string;
  enlaceUrl: string;
  activo?: boolean;
  orden?: number;
}

export async function listarBannersPropiosAdmin(token: string): Promise<BannerPropio[]> {
  const res = await fetch(`${API_URL}/admin/banners-propios`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los banners.");
  return cuerpo as BannerPropio[];
}

export async function crearBannerPropioAdmin(
  token: string,
  datos: { titulo: string; imagenUrl: string; enlaceUrl: string; orden?: number },
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/banners-propios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el banner.");
  }
}

export async function actualizarBannerPropioAdmin(
  token: string,
  id: string,
  datos: { activo?: boolean; orden?: number },
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/banners-propios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo actualizar el banner.");
  }
}

export async function eliminarBannerPropioAdmin(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/banners-propios/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const cuerpo = await res.json();
    throw new Error(cuerpo?.message ?? "No se pudo eliminar el banner.");
  }
}

export async function listarBannersActivos(): Promise<BannerPropio[]> {
  const res = await fetch(`${API_URL}/banners-propios`, { cache: "no-store" });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los banners.");
  return cuerpo as BannerPropio[];
}

// ---------------------------------------------------------------------
// Calificaciones de viaje — 22-jul-2026.
// ---------------------------------------------------------------------

export interface MiPerfil {
  id: string;
  rol: "pasajero" | "vendedor" | "admin_cooperativa" | "admin_plataforma";
  correo: string;
  nombreCompleto: string;
  telefono: string | null;
  fotoUrl: string | null;
  creadoEn: string;
  viajesCompletados?: number;
}

export async function obtenerMiPerfil(token: string): Promise<MiPerfil> {
  const res = await fetch(`${API_URL}/auth/perfil`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar tu perfil.");
  return cuerpo as MiPerfil;
}

export async function actualizarMiPerfil(
  token: string,
  datos: { nombreCompleto?: string; telefono?: string; fotoUrl?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/perfil`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo actualizar tu perfil.");
  }
}

/**
 * Vacío real de diseño encontrado el 29-jul-2026: el backend ya tenía
 * un endpoint real de subida de archivo (POST /auth/perfil/foto), pero
 * el perfil solo dejaba pegar una URL a mano, sin usarlo. Esta función
 * reconecta eso — sube el archivo real, y el backend ya actualiza el
 * perfil solo (no hace falta un segundo PATCH después).
 */
export async function subirFotoPerfil(token: string, archivo: File): Promise<string> {
  const formData = new FormData();
  formData.append("foto", archivo);
  const res = await fetch(`${API_URL}/auth/perfil/foto`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo subir la foto.");
  }
  return cuerpo.url as string;
}

export async function cambiarPassword(
  token: string,
  passwordActual: string,
  passwordNueva: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/cambiar-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ passwordActual, passwordNueva }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo cambiar la contraseña.");
  }
}

/**
 * Cambio de correo (29-jul-2026, hallazgo real del usuario): sin esto,
 * quien pierde acceso a su correo queda fuera de su cuenta para
 * siempre — el reset de contraseña también depende de ese correo.
 */
export async function solicitarCambioCorreo(
  token: string,
  correoNuevo: string,
  passwordActual: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/solicitar-cambio-correo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ correoNuevo, passwordActual }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo solicitar el cambio de correo.");
  }
}

export async function confirmarCambioCorreo(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/confirmar-cambio-correo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo confirmar el cambio de correo.");
  }
}

export interface UsuarioStaffResumen {
  id: string;
  correo: string;
  nombreCompleto: string;
  rol: "vendedor" | "admin_cooperativa";
  activo: boolean;
}

export async function listarUsuariosStaffCoop(token: string): Promise<UsuarioStaffResumen[]> {
  const res = await fetch(`${API_URL}/coop/usuarios`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar el personal.");
  return cuerpo as UsuarioStaffResumen[];
}

export async function crearUsuarioStaffCoop(
  token: string,
  datos: { correo: string; password: string; nombreCompleto: string; rol: "vendedor" | "admin_cooperativa" },
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el usuario.");
  }
}

export interface ConductorResumen {
  id: string;
  nombreCompleto: string;
  cedula: string;
  licenciaNumero: string | null;
  licenciaCategoria: string | null;
  telefono: string | null;
}

export async function listarConductoresCoop(token: string): Promise<ConductorResumen[]> {
  const res = await fetch(`${API_URL}/coop/conductores`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los conductores.");
  return cuerpo as ConductorResumen[];
}

export async function crearConductorCoop(
  token: string,
  datos: { nombreCompleto: string; cedula: string; licenciaNumero?: string; licenciaCategoria?: string; telefono?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/conductores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el conductor.");
  }
}

export interface PasajeroDeViaje {
  numeroAsiento: string;
  nombreCompleto: string;
  documento: string;
  tipoTarifa: string;
  esMenorEdad: boolean;
  estadoBoleto: string;
}

export async function listarPasajerosDeViajeCoop(
  token: string,
  viajeId: string,
): Promise<PasajeroDeViaje[]> {
  const res = await fetch(`${API_URL}/coop/viajes/${viajeId}/pasajeros`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar la lista de pasajeros.");
  return cuerpo as PasajeroDeViaje[];
}

export async function editarViajeCoop(
  token: string,
  viajeId: string,
  datos: { horaSalidaProgramada?: string; precioBase?: number },
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/viajes/${viajeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo editar el viaje.");
  }
}

export async function cambiarUnidadViajeCoop(
  token: string,
  viajeId: string,
  nuevaUnidadId: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/viajes/${viajeId}/unidad`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nuevaUnidadId }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo cambiar la unidad.");
  }
}

export async function cancelarViajeCoop(
  token: string,
  viajeId: string,
): Promise<{ boletosCancelados: number }> {
  const res = await fetch(`${API_URL}/coop/viajes/${viajeId}/cancelar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo cancelar el viaje.");
  }
  return cuerpo;
}

export async function cancelarBoleto(token: string, boletoId: string): Promise<void> {
  const res = await fetch(`${API_URL}/compras/boletos/${boletoId}/cancelar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo cancelar el boleto.");
  }
}

export async function calificarViaje(
  token: string,
  boletoId: string,
  puntuacion: number,
  comentario?: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/calificaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ boletoId, puntuacion, comentario: comentario || undefined }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo enviar la calificación.");
  }
}

export interface MiBoleto {
  boletoId: string;
  codigoQr: string;
  estado: string;
  cooperativaNombre: string;
  origenCiudad: string;
  destinoCiudad: string;
  fechaSalida: string;
  horaSalidaProgramada: string;
  horaLlegadaEstimada: string | null;
  yaCalificado: boolean;
  puedeCalificar: boolean;
}

export async function listarMisBoletos(token: string): Promise<MiBoleto[]> {
  const res = await fetch(`${API_URL}/calificaciones/mis-boletos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar tus boletos.");
  return cuerpo as MiBoleto[];
}

/**
 * Vacío real de diseño encontrado el 29-jul-2026: el crédito de
 * reprogramación existía en el backend desde el 28-jul, pero el
 * pasajero no tenía ningún lugar donde consultar su saldo.
 */
export interface MiCredito {
  id: string;
  cooperativaId: string;
  cooperativaNombre: string;
  monto: number;
  usadoEn: string | null;
  creadoEn: string;
}

export async function listarMisCreditos(token: string): Promise<MiCredito[]> {
  const res = await fetch(`${API_URL}/compras/mis-creditos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar tus créditos.");
  return cuerpo as MiCredito[];
}

/**
 * Solicitud de factura del pasaje (29-jul-2026) -- confirmado con el
 * usuario: la cooperativa emite en su propio sistema, esto solo avisa.
 */
export async function solicitarFacturaCooperativa(
  token: string,
  boletoId: string,
  datosTributarios: Record<string, string>,
): Promise<{ ok: true; id: string }> {
  const res = await fetch(`${API_URL}/compras/boletos/${boletoId}/solicitar-factura`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ datosTributarios }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo solicitar la factura.");
  }
  return cuerpo;
}

export interface SolicitudFactura {
  id: string;
  boletoId: string;
  estado: "pendiente" | "emitida";
  datosTributarios: Record<string, string>;
  urlFactura: string | null;
  pasajeroNombre: string;
  creadoEn: string;
}

export async function listarSolicitudesFactura(token: string): Promise<SolicitudFactura[]> {
  const res = await fetch(`${API_URL}/coop/solicitudes-factura`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las solicitudes de factura.");
  return cuerpo as SolicitudFactura[];
}

export async function marcarFacturaEmitida(
  token: string,
  solicitudId: string,
  urlFactura?: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/solicitudes-factura/${solicitudId}/marcar-emitida`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ urlFactura }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo marcar la factura como emitida.");
}

/**
 * Liquidaciones a cooperativas (30-jul-2026) -- el admin de plataforma
 * genera, lista todas, y marca como pagada. La cooperativa consulta
 * su propio historial, solo lectura (ver listarMisLiquidaciones abajo).
 */
export interface LiquidacionCooperativa {
  id: string;
  cooperativaId: string;
  periodoInicio: string;
  periodoFin: string;
  montoVentasBruto: number;
  montoComisionPlataforma: number;
  montoAjustes: number;
  montoLiquidado: number;
  estado: "pendiente" | "pagada";
  pagadoEn: string | null;
  creadoEn: string;
}

export async function generarLiquidacion(
  token: string,
  cooperativaId: string,
  periodoInicio: string,
  periodoFin: string,
): Promise<LiquidacionCooperativa> {
  const res = await fetch(`${API_URL}/admin/liquidaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ cooperativaId, periodoInicio, periodoFin }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo generar la liquidación.");
  }
  return cuerpo as LiquidacionCooperativa;
}

export async function listarLiquidacionesAdmin(
  token: string,
  cooperativaId?: string,
): Promise<LiquidacionCooperativa[]> {
  const url = cooperativaId
    ? `${API_URL}/admin/liquidaciones?cooperativaId=${cooperativaId}`
    : `${API_URL}/admin/liquidaciones`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las liquidaciones.");
  return cuerpo as LiquidacionCooperativa[];
}

export async function marcarLiquidacionPagada(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/liquidaciones/${id}/pagar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo marcar como pagada.");
}

/**
 * Vacío real de diseño encontrado en la auditoría (30-jul-2026): la
 * cooperativa no tenía ninguna forma de ver su propio historial de
 * liquidaciones -- solo lectura, generar/marcar pagada sigue siendo
 * exclusivo del admin de plataforma.
 */
export async function listarMisLiquidaciones(token: string): Promise<LiquidacionCooperativa[]> {
  const res = await fetch(`${API_URL}/coop/liquidaciones`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar tus liquidaciones.");
  return cuerpo as LiquidacionCooperativa[];
}

/**
 * Comercial / Publicidad (30-jul-2026) -- el backend ya existía y
 * estaba probado desde antes de esta sesión, esto es solo el cliente
 * y las pantallas que faltaban (hallazgo real de la auditoría).
 */
export interface EspacioPublicitario {
  id: string;
  nombre: string;
  descripcion: string | null;
  anchoPx: number | null;
  altoPx: number | null;
  ubicacion: string;
  permiteRotacion: boolean;
  activo: boolean;
}

export async function crearEspacioPublicitario(
  token: string,
  datos: { nombre: string; descripcion?: string; anchoPx: number; altoPx: number; ubicacion: string; permiteRotacion?: boolean },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/admin/espacios-publicitarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el espacio publicitario.");
  }
  return cuerpo;
}

export async function listarEspaciosPublicitarios(token: string): Promise<EspacioPublicitario[]> {
  const res = await fetch(`${API_URL}/admin/espacios-publicitarios`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los espacios.");
  return cuerpo as EspacioPublicitario[];
}

export interface PlanComercial {
  id: string;
  nombre: "basico" | "destacado" | "premium";
  precioMensual: number | null;
  duracionDiasDefault: number | null;
  formatosPermitidos: unknown;
  activo: boolean;
}

export async function crearPlanComercial(
  token: string,
  datos: { nombre: "basico" | "destacado" | "premium"; precioMensual?: number; duracionDiasDefault?: number; formatosPermitidos: string[] },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/admin/planes-comerciales`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el plan comercial.");
  }
  return cuerpo;
}

export async function listarPlanesComerciales(token: string): Promise<PlanComercial[]> {
  const res = await fetch(`${API_URL}/admin/planes-comerciales`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los planes.");
  return cuerpo as PlanComercial[];
}

export interface LeadAnunciante {
  id: string;
  nombreEmpresa: string;
  contactoNombre: string | null;
  contactoCorreo: string;
  contactoTelefono: string | null;
  mensaje: string | null;
  estado: "nuevo" | "contactado" | "cerrado";
  notasSeguimiento: string | null;
  creadoEn: string;
}

export async function listarLeads(token: string): Promise<LeadAnunciante[]> {
  const res = await fetch(`${API_URL}/admin/leads`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los leads.");
  return cuerpo as LeadAnunciante[];
}

export async function actualizarEstadoLead(
  token: string,
  id: string,
  datos: { estado?: "nuevo" | "contactado" | "cerrado"; notasSeguimiento?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo actualizar el lead.");
}

export interface CampanaPublicitaria {
  id: string;
  espacioPublicitarioId: string;
  espacioNombre: string;
  planNombre: string;
  nombreAnunciante: string;
  formato: "imagen_texto" | "imagen_texto_video";
  archivoUrl: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "pendiente_revision" | "activa" | "rechazada";
  aprobadoPorUsuarioId: string | null;
  aprobadoEn: string | null;
}

export async function crearCampana(
  token: string,
  datos: {
    espacioPublicitarioId: string;
    planComercialId: string;
    leadAnuncianteId?: string;
    nombreAnunciante: string;
    formato: "imagen_texto" | "imagen_texto_video";
    archivoUrl: string;
    fechaInicio: string;
    fechaFin: string;
  },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/admin/campanas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear la campaña.");
  }
  return cuerpo;
}

export async function listarCampanas(token: string): Promise<CampanaPublicitaria[]> {
  const res = await fetch(`${API_URL}/admin/campanas`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las campañas.");
  return cuerpo as CampanaPublicitaria[];
}

export async function aprobarCampana(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/campanas/${id}/aprobar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo aprobar la campaña.");
}

export async function rechazarCampana(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/campanas/${id}/rechazar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo rechazar la campaña.");
}

export interface MetricaDiaCampana {
  fecha: string;
  impresiones: number;
  clics: number;
}

export async function obtenerMetricasCampana(token: string, id: string): Promise<MetricaDiaCampana[]> {
  const res = await fetch(`${API_URL}/admin/campanas/${id}/metricas`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las métricas.");
  return cuerpo as MetricaDiaCampana[];
}

/**
 * Contador de usuarios registrados por rol (02-ago-2026) -- RF-ADMIN
 * sección 3.13. Solo cuenta usuarios activos; el backend completa el
 * desglose con cantidad=0 en los roles sin ningún usuario todavía.
 */
export interface FilaConteoUsuariosPorRol {
  rol: "pasajero" | "vendedor" | "admin_cooperativa" | "admin_plataforma";
  cantidad: number;
}

export interface ConteoUsuarios {
  total: number;
  porRol: FilaConteoUsuariosPorRol[];
}

export async function contarUsuariosPorRolAdmin(token: string): Promise<ConteoUsuarios> {
  const res = await fetch(`${API_URL}/admin/usuarios/contador`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar el contador de usuarios.");
  return cuerpo as ConteoUsuarios;
}
