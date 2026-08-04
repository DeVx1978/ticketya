/**
 * API externa — Modelo B (03-ago-2026), cierre del ítem 4 de la hoja de
 * ruta Fase 2. Dos piezas distintas y complementarias al webhook (que
 * ya cubre el aviso de venta, push nuestro → cooperativa):
 *
 * 1) RECEPCIÓN (RF-API-002) — la cooperativa nos empuja cambios de
 *    disponibilidad/precio de SUS PROPIOS viajes. Alcance de esta
 *    primera entrega: precio (`precioBase`). El estado real de
 *    asientos ocupados/disponibles vive en `viaje_asientos` y refleja
 *    reservas reales del sistema propio de Columbus -- dejarlo
 *    editable directamente por una API externa abriría una vía de
 *    corromper reservas ya confirmadas sin una estrategia de conflicto
 *    definida. Eso queda para cuando exista la primera integración
 *    real y se pueda diseñar esa estrategia con datos reales, no
 *    hipotéticos -- mismo criterio que "el conector a la medida espera
 *    a una cooperativa real", ya aplicado en el resto de esta sección.
 *
 * 2) RECONCILIACIÓN (RF-API-004) — la cooperativa consulta activamente
 *    el estado de entrega de los webhooks que le enviamos, para poder
 *    verificar manualmente si algo se perdió, sin depender al 100% del
 *    reintento automático.
 *
 * Ambas piezas se autentican con la llave API de la cooperativa
 * (ApiKeyGuard), no con sesión JWT de admin_cooperativa -- están
 * pensadas para que el sistema propio de la cooperativa llame directo,
 * sin un usuario logueado en el navegador de por medio.
 */

export interface EventoWebhookResumen {
  id: string;
  evento: string;
  estadoEntrega: string;
  intentos: number;
  ultimoIntentoEn: string | null;
  ultimaRespuesta: string | null;
  creadoEn: string;
}

export interface ApiExternaRepositorio {
  /**
   * Bypass RLS a propósito -- todavía no sabemos a qué cooperativa
   * pertenece la petición, eso es justo lo que este método resuelve.
   * El prefijo es el mecanismo de lookup rápido (texto plano, único);
   * el hash es lo que realmente verifica el secreto.
   */
  validarCredencial(
    apiKeyPrefix: string,
    secreto: string,
  ): Promise<{ cooperativaId: string } | null>;

  actualizarPrecioViaje(
    cooperativaId: string,
    viajeId: string,
    precioBase: number,
  ): Promise<{ ok: true } | { ok: false; motivo: string }>;

  listarEventosWebhook(
    cooperativaId: string,
    desde?: string,
    hasta?: string,
  ): Promise<EventoWebhookResumen[]>;
}
