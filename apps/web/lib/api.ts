/**
 * URL del backend. En desarrollo local apunta directo al NestJS que
 * corre en el puerto 3000 (ver apps/api). En producción, esto se
 * reemplaza por una variable de entorno real (NEXT_PUBLIC_API_URL) — no
 * se hardcodea la URL de producción aquí porque todavía no existe.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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

export interface PasajeroCompraInput {
  viajeId: string;
  numeroAsiento: string;
  nombreCompleto: string;
  documento: string;
  tipoTarifa: "adulto" | "nino" | "tercera_edad" | "discapacidad";
  fechaNacimiento?: string;
}

export interface BoletoEmitido {
  id: string;
  codigoQr: string;
}

export interface ResultadoCompra {
  compraId: string;
  estado: "aprobado" | "rechazado";
  boletos?: BoletoEmitido[];
  motivo?: string;
  montoTotal?: number;
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
