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
  // Reseñas de texto reales (13-ago-2026) -- faltaba para poder pedir
  // las reseñas de esta cooperativa; antes solo llegaban nombre/logo.
  cooperativaId: string;
  cooperativaNombre: string;
  cooperativaLogoUrl: string | null;
  cooperativaCalificacionPromedio: number | null;
  cooperativaCalificacionCantidad: number;
  rutaId: string;
  horaSalidaProgramada: string;
  horaLlegadaEstimada: string | null;
  precioBase: string;
  tipoVehiculoId: string;
  tipoVehiculoNombre: string;
  // Ítem 11 (04-ago-2026) -- visibles antes de elegir, no solo guardadas.
  tipoVehiculoAmenidades: string[];
  asientosDisponibles: number;
  // Ítem 15 (05-ago-2026) -- ya llegaban del backend, pero se descartaban
  // en silencio por no estar declaradas aquí. Para el link "ver trayecto".
  origenLatitud: string;
  origenLongitud: string;
  destinoLatitud: string;
  destinoLongitud: string;
  origenNombre: string;
  destinoNombre: string;
  recargoVip: string;
}

export async function buscarPuntosOperacion(texto: string): Promise<PuntoOperacion[]> {
  if (texto.trim().length < 2) return [];
  const res = await fetch(`${API_URL}/puntos-operacion/buscar?texto=${encodeURIComponent(texto)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fase 2-portada (16-ago-2026) -- terminales aliadas reales, para la
 * portada. A diferencia de `buscarPuntosOperacion`, no necesita
 * texto -- lista todas las aprobadas de una vez.
 */
export interface TerminalAliada {
  id: string;
  nombre: string;
  ciudad: string;
}

export async function listarTerminalesAliadas(): Promise<TerminalAliada[]> {
  const res = await fetch(`${API_URL}/puntos-operacion/aliadas`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fase 7-portada (07-ago-2026) -- rutas reales disponibles con precio de
 * referencia, para la portada. Decision del director: "rutas
 * disponibles" (dato real), no "populares" (implicaria datos de demanda
 * que hoy casi no existen en produccion).
 */
export interface RutaDisponible {
  rutaId: string;
  origenCiudad: string;
  origenNombre: string;
  destinoCiudad: string;
  destinoNombre: string;
  precioReferencia: string;
}

export async function listarRutasDisponibles(): Promise<RutaDisponible[]> {
  const res = await fetch(`${API_URL}/rutas-disponibles`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fase 7-portada (07-ago-2026) -- contador real de cooperativas activas
 * y rutas disponibles, para la prueba social de la portada. Ningun
 * numero inventado.
 */
export interface EstadisticasPublicas {
  cooperativasActivas: number;
  rutasDisponibles: number;
}

export async function obtenerEstadisticasPublicas(): Promise<EstadisticasPublicas | null> {
  const res = await fetch(`${API_URL}/estadisticas-publicas`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Ítem 11 (04-ago-2026) -- filtros nuevos de hora, tipo de vehículo y
 * amenidades. Objeto de parámetros en vez de seguir agregando
 * argumentos posicionales (mismo criterio que el backend).
 */
export async function buscarViajes(params: {
  origenId: string;
  destinoId: string;
  fecha: string;
  pasajeros: number;
  horaDesde?: string;
  horaHasta?: string;
  tipoVehiculoId?: string;
  amenidades?: Amenidad[];
}): Promise<ResultadoViaje[]> {
  const query = new URLSearchParams({
    origenId: params.origenId,
    destinoId: params.destinoId,
    fecha: params.fecha,
    pasajeros: String(params.pasajeros),
  });
  if (params.horaDesde) query.set("horaDesde", params.horaDesde);
  if (params.horaHasta) query.set("horaHasta", params.horaHasta);
  if (params.tipoVehiculoId) query.set("tipoVehiculoId", params.tipoVehiculoId);
  if (params.amenidades && params.amenidades.length > 0) {
    query.set("amenidades", params.amenidades.join(","));
  }
  const res = await fetch(`${API_URL}/viajes/buscar?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudo completar la búsqueda. Intenta de nuevo en un momento.");
  }
  return res.json();
}

/**
 * Reseñas de texto reales (13-ago-2026) -- el campo `comentario` ya se
 * guardaba desde el 22-jul-2026, pero ningún endpoint lo devolvía.
 * Pública, sin autenticación (mismo criterio que el promedio numérico
 * que ya se muestra en resultados). El backend aplica el mismo umbral
 * mínimo de 5 calificaciones ya usado para el promedio -- por debajo
 * de eso, devuelve la lista vacía, no un error.
 */
export interface Resena {
  id: string;
  puntuacion: number;
  comentario: string;
  nombreAutor: string;
  creadoEn: string;
}

export interface ResenasPaginadas {
  resenas: Resena[];
  total: number;
  pagina: number;
  porPagina: number;
}

export async function listarResenasCooperativa(
  cooperativaId: string,
  pagina: number = 1,
  porPagina: number = 10,
): Promise<ResenasPaginadas> {
  const query = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina) });
  const res = await fetch(
    `${API_URL}/calificaciones/cooperativa/${cooperativaId}/resenas?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error("No se pudieron cargar las reseñas.");
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
/**
 * Ítem 14, Fase 2 (05-ago-2026) -- un solo sistema de etiquetas por
 * asiento individual (VIP, mujeres, cualquier combinación), unifica el
 * "VIP por piso completo" que existía antes. Compatibilidad hacia atrás
 * PERMANENTE (decisión del director): si una celda sigue siendo solo un
 * string (formato viejo), se interpreta igual que siempre, heredando la
 * etiqueta del piso si piso.categoria === 'vip'.
 *
 * ⚠ Debe mantenerse en sync con la copia idéntica de este archivo en
 * apps/api/src/dominio/asientos/distribucion-asientos.util.ts.
 */
export type Etiqueta = "vip" | "mujeres";

export const ETIQUETAS_CATALOGO: { valor: Etiqueta; etiqueta: string }[] = [
  { valor: "vip", etiqueta: "VIP" },
  { valor: "mujeres", etiqueta: "Exclusivo mujeres" },
];

export type Celda = string | null | { numero: string; etiquetas?: Etiqueta[] };

export interface PisoDistribucionAsientos {
  nombre: string;
  /** Formato viejo -- ya no se escribe desde el sistema nuevo, se sigue leyendo para heredar VIP. */
  categoria?: string;
  filas: Array<{ celdas: Celda[] }>;
}

export interface DistribucionAsientos {
  pisos: PisoDistribucionAsientos[];
}

/** Interpreta una celda: null si es pasillo, o { numero, etiquetas } con las etiquetas efectivas (propias + heredada del piso). */
export function interpretarCelda(
  celda: Celda,
  piso: PisoDistribucionAsientos,
): { numero: string; etiquetas: Etiqueta[] } | null {
  if (celda === null) return null;
  const esFormatoNuevo = typeof celda === "object";
  const numero = esFormatoNuevo ? celda.numero : celda;
  const etiquetasPropias = esFormatoNuevo ? (celda.etiquetas ?? []) : [];
  const heredaVipDePiso = piso.categoria?.toLowerCase() === "vip";
  const etiquetas = Array.from(
    new Set<Etiqueta>([...etiquetasPropias, ...(heredaVipDePiso ? (["vip"] as Etiqueta[]) : [])]),
  );
  return { numero, etiquetas };
}

/**
 * Generador de respaldo 2+2 -- compartido de verdad con la pantalla de
 * selección de asientos (antes vivía duplicado ahí, ítem 14, 05-ago-2026).
 */
export function generarPisosDeRespaldo(capacidadTotal: number): PisoDistribucionAsientos[] {
  const letras = ["A", "B", "C", "D"];
  const filas: Array<{ celdas: Celda[] }> = [];
  let restante = capacidadTotal;
  let numeroFila = 1;
  while (restante > 0) {
    const enEstaFila = Math.min(4, restante);
    const celdas: Celda[] = letras.slice(0, enEstaFila).map((l) => `${numeroFila}${l}`);
    celdas.splice(2, 0, null);
    filas.push({ celdas });
    restante -= enEstaFila;
    numeroFila++;
  }
  return [{ nombre: "Piso único", filas }];
}

export function obtenerPisosDeDistribucion(
  distribucion: DistribucionAsientos | null | undefined,
  capacidadTotal: number,
): PisoDistribucionAsientos[] {
  if (distribucion && Array.isArray(distribucion.pisos) && distribucion.pisos.length > 0) {
    return distribucion.pisos;
  }
  return generarPisosDeRespaldo(capacidadTotal);
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

/** Item 31, Fase 7 (11-ago-2026) -- compra como invitado: token puede ser null, en cuyo caso sesionInvitadoId identifica el bloqueo. */
export async function bloquearAsiento(viajeId: string, numeroAsiento: string, token: string | null, sesionInvitadoId?: string) {
  const res = await fetch(`${API_URL}/viajes/${viajeId}/asientos/${numeroAsiento}/bloquear`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sesionInvitadoId }),
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

/** Recargo VIP fijo de la cooperativa -- corrección real 18-ago-2026 (antes se pedía en cada viaje). */
export interface ConfiguracionVip {
  recargoVipDefault: number;
}

export async function obtenerConfiguracionVip(token: string): Promise<ConfiguracionVip> {
  const res = await fetch(`${API_URL}/coop/configuracion-vip`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo cargar la configuración VIP.");
  }
  return cuerpo as ConfiguracionVip;
}

export async function actualizarConfiguracionVip(
  token: string,
  datos: ConfiguracionVip,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/configuracion-vip`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo guardar la configuración VIP.");
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

/**
 * Ítem 21/22 (06-ago-2026) -- catálogo cerrado, ver enums.ts en el
 * paquete de base de datos para el contexto completo de por qué el
 * texto libre no era suficiente para mostrar el logo/nombre correcto
 * del banco receptor.
 */
export type EntidadFinanciera =
  | "banco_pichincha"
  | "banco_guayaquil"
  | "banco_pacifico"
  | "produbanco"
  | "banco_bolivariano"
  | "banco_internacional"
  | "diners_club"
  | "banco_ruminahui"
  | "coop_jep"
  | "coop_jardin_azuayo"
  | "otro";

export interface MetodoPagoCooperativa {
  id: string;
  tipo: TipoMetodoPago;
  activo: boolean;
  datosCuenta: Record<string, string>;
  entidadFinanciera: EntidadFinanciera | null;
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
  entidadFinanciera: EntidadFinanciera | null,
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/metodos-pago`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tipo, datosCuenta, activo, entidadFinanciera }),
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

/**
 * Credenciales API — Modelo B (02-ago-2026). Autoservicio de la propia
 * cooperativa. apiKeyCompleta solo viene presente en la respuesta de
 * crear/rotar -- después de eso nunca se vuelve a poder recuperar.
 */
export interface CredencialApiCooperativa {
  id: string;
  tipo: "api_key";
  apiKeyPrefix: string;
  webhookUrl: string | null;
  activo: boolean;
  creadoEn: string;
  revocadoEn: string | null;
}

export interface CredencialApiRecienCreada {
  id: string;
  apiKeyPrefix: string;
  apiKeyCompleta: string;
}

export async function listarCredencialesApi(token: string): Promise<CredencialApiCooperativa[]> {
  const res = await fetch(`${API_URL}/coop/credenciales-api`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar las credenciales API.");
  return cuerpo as CredencialApiCooperativa[];
}

export async function crearCredencialApi(
  token: string,
  webhookUrl?: string,
): Promise<CredencialApiRecienCreada> {
  const res = await fetch(`${API_URL}/coop/credenciales-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ webhookUrl: webhookUrl && webhookUrl.trim() !== "" ? webhookUrl : undefined }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear la credencial API.");
  }
  return cuerpo as CredencialApiRecienCreada;
}

export async function rotarCredencialApi(
  token: string,
  id: string,
): Promise<CredencialApiRecienCreada> {
  const res = await fetch(`${API_URL}/coop/credenciales-api/${id}/rotar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo rotar la credencial.");
  return cuerpo as CredencialApiRecienCreada;
}

export async function revocarCredencialApi(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/coop/credenciales-api/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo revocar la credencial.");
}

export async function actualizarWebhookCredencialApi(
  token: string,
  id: string,
  webhookUrl: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/credenciales-api/${id}/webhook`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ webhookUrl }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo actualizar el webhook.");
  }
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

/** Ítem 11 (04-ago-2026) -- catálogo cerrado, sección 3.2 del documento maestro. */
export type Amenidad =
  | "wifi"
  | "aire_acondicionado"
  | "bano_a_bordo"
  | "cargadores"
  | "asientos_reclinables"
  | "tv";

export const AMENIDADES_CATALOGO: { valor: Amenidad; etiqueta: string }[] = [
  { valor: "wifi", etiqueta: "WiFi" },
  { valor: "aire_acondicionado", etiqueta: "Aire acondicionado" },
  { valor: "bano_a_bordo", etiqueta: "Baño a bordo" },
  { valor: "cargadores", etiqueta: "Cargadores" },
  { valor: "asientos_reclinables", etiqueta: "Asientos reclinables" },
  { valor: "tv", etiqueta: "TV" },
];

export interface TipoVehiculoResumen {
  id: string;
  nombre: string;
  categoria: "bus" | "buseta" | "van" | "auto" | null;
  capacidadTotal: number;
  // Bug real encontrado por el director (18-ago-2026): el backend
  // puede devolver null cuando no se marco ninguna amenidad -- el tipo
  // mentia diciendo que siempre era un arreglo, y eso dejo pasar un
  // .map() sobre null hasta produccion, rompiendo toda la pantalla.
  amenidades: Amenidad[] | null;
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

/**
 * Horarios recurrentes (plantilla) — ítem 7, RF-COOP-002 (03-ago-2026).
 * Un generador aparte (cron diario) crea los viajes reales desde estas
 * plantillas; solo hace INSERT si no existe ya un viaje para esa
 * combinación, nunca UPDATE.
 */
export interface HorarioRutaResumen {
  id: string;
  rutaId: string;
  horaSalida: string;
  diasSemana: number[]; // 0=domingo..6=sábado
  tipoVehiculoPredeterminadoId: string;
  tipoVehiculoNombre: string;
  activo: boolean;
}

export async function listarHorariosRutaCoop(
  token: string,
  rutaId: string,
): Promise<HorarioRutaResumen[]> {
  const res = await fetch(`${API_URL}/coop/horarios-ruta?rutaId=${rutaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los horarios.");
  return cuerpo as HorarioRutaResumen[];
}

export async function crearHorarioRutaCoop(
  token: string,
  datos: {
    rutaId: string;
    horaSalida: string;
    diasSemana: number[];
    tipoVehiculoPredeterminadoId: string;
  },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/coop/horarios-ruta`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el horario.");
  }
  return cuerpo as { id: string };
}

export async function actualizarEstadoHorarioRutaCoop(
  token: string,
  id: string,
  activo: boolean,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/horarios-ruta/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activo }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo actualizar el horario.");
}

/**
 * Cancelación/suspensión masiva — ítem 7 (03-ago-2026). Los viajes con
 * boletos vendidos SÍ se cancelan: se genera crédito automático y se
 * notifica por WhatsApp a cada pasajero afectado.
 */
export interface ResultadoCancelacionMasiva {
  viajesCancelados: number;
  boletosCancelados: number;
  viajesEncontrados: number;
}

export async function cancelarViajesMasivoCoop(
  token: string,
  rutaId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<ResultadoCancelacionMasiva> {
  const res = await fetch(`${API_URL}/coop/rutas/${rutaId}/cancelar-masivo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fechaInicio, fechaFin }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo ejecutar la cancelación masiva.");
  }
  return cuerpo as ResultadoCancelacionMasiva;
}

export async function crearTipoVehiculoCoop(
  token: string,
  datos: {
    nombre: string;
    categoria?: "bus" | "buseta" | "van" | "auto";
    capacidadTotal: number;
    amenidades?: Amenidad[];
    /** Ítem 14 (05-ago-2026) -- opcional, mapa de asientos con etiquetas (VIP, mujeres). */
    distribucionAsientos?: DistribucionAsientos;
  },
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
  datos: {
    rutaId: string;
    unidadId: string;
    fechaSalida: string;
    horaSalidaProgramada: string;
    horaLlegadaEstimada?: string;
    recargoVip?: number;
    precioBase: number;
  },
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

/** Item 31.1, Fase 7 (13-ago-2026) -- nombreCompleto se reemplaza por
 * nombres/apellidos separados, y se agrega el selector explícito de
 * tipoDocumento (el backend valida distinto según cuál sea: cédula con
 * el algoritmo real Módulo 10, pasaporte con formato más ligero).
 * esEmbarazada es atención preferente (LOTTTSV Art. 48), no un
 * descuento -- va separado de tipoTarifa. */
export interface PasajeroCompraInput {
  viajeId: string;
  numeroAsiento: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "cedula" | "pasaporte";
  documento: string;
  tipoTarifa: "adulto" | "nino" | "tercera_edad" | "discapacidad";
  fechaNacimiento?: string;
  esEmbarazada?: boolean;
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
  // Hallazgo real del director (15-ago-2026, recorrido en vivo de
  // producción): la pantalla de confirmación no mostraba nada de esto.
  cooperativaNombre: string;
  rutaOrigenCiudad: string;
  rutaDestinoCiudad: string;
  fechaSalida: string;
  horaSalidaProgramada: string;
  unidadPlaca: string | null;
  unidadIdentificador: string | null;
  compradorNombre: string;
  compradorDocumento: string | null;
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

/** Item 31, Fase 7 (11-ago-2026) -- compra como invitado: token puede ser null, y entonces se exige telefonoContacto o correoContacto. */
export async function crearCompra(
  pasajeros: PasajeroCompraInput[],
  token: string | null,
  idempotencyKey: string,
  creditoIdAUsar?: string,
  telefonoContacto?: string,
  correoContacto?: string,
  sesionInvitadoId?: string,
): Promise<ResultadoCompra> {
  const res = await fetch(`${API_URL}/compras`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      pasajeros,
      idempotencyKey,
      creditoIdAUsar,
      telefonoContacto,
      correoContacto,
      sesionInvitadoId,
    }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(" ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo completar la compra.");
  }
  return cuerpo;
}

/**
 * Ítem 19, Fase 3 (06-ago-2026) -- 2FA obligatorio para las 3 cuentas
 * administrativas. login() ahora devuelve una de 3 formas distintas:
 * credenciales reales de una vez (pasajero/vendedor, sin 2FA), o un
 * token temporal que exige un paso más (admin sin 2FA configurado
 * todavía, o admin con 2FA ya activo).
 */
export type RespuestaLogin =
  | { accessToken: string; refreshToken: string }
  | { requiereConfigurar2fa: true; tokenTemporal: string }
  | { requiere2fa: true; tokenTemporal: string };

export async function login(correo: string, password: string): Promise<RespuestaLogin> {
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

/** Paso 1 de la configuración de 2FA: genera el secreto y el QR para escanear. */
export async function iniciarConfiguracion2fa(
  tokenTemporal: string,
): Promise<{ secreto: string; qrDataUrl: string }> {
  const res = await fetch(`${API_URL}/auth/2fa/iniciar-configuracion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenTemporal }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo iniciar la configuración de 2FA.");
  return cuerpo;
}

/** Paso 2: confirma con un código real, activa 2FA, entrega credenciales + 10 códigos de recuperación (una sola vez). */
export async function confirmarConfiguracion2fa(
  tokenTemporal: string,
  codigo: string,
): Promise<{ accessToken: string; refreshToken: string; codigosRecuperacion: string[] }> {
  const res = await fetch(`${API_URL}/auth/2fa/confirmar-configuracion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenTemporal, codigo }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "El código no es válido.");
  return cuerpo;
}

/** Login normal cuando 2FA ya está activo: valida el código de 6 dígitos. */
export async function verificar2fa(
  tokenTemporal: string,
  codigo: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${API_URL}/auth/2fa/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenTemporal, codigo }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "El código no es válido.");
  return cuerpo;
}

/** Respaldo si se perdió el dispositivo con la app autenticadora. */
export async function recuperarCon2fa(
  tokenTemporal: string,
  codigoRecuperacion: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${API_URL}/auth/2fa/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenTemporal, codigoRecuperacion }),
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "Ese código de recuperación no es válido.");
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
  latitud: number | null;
  longitud: number | null;
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
  latitud?: number;
  longitud?: number;
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
  cedula: string | null;
  telefono: string | null;
  fotoUrl: string | null;
  codigoPasajero: string;
  creadoEn: string;
  viajesCompletados?: number;
  puedeEditarIdentidad: boolean;
  diasRestantesParaEditarIdentidad: number | null;
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
  datos: { telefono?: string; fotoUrl?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/perfil`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(cuerpo?.message ?? "No se pudo actualizar tu perfil.");
  }
}

/**
 * Ítem 6, Fase 2 (03-ago-2026) -- separado de actualizarMiPerfil a
 * propósito: nombre/cédula llevan el límite de 90 días, teléfono/foto
 * no. El backend devuelve 400 con los días restantes si el límite
 * todavía no se cumple -- ese mensaje llega tal cual en el error.
 */
export async function actualizarMiIdentidad(
  token: string,
  datos: { nombreCompleto?: string; cedula?: string },
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/perfil/identidad`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo actualizar tu nombre/cédula.");
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
 * Ítem 13, Fase 2 (05-ago-2026) -- descarga de boleto en PDF. Endpoint
 * autenticado (requiere Authorization), así que no puede ser un simple
 * <a href> -- se pide como blob y se dispara la descarga con un enlace
 * temporal invisible, mismo patrón estándar para descargas autenticadas
 * en el navegador.
 */
export async function descargarBoletoPdf(token: string, boletoId: string): Promise<void> {
  const res = await fetch(`${API_URL}/calificaciones/mis-boletos/${boletoId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.message ?? "No se pudo descargar el boleto.");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `boleto-${boletoId.slice(0, 8)}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.URL.revokeObjectURL(url);
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

/**
 * Carga masiva (RF-COOP-008), ítem 8 (04-ago-2026). El payload es el
 * mismo JSON que ya acepta el backend -- se manda tal cual, sin
 * construir un formulario estructurado (pantalla simple, según pidió
 * el director). `horarios[].tipoVehiculoRef` es obligatorio desde la
 * unificación del generador con el ítem 7 -- sin eso, un horario de
 * carga masiva nunca podría generar viajes automáticos después.
 */
export interface ResultadoImportacion {
  tiposVehiculoCreados: number;
  conductoresCreados: number;
  unidadesCreadas: number;
  rutasCreadas: number;
  horariosCreados: number;
  viajesGenerados: number;
}

export async function importarDatosCoop(
  token: string,
  payload: unknown,
): Promise<ResultadoImportacion> {
  const res = await fetch(`${API_URL}/coop/importar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo procesar la carga masiva.");
  }
  return cuerpo as ResultadoImportacion;
}

/**
 * Ítem 9, Fase 2 (04-ago-2026) -- división super_admin/admin_plataforma.
 * Crear/eliminar son exclusivos de super_admin (el backend lo rechaza
 * con 403 si no lo eres -- aquí solo se oculta la acción por UX, no es
 * la barrera de seguridad real).
 */
export interface AdministradorResumen {
  id: string;
  correo: string;
  nombreCompleto: string;
  rol: "admin_plataforma" | "super_admin";
  activo: boolean;
  creadoEn: string;
}

export async function listarAdministradoresAdmin(token: string): Promise<AdministradorResumen[]> {
  const res = await fetch(`${API_URL}/admin/administradores`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar los administradores.");
  return cuerpo as AdministradorResumen[];
}

export async function crearAdministradorAdmin(
  token: string,
  datos: { correo: string; password: string; nombreCompleto: string; rol: "admin_plataforma" | "super_admin" },
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/admin/administradores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo crear el administrador.");
  }
  return cuerpo as { id: string };
}

export async function eliminarAdministradorAdmin(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/administradores/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo eliminar el administrador.");
}

/**
 * Ítem 10, Fase 2 (04-ago-2026) -- actualización periódica obligatoria
 * de datos legales de cooperativa. 6 meses sin confirmar = advertencia
 * (banner, no bloqueante). 12 meses de silencio total = bloqueado
 * (solo horarios recurrentes y carga masiva -- nunca venta, validación
 * de boletos, ni pagos).
 */
export interface DatosLegalesCooperativa {
  razonSocial: string;
  ruc: string;
  direccionLegal: string | null;
  contactoNombre: string | null;
  contactoCorreo: string | null;
  contactoTelefono: string | null;
}

export type EstadoActualizacionDatos =
  | { estado: "al_dia" }
  | { estado: "advertencia"; mesesSinConfirmar: number }
  | { estado: "bloqueado"; mesesSinConfirmar: number };

export type EstadoDatosCooperativa = EstadoActualizacionDatos & {
  datosActuales: DatosLegalesCooperativa;
};

export async function obtenerEstadoDatosCoop(token: string): Promise<EstadoDatosCooperativa> {
  const res = await fetch(`${API_URL}/coop/estado-datos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar el estado de tus datos.");
  return cuerpo as EstadoDatosCooperativa;
}

export async function confirmarDatosCoop(
  token: string,
  datos: Partial<DatosLegalesCooperativa>,
): Promise<void> {
  const res = await fetch(`${API_URL}/coop/confirmar-datos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudieron confirmar los datos.");
  }
}

/**
 * Wallet + referidos, lado pasajero (15-ago-2026) -- hallazgo real del
 * director en el recorrido en vivo de producción: el backend ya tenía
 * todo esto funcionando (wallet gana/gasta, referidos acredita) desde
 * hace días, pero el frontend nunca lo conectó -- el pasajero no tenía
 * ningún lugar donde verlo.
 */
export interface MovimientoWallet {
  id: string;
  monto: number;
  tipo: string;
  creadoEn: string;
}

export async function obtenerSaldoWallet(token: string): Promise<number> {
  const res = await fetch(`${API_URL}/wallet/saldo`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar tu saldo.");
  return cuerpo.saldo;
}

export async function listarMovimientosWallet(token: string): Promise<MovimientoWallet[]> {
  const res = await fetch(`${API_URL}/wallet/movimientos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudo cargar tu historial.");
  return cuerpo as MovimientoWallet[];
}

export interface MiReferido {
  id: string;
  nombreReferido: string;
  creadoEn: string;
  creditoDisparado: boolean;
}

export async function listarMisReferidos(token: string): Promise<MiReferido[]> {
  const res = await fetch(`${API_URL}/referidos/mis-referidos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const cuerpo = await res.json();
  if (!res.ok) throw new Error(cuerpo?.message ?? "No se pudieron cargar tus referidos.");
  return cuerpo as MiReferido[];
}

/**
 * Comercial / Publicidad, lado público (16-ago-2026, Fase 3 de la
 * sesión de frontend) -- hallazgo real de la auditoría del 13-ago
 * (sección 3.9 de DOCUMENTO_MAESTRO.md, "Estado real: ✅ Completo"):
 * el backend de publicidad ya funcionaba de punta a punta, pero el
 * frontend público nunca lo consumió -- mismo patrón real que luego
 * se repitió con wallet/referidos.
 *
 * Convención real de "ubicación" para el espacio de tarjeta nativa de
 * la portada (documentada aquí porque el campo es texto libre en el
 * panel admin, sin ningún catálogo cerrado): "portada_tarjeta_nativa".
 */
export interface CampanaActiva {
  campanaId: string;
  nombreAnunciante: string;
  formato: "imagen_texto" | "imagen_texto_video";
  archivoUrl: string;
  anchoPx: number | null;
  altoPx: number | null;
}

export async function listarPublicidadActiva(ubicacion: string): Promise<CampanaActiva[]> {
  const res = await fetch(
    `${API_URL}/publicidad/activas?ubicacion=${encodeURIComponent(ubicacion)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function registrarImpresionPublicidad(campanaId: string): Promise<void> {
  // No debe romper la navegación del pasajero si esto falla -- una
  // metrica perdida no es motivo para mostrar un error en la portada.
  try {
    await fetch(`${API_URL}/publicidad/${campanaId}/impresion`, { method: "POST" });
  } catch {
    // silencioso a propósito
  }
}

export async function registrarClicPublicidad(campanaId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/publicidad/${campanaId}/clic`, { method: "POST" });
  } catch {
    // silencioso a propósito
  }
}

export interface DatosLeadPublicidad {
  nombreEmpresa: string;
  contactoNombre?: string;
  contactoCorreo: string;
  contactoTelefono?: string;
  mensaje?: string;
}

export async function enviarLeadPublicidad(datos: DatosLeadPublicidad): Promise<void> {
  const res = await fetch(`${API_URL}/publicidad/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(", ") : cuerpo?.message;
    throw new Error(mensaje ?? "No se pudo enviar tu solicitud. Intenta de nuevo.");
  }
}

/**
 * Fase 5-buscador (16-ago-2026) -- reemplaza el banner con un dato
 * falso ("15% de descuento") por el beneficio real del programa de
 * referidos, ya configurado en producción.
 */
export interface BeneficiosReferidos {
  creditoReferidor: number;
  descuentoReferido: number;
}

export async function obtenerBeneficiosReferidos(): Promise<BeneficiosReferidos | null> {
  try {
    const res = await fetch(`${API_URL}/referidos/beneficios-publicos`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
