/**
 * Interfaces (puertos) del dominio de asientos — RF-SEAT.
 */

export type EstadoAsiento =
  | 'disponible'
  | 'bloqueado_temporal'
  | 'pendiente_confirmacion_pago'
  | 'ocupado';

export interface AsientoNoDisponible {
  numeroAsiento: string;
  estado: EstadoAsiento;
  holdExpiraEn: Date | null;
}

export interface MapaAsientosViaje {
  viajeId: string;
  capacidadTotal: number;
  distribucionAsientos: unknown;
  asientosNoDisponibles: AsientoNoDisponible[];
  /** Política de cancelación/reprogramación (29-jul-2026) — el pasajero debe saberlo ANTES de comprar. */
  permiteCancelacion: boolean;
  permiteReprogramacion: boolean;
}

export type ResultadoBloqueo =
  | { exito: true; expiraEn: Date }
  | { exito: false; motivo: 'ocupado' | 'bloqueado_por_otro_usuario' };

export interface AsientoRepositorio {
  obtenerMapa(viajeId: string): Promise<MapaAsientosViaje | null>;
  /** Necesario para saber bajo qué cooperativa abrir la transacción de escritura. */
  obtenerCooperativaDelViaje(viajeId: string): Promise<string | null>;
  bloquear(
    viajeId: string,
    numeroAsiento: string,
    usuarioId: string,
    cooperativaId: string,
  ): Promise<ResultadoBloqueo>;
}

/**
 * RN-004 — decisión de negocio pendiente: duración exacta de la ventana
 * de bloqueo temporal (referencia de industria: 5-10 minutos, no
 * confirmada). Se usa un valor por defecto razonable aquí, no un
 * requisito ya validado — ver configuracion_plataforma.ventana_bloqueo_asiento_segundos
 * en el esquema, pensada exactamente para reemplazar esta constante
 * cuando el negocio decida el valor real.
 */
export const MINUTOS_BLOQUEO_ASIENTO_DEFECTO = 10;
