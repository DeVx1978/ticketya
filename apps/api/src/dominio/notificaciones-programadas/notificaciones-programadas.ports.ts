/**
 * Notificaciones programadas — RF-NOTIF-002/003 (03-ago-2026), ítem 5
 * de la hoja de ruta Fase 2. Dos disparadores distintos:
 *
 * 1) Recordatorio de viaje próximo -- disparo programado (cron), no
 *    reacción a una acción del usuario. Se registra en `notificaciones`
 *    ANTES de intentar enviar (mismo patrón que notificarCompraConfirmada
 *    en CompraRepositorio), para que la propia tabla sirva de control de
 *    idempotencia: un viaje+compra que ya tiene una fila con
 *    tipo='recordatorio_viaje' no se vuelve a recordar, sin importar si
 *    esa fila quedó 'enviado' o 'fallido'.
 *
 * 2) Aviso de cambio operativo -- disparo síncrono, enganchado justo en
 *    el momento real donde ocurre el cambio (cambiarUnidadViaje en
 *    PanelEmpresaService), no detectado después por un cron.
 */

export interface RecordatorioPendiente {
  viajeId: string;
  compraId: string;
  telefono: string | null;
  origenCiudad: string;
  destinoCiudad: string;
  fechaSalida: string;
  horaSalidaProgramada: string;
}

export interface CompraAfectadaPorViaje {
  compraId: string;
  telefono: string | null;
}

export interface NotificacionesProgramadasRepositorio {
  /**
   * Viajes 'programado' cuya salida cae dentro de las próximas
   * `horasAntes` horas, con boletos activos vendidos, que todavía no
   * tienen ninguna fila de recordatorio registrada para esa compra.
   */
  listarRecordatoriosPendientes(horasAntes: number): Promise<RecordatorioPendiente[]>;

  /** Inserta la fila de control ANTES de enviar -- devuelve su id para marcarla después. */
  registrarRecordatorio(
    viajeId: string,
    compraId: string,
    telefono: string | null,
  ): Promise<{ id: string }>;

  /** Compras con boletos activos en un viaje -- para el aviso de cambio operativo. */
  listarComprasAfectadasPorViaje(
    cooperativaId: string,
    viajeId: string,
  ): Promise<CompraAfectadaPorViaje[]>;

  registrarAvisoCambioOperativo(
    viajeId: string,
    compraId: string,
    telefono: string | null,
  ): Promise<{ id: string }>;

  marcarNotificacionEnviada(id: string): Promise<void>;
  marcarNotificacionFallida(id: string, error: string): Promise<void>;
}
