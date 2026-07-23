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

export interface MapaAsientos {
  viajeId: string;
  capacidadTotal: number;
  distribucionAsientos: unknown;
  asientosNoDisponibles: { numeroAsiento: string; estado: string; holdExpiraEn: string | null }[];
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
  datos: { nombre: string; capacidadTotal: number },
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
  ivaTotal?: number;
  ivaVisible?: boolean;
}

export async function crearCompra(
  pasajeros: PasajeroCompraInput[],
  token: string,
  idempotencyKey: string,
): Promise<ResultadoCompra> {
  const res = await fetch(`${API_URL}/compras`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pasajeros, idempotencyKey }),
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
  nombreCompleto: string;
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



